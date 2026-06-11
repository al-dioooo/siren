// Feed alert (plan 03 Stage 4 — P4.1.1/P4.1.2/P4.1.3 sisi API).
// scope=mine (default) → hanya alert agency user; scope=all → semua agency.
import { Hono } from 'hono';
import { ALERT_STATUSES, RULE_TYPES, SEVERITIES, WPP_ZONE_IDS } from '@siren/shared';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import type { AppEnv } from '../types';

export const alertRoutes = new Hono<AppEnv>();

const FEED_LIMIT = 30;

alertRoutes.get('/api/v1/alerts', requireAuth, async (c) => {
  const scope = c.req.query('scope') === 'all' ? 'all' : 'mine';
  const severity = c.req.query('severity');
  const ruleType = c.req.query('ruleType');
  const status = c.req.query('status');
  const since = c.req.query('since'); // '24h' | '7d' | '30d'
  const wppZone = c.req.query('wppZone');
  const vesselQuery = c.req.query('vesselQuery');
  const agencyId = c.get('agencyId');

  const sinceHours = since === '7d' ? 168 : since === '30d' ? 720 : since === '24h' ? 24 : null;
  const wppZoneId =
    wppZone && (WPP_ZONE_IDS as readonly string[]).includes(wppZone)
      ? (await prisma.wppZone.findUnique({ where: { zoneId: wppZone }, select: { id: true } }))?.id
      : undefined;

  const alerts = await prisma.alert.findMany({
    where: {
      ...(scope === 'mine' && agencyId ? { assignedAgencyId: agencyId } : {}),
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
    orderBy: { createdAt: 'desc' },
    take: FEED_LIMIT,
    include: {
      vessel: { select: { name: true, mmsi: true, flag: true } },
      assignedAgency: { select: { code: true } },
    },
  });

  return c.json({
    scope,
    alerts: alerts.map((a) => ({
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
