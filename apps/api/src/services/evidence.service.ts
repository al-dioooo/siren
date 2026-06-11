// Evidence PDF — pengumpulan data case (plan 08 P2.1.1) + peta statis (P2.1.2).
import { RULE_LABELS, RULE_LAW_REFS, type RuleType } from '@siren/shared';
import { prisma } from '../lib/prisma';
import { explainAlert } from './explanation.service';
import { getCitation, type Citation } from './pasal.service';

export type EvidenceData = {
  caseCode: string;
  caseStatus: string;
  caseCreatedAt: Date;
  agency: { code: string; name: string };
  openedBy: string;
  vessel: { name: string | null; mmsi: string; imo: string | null; flag: string | null; vesselType: string | null };
  alert: {
    id: string;
    ruleType: string;
    ruleLabel: string;
    severity: string;
    lat: number;
    lng: number;
    createdAt: Date;
    evidenceJson: Record<string, unknown>;
  };
  explanation: string | null;
  citations: Citation[];
  chronology: Array<{ at: Date; actor: string; text: string }>;
};

/** Kumpulkan seluruh data PDF untuk satu case; null bila case tidak ada. */
export async function collectEvidence(caseId: string): Promise<EvidenceData | null> {
  const kasus = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      vessel: true,
      assignedAgency: true,
      openedBy: { select: { name: true } },
      alert: true,
      updates: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } },
    },
  });
  if (!kasus) return null;

  const [explanationResult, auditRows] = await Promise.all([
    explainAlert(kasus.alertId).catch(() => null),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: 'case', targetId: kasus.id },
          { targetType: 'alert', targetId: kasus.alertId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { name: true } } },
    }),
  ]);

  const lawRefs = RULE_LAW_REFS[kasus.alert.ruleType as RuleType] ?? [];
  const citations = (
    await Promise.all(lawRefs.map((ref) => getCitation(ref).catch(() => null)))
  ).filter((ct): ct is Citation => ct !== null);

  // Kronologi gabungan CaseUpdate + AuditLog, urut waktu
  const chronology = [
    ...kasus.updates.map((u) => ({
      at: u.createdAt,
      actor: u.author.name,
      text:
        // Helvetica WinAnsi tidak punya U+2192 — pakai "->"
        u.kind === 'status_change'
          ? `Status ${u.fromStatus} -> ${u.toStatus}${u.body ? ` - ${u.body}` : ''}`
          : u.kind === 'handoff'
            ? `Handoff: ${u.body ?? ''}`
            : u.kind === 'attachment'
              ? `Lampiran: ${u.body ?? ''}`
              : (u.body ?? ''),
    })),
    ...auditRows.map((a) => ({
      at: a.createdAt,
      actor: a.actor?.name ?? 'sistem',
      text: `[audit] ${a.action}`,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    caseCode: kasus.caseCode,
    caseStatus: kasus.status,
    caseCreatedAt: kasus.createdAt,
    agency: { code: kasus.assignedAgency.code, name: kasus.assignedAgency.name },
    openedBy: kasus.openedBy.name,
    vessel: {
      name: kasus.vessel.name,
      mmsi: kasus.vessel.mmsi,
      imo: kasus.vessel.imo,
      flag: kasus.vessel.flag,
      vesselType: kasus.vessel.vesselType,
    },
    alert: {
      id: kasus.alert.id,
      ruleType: kasus.alert.ruleType,
      ruleLabel: RULE_LABELS[kasus.alert.ruleType as RuleType] ?? kasus.alert.ruleType,
      severity: kasus.alert.severity,
      lat: kasus.alert.lat,
      lng: kasus.alert.lng,
      createdAt: kasus.alert.createdAt,
      evidenceJson: kasus.alert.evidenceJson as Record<string, unknown>,
    },
    explanation: explanationResult?.explanation ?? null,
    citations,
    chronology,
  };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Peta statis Mapbox 800x500@2x dengan pin merah di koordinat pelanggaran
 * (P2.1.2). Di-embed sebagai bytes agar PDF mandiri; gagal → null (placeholder).
 */
export async function fetchStaticMap(lat: number, lng: number): Promise<Buffer | null> {
  const token = process.env.MAPBOX_SECRET_TOKEN ?? process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) return null;
  const url =
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `pin-l+ef4444(${lng.toFixed(5)},${lat.toFixed(5)})/` +
    `${lng.toFixed(5)},${lat.toFixed(5)},6,0/800x500@2x?access_token=${token}&attribution=false&logo=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[evidence] static map HTTP ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.subarray(0, 4).equals(PNG_MAGIC)) return null;
    return buffer;
  } catch (e) {
    console.warn(`[evidence] static map gagal: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
