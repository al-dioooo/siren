// Demo seeder — jaring pengaman demo (plan 04 Module 2.2).
// Sintetis tapi realistis: track kapal 8–12 knot, alert per rule, case, dan
// 3 skenario demo khusus. SEMUA row sintetis ber-id prefix `seed_` dan posisi
// ber-source 'seed' — data GFW asli TIDAK PERNAH disentuh.
//
// Pakai:
//   pnpm --filter api exec tsx scripts/seed-demo.ts            # upsert (idempotent)
//   pnpm --filter api exec tsx scripts/seed-demo.ts --reset    # hapus seed lama dulu
import '../src/lib/env';
import { parseArgs } from 'node:util';
import {
  RULE_THRESHOLDS,
  RULE_TYPES,
  SEVERITIES,
  type RuleType,
  type Severity,
} from '@siren/shared';
import { prisma } from '../src/lib/prisma';

const { values: args } = parseArgs({
  options: { reset: { type: 'boolean', default: false } },
});

// ── Konstanta seeder (sesuai plan 04 P2.2.1) ──
const VESSEL_COUNT = 25;
const POSITIONS_PER_VESSEL = 40; // 25 × 40 = 1000 posisi
const ALERT_COUNT = 200;
const CASE_COUNT = 50;
const TRACK_WINDOW_HOURS = 24;
const SOG_MIN_KN = 8;
const SOG_MAX_KN = 12;
/** 1 knot ≈ 1.852 km/jam; 1 derajat ≈ 111 km */
const KNOT_TO_DEG_PER_HOUR = 1.852 / 111;

// Titik laut aman di dalam WPP riil (lng, lat, zona) — bukan daratan
const SEA_POINTS: Array<{ lng: number; lat: number; zone: string }> = [
  { lng: 107.5, lat: 4.5, zone: 'WPP-711' }, // Laut Natuna
  { lng: 109.0, lat: 2.0, zone: 'WPP-711' },
  { lng: 111.0, lat: -5.0, zone: 'WPP-712' }, // Laut Jawa
  { lng: 113.5, lat: -5.5, zone: 'WPP-712' },
  { lng: 117.8, lat: -3.0, zone: 'WPP-713' }, // Selat Makassar
  { lng: 118.5, lat: -6.5, zone: 'WPP-713' }, // Laut Flores
  { lng: 124.0, lat: -5.5, zone: 'WPP-714' }, // Laut Banda
  { lng: 126.0, lat: 0.5, zone: 'WPP-715' }, // Laut Maluku
  { lng: 135.0, lat: -5.0, zone: 'WPP-718' }, // Laut Arafura
  { lng: 97.0, lat: 4.0, zone: 'WPP-571' }, // Selat Malaka
];

// RNG deterministik (mulberry32) — hasil seeder stabil antar-run
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260611);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;

// Jangkar waktu: awal jam berjalan — run ulang dalam jam yang sama identik
const anchor = new Date();
anchor.setMinutes(0, 0, 0);
const anchorMs = anchor.getTime();

async function resetSeedData() {
  // Urutan FK: case children → case → alert → event → posisi → vessel
  await prisma.$executeRaw`DELETE FROM "CaseUpdate" WHERE case_id LIKE 'seed_%'`;
  await prisma.$executeRaw`DELETE FROM "CaseAttachment" WHERE case_id LIKE 'seed_%'`;
  await prisma.$executeRaw`DELETE FROM "Case" WHERE id LIKE 'seed_%'`;
  await prisma.$executeRaw`DELETE FROM "Alert" WHERE id LIKE 'seed_%'`;
  await prisma.$executeRaw`DELETE FROM "VesselEvent" WHERE id LIKE 'seed_%'`;
  await prisma.$executeRaw`DELETE FROM "VesselPosition" WHERE source = 'seed'`;
  await prisma.$executeRaw`DELETE FROM "Vessel" WHERE id LIKE 'seed_%'`;
  console.log('[seed-demo] reset: semua row seed_% dihapus (source gfw tidak disentuh)');
}

if (args.reset) {
  await resetSeedData();
}

// ─────────────────────────────── 1. Vessels ─────────────────────────────────
const FLAGS = ['IDN', 'IDN', 'IDN', 'IDN', 'VNM', 'THA', 'CHN', 'PHL', 'MYS'];
const NAME_PREFIX = ['KM', 'FV', 'MV', 'KMN'];
const NAME_BODY = ['Sinar', 'Bahari', 'Samudra', 'Mutiara', 'Cahaya', 'Bintang', 'Laut', 'Nusantara', 'Sejahtera', 'Makmur'];

type SeedVessel = { id: string; mmsi: string; name: string; flag: string; type: string };
const seedVessels: SeedVessel[] = [];
for (let i = 0; i < VESSEL_COUNT; i++) {
  seedVessels.push({
    id: `seed_vsl_${i}`,
    mmsi: String(990000000 + i),
    name: `${pick(NAME_PREFIX)} ${pick(NAME_BODY)} ${i + 1}`,
    flag: pick(FLAGS),
    type: rand() < 0.7 ? 'fishing' : pick(['cargo', 'tanker', 'passenger']),
  });
}
// Skenario khusus (plan 04 P2.2.1): kapal asing di ZEE, AIS gap 6 jam, loitering MPA
const FOREIGN_IN_EEZ = { id: 'seed_vsl_foreign_eez', mmsi: '991000001', name: 'LIAO DONG YU 501', flag: 'CHN', type: 'fishing' };
const AIS_GAP_VESSEL = { id: 'seed_vsl_ais_gap', mmsi: '991000002', name: 'FV SHADOW RUNNER', flag: 'VNM', type: 'fishing' };
const MPA_LOITERER = { id: 'seed_vsl_mpa_loiter', mmsi: '991000003', name: 'KM PENYUSUP RAJA AMPAT', flag: 'IDN', type: 'fishing' };
seedVessels.push(FOREIGN_IN_EEZ, AIS_GAP_VESSEL, MPA_LOITERER);

for (const v of seedVessels) {
  await prisma.vessel.upsert({
    where: { mmsi: v.mmsi },
    create: { id: v.id, mmsi: v.mmsi, name: v.name, flag: v.flag, vesselType: v.type },
    update: { name: v.name, flag: v.flag, vesselType: v.type },
  });
}
console.log(`[seed-demo] vessels: ${seedVessels.length}`);

// ──────────────── 2. Posisi membentuk track masuk akal ──────────────────────
// Random walk per kapal: SOG 8–12 kn, heading berubah pelan, interval rata
const stepHours = TRACK_WINDOW_HOURS / POSITIONS_PER_VESSEL;
let positionCount = 0;

/** Jarak maksimum kapal dari fishing ground-nya (derajat ≈ ×111 km) */
const PATROL_RADIUS_DEG = 0.15;

async function insertTrack(vesselId: string, start: { lng: number; lat: number }, opts?: { gapFromHour?: number; gapHours?: number; freeze?: boolean }) {
  let { lng, lat } = start;
  let heading = rand() * 2 * Math.PI;
  for (let i = 0; i < POSITIONS_PER_VESSEL; i++) {
    const hoursAgo = TRACK_WINDOW_HOURS - i * stepHours;
    // AIS gap: lompati window gap (tidak ada transmisi)
    if (opts?.gapFromHour !== undefined && opts.gapHours !== undefined) {
      if (hoursAgo <= opts.gapFromHour && hoursAgo > opts.gapFromHour - opts.gapHours) continue;
    }
    const sog = opts?.freeze ? 0.5 : SOG_MIN_KN + rand() * (SOG_MAX_KN - SOG_MIN_KN);
    if (!opts?.freeze) {
      heading += (rand() - 0.5) * 0.6; // belok pelan ±17°
      // Mean-reverting: kapal beroperasi di sekitar fishing ground-nya,
      // tidak hanyut ratusan km — supaya cluster LOD terbentuk realistis
      const distFromStart = Math.hypot(lng - start.lng, lat - start.lat);
      if (distFromStart > PATROL_RADIUS_DEG) {
        heading = Math.atan2(start.lat - lat, start.lng - lng) + (rand() - 0.5) * 0.5;
      }
      const dist = sog * stepHours * KNOT_TO_DEG_PER_HOUR;
      lng += Math.cos(heading) * dist;
      lat += Math.sin(heading) * dist;
    } else {
      lng += (rand() - 0.5) * 0.002; // drift loitering
      lat += (rand() - 0.5) * 0.002;
    }
    const ts = new Date(anchorMs - hoursAgo * 3_600_000);
    await prisma.$executeRaw`
      INSERT INTO "VesselPosition" (id, vessel_id, "timestamp", lat, lng, position_geom, sog, cog, source)
      VALUES (
        ${`seed_pos_${vesselId}_${i}`}, ${vesselId}, ${ts}, ${lat}, ${lng},
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326),
        ${Math.round(sog * 10) / 10}, ${Math.round(((heading * 180) / Math.PI + 360) % 360)}, 'seed'
      )
      ON CONFLICT (id) DO UPDATE SET
        "timestamp" = EXCLUDED."timestamp", lat = EXCLUDED.lat, lng = EXCLUDED.lng,
        position_geom = EXCLUDED.position_geom, sog = EXCLUDED.sog, cog = EXCLUDED.cog
    `;
    positionCount++;
  }
}

for (let i = 0; i < VESSEL_COUNT; i++) {
  const startPoint = SEA_POINTS[i % SEA_POINTS.length]!;
  await insertTrack(`seed_vsl_${i}`, {
    lng: startPoint.lng + (rand() - 0.5) * 0.25,
    lat: startPoint.lat + (rand() - 0.5) * 0.25,
  });
}
// Skenario: kapal asing patroli ZEE Natuna; AIS gap 6 jam; loitering diam di MPA Raja Ampat
await insertTrack(FOREIGN_IN_EEZ.id, { lng: 108.8, lat: 5.2 });
await insertTrack(AIS_GAP_VESSEL.id, { lng: 106.5, lat: 3.8 }, { gapFromHour: 14, gapHours: 6 });
await insertTrack(MPA_LOITERER.id, { lng: 130.45, lat: -0.55 }, { freeze: true });
console.log(`[seed-demo] positions: ${positionCount}`);

// ──────────────── 3. VesselEvent skenario (gap & loitering) ─────────────────
const gapStart = new Date(anchorMs - 14 * 3_600_000);
const gapEnd = new Date(anchorMs - 8 * 3_600_000);
await prisma.$executeRaw`
  INSERT INTO "VesselEvent" (id, gfw_event_id, vessel_id, event_type, start_at, end_at, lat, lng, event_geom, payload_json)
  VALUES (
    'seed_evt_gap_6h', 'seed_evt_gap_6h', ${AIS_GAP_VESSEL.id}, 'gap',
    ${gapStart}, ${gapEnd}, 3.8, 106.5,
    ST_SetSRID(ST_MakePoint(106.5, 3.8), 4326),
    ${JSON.stringify({ gapHours: 6, source: 'seed', note: 'AIS dimatikan 6 jam — skenario demo' })}::jsonb
  )
  ON CONFLICT (gfw_event_id) DO UPDATE SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at
`;
const loiterStart = new Date(anchorMs - 5 * 3_600_000);
const loiterEnd = new Date(anchorMs - 1 * 3_600_000);
await prisma.$executeRaw`
  INSERT INTO "VesselEvent" (id, gfw_event_id, vessel_id, event_type, start_at, end_at, lat, lng, event_geom, payload_json)
  VALUES (
    'seed_evt_loiter_mpa', 'seed_evt_loiter_mpa', ${MPA_LOITERER.id}, 'loitering',
    ${loiterStart}, ${loiterEnd}, -0.55, 130.45,
    ST_SetSRID(ST_MakePoint(130.45, -0.55), 4326),
    ${JSON.stringify({ durationHours: 4, avgSogKnots: 0.4, source: 'seed', note: 'Loitering dalam MPA Raja Ampat — skenario demo' })}::jsonb
  )
  ON CONFLICT (gfw_event_id) DO UPDATE SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at
`;
console.log('[seed-demo] events skenario: 2 (gap 6h, loitering MPA)');

// ─────────────────────────────── 4. Alerts ──────────────────────────────────
const agencies = await prisma.agency.findMany({ select: { id: true, code: true } });
const agencyByCode = new Map(agencies.map((a) => [a.code, a.id]));
const bakamlaId = agencyByCode.get('BAKAMLA');
const psdkpId = agencyByCode.get('PSDKP');
if (!bakamlaId || !psdkpId) throw new Error('Agency BAKAMLA/PSDKP belum di-seed — jalankan pnpm --filter api db:seed dulu');

const SEVERITY_BY_RULE: Record<RuleType, readonly Severity[]> = {
  zone_violation: ['critical', 'high'],
  ais_gap: ['high', 'critical'],
  loitering_mpa: ['high', 'medium'],
  suspicious_encounter: ['medium', 'high'],
  behavior_mismatch: ['medium', 'low'],
};
const ALERT_STATUS_POOL = ['new', 'new', 'new', 'dispatched', 'in_progress', 'resolved', 'false_positive'] as const;

function evidenceFor(rule: RuleType, zone: string): object {
  switch (rule) {
    case 'zone_violation':
      return { zone, vesselFlag: pick(['CHN', 'VNM', 'THA']), insideEez: true, distanceToBoundaryNm: Math.round(rand() * 40 * 10) / 10 };
    case 'ais_gap':
      return { gapHours: RULE_THRESHOLDS.AIS_GAP_HOURS + Math.round(rand() * 8), lastSeenZone: zone };
    case 'loitering_mpa':
      return { mpaName: 'Kawasan Konservasi', durationMinutes: RULE_THRESHOLDS.LOITERING_MIN_MINUTES + Math.round(rand() * 240), avgSogKnots: Math.round(rand() * RULE_THRESHOLDS.LOITERING_MAX_SOG_KNOTS * 10) / 10 };
    case 'suspicious_encounter':
      return { partnerMmsi: String(990100000 + Math.floor(rand() * 100)), distanceM: Math.round(rand() * RULE_THRESHOLDS.ENCOUNTER_MAX_DISTANCE_M), durationHours: RULE_THRESHOLDS.ENCOUNTER_MIN_HOURS + Math.round(rand() * 6 * 10) / 10 };
    case 'behavior_mismatch':
      return { declaredType: 'cargo', observedSogKnots: RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN + Math.round(rand() * 2 * 10) / 10, pattern: 'fishing-like' };
  }
}

let alertCount = 0;
for (let i = 0; i < ALERT_COUNT; i++) {
  // 3 alert pertama = skenario demo khusus, sisanya variasi acak
  let rule: RuleType;
  let vesselId: string;
  let point: { lng: number; lat: number; zone: string };
  let severity: Severity;
  let assignedAgencyId: string;

  if (i === 0) {
    rule = 'zone_violation';
    vesselId = FOREIGN_IN_EEZ.id;
    point = { lng: 108.8, lat: 5.2, zone: 'WPP-711' };
    severity = 'critical';
    assignedAgencyId = bakamlaId; // asing → BAKAMLA (jurisdiction rule)
  } else if (i === 1) {
    rule = 'ais_gap';
    vesselId = AIS_GAP_VESSEL.id;
    point = { lng: 106.5, lat: 3.8, zone: 'WPP-711' };
    severity = 'high';
    assignedAgencyId = bakamlaId;
  } else if (i === 2) {
    rule = 'loitering_mpa';
    vesselId = MPA_LOITERER.id;
    point = { lng: 130.45, lat: -0.55, zone: 'WPP-715' };
    severity = 'high';
    assignedAgencyId = psdkpId; // lokal → PSDKP
  } else {
    rule = pick(RULE_TYPES);
    vesselId = `seed_vsl_${Math.floor(rand() * VESSEL_COUNT)}`;
    const sp = pick(SEA_POINTS);
    point = { lng: sp.lng + (rand() - 0.5) * 1.2, lat: sp.lat + (rand() - 0.5) * 1.2, zone: sp.zone };
    severity = pick(SEVERITY_BY_RULE[rule]);
    assignedAgencyId = rule === 'zone_violation' ? bakamlaId : pick(agencies).id;
  }

  const status = i < 3 ? 'new' : pick(ALERT_STATUS_POOL);
  const createdAt = new Date(anchorMs - rand() * TRACK_WINDOW_HOURS * 3_600_000);
  const evidence = i === 1 ? { gapHours: 6, lastSeenZone: 'WPP-711', note: 'skenario demo' } : evidenceFor(rule, point.zone);

  await prisma.$executeRaw`
    INSERT INTO "Alert" (id, vessel_id, rule_type, severity, status, assigned_agency_id, lat, lng, position_geom, evidence_json, created_at)
    VALUES (
      ${`seed_alert_${i}`}, ${vesselId}, ${rule}, ${severity}, ${status}, ${assignedAgencyId},
      ${point.lat}, ${point.lng},
      ST_SetSRID(ST_MakePoint(${point.lng}::float8, ${point.lat}::float8), 4326),
      ${JSON.stringify(evidence)}::jsonb, ${createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      severity = EXCLUDED.severity, status = EXCLUDED.status, created_at = EXCLUDED.created_at,
      evidence_json = EXCLUDED.evidence_json
  `;
  alertCount++;
}
console.log(`[seed-demo] alerts: ${alertCount}`);

// ─────────────────────────────── 5. Cases ───────────────────────────────────
const opener = await prisma.user.findUnique({ where: { email: 'admin@siren.id' }, select: { id: true } });
if (!opener) throw new Error('User admin@siren.id belum ada — jalankan db:seed dulu');

const CASE_STATUS_POOL = ['opened', 'opened', 'in_progress', 'in_progress', 'resolved', 'closed'] as const;
const seedAlerts = await prisma.alert.findMany({
  where: { id: { startsWith: 'seed_alert_' } },
  orderBy: { id: 'asc' },
  take: CASE_COUNT,
  select: { id: true, vesselId: true, assignedAgencyId: true },
});

let caseCount = 0;
for (let i = 0; i < seedAlerts.length; i++) {
  const alert = seedAlerts[i]!;
  await prisma.case.upsert({
    where: { caseCode: `CASE-SEED${String(i).padStart(3, '0')}` },
    create: {
      id: `seed_case_${i}`,
      caseCode: `CASE-SEED${String(i).padStart(3, '0')}`,
      alertId: alert.id,
      vesselId: alert.vesselId,
      assignedAgencyId: alert.assignedAgencyId ?? psdkpId,
      status: pick(CASE_STATUS_POOL),
      openedById: opener.id,
    },
    update: { status: pick(CASE_STATUS_POOL) },
  });
  caseCount++;
}
console.log(`[seed-demo] cases: ${caseCount}`);

// ─────────────────────────────── Verifikasi ─────────────────────────────────
const [counts] = await prisma.$queryRaw<Array<Record<string, bigint>>>`
  SELECT
    (SELECT count(*) FROM "Vessel" WHERE id LIKE 'seed_%') AS vessels,
    (SELECT count(*) FROM "VesselPosition" WHERE source = 'seed') AS positions,
    (SELECT count(*) FROM "Alert" WHERE id LIKE 'seed_%') AS alerts,
    (SELECT count(*) FROM "Case" WHERE id LIKE 'seed_%') AS cases,
    (SELECT count(*) FROM "VesselPosition" WHERE source = 'gfw') AS gfw_positions_untouched
`;
console.log('[seed-demo] verifikasi DB:', Object.fromEntries(Object.entries(counts!).map(([k, v]) => [k, Number(v)])));
console.log('[seed-demo] selesai ✓');
await prisma.$disconnect();
