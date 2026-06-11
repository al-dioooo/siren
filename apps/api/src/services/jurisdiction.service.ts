// Routing multi-agency (plan 05 Stage 2).
// Match pertama by priority ASC atas (ruleType, vesselFlagScope, severityMin).
// Fallback eksplisit → PSDKP + warning. 0 alert tanpa agency.
import { LRUCache } from 'lru-cache';
import { SEVERITIES, type RuleType, type Severity } from '@siren/shared';
import { prisma } from '../lib/prisma';

const DOMESTIC_FLAG = 'IDN';
const FALLBACK_AGENCY_CODE = 'PSDKP';

export type RoutingDecision = {
  agencyId: string;
  agencyCode: string;
  ruleId: string | null;
  reason: string;
};

type LoadedRule = {
  id: string;
  priority: number;
  ruleType: string | null;
  vesselFlagScope: string;
  severityMin: string | null;
  assignedAgencyId: string;
  agencyCode: string;
};

// Rules jarang berubah — cache 5 menit (plan 05 P2.1.1)
const rulesCache = new LRUCache<string, LoadedRule[]>({ max: 1, ttl: 5 * 60 * 1000 });

async function loadRules(): Promise<LoadedRule[]> {
  const cached = rulesCache.get('rules');
  if (cached) return cached;
  const rows = await prisma.jurisdictionRule.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' },
    include: { assignedAgency: { select: { code: true } } },
  });
  const rules = rows.map((r) => ({
    id: r.id,
    priority: r.priority,
    ruleType: r.ruleType,
    vesselFlagScope: r.vesselFlagScope,
    severityMin: r.severityMin,
    assignedAgencyId: r.assignedAgencyId,
    agencyCode: r.assignedAgency.code,
  }));
  rulesCache.set('rules', rules);
  return rules;
}

/** Severity index kecil = lebih parah (SEVERITIES terurut critical→low) */
function severityAtLeast(actual: Severity, min: string): boolean {
  const minIdx = SEVERITIES.indexOf(min as Severity);
  if (minIdx === -1) return true; // severityMin tidak valid → tidak membatasi
  return SEVERITIES.indexOf(actual) <= minIdx;
}

export async function routeAlert(input: {
  ruleType: RuleType;
  severity: Severity;
  vesselFlag: string | null;
}): Promise<RoutingDecision> {
  const rules = await loadRules();
  const flagScope =
    input.vesselFlag === null ? 'unknown' : input.vesselFlag === DOMESTIC_FLAG ? 'domestic' : 'foreign';

  for (const rule of rules) {
    if (rule.ruleType !== null && rule.ruleType !== input.ruleType) continue;
    if (rule.vesselFlagScope !== 'any' && rule.vesselFlagScope !== flagScope) continue;
    if (rule.severityMin !== null && !severityAtLeast(input.severity, rule.severityMin)) continue;
    return {
      agencyId: rule.assignedAgencyId,
      agencyCode: rule.agencyCode,
      ruleId: rule.id,
      reason: `match jurisdiction rule ${rule.id} (priority ${rule.priority}, scope ${rule.vesselFlagScope})`,
    };
  }

  // Fallback eksplisit — seharusnya tidak terjadi karena seed punya rule 'any'
  console.warn(
    `[jurisdiction] tidak ada rule match untuk ${input.ruleType}/${flagScope}/${input.severity} — fallback ${FALLBACK_AGENCY_CODE}`,
  );
  const fallback = await prisma.agency.findUniqueOrThrow({
    where: { code: FALLBACK_AGENCY_CODE },
    select: { id: true, code: true },
  });
  return {
    agencyId: fallback.id,
    agencyCode: fallback.code,
    ruleId: null,
    reason: `fallback ${FALLBACK_AGENCY_CODE} — tidak ada jurisdiction rule yang match`,
  };
}

/** Untuk test: kosongkan cache rules */
export function clearJurisdictionCache() {
  rulesCache.clear();
}
