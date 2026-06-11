// Rule 4 — Pertemuan mencurigakan (plan 05 P1.1.4).
// Dua jalur: (a) event `encounter` GFW hasil import, (b) pasangan posisi
// ST_DWithin < ENCOUNTER_MAX_DISTANCE_M selama ≥ ENCOUNTER_MIN_HOURS.
// Satu kandidat per kapal; pasangan tercatat di evidence.
import { RULE_THRESHOLDS, type AlertCandidate } from '@siren/shared';
import { prisma } from '../lib/prisma';

type PairRow = {
  vesselA: string;
  vesselB: string;
  mmsiA: string;
  mmsiB: string;
  startAt: Date;
  endAt: Date;
  durationHours: number;
  lat: number;
  lng: number;
};

type EventRow = {
  vesselId: string;
  mmsi: string;
  startAt: Date;
  endAt: Date | null;
  lat: number | null;
  lng: number | null;
  payloadJson: unknown;
};

export async function runSuspiciousEncounterRule(windowStart: Date): Promise<AlertCandidate[]> {
  // Jalur (b): pasangan posisi berdampingan. Timestamp join toleransi ±10 menit
  // (data seeder sinkron; data GFW turunan event tidak selalu).
  const pairs = await prisma.$queryRaw<PairRow[]>`
    SELECT
      a.vessel_id AS "vesselA", b.vessel_id AS "vesselB",
      va.mmsi AS "mmsiA", vb.mmsi AS "mmsiB",
      min(a."timestamp") AS "startAt",
      max(a."timestamp") AS "endAt",
      EXTRACT(EPOCH FROM (max(a."timestamp") - min(a."timestamp"))) / 3600 AS "durationHours",
      avg((a.lat + b.lat) / 2) AS lat,
      avg((a.lng + b.lng) / 2) AS lng
    FROM "VesselPosition" a
    JOIN "VesselPosition" b
      ON b.vessel_id > a.vessel_id
     AND b."timestamp" BETWEEN a."timestamp" - interval '10 minutes'
                           AND a."timestamp" + interval '10 minutes'
     AND ST_DWithin(a.position_geom::geography, b.position_geom::geography,
                    ${RULE_THRESHOLDS.ENCOUNTER_MAX_DISTANCE_M})
    JOIN "Vessel" va ON va.id = a.vessel_id
    JOIN "Vessel" vb ON vb.id = b.vessel_id
    WHERE a."timestamp" >= ${windowStart}
      AND b."timestamp" >= ${windowStart}
    GROUP BY a.vessel_id, b.vessel_id, va.mmsi, vb.mmsi
    HAVING EXTRACT(EPOCH FROM (max(a."timestamp") - min(a."timestamp"))) / 3600
           >= ${RULE_THRESHOLDS.ENCOUNTER_MIN_HOURS}
  `;

  const candidates = new Map<string, AlertCandidate>();
  for (const p of pairs) {
    const evidence = {
      source: 'position_proximity',
      partnerVessels: [
        { vesselId: p.vesselA, mmsi: p.mmsiA },
        { vesselId: p.vesselB, mmsi: p.mmsiB },
      ],
      startAt: p.startAt.toISOString(),
      endAt: p.endAt.toISOString(),
      durationHours: Math.round(Number(p.durationHours) * 10) / 10,
      midpoint: { lat: Number(p.lat), lng: Number(p.lng) },
      thresholds: {
        maxDistanceM: RULE_THRESHOLDS.ENCOUNTER_MAX_DISTANCE_M,
        minHours: RULE_THRESHOLDS.ENCOUNTER_MIN_HOURS,
      },
    };
    for (const vesselId of [p.vesselA, p.vesselB]) {
      candidates.set(vesselId, {
        vesselId,
        ruleType: 'suspicious_encounter',
        severity: 'medium',
        lat: Number(p.lat),
        lng: Number(p.lng),
        evidenceJson: evidence,
      });
    }
  }

  // Jalur (a): event encounter GFW langsung (kalau hasil import tersedia)
  const events = await prisma.$queryRaw<EventRow[]>`
    SELECT DISTINCT ON (e.vessel_id)
      e.vessel_id AS "vesselId", v.mmsi, e.start_at AS "startAt", e.end_at AS "endAt",
      e.lat, e.lng, e.payload_json AS "payloadJson"
    FROM "VesselEvent" e
    JOIN "Vessel" v ON v.id = e.vessel_id
    WHERE e.event_type = 'encounter'
      AND (e.end_at >= ${windowStart} OR e.start_at >= ${windowStart})
    ORDER BY e.vessel_id, e.start_at DESC
  `;
  for (const ev of events) {
    if (candidates.has(ev.vesselId) || ev.lat === null || ev.lng === null) continue;
    candidates.set(ev.vesselId, {
      vesselId: ev.vesselId,
      ruleType: 'suspicious_encounter',
      severity: 'medium',
      lat: ev.lat,
      lng: ev.lng,
      evidenceJson: {
        source: 'gfw_event',
        mmsi: ev.mmsi,
        startAt: ev.startAt.toISOString(),
        endAt: ev.endAt?.toISOString() ?? null,
        gfwPayload: ev.payloadJson,
      },
    });
  }

  return [...candidates.values()];
}
