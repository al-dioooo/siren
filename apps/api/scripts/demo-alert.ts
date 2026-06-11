// Alert pemicu demo (plan 09 P3.1.2): INSERT 1 alert dramatis — kapal asing,
// critical, koordinat Natuna (viewport default) — memicu sonar ping + toast
// live via Supabase Realtime (<3 detik). Idempotent per run (id baru tiap kali).
// Pakai: pnpm --filter api exec tsx scripts/demo-alert.ts
import '../src/lib/env';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { explainAlert } from '../src/services/explanation.service';

// Laut Natuna Utara — terlihat jelas di viewport default (118, -2.3, z4.4)
const DEMO_POSITION = { lat: 4.85, lng: 109.2 };
const DEMO_VESSEL = {
  mmsi: '412999999',
  name: 'LU RONG YUAN YU 588',
  flag: 'CHN',
  vesselType: 'fishing',
};

// Vessel demo idempotent
const vessel = await prisma.vessel.upsert({
  where: { mmsi: DEMO_VESSEL.mmsi },
  create: { id: `vsl_demo_${DEMO_VESSEL.mmsi}`, ...DEMO_VESSEL },
  update: {},
});

// Track intrusi 6 jam terakhir (lintasan masuk ZEE dari utara) — mini-map detail
// menampilkan garis violet, bukan "0 titik". Idempotent via unique (vesselId,timestamp).
const TRACK_STEPS = 12;
for (let i = 0; i < TRACK_STEPS; i++) {
  const t = new Date(Date.now() - (TRACK_STEPS - i) * 30 * 60_000);
  const lat = DEMO_POSITION.lat + (TRACK_STEPS - i) * 0.045;
  const lng = DEMO_POSITION.lng - (TRACK_STEPS - i) * 0.02 + Math.sin(i / 2) * 0.012;
  await prisma.$executeRaw`
    INSERT INTO "VesselPosition" (id, vessel_id, "timestamp", lat, lng, position_geom, sog, cog, source)
    VALUES (
      ${`vpos_demo_${vessel.id}_${i}_${t.getTime()}`}, ${vessel.id}, ${t},
      ${lat}, ${lng},
      ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326),
      ${3.2 + Math.random()}, ${185 + Math.sin(i) * 12}, 'seed'
    )
    ON CONFLICT (vessel_id, "timestamp") DO NOTHING
  `;
}
console.log(`[demo-alert] track ${TRACK_STEPS} titik ditulis (lintasan intrusi 6 jam)`);

const bakamla = await prisma.agency.findUnique({ where: { code: 'BAKAMLA' } });
if (!bakamla) throw new Error('Agency BAKAMLA tidak ditemukan — seed dasar belum jalan?');

const alertId = `alert_demo_${randomUUID()}`;
const evidence = {
  wppZone: 'WPP-711',
  intrusionKm: 38.4,
  avgSog: 3.6,
  headingChangeCount: 14,
  note: 'Kapal asing menangkap ikan tanpa izin di ZEE Indonesia (Laut Natuna Utara)',
  routing: { agencyCode: 'BAKAMLA', ruleId: null, reason: 'demo trigger — kapal asing → BAKAMLA' },
};

await prisma.$executeRaw`
  INSERT INTO "Alert" (id, vessel_id, rule_type, severity, status, assigned_agency_id,
                       lat, lng, position_geom, evidence_json)
  VALUES (
    ${alertId}, ${vessel.id}, 'zone_violation', 'critical', 'new', ${bakamla.id},
    ${DEMO_POSITION.lat}, ${DEMO_POSITION.lng},
    ST_SetSRID(ST_MakePoint(${DEMO_POSITION.lng}::float8, ${DEMO_POSITION.lat}::float8), 4326),
    ${JSON.stringify(evidence)}::jsonb
  )
`;
console.log(`[demo-alert] alert ${alertId} dibuat (${DEMO_VESSEL.name}, critical, WPP-711) — cek ping di dashboard`);

// Pre-generate explanation supaya klik detail saat demo instan
const result = await explainAlert(alertId);
console.log(`[demo-alert] explanation: ${result?.source ?? 'gagal'}`);
await prisma.$disconnect();
