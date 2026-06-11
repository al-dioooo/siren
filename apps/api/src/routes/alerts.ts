// Feed alert (plan 03 Stage 4) + detail & mutasi operasional (plan 07 Stage 1 Module 1.1).
// scope=mine (default) → hanya alert agency user; scope=all → semua agency.
import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { customAlphabet } from 'nanoid';
import {
  AGENCY_CODES,
  ALERT_STATUSES,
  RULE_TYPES,
  SEVERITIES,
  WPP_ZONE_IDS,
  dispatchAlertSchema,
  escalateAlertSchema,
  falsePositiveSchema,
  type RuleType,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import { writeAudit } from '../services/audit.service';
import { getCitationsForRule } from '../services/pasal.service';
import type { AppEnv } from '../types';

export const alertRoutes = new Hono<AppEnv>();

const FEED_LIMIT = 30;
const MAX_LIMIT = 100;
const caseCodeId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

alertRoutes.get('/api/v1/alerts', requireAuth, async (c) => {
  const scope = c.req.query('scope') === 'all' ? 'all' : 'mine';
  const severity = c.req.query('severity');
  const ruleType = c.req.query('ruleType');
  const status = c.req.query('status');
  const since = c.req.query('since'); // '24h' | '7d' | '30d'
  const wppZone = c.req.query('wppZone');
  const vesselQuery = c.req.query('vesselQuery');
  const agencyCode = c.req.query('agencyCode');
  const cursor = c.req.query('cursor');
  const rawLimit = Number(c.req.query('limit'));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : FEED_LIMIT;
  const agencyId = c.get('agencyId');

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

  return c.json({
    scope,
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
  });
});

// ── Detail alert: SATU request untuk halaman detail (plan 07 P1.1.2) ──
// vessel + agency + citations (mapping ruleType) + track 24 jam + case + audit timeline.
alertRoutes.get('/api/v1/alerts/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      vessel: true,
      assignedAgency: { select: { id: true, code: true, name: true } },
      case: { select: { id: true, caseCode: true, status: true } },
    },
  });
  if (!alert) return c.json({ error: 'Alert tidak ditemukan' }, 404);

  const since = new Date(alert.createdAt.getTime() - 24 * 3_600_000);
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

  return c.json({
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
  });
});

/** Alert + agency untuk guard mutasi; 404 → null. */
async function findAlertForMutation(id: string) {
  return prisma.alert.findUnique({
    where: { id },
    include: { assignedAgency: { select: { id: true, code: true } } },
  });
}

/** Aksi lintas agency butuh konfirmasi handoff eksplisit (DESIGN.md §2 / plan 07 Test 1.2). */
function crossAgencyBlocked(c: Context<AppEnv>, alertAgencyId: string | null, confirmed: boolean) {
  const role = c.get('role');
  const agencyId = c.get('agencyId');
  if (role === 'admin') return false;
  if (!alertAgencyId || alertAgencyId === agencyId) return false;
  return !confirmed;
}

// ── Mutasi: dispatch (buat Case, transaksional) — hanya dari status `new` ──
alertRoutes.post('/api/v1/alerts/:id/dispatch', requireAuth, async (c) => {
  const id = c.req.param('id');
  const parsed = dispatchAlertSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  const alert = await findAlertForMutation(id);
  if (!alert) return c.json({ error: 'Alert tidak ditemukan' }, 404);
  if (crossAgencyBlocked(c, alert.assignedAgencyId, parsed.data.confirmHandoff === true)) {
    return c.json(
      { error: 'Alert milik agency lain — konfirmasi handoff diperlukan', code: 'handoff_required' },
      409,
    );
  }
  if (alert.status !== 'new') {
    return c.json({ error: `Dispatch hanya dari status \`new\` (sekarang: ${alert.status})` }, 409);
  }

  const userId = c.get('userId');
  const userAgencyId = c.get('agencyId');
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
          assignedAgencyId: userAgencyId ?? alert.assignedAgencyId ?? '',
          openedById: userId,
        },
      });
      await tx.alert.update({ where: { id: alert.id, status: 'new' }, data: { status: 'dispatched' } });
      return kasus;
    });

    writeAudit({
      actorId: userId,
      action: 'alert.dispatch',
      targetType: 'alert',
      targetId: alert.id,
      metaJson: { caseId: created.id, caseCode },
    });
    writeAudit({
      actorId: userId,
      action: 'case.open',
      targetType: 'case',
      targetId: created.id,
      metaJson: { alertId: alert.id, caseCode },
    });

    return c.json({ ok: true, case: { id: created.id, caseCode, status: created.status } }, 201);
  } catch {
    // Unique alertId → dispatch ganda balapan = 409, bukan case kembar
    return c.json({ error: 'Alert sudah memiliki case (dispatch ganda)' }, 409);
  }
});

// ── Mutasi: escalate — ganti agency penanggung jawab + alasan ──
alertRoutes.post('/api/v1/alerts/:id/escalate', requireAuth, async (c) => {
  const id = c.req.param('id');
  const parsed = escalateAlertSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toAgencyCode, reason)' }, 400);

  const alert = await findAlertForMutation(id);
  if (!alert) return c.json({ error: 'Alert tidak ditemukan' }, 404);
  if (crossAgencyBlocked(c, alert.assignedAgencyId, false)) {
    return c.json({ error: 'Alert milik agency lain', code: 'handoff_required' }, 409);
  }
  if (!['new', 'dispatched'].includes(alert.status)) {
    return c.json({ error: `Escalate hanya dari \`new\`/\`dispatched\` (sekarang: ${alert.status})` }, 409);
  }

  const toAgency = await prisma.agency.findUnique({ where: { code: parsed.data.toAgencyCode } });
  if (!toAgency) return c.json({ error: `Agency ${parsed.data.toAgencyCode} tidak dikenal` }, 400);

  await prisma.alert.update({ where: { id }, data: { assignedAgencyId: toAgency.id } });
  writeAudit({
    actorId: c.get('userId'),
    action: 'alert.escalate',
    targetType: 'alert',
    targetId: id,
    metaJson: {
      fromAgency: alert.assignedAgency?.code ?? null,
      toAgency: toAgency.code,
      reason: parsed.data.reason,
    },
  });
  return c.json({ ok: true, agencyCode: toAgency.code });
});

// ── Mutasi: false positive — alasan wajib; hanya dari `new`/`dispatched` ──
alertRoutes.post('/api/v1/alerts/:id/false-positive', requireAuth, async (c) => {
  const id = c.req.param('id');
  const parsed = falsePositiveSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (reason wajib)' }, 400);

  const alert = await findAlertForMutation(id);
  if (!alert) return c.json({ error: 'Alert tidak ditemukan' }, 404);
  if (crossAgencyBlocked(c, alert.assignedAgencyId, false)) {
    return c.json({ error: 'Alert milik agency lain', code: 'handoff_required' }, 409);
  }
  if (!['new', 'dispatched'].includes(alert.status)) {
    return c.json(
      { error: `False positive hanya dari \`new\`/\`dispatched\` (sekarang: ${alert.status})` },
      409,
    );
  }

  await prisma.alert.update({ where: { id }, data: { status: 'false_positive' } });
  writeAudit({
    actorId: c.get('userId'),
    action: 'alert.false_positive',
    targetType: 'alert',
    targetId: id,
    metaJson: { reason: parsed.data.reason, fromStatus: alert.status },
  });
  return c.json({ ok: true });
});
