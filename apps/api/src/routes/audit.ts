// Audit log API (plan 08 Stage 4) — role admin only, append-only read.
import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireAuth } from '../middleware/require-auth';
import type { AppEnv } from '../types';

export const auditRoutes = new Hono<AppEnv>();

const PAGE_LIMIT = 100;

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

auditRoutes.get('/api/v1/audit', requireAuth, requireAdmin, async (c) => {
  const action = c.req.query('action');
  const actor = c.req.query('actor'); // email atau nama (contains)
  const fromRaw = c.req.query('from');
  const toRaw = c.req.query('to');
  const cursor = c.req.query('cursor');
  const format = c.req.query('format');

  const where = {
    ...(action ? { action } : {}),
    ...(actor
      ? {
          actor: {
            OR: [
              { email: { contains: actor, mode: 'insensitive' as const } },
              { name: { contains: actor, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
    ...(fromRaw && !Number.isNaN(Date.parse(fromRaw))
      ? { createdAt: { gte: new Date(fromRaw) } }
      : {}),
    ...(toRaw && !Number.isNaN(Date.parse(toRaw))
      ? { createdAt: { lte: new Date(`${toRaw}T23:59:59.999Z`) } }
      : {}),
  };

  // Export CSV (P4.1.3) — tanpa pagination, langsung stream isi terfilter
  if (format === 'csv') {
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { actor: { select: { name: true, email: true } } },
    });
    const lines = [
      'timestamp,actor,action,target_type,target_id,meta',
      ...rows.map((r) =>
        [
          r.createdAt.toISOString(),
          csvEscape(r.actor ? `${r.actor.name} <${r.actor.email}>` : 'sistem'),
          r.action,
          r.targetType,
          r.targetId,
          csvEscape(JSON.stringify(r.metaJson)),
        ].join(','),
      ),
    ];
    return c.body(lines.join('\n'), 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="siren-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: { name: true, email: true } } },
  });

  const hasMore = rows.length > PAGE_LIMIT;
  const page = hasMore ? rows.slice(0, PAGE_LIMIT) : rows;

  return c.json({
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    entries: page.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      actorName: r.actor?.name ?? null,
      actorEmail: r.actor?.email ?? null,
      metaJson: r.metaJson,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});
