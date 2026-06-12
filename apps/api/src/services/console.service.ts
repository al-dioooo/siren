// Konsol pengujian admin (testing console) — simulasi kapal, injeksi alert.
// SEMUA row sintetis ber-id prefix `seed_console_` dan posisi ber-source
// 'seed' sehingga reset seed existing membersihkannya; data GFW tidak disentuh.
import { randomUUID } from 'node:crypto';
import type { InjectAlertInput, SpawnVesselInput, StepVesselInput } from '@siren/shared';
import { prisma } from '../lib/prisma';
import { buildSeedEvidence, KNOT_TO_DEG_PER_HOUR, SEA_POINTS } from './demo-seed.service';
import { routeAlert } from './jurisdiction.service';

/** Blok MMSI konsol (993xxxxxx) — di luar blok seeder 990/991xxxxxx */
const CONSOLE_MMSI_BASE = 993000000;

export type TestVessel = {
  id: string;
  mmsi: string;
  name: string | null;
  flag: string | null;
  vesselType: string | null;
  lastPosition: { lat: number; lng: number; sog: number | null; cog: number | null; timestamp: string } | null;
};

type LastPosRow = {
  id: string;
  mmsi: string;
  name: string | null;
  flag: string | null;
  vesselType: string | null;
  lat: number | null;
  lng: number | null;
  sog: number | null;
  cog: number | null;
  timestamp: Date | null;
};

export async function listTestVessels(): Promise<TestVessel[]> {
  const rows = await prisma.$queryRaw<LastPosRow[]>`
    SELECT v.id, v.mmsi, v.name, v.flag, v.vessel_type AS "vesselType",
           vp.lat, vp.lng, vp.sog, vp.cog, vp."timestamp"
    FROM "Vessel" v
    LEFT JOIN LATERAL (
      SELECT lat, lng, sog, cog, "timestamp"
      FROM "VesselPosition"
      WHERE vessel_id = v.id
      ORDER BY "timestamp" DESC
      LIMIT 1
    ) vp ON true
    WHERE v.id LIKE 'seed_%'
    ORDER BY (v.id LIKE 'seed_console_%') DESC, v.created_at DESC NULLS LAST, v.id ASC
    LIMIT 100
  `;
  return rows.map((r) => ({
    id: r.id,
    mmsi: r.mmsi,
    name: r.name,
    flag: r.flag,
    vesselType: r.vesselType,
    lastPosition:
      r.lat !== null && r.lng !== null && r.timestamp !== null
        ? { lat: r.lat, lng: r.lng, sog: r.sog, cog: r.cog, timestamp: r.timestamp.toISOString() }
        : null,
  }));
}

async function nextConsoleMmsi(): Promise<string> {
  const [row] = await prisma.$queryRaw<Array<{ max: string | null }>>`
    SELECT max(mmsi) AS max FROM "Vessel" WHERE mmsi LIKE '993%'
  `;
  const current = row?.max ? Number(row.max) : CONSOLE_MMSI_BASE;
  return String(Math.max(current, CONSOLE_MMSI_BASE) + 1);
}

async function insertPosition(input: {
  vesselId: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  timestamp: Date;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "VesselPosition" (id, vessel_id, "timestamp", lat, lng, position_geom, sog, cog, source)
    VALUES (
      ${`seed_console_pos_${input.vesselId.slice(-12)}_${input.timestamp.getTime()}`},
      ${input.vesselId}, ${input.timestamp}, ${input.lat}, ${input.lng},
      ST_SetSRID(ST_MakePoint(${input.lng}::float8, ${input.lat}::float8), 4326),
      ${Math.round(input.sog * 10) / 10}, ${Math.round(input.cog)}, 'seed'
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function spawnTestVessel(input: SpawnVesselInput): Promise<TestVessel> {
  const id = `seed_console_vsl_${randomUUID()}`;
  const mmsi = await nextConsoleMmsi();
  const name = input.name ?? `KM UJI KONSOL ${mmsi.slice(-4)}`;
  const vessel = await prisma.vessel.create({
    data: { id, mmsi, name, flag: input.flag, vesselType: input.vesselType },
  });

  const timestamp = new Date();
  await insertPosition({ vesselId: id, lat: input.lat, lng: input.lng, sog: 0, cog: 0, timestamp });

  return {
    id: vessel.id,
    mmsi: vessel.mmsi,
    name: vessel.name,
    flag: vessel.flag,
    vesselType: vessel.vesselType,
    lastPosition: { lat: input.lat, lng: input.lng, sog: 0, cog: 0, timestamp: timestamp.toISOString() },
  };
}

export type StepResult =
  | { outcome: 'not_test_vessel' }
  | { outcome: 'not_found' }
  | { outcome: 'done'; position: { lat: number; lng: number; sog: number; cog: number; timestamp: string } };

export async function stepTestVessel(vesselId: string, input: StepVesselInput): Promise<StepResult> {
  // Hanya kapal seed yang boleh digerakkan — kapal nyata (GFW) tidak pernah disentuh
  if (!vesselId.startsWith('seed_')) return { outcome: 'not_test_vessel' };

  const last = await prisma.vesselPosition.findFirst({
    where: { vesselId },
    orderBy: { timestamp: 'desc' },
    select: { lat: true, lng: true, cog: true, timestamp: true },
  });
  if (!last) return { outcome: 'not_found' };

  let lat: number;
  let lng: number;
  let cog: number;
  if (input.lat !== undefined && input.lng !== undefined) {
    // Teleport step — posisi eksplisit
    lat = input.lat;
    lng = input.lng;
    cog = Math.round((Math.atan2(lat - last.lat, lng - last.lng) * 180) / Math.PI + 360) % 360;
  } else {
    const headingDeg = input.headingDeg ?? last.cog ?? Math.random() * 360;
    const headingRad = (headingDeg * Math.PI) / 180;
    const dist = input.sogKnots * (input.stepMinutes / 60) * KNOT_TO_DEG_PER_HOUR;
    lng = last.lng + Math.cos(headingRad) * dist;
    lat = last.lat + Math.sin(headingRad) * dist;
    cog = Math.round(headingDeg) % 360;
  }

  // Hormati @@unique([vesselId, timestamp]) — auto-play cepat tetap monotonic
  const timestamp = new Date(Math.max(Date.now(), last.timestamp.getTime() + 1_000));
  await insertPosition({ vesselId, lat, lng, sog: input.sogKnots, cog, timestamp });

  return {
    outcome: 'done',
    position: { lat, lng, sog: input.sogKnots, cog, timestamp: timestamp.toISOString() },
  };
}

export type InjectResult =
  | { outcome: 'vessel_not_found' }
  | { outcome: 'done'; id: string; agencyCode: string };

export async function injectTestAlert(input: InjectAlertInput): Promise<InjectResult> {
  const vessel = await prisma.vessel.findUnique({
    where: { id: input.vesselId },
    select: { id: true, flag: true },
  });
  if (!vessel) return { outcome: 'vessel_not_found' };

  const last = await prisma.vesselPosition.findFirst({
    where: { vesselId: input.vesselId },
    orderBy: { timestamp: 'desc' },
    select: { lat: true, lng: true },
  });
  const fallback = SEA_POINTS[0]!;
  const lat = last?.lat ?? fallback.lat;
  const lng = last?.lng ?? fallback.lng;

  // Zona evidence = titik laut terdekat (cukup untuk data uji)
  const zone = SEA_POINTS.reduce((best, p) =>
    Math.hypot(p.lng - lng, p.lat - lat) < Math.hypot(best.lng - lng, best.lat - lat) ? p : best,
  ).zone;

  // Routing dihitung seperti alert engine — assigned_agency_id wajib terisi
  // supaya filter realtime scope=mine di web tidak membuang alert ini.
  const routing = await routeAlert({
    ruleType: input.ruleType,
    severity: input.severity,
    vesselFlag: vessel.flag,
  });

  const evidence = {
    ...buildSeedEvidence(input.ruleType, zone),
    note: 'console-injected test alert',
    routing: {
      agencyCode: routing.agencyCode,
      ruleId: routing.ruleId,
      reason: routing.reason,
    },
  };

  const id = `seed_console_alert_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO "Alert" (id, vessel_id, rule_type, severity, status, assigned_agency_id,
                         lat, lng, position_geom, evidence_json)
    VALUES (
      ${id}, ${input.vesselId}, ${input.ruleType}, ${input.severity}, 'new', ${routing.agencyId},
      ${lat}, ${lng},
      ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326),
      ${JSON.stringify(evidence)}::jsonb
    )
  `;

  return { outcome: 'done', id, agencyCode: routing.agencyCode };
}
