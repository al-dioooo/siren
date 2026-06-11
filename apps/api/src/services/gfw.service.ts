// Typed client Global Fishing Watch API v3 (plan 04 Stage 1).
// Semua respons divalidasi Zod (schema di @siren/shared). Retry/backoff
// untuk 429/5xx; 401 langsung throw deskriptif. Identitas kapal di-cache LRU.
import { LRUCache } from 'lru-cache';
import {
  GFW_EVENT_DATASETS,
  GFW_VESSEL_DATASET,
  gfwEventsResponseSchema,
  gfwVesselSchema,
  gfwVesselSearchResponseSchema,
  type GfwDerivedPosition,
  type GfwEvent,
  type GfwEventType,
  type GfwVessel,
  type GfwVesselSearchResponse,
} from '@siren/shared';

const GFW_BASE_URL = 'https://gateway.api.globalfishingwatch.org/v3';

/** Backoff retry: 3 percobaan ulang dengan jeda kuadratik (detik) */
const RETRY_DELAYS_MS = [1_000, 4_000, 9_000];

/** Counter request HTTP — dipakai test cache & monitoring kuota (50k/hari) */
let httpRequestCount = 0;
export function getGfwRequestCount() {
  return httpRequestCount;
}

function token(): string {
  const t = process.env.GFW_API_TOKEN;
  if (!t) throw new Error('GFW_API_TOKEN kosong — isi apps/api/.env');
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gfwFetch(path: string, init?: RequestInit): Promise<unknown> {
  const url = path.startsWith('http') ? path : `${GFW_BASE_URL}${path}`;

  for (let attempt = 0; ; attempt++) {
    httpRequestCount++;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    const quota = res.headers.get('x-ratelimit-remaining');
    if (quota !== null) {
      console.log(`[gfw] quota remaining: ${quota}`);
    }

    if (res.ok) {
      return res.json();
    }

    if (res.status === 401) {
      throw new Error('GFW 401 Unauthorized — GFW_API_TOKEN tidak valid atau kedaluwarsa');
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < RETRY_DELAYS_MS.length) {
      console.warn(`[gfw] HTTP ${res.status} di ${path} — retry ${attempt + 1}/${RETRY_DELAYS_MS.length}`);
      await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!);
      continue;
    }

    const body = await res.text().catch(() => '');
    throw new Error(`GFW HTTP ${res.status} di ${path}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  }
}

export type SearchVesselsParams = {
  /** Teks bebas (nama/mmsi) — opsional kalau pakai where */
  query?: string;
  /** Klausa filter v3, mis. `flag = 'IDN'` */
  where?: string;
  limit?: number;
  /** Cursor pagination dari respons sebelumnya */
  since?: string;
};

export async function searchVessels(params: SearchVesselsParams): Promise<GfwVesselSearchResponse> {
  const qs = new URLSearchParams();
  qs.set('datasets[0]', GFW_VESSEL_DATASET);
  qs.set('limit', String(params.limit ?? 25));
  if (params.query) qs.set('query', params.query);
  if (params.where) qs.set('where', params.where);
  if (params.since) qs.set('since', params.since);

  const json = await gfwFetch(`/vessels/search?${qs}`);
  return gfwVesselSearchResponseSchema.parse(json);
}

// Identitas kapal jarang berubah — LRU 500 entri, TTL 1 jam (plan 04 P1.1.3)
const identityCache = new LRUCache<string, GfwVessel>({ max: 500, ttl: 60 * 60 * 1000 });

export async function getVesselIdentity(gfwVesselId: string): Promise<GfwVessel> {
  const cached = identityCache.get(gfwVesselId);
  if (cached) return cached;

  const qs = new URLSearchParams();
  qs.set('dataset', GFW_VESSEL_DATASET);
  const json = await gfwFetch(`/vessels/${encodeURIComponent(gfwVesselId)}?${qs}`);
  const vessel = gfwVesselSchema.parse(json);
  identityCache.set(gfwVesselId, vessel);
  return vessel;
}

export type GetEventsParams = {
  types: GfwEventType[];
  /** ISO date (YYYY-MM-DD) */
  startDate: string;
  endDate?: string;
  /** GFW vessel ids — opsional */
  vesselIds?: string[];
  /** [west, south, east, north] — difilter via geometry polygon */
  bbox?: [number, number, number, number];
  limit?: number;
  offset?: number;
};

export async function getEvents(params: GetEventsParams): Promise<GfwEvent[]> {
  const qs = new URLSearchParams();
  qs.set('limit', String(params.limit ?? 100));
  qs.set('offset', String(params.offset ?? 0));

  const body: Record<string, unknown> = {
    datasets: params.types.map((t) => GFW_EVENT_DATASETS[t]),
    startDate: params.startDate,
    endDate: params.endDate ?? new Date().toISOString().slice(0, 10),
  };
  if (params.vesselIds?.length) body.vessels = params.vesselIds;
  if (params.bbox) {
    const [w, s, e, n] = params.bbox;
    body.geometry = {
      type: 'Polygon',
      coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    };
  }

  const json = await gfwFetch(`/events?${qs}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return gfwEventsResponseSchema.parse(json).entries;
}

/**
 * Posisi kapal diturunkan dari event (start & end point).
 * API publik GFW v3 tidak mengekspos track AIS mentah — derivasi event
 * adalah jalur yang disepakati plan 04 P2.1.1 ("fetch/derive posisi").
 */
export async function getVesselPositions(params: {
  vesselId: string;
  startDate: string;
  endDate?: string;
  types?: GfwEventType[];
}): Promise<GfwDerivedPosition[]> {
  const events = await getEvents({
    types: params.types ?? ['fishing', 'loitering', 'encounter', 'port_visit'],
    startDate: params.startDate,
    endDate: params.endDate,
    vesselIds: [params.vesselId],
    limit: 500,
  });
  return derivePositionsFromEvents(events);
}

export function derivePositionsFromEvents(events: GfwEvent[]): GfwDerivedPosition[] {
  const positions: GfwDerivedPosition[] = [];
  for (const ev of events) {
    if (!ev.position) continue;
    positions.push({
      vesselGfwId: ev.vessel.id,
      timestamp: ev.start,
      lat: ev.position.lat,
      lng: ev.position.lon,
      sourceEventId: ev.id,
      sourceEventType: ev.type,
    });
    if (ev.end && ev.end !== ev.start) {
      positions.push({
        vesselGfwId: ev.vessel.id,
        timestamp: ev.end,
        lat: ev.position.lat,
        lng: ev.position.lon,
        sourceEventId: ev.id,
        sourceEventType: ev.type,
      });
    }
  }
  return positions;
}
