// One-shot import data GFW nyata (plan 04 Stage 2, Module 2.1 — JALUR KRITIS DEMO).
// Loop bbox 11 WPP dari DB → events GFW → upsert Vessel/VesselEvent → derive posisi.
// Idempotent: semua tulis ON CONFLICT DO NOTHING / upsert; run kedua = 0 insert baru.
//
// Pakai:
//   pnpm --filter api exec tsx scripts/import-gfw.ts --days 7
//   pnpm --filter api exec tsx scripts/import-gfw.ts --days 3 --wpp WPP-711
//   pnpm --filter api exec tsx scripts/import-gfw.ts --dry-run
import '../src/lib/env';
import { parseArgs } from 'node:util';
import { Prisma } from '@prisma/client';
import { GFW_EVENT_TYPES, type GfwEvent } from '@siren/shared';
import { prisma } from '../src/lib/prisma';
import {
  derivePositionsFromEvents,
  getEvents,
  getGfwRequestCount,
} from '../src/services/gfw.service';

const { values: args } = parseArgs({
  options: {
    days: { type: 'string', default: '7' },
    wpp: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const DAYS = Number(args.days);
const DRY_RUN = args['dry-run'] ?? false;
const ONLY_WPP = args.wpp;
/** Batas event per zona per halaman + jumlah halaman (jaga kuota & durasi) */
const PAGE_LIMIT = 300;
const MAX_PAGES_PER_ZONE = 2;

if (!Number.isFinite(DAYS) || DAYS <= 0) {
  throw new Error(`--days tidak valid: ${args.days}`);
}

const startDate = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
const endDate = new Date().toISOString().slice(0, 10);

type ZoneBbox = { zoneId: string; west: number; south: number; east: number; north: number };

const zones = await prisma.$queryRaw<ZoneBbox[]>`
  SELECT zone_id AS "zoneId",
         ST_XMin(geom::box3d) AS west,  ST_YMin(geom::box3d) AS south,
         ST_XMax(geom::box3d) AS east,  ST_YMax(geom::box3d) AS north
  FROM "WppZone"
  ORDER BY zone_id
`;

const targetZones = ONLY_WPP ? zones.filter((z) => z.zoneId === ONLY_WPP) : zones;
if (targetZones.length === 0) {
  throw new Error(`Zona tidak ditemukan: ${ONLY_WPP} (tersedia: ${zones.map((z) => z.zoneId).join(', ')})`);
}

console.log(`[import-gfw] window ${startDate} → ${endDate} (${DAYS} hari), zona: ${targetZones.length}${DRY_RUN ? ' [DRY RUN]' : ''}`);

// ───────────────────────── 1. Fetch events per zona ─────────────────────────
const eventsById = new Map<string, GfwEvent>();

for (const zone of targetZones) {
  let offset = 0;
  let fetched = 0;
  for (let page = 0; page < MAX_PAGES_PER_ZONE; page++) {
    let entries: GfwEvent[];
    try {
      entries = await getEvents({
        types: [...GFW_EVENT_TYPES],
        startDate,
        endDate,
        bbox: [zone.west, zone.south, zone.east, zone.north],
        limit: PAGE_LIMIT,
        offset,
      });
    } catch (e) {
      console.warn(`  ! ${zone.zoneId}: fetch gagal setelah retry — ${e instanceof Error ? e.message : e}`);
      break;
    }
    for (const ev of entries) eventsById.set(ev.id, ev);
    fetched += entries.length;
    if (entries.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }
  console.log(`  ${zone.zoneId}: ${fetched} event`);
}

const events = [...eventsById.values()];
console.log(`[import-gfw] total event unik: ${events.length} (HTTP requests: ${getGfwRequestCount()})`);

// ───────────────────── 2. Upsert Vessel by mmsi (ssvid) ─────────────────────
type VesselRow = { id: string; mmsi: string; name: string | null; flag: string | null; gfwVesselId: string };
const vesselsByMmsi = new Map<string, VesselRow>();
for (const ev of events) {
  const mmsi = ev.vessel.ssvid;
  if (!mmsi) continue;
  if (!vesselsByMmsi.has(mmsi)) {
    vesselsByMmsi.set(mmsi, {
      id: `vsl_${mmsi}`,
      mmsi,
      name: ev.vessel.name ?? null,
      flag: ev.vessel.flag ?? null,
      gfwVesselId: ev.vessel.id,
    });
  }
}

let vesselsUpserted = 0;
if (!DRY_RUN) {
  for (const v of vesselsByMmsi.values()) {
    await prisma.vessel.upsert({
      where: { mmsi: v.mmsi },
      create: { id: v.id, mmsi: v.mmsi, name: v.name, flag: v.flag, gfwVesselId: v.gfwVesselId },
      update: { name: v.name ?? undefined, flag: v.flag ?? undefined, gfwVesselId: v.gfwVesselId },
    });
    vesselsUpserted++;
  }
}

// Map mmsi → id Vessel di DB (vessel lama bisa punya id berbeda dari vsl_<mmsi>)
const dbVessels = DRY_RUN
  ? []
  : await prisma.vessel.findMany({
      where: { mmsi: { in: [...vesselsByMmsi.keys()] } },
      select: { id: true, mmsi: true },
    });
const vesselIdByMmsi = new Map(dbVessels.map((v) => [v.mmsi, v.id]));

// ─────────────── 3. Upsert VesselEvent by gfwEventId (dedup) ────────────────
let eventsInserted = 0;
let eventsSkipped = 0;
if (!DRY_RUN) {
  for (const ev of events) {
    const vesselId = ev.vessel.ssvid ? vesselIdByMmsi.get(ev.vessel.ssvid) : undefined;
    if (!vesselId) {
      eventsSkipped++;
      continue;
    }
    const lat = ev.position?.lat ?? null;
    const lng = ev.position?.lon ?? null;
    const inserted = await prisma.$executeRaw`
      INSERT INTO "VesselEvent" (id, gfw_event_id, vessel_id, event_type, start_at, end_at, lat, lng, event_geom, payload_json)
      VALUES (
        ${`evt_${ev.id}`}, ${ev.id}, ${vesselId}, ${ev.type},
        ${new Date(ev.start)}, ${ev.end ? new Date(ev.end) : null},
        ${lat}, ${lng},
        CASE WHEN ${lat}::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326) END,
        ${JSON.stringify(ev)}::jsonb
      )
      ON CONFLICT (gfw_event_id) DO NOTHING
    `;
    if (inserted > 0) eventsInserted++;
    else eventsSkipped++;
  }
}

// ──────── 4. Derive posisi dari event → insert (trigger isi wpp_zone) ───────
const derived = derivePositionsFromEvents(events);
let positionsInserted = 0;
let positionsSkipped = 0;
if (!DRY_RUN) {
  // vesselGfwId di posisi = ev.vessel.id; map balik via mmsi event terkait
  const mmsiByGfwId = new Map<string, string>();
  for (const ev of events) {
    if (ev.vessel.ssvid) mmsiByGfwId.set(ev.vessel.id, ev.vessel.ssvid);
  }
  for (const pos of derived) {
    const mmsi = mmsiByGfwId.get(pos.vesselGfwId);
    const vesselId = mmsi ? vesselIdByMmsi.get(mmsi) : undefined;
    if (!vesselId) {
      positionsSkipped++;
      continue;
    }
    const ts = new Date(pos.timestamp);
    const inserted = await prisma.$executeRaw`
      INSERT INTO "VesselPosition" (id, vessel_id, "timestamp", lat, lng, position_geom, source)
      VALUES (
        ${`pos_${vesselId}_${ts.getTime()}`}, ${vesselId}, ${ts},
        ${pos.lat}, ${pos.lng},
        ST_SetSRID(ST_MakePoint(${pos.lng}::float8, ${pos.lat}::float8), 4326),
        'gfw'
      )
      ON CONFLICT (vessel_id, "timestamp") DO NOTHING
    `;
    if (inserted > 0) positionsInserted++;
    else positionsSkipped++;
  }
}

// ───────────────────────────────── Ringkasan ────────────────────────────────
console.log('\n[import-gfw] ringkasan:');
console.log(`  vessels:   ${DRY_RUN ? vesselsByMmsi.size + ' (dry-run, tidak ditulis)' : `${vesselsUpserted} upserted`}`);
console.log(`  events:    ${DRY_RUN ? events.length + ' (dry-run)' : `inserted: ${eventsInserted}, skipped: ${eventsSkipped}`}`);
console.log(`  positions: ${DRY_RUN ? derived.length + ' (dry-run)' : `inserted: ${positionsInserted}, skipped: ${positionsSkipped}`}`);
console.log(`  HTTP requests GFW: ${getGfwRequestCount()} (kuota 50k/hari)`);

await prisma.$disconnect();
