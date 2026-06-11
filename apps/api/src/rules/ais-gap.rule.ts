// Rule 2 — AIS gap (plan 05 P1.1.2).
// Logika gap di services/ais-gap.service.ts (dipakai juga dark vessels, plan 08).
import { RULE_THRESHOLDS, type AlertCandidate } from '@siren/shared';
import { findAisGaps } from '../services/ais-gap.service';

export async function runAisGapRule(windowStart: Date): Promise<AlertCandidate[]> {
  const rows = await findAisGaps(windowStart);

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
