// Logika bisnis alert (plan 03 Stage 4 + plan 07 Module 1.1): list feed,
// detail satu-request, dispatch/escalate/false-positive. Route hanya
// parse/authorize/serialize.
import { randomUUID } from 'node:crypto';
import { customAlphabet } from 'nanoid';
import {
  AGENCY_CODES,
  ALERT_STATUSES,
  RULE_TYPES,
  SEVERITIES,
  WPP_ZONE_IDS,
  type RuleType,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { writeAudit } from './audit.service';
import { getCitationsForRule } from './pasal.service';

const FEED_LIMIT = 30;
const MAX_LIMIT = 100;
const TRACK_WINDOW_HOURS = 24;
const caseCodeId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

/** Identitas pelaku mutasi — diambil route dari context auth. */
export type AlertActor = {
  userId: string;
  role: string;
  agencyId: string | null;
};

export async function listAlerts(params: {
  scope: 'all' | 'mine';
  severity?: string;
  ruleType?: string;
  status?: string;
  since?: string; // '24h' | '7d' | '30d'
  wppZone?: string;
  vesselQuery?: string;
  agencyCode?: string;
  cursor?: string;
  rawLimit: number;
  agencyId: string | null;
}) {
  const { scope, severity, ruleType, status, since, wppZone, vesselQuery, agencyCode, cursor, rawLimit, agencyId } =
    params;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : FEED_LIMIT;

  const filterAgencyId =
    agencyCode && (AGENCY_CODES as readonly string[]).includes(agencyCode)
      ? (await prisma.agency.findUnique({ where: { code: agencyCode }, select: { id: true } }))?.id
      : undefined;

  const sinceHours = since === '7d' ? 168 : since === '30d' ? 720 : since === '24h' ? 24 : null;
  const wppZoneId =
    wppZone && (WPP_ZONE_IDS as readonly string[]).includes(wppZone)
      ? (await prisma.wppZone.findUnique({ where: { zoneId: wppZone }, select: { id: true } }))?.id
      : undefined;

  const alerts = await prisma.alert.findMany({
    where: {
      ...(scope === 'mine' && agencyId ? { assignedAgencyId: agencyId } : {}),
      ...(filterAgencyId ? { assignedAgencyId: filterAgencyId } : {}),
      ...(severity && (SEVERITIES as readonly string[]).includes(severity) ? { severity } : {}),
      ...(ruleType && (RULE_TYPES as readonly string[]).includes(ruleType) ? { ruleType } : {}),
      ...(status && (ALERT_STATUSES as readonly string[]).includes(status) ? { status } : {}),
      ...(sinceHours ? { createdAt: { gte: new Date(Date.now() - sinceHours * 3_600_000) } } : {}),
      ...(wppZoneId ? { wppZoneId } : {}),
      ...(vesselQuery
        ? {
            vessel: {
              OR: [
                { name: { contains: vesselQuery, mode: 'insensitive' } },
                { mmsi: { contains: vesselQuery } },
              ],
            },
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      vessel: { select: { name: true, mmsi: true, flag: true } },
      assignedAgency: { select: { code: true } },
    },
  });

  const hasMore = alerts.length > limit;
  const page = hasMore ? alerts.slice(0, limit) : alerts;

  return {
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    alerts: page.map((a) => ({
      id: a.id,
      ruleType: a.ruleType,
      severity: a.severity,
      status: a.status,
      lat: a.lat,
      lng: a.lng,
      createdAt: a.createdAt.toISOString(),
      vessel: a.vessel,
      agencyCode: a.assignedAgency?.code ?? null,
    })),
  };
}

// ── Detail alert: SATU request untuk halaman detail (plan 07 P1.1.2) ──
// vessel + agency + citations (mapping ruleType) + track 24 jam + case + audit timeline.
export async function getAlertDetail(id: string) {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      vessel: true,
      assignedAgency: { select: { id: true, code: true, name: true } },
      case: { select: { id: true, caseCode: true, status: true } },
    },
  });
  if (!alert) return null;

  const since = new Date(alert.createdAt.getTime() - TRACK_WINDOW_HOURS * 3_600_000);
  const [wppZone, track, citations, auditTrail] = await Promise.all([
    alert.wppZoneId
      ? prisma.wppZone.findUnique({ where: { id: alert.wppZoneId }, select: { zoneId: true, name: true } })
      : null,
    prisma.vesselPosition.findMany({
      where: { vesselId: alert.vesselId, timestamp: { gte: since, lte: alert.createdAt } },
      orderBy: { timestamp: 'asc' },
      select: { lat: true, lng: true, timestamp: true, sog: true },
    }),
    getCitationsForRule(alert.ruleType as RuleType),
    prisma.auditLog.findMany({
      where: { targetType: 'alert', targetId: id },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    id: alert.id,
    ruleType: alert.ruleType,
    severity: alert.severity,
    status: alert.status,
    lat: alert.lat,
    lng: alert.lng,
    evidenceJson: alert.evidenceJson,
    explanation: alert.explanation,
    explanationAt: alert.explanationAt?.toISOString() ?? null,
    createdAt: alert.createdAt.toISOString(),
    vessel: alert.vessel,
    agency: alert.assignedAgency,
    wppZone,
    case: alert.case,
    citations,
    track: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: track.map((p) => [p.lng, p.lat]) },
      properties: { pointCount: track.length },
    },
    auditTrail: auditTrail.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actor?.name ?? null,
      metaJson: a.metaJson,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/** Alert + agency untuk guard mutasi; 404 → null. */
async function findAlertForMutation(id: string) {
  return prisma.alert.findUnique({
    where: { id },
    include: { assignedAgency: { select: { id: true, code: true } } },
  });
}

/** Aksi lintas agency butuh konfirmasi handoff eksplisit (DESIGN.md §2 / plan 07 Test 1.2). */
function crossAgencyBlocked(actor: AlertActor, alertAgencyId: string | null, confirmed: boolean) {
  if (actor.role === 'admin') return false;
  if (!alertAgencyId || alertAgencyId === actor.agencyId) return false;
  return !confirmed;
}

// ── Mutasi: dispatch (buat Case, transaksional) — hanya dari status `new` ──
export async function dispatchAlert(params: {
  id: string;
  confirmHandoff: boolean;
  actor: AlertActor;
}): Promise<
  | { outcome: 'not_found' }
  | { outcome: 'handoff_required' }
  | { outcome: 'wrong_status'; status: string }
  | { outcome: 'already_dispatched' }
  | { outcome: 'done'; case: { id: string; caseCode: string; status: string } }
> {
  const { id, confirmHandoff, actor } = params;
  const alert = await findAlertForMutation(id);
  if (!alert) return { outcome: 'not_found' };
  if (crossAgencyBlocked(actor, alert.assignedAgencyId, confirmHandoff)) {
    return { outcome: 'handoff_required' };
  }
  if (alert.status !== 'new') return { outcome: 'wrong_status', status: alert.status };

  const caseCode = `CASE-${caseCodeId()}`;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const kasus = await tx.case.create({
        data: {
          id: `case_${randomUUID()}`,
          caseCode,
          alertId: alert.id,
          vesselId: alert.vesselId,
          // Case dikerjakan agency pelaksana: agency user (atau agency alert bila user tanpa agency)
          assignedAgencyId: actor.agencyId ?? alert.assignedAgencyId ?? '',
          openedById: actor.userId,
        },
      });
      await tx.alert.update({ where: { id: alert.id, status: 'new' }, data: { status: 'dispatched' } });
      return kasus;
    });

    writeAudit({
      actorId: actor.userId,
      action: 'alert.dispatch',
      targetType: 'alert',
      targetId: alert.id,
      metaJson: { caseId: created.id, caseCode },
    });
    writeAudit({
      actorId: actor.userId,
      action: 'case.open',
      targetType: 'case',
      targetId: created.id,
      metaJson: { alertId: alert.id, caseCode },
    });

    return { outcome: 'done', case: { id: created.id, caseCode, status: created.status } };
  } catch {
    // Unique alertId → dispatch ganda balapan = 409, bukan case kembar
    return { outcome: 'already_dispatched' };
  }
}

// ── Mutasi: escalate — ganti agency penanggung jawab + alasan ──
export async function escalateAlert(params: {
  id: string;
  toAgencyCode: string;
  reason: string;
  actor: AlertActor;
}): Promise<
  | { outcome: 'not_found' }
  | { outcome: 'handoff_required' }
  | { outcome: 'wrong_status'; status: string }
  | { outcome: 'unknown_agency' }
  | { outcome: 'done'; agencyCode: string }
> {
  const { id, toAgencyCode, reason, actor } = params;
  const alert = await findAlertForMutation(id);
  if (!alert) return { outcome: 'not_found' };
  if (crossAgencyBlocked(actor, alert.assignedAgencyId, false)) {
    return { outcome: 'handoff_required' };
  }
  if (!['new', 'dispatched'].includes(alert.status)) {
    return { outcome: 'wrong_status', status: alert.status };
  }

  const toAgency = await prisma.agency.findUnique({ where: { code: toAgencyCode } });
  if (!toAgency) return { outcome: 'unknown_agency' };

  await prisma.alert.update({ where: { id }, data: { assignedAgencyId: toAgency.id } });
  writeAudit({
    actorId: actor.userId,
    action: 'alert.escalate',
    targetType: 'alert',
    targetId: id,
    metaJson: {
      fromAgency: alert.assignedAgency?.code ?? null,
      toAgency: toAgency.code,
      reason,
    },
  });
  return { outcome: 'done', agencyCode: toAgency.code };
}

// ── Mutasi: false positive — alasan wajib; hanya dari `new`/`dispatched` ──
export async function markFalsePositive(params: {
  id: string;
  reason: string;
  actor: AlertActor;
}): Promise<
  | { outcome: 'not_found' }
  | { outcome: 'handoff_required' }
  | { outcome: 'wrong_status'; status: string }
  | { outcome: 'done' }
> {
  const { id, reason, actor } = params;
  const alert = await findAlertForMutation(id);
  if (!alert) return { outcome: 'not_found' };
  if (crossAgencyBlocked(actor, alert.assignedAgencyId, false)) {
    return { outcome: 'handoff_required' };
  }
  if (!['new', 'dispatched'].includes(alert.status)) {
    return { outcome: 'wrong_status', status: alert.status };
  }

  await prisma.alert.update({ where: { id }, data: { status: 'false_positive' } });
  writeAudit({
    actorId: actor.userId,
    action: 'alert.false_positive',
    targetType: 'alert',
    targetId: id,
    metaJson: { reason, fromStatus: alert.status },
  });
  return { outcome: 'done' };
}
