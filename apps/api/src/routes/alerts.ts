// Feed alert (plan 03 Stage 4) + detail & mutasi operasional (plan 07 Stage 1
// Module 1.1). Route tipis — parse, authorize, delegasi ke alert.service.
// scope=mine (default) → hanya alert agency user; scope=all → semua agency.
import { Hono, type Context } from 'hono';
import { dispatchAlertSchema, escalateAlertSchema, falsePositiveSchema } from '@siren/shared';
import { requireAuth } from '../middleware/require-auth';
import {
  dispatchAlert,
  escalateAlert,
  getAlertDetail,
  listAlerts,
  markFalsePositive,
  type AlertActor,
} from '../services/alert.service';
import type { AppEnv } from '../types';

export const alertRoutes = new Hono<AppEnv>();

function actorFrom(c: Context<AppEnv>): AlertActor {
  return { userId: c.get('userId'), role: c.get('role'), agencyId: c.get('agencyId') };
}

alertRoutes.get('/api/v1/alerts', requireAuth, async (c) => {
  const scope = c.req.query('scope') === 'all' ? 'all' : 'mine';
  const result = await listAlerts({
    scope,
    severity: c.req.query('severity'),
    ruleType: c.req.query('ruleType'),
    status: c.req.query('status'),
    since: c.req.query('since'),
    wppZone: c.req.query('wppZone'),
    vesselQuery: c.req.query('vesselQuery'),
    agencyCode: c.req.query('agencyCode'),
    cursor: c.req.query('cursor'),
    rawLimit: Number(c.req.query('limit')),
    agencyId: c.get('agencyId'),
  });
  return c.json({ scope, ...result });
});

// ── Detail alert: SATU request untuk halaman detail (plan 07 P1.1.2) ──
alertRoutes.get('/api/v1/alerts/:id', requireAuth, async (c) => {
  const detail = await getAlertDetail(c.req.param('id'));
  if (!detail) return c.json({ error: 'Alert tidak ditemukan' }, 404);
  return c.json(detail);
});

// ── Mutasi: dispatch (buat Case, transaksional) — hanya dari status `new` ──
alertRoutes.post('/api/v1/alerts/:id/dispatch', requireAuth, async (c) => {
  const parsed = dispatchAlertSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  const result = await dispatchAlert({
    id: c.req.param('id'),
    confirmHandoff: parsed.data.confirmHandoff === true,
    actor: actorFrom(c),
  });

  switch (result.outcome) {
    case 'not_found':
      return c.json({ error: 'Alert tidak ditemukan' }, 404);
    case 'handoff_required':
      return c.json(
        { error: 'Alert milik agency lain — konfirmasi handoff diperlukan', code: 'handoff_required' },
        409,
      );
    case 'wrong_status':
      return c.json({ error: `Dispatch hanya dari status \`new\` (sekarang: ${result.status})` }, 409);
    case 'already_dispatched':
      return c.json({ error: 'Alert sudah memiliki case (dispatch ganda)' }, 409);
    case 'done':
      return c.json({ ok: true, case: result.case }, 201);
  }
});

// ── Mutasi: escalate — ganti agency penanggung jawab + alasan ──
alertRoutes.post('/api/v1/alerts/:id/escalate', requireAuth, async (c) => {
  const parsed = escalateAlertSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toAgencyCode, reason)' }, 400);

  const result = await escalateAlert({
    id: c.req.param('id'),
    toAgencyCode: parsed.data.toAgencyCode,
    reason: parsed.data.reason,
    actor: actorFrom(c),
  });

  switch (result.outcome) {
    case 'not_found':
      return c.json({ error: 'Alert tidak ditemukan' }, 404);
    case 'handoff_required':
      return c.json({ error: 'Alert milik agency lain', code: 'handoff_required' }, 409);
    case 'wrong_status':
      return c.json(
        { error: `Escalate hanya dari \`new\`/\`dispatched\` (sekarang: ${result.status})` },
        409,
      );
    case 'unknown_agency':
      return c.json({ error: `Agency ${parsed.data.toAgencyCode} tidak dikenal` }, 400);
    case 'done':
      return c.json({ ok: true, agencyCode: result.agencyCode });
  }
});

// ── Mutasi: false positive — alasan wajib; hanya dari `new`/`dispatched` ──
alertRoutes.post('/api/v1/alerts/:id/false-positive', requireAuth, async (c) => {
  const parsed = falsePositiveSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (reason wajib)' }, 400);

  const result = await markFalsePositive({
    id: c.req.param('id'),
    reason: parsed.data.reason,
    actor: actorFrom(c),
  });

  switch (result.outcome) {
    case 'not_found':
      return c.json({ error: 'Alert tidak ditemukan' }, 404);
    case 'handoff_required':
      return c.json({ error: 'Alert milik agency lain', code: 'handoff_required' }, 409);
    case 'wrong_status':
      return c.json(
        { error: `False positive hanya dari \`new\`/\`dispatched\` (sekarang: ${result.status})` },
        409,
      );
    case 'done':
      return c.json({ ok: true });
  }
});
