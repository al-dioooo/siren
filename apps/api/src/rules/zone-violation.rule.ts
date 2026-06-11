// Rule 1 — Pelanggaran zona (plan 05 P1.1.1).
// Pakai wpp_zone_id hasil pre-compute trigger (B-tree idx_vessel_positions_wpp),
// BUKAN spatial join runtime. Kandidat: kapal asing di WPP/ZEE, atau kapal lokal
// beroperasi di luar zona lisensinya.
import type { AlertCandidate } from '@siren/shared';
import { prisma } from '../lib/prisma';

const DOMESTIC_FLAG = 'IDN';

type Row = {
  vesselId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  flag: string | null;
  licensedWppId: string | null;
  zoneId: string;
  zoneName: string;
};

export async function runZoneViolationRule(windowStart: Date): Promise<AlertCandidate[]> {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT ON (vp.vessel_id)
      vp.vessel_id AS "vesselId", vp.lat, vp.lng, vp."timestamp",
      v.flag, v.licensed_wpp_id AS "licensedWppId",
      w.zone_id AS "zoneId", w.name AS "zoneName"
    FROM "VesselPosition" vp
    JOIN "Vessel" v ON v.id = vp.vessel_id
    JOIN "WppZone" w ON w.id = vp.wpp_zone_id
    WHERE vp."timestamp" >= ${windowStart}
      AND vp.wpp_zone_id IS NOT NULL
      AND (
        (v.flag IS NOT NULL AND v.flag <> ${DOMESTIC_FLAG})
        OR (v.licensed_wpp_id IS NOT NULL AND vp.wpp_zone_id <> v.licensed_wpp_id)
      )
    ORDER BY vp.vessel_id, vp."timestamp" DESC
  `;

  return rows.map((r) => {
    const foreign = r.flag !== null && r.flag !== DOMESTIC_FLAG;
    return {
      vesselId: r.vesselId,
      ruleType: 'zone_violation' as const,
      // Kapal asing di ZEE = pelanggaran kedaulatan → naik satu tingkat
      severity: foreign ? ('critical' as const) : ('high' as const),
      lat: r.lat,
      lng: r.lng,
      evidenceJson: {
        zone: r.zoneId,
        zoneName: r.zoneName,
        vesselFlag: r.flag,
        foreign,
        licensedWpp: r.licensedWppId,
        observedAt: r.timestamp.toISOString(),
        position: { lat: r.lat, lng: r.lng },
      },
    };
  });
}
