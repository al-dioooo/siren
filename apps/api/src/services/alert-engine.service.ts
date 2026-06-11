// Orchestrator alert engine (plan 05 Module 1.2 + integrasi routing Stage 2).
// Jalankan 5 rules atas window sejak run terakhir (EngineMeta), dedup terhadap
// alert existing (vessel+rule dalam ALERT_DEDUP_WINDOW_HOURS), routing dihitung
// SEBELUM insert, keputusan disimpan di evidence_json.routing.
import { randomUUID } from 'node:crypto';
import {
  RULE_THRESHOLDS,
  alertCandidateSchema,
  type AlertCandidate,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { runAisGapRule } from '../rules/ais-gap.rule';
import { runBehaviorMismatchRule } from '../rules/behavior-mismatch.rule';
import { runLoiteringMpaRule } from '../rules/loitering-mpa.rule';
import { runSuspiciousEncounterRule } from '../rules/suspicious-encounter.rule';
import { runZoneViolationRule } from '../rules/zone-violation.rule';
import { routeAlert } from './jurisdiction.service';

const LAST_RUN_KEY = 'alert_engine_last_run';
/** Window default kalau belum pernah run (jam) */
const DEFAULT_WINDOW_HOURS = 24;

const RULES: Array<(windowStart: Date) => Promise<AlertCandidate[]>> = [
  runZoneViolationRule,
  runAisGapRule,
  runLoiteringMpaRule,
  runSuspiciousEncounterRule,
  runBehaviorMismatchRule,
];

export type EngineResult = {
  windowStart: Date;
  candidates: number;
  created: number;
  deduped: number;
  invalid: number;
};

async function getWindowStart(): Promise<Date> {
  const meta = await prisma.engineMeta.findUnique({ where: { key: LAST_RUN_KEY } });
  if (meta) {
    const ts = new Date(meta.value);
    if (!Number.isNaN(ts.getTime())) return ts;
  }
  return new Date(Date.now() - DEFAULT_WINDOW_HOURS * 3_600_000);
}

export async function runAlertEngine(options?: { windowStart?: Date }): Promise<EngineResult> {
  const windowStart = options?.windowStart ?? (await getWindowStart());
  const runStartedAt = new Date();

  // 1. Kumpulkan kandidat dari 5 rules (paralel — query independen)
  const ruleResults = await Promise.all(RULES.map((rule) => rule(windowStart)));
  const rawCandidates = ruleResults.flat();

  // 2. Validasi kontrak + dedup intra-batch (vessel+rule)
  let invalid = 0;
  const batch = new Map<string, AlertCandidate>();
  for (const raw of rawCandidates) {
    const parsed = alertCandidateSchema.safeParse(raw);
    if (!parsed.success) {
      invalid++;
      console.warn(`[engine] kandidat tidak valid: ${parsed.error.message.slice(0, 200)}`);
      continue;
    }
    batch.set(`${parsed.data.vesselId}:${parsed.data.ruleType}`, parsed.data);
  }

  // 3. Dedup terhadap alert existing dalam window dedup
  const dedupSince = new Date(Date.now() - RULE_THRESHOLDS.ALERT_DEDUP_WINDOW_HOURS * 3_600_000);
  const existing = await prisma.alert.findMany({
    where: {
      createdAt: { gte: dedupSince },
      vesselId: { in: [...new Set([...batch.values()].map((c) => c.vesselId))] },
    },
    select: { vesselId: true, ruleType: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.vesselId}:${e.ruleType}`));

  // 4. Routing pre-insert + INSERT (flag kapal dibutuhkan untuk routing)
  const vesselFlags = new Map(
    (
      await prisma.vessel.findMany({
        where: { id: { in: [...new Set([...batch.values()].map((c) => c.vesselId))] } },
        select: { id: true, flag: true },
      })
    ).map((v) => [v.id, v.flag]),
  );

  let created = 0;
  let deduped = 0;
  for (const candidate of batch.values()) {
    const key = `${candidate.vesselId}:${candidate.ruleType}`;
    if (existingKeys.has(key)) {
      deduped++;
      continue;
    }

    const routing = await routeAlert({
      ruleType: candidate.ruleType,
      severity: candidate.severity,
      vesselFlag: vesselFlags.get(candidate.vesselId) ?? null,
    });

    const evidence = {
      ...candidate.evidenceJson,
      routing: {
        agencyCode: routing.agencyCode,
        ruleId: routing.ruleId,
        reason: routing.reason,
      },
    };

    await prisma.$executeRaw`
      INSERT INTO "Alert" (id, vessel_id, rule_type, severity, status, assigned_agency_id,
                           lat, lng, position_geom, evidence_json)
      VALUES (
        ${`alert_${randomUUID()}`}, ${candidate.vesselId}, ${candidate.ruleType},
        ${candidate.severity}, 'new', ${routing.agencyId},
        ${candidate.lat}, ${candidate.lng},
        ST_SetSRID(ST_MakePoint(${candidate.lng}::float8, ${candidate.lat}::float8), 4326),
        ${JSON.stringify(evidence)}::jsonb
      )
    `;
    created++;
  }

  // 5. Simpan watermark run
  await prisma.engineMeta.upsert({
    where: { key: LAST_RUN_KEY },
    create: { key: LAST_RUN_KEY, value: runStartedAt.toISOString() },
    update: { value: runStartedAt.toISOString() },
  });

  return { windowStart, candidates: rawCandidates.length, created, deduped, invalid };
}
