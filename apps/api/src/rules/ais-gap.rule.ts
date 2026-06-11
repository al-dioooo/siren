// Rule 2 — AIS gap (plan 05 P1.1.2).
// Window function LAG() per vessel; gap > AIS_GAP_HOURS dianggap mencurigakan.
import { RULE_THRESHOLDS, type AlertCandidate } from '@siren/shared';
import { prisma } from '../lib/prisma';

type Row = {
  vesselId: string;
  lastSeenAt: Date;
  resumeAt: Date;
  gapHours: number;
  lat: number;
  lng: number;
};

export async function runAisGapRule(windowStart: Date): Promise<AlertCandidate[]> {
  // Lookback ekstra sebesar 2× threshold supaya LAG menjangkau posisi sebelum window
  const lookback = new Date(
    windowStart.getTime() - 2 * RULE_THRESHOLDS.AIS_GAP_HOURS * 3_600_000,
  );

  const rows = await prisma.$queryRaw<Row[]>`
    WITH ordered AS (
      SELECT vessel_id, "timestamp", lat, lng,
             LAG("timestamp") OVER (PARTITION BY vessel_id ORDER BY "timestamp") AS prev_ts
      FROM "VesselPosition"
      WHERE "timestamp" >= ${lookback}
    )
    SELECT DISTINCT ON (vessel_id)
      vessel_id AS "vesselId",
      prev_ts AS "lastSeenAt",
      "timestamp" AS "resumeAt",
      EXTRACT(EPOCH FROM ("timestamp" - prev_ts)) / 3600 AS "gapHours",
      lat, lng
    FROM ordered
    WHERE prev_ts IS NOT NULL
      AND "timestamp" >= ${windowStart}
      AND "timestamp" - prev_ts > make_interval(hours => ${RULE_THRESHOLDS.AIS_GAP_HOURS})
    ORDER BY vessel_id, "timestamp" DESC
  `;

  return rows.map((r) => ({
    vesselId: r.vesselId,
    ruleType: 'ais_gap' as const,
    // Gap ≥ 2× threshold (mis. ≥8 jam) = indikasi kuat sengaja mematikan AIS
    severity:
      Number(r.gapHours) >= RULE_THRESHOLDS.AIS_GAP_HOURS * 2
        ? ('critical' as const)
        : ('high' as const),
    lat: r.lat,
    lng: r.lng,
    evidenceJson: {
      lastSeenAt: r.lastSeenAt.toISOString(),
      resumeAt: r.resumeAt.toISOString(),
      gapHours: Math.round(Number(r.gapHours) * 10) / 10,
      thresholdHours: RULE_THRESHOLDS.AIS_GAP_HOURS,
      resumePosition: { lat: r.lat, lng: r.lng },
    },
  }));
}
