// Rule 3 — Loitering di kawasan konservasi (plan 05 P1.1.3).
// ST_Within memakai GIST index MPA; loitering = SOG < threshold berkelanjutan
// melebihi durasi minimum di dalam MPA. Kapal transit cepat tidak match (SOG tinggi).
import { RULE_THRESHOLDS, type AlertCandidate } from '@siren/shared';
import { prisma } from '../lib/prisma';

type Row = {
  vesselId: string;
  mpaName: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  avgSog: number;
  lat: number;
  lng: number;
};

export async function runLoiteringMpaRule(windowStart: Date): Promise<AlertCandidate[]> {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      vp.vessel_id AS "vesselId",
      m.name AS "mpaName",
      min(vp."timestamp") AS "startAt",
      max(vp."timestamp") AS "endAt",
      EXTRACT(EPOCH FROM (max(vp."timestamp") - min(vp."timestamp"))) / 60 AS "durationMinutes",
      avg(vp.sog) AS "avgSog",
      avg(vp.lat) AS lat,
      avg(vp.lng) AS lng
    FROM "VesselPosition" vp
    JOIN "MarineProtectedArea" m ON ST_Within(vp.position_geom, m.geom)
    WHERE vp."timestamp" >= ${windowStart}
      AND vp.sog IS NOT NULL
      AND vp.sog < ${RULE_THRESHOLDS.LOITERING_MAX_SOG_KNOTS}
    GROUP BY vp.vessel_id, m.id, m.name
    HAVING EXTRACT(EPOCH FROM (max(vp."timestamp") - min(vp."timestamp"))) / 60
           > ${RULE_THRESHOLDS.LOITERING_MIN_MINUTES}
       AND count(*) >= 3
  `;

  return rows.map((r) => ({
    vesselId: r.vesselId,
    ruleType: 'loitering_mpa' as const,
    // Loitering > 3 jam di kawasan konservasi = kemungkinan besar aktivitas ekstraktif
    severity: Number(r.durationMinutes) >= 180 ? ('high' as const) : ('medium' as const),
    lat: Number(r.lat),
    lng: Number(r.lng),
    evidenceJson: {
      mpaName: r.mpaName,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      durationMinutes: Math.round(Number(r.durationMinutes)),
      avgSogKnots: Math.round(Number(r.avgSog) * 10) / 10,
      thresholds: {
        maxSogKnots: RULE_THRESHOLDS.LOITERING_MAX_SOG_KNOTS,
        minMinutes: RULE_THRESHOLDS.LOITERING_MIN_MINUTES,
      },
    },
  }));
}
