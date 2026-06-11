// Deteksi AIS gap via LAG() per vessel — SATU-SATUNYA sumber logika gap
// (plan 05 P1.1.2 rule + plan 08 P1.2.1 dark vessels; JANGAN duplikat).
import { RULE_THRESHOLDS } from '@siren/shared';
import { prisma } from '../lib/prisma';

export type AisGapRow = {
  vesselId: string;
  lastSeenAt: Date;
  resumeAt: Date;
  gapHours: number;
  /** Posisi saat sinyal kembali */
  lat: number;
  lng: number;
  /** Posisi terakhir sebelum gelap (last known position) */
  lastLat: number;
  lastLng: number;
};

/** Gap AIS > threshold dengan resume di dalam window; satu baris per vessel (gap terbaru). */
export async function findAisGaps(windowStart: Date): Promise<AisGapRow[]> {
  // Lookback ekstra sebesar 2× threshold supaya LAG menjangkau posisi sebelum window
  const lookback = new Date(
    windowStart.getTime() - 2 * RULE_THRESHOLDS.AIS_GAP_HOURS * 3_600_000,
  );

  return prisma.$queryRaw<AisGapRow[]>`
    WITH ordered AS (
      SELECT vessel_id, "timestamp", lat, lng,
             LAG("timestamp") OVER (PARTITION BY vessel_id ORDER BY "timestamp") AS prev_ts,
             LAG(lat) OVER (PARTITION BY vessel_id ORDER BY "timestamp") AS prev_lat,
             LAG(lng) OVER (PARTITION BY vessel_id ORDER BY "timestamp") AS prev_lng
      FROM "VesselPosition"
      WHERE "timestamp" >= ${lookback}
    )
    SELECT DISTINCT ON (vessel_id)
      vessel_id AS "vesselId",
      prev_ts AS "lastSeenAt",
      "timestamp" AS "resumeAt",
      EXTRACT(EPOCH FROM ("timestamp" - prev_ts)) / 3600 AS "gapHours",
      lat, lng,
      prev_lat AS "lastLat",
      prev_lng AS "lastLng"
    FROM ordered
    WHERE prev_ts IS NOT NULL
      AND "timestamp" >= ${windowStart}
      AND "timestamp" - prev_ts > make_interval(hours => ${RULE_THRESHOLDS.AIS_GAP_HOURS})
    ORDER BY vessel_id, "timestamp" DESC
  `;
}
