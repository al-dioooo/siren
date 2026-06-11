// Alert explanation — generate sekali, persist selamanya (plan 06 Module 1.2).
// Gagal LLM → template deterministik Bahasa Indonesia (TIDAK dipersist supaya
// dicoba ulang nanti). Tidak pernah regenerate alert yang sudah punya explanation.
import { LRUCache } from 'lru-cache';
import { generateText } from 'ai';
import { RULE_LABELS, type RuleType } from '@siren/shared';
import { MODEL_EXPLAIN, aiProvider, countLlmCall } from '../lib/ai';
import { prisma } from '../lib/prisma';

export type ExplanationResult = {
  explanation: string;
  generatedAt: string | null;
  source: 'llm' | 'template';
};

// LRU panas — alert yang sama sering dibuka berulang saat demo
const hotCache = new LRUCache<string, ExplanationResult>({ max: 500, ttl: 60 * 60 * 1000 });

type AlertWithContext = NonNullable<Awaited<ReturnType<typeof loadAlert>>>;

function loadAlert(alertId: string) {
  return prisma.alert.findUnique({
    where: { id: alertId },
    include: {
      vessel: { select: { name: true, mmsi: true, flag: true, vesselType: true } },
      assignedAgency: { select: { code: true } },
    },
  });
}

/** Fallback deterministik dari evidence — selalu tersedia, tanpa API call */
export function templateExplanation(alert: AlertWithContext): string {
  const vessel = alert.vessel.name ?? `MMSI ${alert.vessel.mmsi}`;
  const flag = alert.vessel.flag ? ` (bendera ${alert.vessel.flag})` : '';
  const label = RULE_LABELS[alert.ruleType as RuleType] ?? alert.ruleType;
  const evidence = alert.evidenceJson as Record<string, unknown>;
  const zone =
    (evidence.zone as string | undefined) ??
    (evidence.zoneName as string | undefined) ??
    (evidence.mpaName as string | undefined) ??
    'perairan Indonesia';
  const time = alert.createdAt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const agency = alert.assignedAgency?.code ? ` Ditangani oleh ${alert.assignedAgency.code}.` : '';
  return `Kapal ${vessel}${flag} terdeteksi ${label} di ${zone} pada ${time} dengan tingkat ${alert.severity}.${agency}`;
}

export async function explainAlert(alertId: string): Promise<ExplanationResult | null> {
  const hot = hotCache.get(alertId);
  if (hot) return hot;

  const alert = await loadAlert(alertId);
  if (!alert) return null;

  // 1. Sudah dipersist → langsung pakai, JANGAN regenerate (kuota!)
  if (alert.explanation) {
    const result: ExplanationResult = {
      explanation: alert.explanation,
      generatedAt: alert.explanationAt?.toISOString() ?? null,
      source: 'llm',
    };
    hotCache.set(alertId, result);
    return result;
  }

  // 2. Generate via flash-lite
  try {
    countLlmCall(MODEL_EXPLAIN);
    const { text } = await generateText({
      model: aiProvider(MODEL_EXPLAIN),
      prompt: [
        'Kamu analis maritim SIREN. Jelaskan alert pengawasan perikanan berikut dalam 2-3 kalimat Bahasa Indonesia yang lugas untuk operator lapangan. Sebut nama/MMSI kapal, jenis pelanggaran, lokasi, dan kenapa mencurigakan. Tanpa markdown.',
        `Jenis pelanggaran: ${RULE_LABELS[alert.ruleType as RuleType] ?? alert.ruleType}`,
        `Severity: ${alert.severity}`,
        `Kapal: ${alert.vessel.name ?? '(tanpa nama)'} | MMSI ${alert.vessel.mmsi} | bendera ${alert.vessel.flag ?? '?'} | tipe ${alert.vessel.vesselType ?? '?'}`,
        `Posisi: ${alert.lat.toFixed(3)}, ${alert.lng.toFixed(3)}`,
        `Bukti (JSON): ${JSON.stringify(alert.evidenceJson)}`,
      ].join('\n'),
    });

    const explanation = text.trim();
    const generatedAt = new Date();
    await prisma.alert.update({
      where: { id: alertId },
      data: { explanation, explanationAt: generatedAt },
    });
    const result: ExplanationResult = {
      explanation,
      generatedAt: generatedAt.toISOString(),
      source: 'llm',
    };
    hotCache.set(alertId, result);
    return result;
  } catch (e) {
    // 3. Fallback template — tidak dipersist, tidak di-cache lama
    console.warn(`[explanation] LLM gagal untuk ${alertId}: ${e instanceof Error ? e.message : e}`);
    return { explanation: templateExplanation(alert), generatedAt: null, source: 'template' };
  }
}
