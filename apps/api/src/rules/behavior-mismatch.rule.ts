// Rule 5 — Perilaku tidak sesuai tipe kapal (plan 05 P1.1.5).
// Kapal cargo/tanker dengan pola SOG khas fishing + belokan heading sering.
// Fishing vessel asli TIDAK ikut (filter vessel_type).
import { RULE_THRESHOLDS, type AlertCandidate } from '@siren/shared';
import { prisma } from '../lib/prisma';

/** Belokan dianggap "sering" bila ≥ segini dalam window, dengan delta COG ≥ 30° */
const MIN_TURNS = 3;
const TURN_DELTA_DEG = 30;
const MIN_SAMPLES = 4;

type Row = {
  vesselId: string;
  vesselType: string;
  samples: number;
  avgSog: number;
  turns: number;
  lat: number;
  lng: number;
};

export async function runBehaviorMismatchRule(windowStart: Date): Promise<AlertCandidate[]> {
  const rows = await prisma.$queryRaw<Row[]>`
    WITH tracked AS (
      SELECT vp.vessel_id, v.vessel_type, vp.sog, vp.lat, vp.lng,
             ABS(vp.cog - LAG(vp.cog) OVER (PARTITION BY vp.vessel_id ORDER BY vp."timestamp")) AS raw_delta
      FROM "VesselPosition" vp
      JOIN "Vessel" v ON v.id = vp.vessel_id
      WHERE vp."timestamp" >= ${windowStart}
        AND v.vessel_type IN ('cargo', 'tanker')
        AND vp.sog IS NOT NULL AND vp.cog IS NOT NULL
    )
    SELECT
      vessel_id AS "vesselId",
      max(vessel_type) AS "vesselType",
      count(*) FILTER (WHERE sog BETWEEN ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN}
                                     AND ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MAX}) AS samples,
      avg(sog) AS "avgSog",
      count(*) FILTER (
        WHERE LEAST(raw_delta, 360 - raw_delta) >= ${TURN_DELTA_DEG}
          AND sog BETWEEN ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN}
                      AND ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MAX}
      ) AS turns,
      avg(lat) AS lat,
      avg(lng) AS lng
    FROM tracked
    GROUP BY vessel_id
    HAVING count(*) FILTER (WHERE sog BETWEEN ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN}
                                          AND ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MAX})
           >= ${MIN_SAMPLES}
       AND count(*) FILTER (
             WHERE LEAST(raw_delta, 360 - raw_delta) >= ${TURN_DELTA_DEG}
               AND sog BETWEEN ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN}
                           AND ${RULE_THRESHOLDS.FISHING_PATTERN_SOG_MAX}
           ) >= ${MIN_TURNS}
  `;

  return rows.map((r) => ({
    vesselId: r.vesselId,
    ruleType: 'behavior_mismatch' as const,
    severity: 'medium' as const,
    lat: Number(r.lat),
    lng: Number(r.lng),
    evidenceJson: {
      declaredType: r.vesselType,
      observedPattern: 'fishing-like',
      samplesInFishingBand: Number(r.samples),
      sharpTurns: Number(r.turns),
      avgSogKnots: Math.round(Number(r.avgSog) * 10) / 10,
      thresholds: {
        sogMin: RULE_THRESHOLDS.FISHING_PATTERN_SOG_MIN,
        sogMax: RULE_THRESHOLDS.FISHING_PATTERN_SOG_MAX,
        minTurns: MIN_TURNS,
        turnDeltaDeg: TURN_DELTA_DEG,
      },
    },
  }));
}
