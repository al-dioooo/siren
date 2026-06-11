import { Hono } from 'hono';
import {
  ACTIVE_ALERT_STATUSES,
  MAP_DEFAULT_TIME_RANGE,
  MAP_TIME_RANGE_HOURS,
  SEVERITIES,
  type MapTimeRange,
  type Severity,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import type { AppEnv } from '../types';

export const mapRoutes = new Hono<AppEnv>();

function parseSince(raw: string | undefined): Date {
  const range = (raw && raw in MAP_TIME_RANGE_HOURS ? raw : MAP_DEFAULT_TIME_RANGE) as MapTimeRange;
  return new Date(Date.now() - MAP_TIME_RANGE_HOURS[range] * 3_600_000);
}

/** Rank severity: index lebih kecil = lebih parah (SEVERITIES sudah terurut) */
function worstSeverity(a: Severity | null, b: Severity): Severity {
  if (!a) return b;
  return SEVERITIES.indexOf(b) < SEVERITIES.indexOf(a) ? b : a;
}

type LastPositionRow = {
  vesselId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  sog: number | null;
  mmsi: string;
  name: string | null;
  flag: string | null;
  vesselType: string | null;
};

/**
 * Posisi terakhir per vessel sebagai GeoJSON FeatureCollection (plan 03 P3.1.1).
 * scope=mine → properti severity hanya memperhitungkan alert agency user;
 * marker kapal tetap tampil semua (feed-lah yang di-scope penuh, Blok C).
 */
mapRoutes.get('/api/v1/map/vessels', requireAuth, async (c) => {
  const since = parseSince(c.req.query('since'));
  const scope = c.req.query('scope') === 'mine' ? 'mine' : 'all';
  const agencyId = c.get('agencyId');

  const rows = await prisma.$queryRaw<LastPositionRow[]>`
    SELECT DISTINCT ON (vp.vessel_id)
      vp.vessel_id AS "vesselId", vp.lat, vp.lng, vp."timestamp", vp.sog,
      v.mmsi, v.name, v.flag, v.vessel_type AS "vesselType"
    FROM "VesselPosition" vp
    JOIN "Vessel" v ON v.id = vp.vessel_id
    WHERE vp."timestamp" >= ${since}
    ORDER BY vp.vessel_id, vp."timestamp" DESC
  `;

  // Severity alert aktif tertinggi per vessel (scoped bila perlu)
  const alerts = await prisma.alert.findMany({
    where: {
      status: { in: [...ACTIVE_ALERT_STATUSES] },
      vesselId: { in: rows.map((r) => r.vesselId) },
      ...(scope === 'mine' && agencyId ? { assignedAgencyId: agencyId } : {}),
    },
    select: { vesselId: true, severity: true },
  });
  const severityByVessel = new Map<string, Severity>();
  for (const a of alerts) {
    severityByVessel.set(
      a.vesselId,
      worstSeverity(severityByVessel.get(a.vesselId) ?? null, a.severity as Severity),
    );
  }

  return c.json({
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        vesselId: r.vesselId,
        mmsi: r.mmsi,
        name: r.name,
        flag: r.flag,
        vesselType: r.vesselType,
        sog: r.sog,
        timestamp: r.timestamp.toISOString(),
        severity: severityByVessel.get(r.vesselId) ?? null,
      },
    })),
  });
});

/** Track posisi historis satu vessel, urut waktu (plan 03 P3.1.4) */
mapRoutes.get('/api/v1/vessels/:id/track', requireAuth, async (c) => {
  const vesselId = c.req.param('id');
  const since = parseSince(c.req.query('since'));

  const positions = await prisma.vesselPosition.findMany({
    where: { vesselId, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
    select: { lat: true, lng: true, timestamp: true, sog: true },
  });

  return c.json({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: positions.map((p) => [p.lng, p.lat]),
    },
    properties: {
      vesselId,
      pointCount: positions.length,
      from: positions[0]?.timestamp.toISOString() ?? null,
      to: positions[positions.length - 1]?.timestamp.toISOString() ?? null,
    },
  });
});
