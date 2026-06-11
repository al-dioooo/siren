import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import {
  ACTIVE_ALERT_STATUSES,
  AGENCY_CODES,
  MAP_DEFAULT_TIME_RANGE,
  MAP_TIME_RANGE_HOURS,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import type { AppEnv } from '../types';

export const statsRoutes = new Hono<AppEnv>();

type DailyRow = {
  day: Date;
  agencyCode: string | null;
  ruleType: string;
  severity: string;
  count: bigint;
};

/**
 * Data analytics dari matview alert_stats_daily — BUKAN tabel Alert langsung
 * (plan 08 P3.1.1). Refresh: scripts/refresh-stats.ts.
 */
statsRoutes.get('/api/v1/stats/daily', requireAuth, async (c) => {
  const fromRaw = c.req.query('from');
  const toRaw = c.req.query('to');
  const agency = c.req.query('agency');

  const from = fromRaw && !Number.isNaN(Date.parse(fromRaw))
    ? new Date(fromRaw)
    : new Date(Date.now() - 30 * 24 * 3_600_000);
  const to = toRaw && !Number.isNaN(Date.parse(toRaw)) ? new Date(toRaw) : new Date();
  const agencyCode = agency && (AGENCY_CODES as readonly string[]).includes(agency) ? agency : null;

  const rows = await prisma.$queryRaw<DailyRow[]>`
    SELECT s.day, a.code AS "agencyCode", s.rule_type AS "ruleType", s.severity, s.count
    FROM alert_stats_daily s
    LEFT JOIN "Agency" a ON a.id = s.assigned_agency_id
    WHERE s.day >= ${from} AND s.day <= ${to}
    ${agencyCode ? Prisma.sql`AND a.code = ${agencyCode}` : Prisma.empty}
    ORDER BY s.day ASC
  `;

  return c.json({
    from: from.toISOString(),
    to: to.toISOString(),
    agency: agencyCode,
    rows: rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      agencyCode: r.agencyCode,
      ruleType: r.ruleType,
      severity: r.severity,
      count: Number(r.count),
    })),
  });
});

/**
 * Stats strip dashboard (plan 03 P2.2.2).
 * Angka global (bukan per-agency) — scope feed diatur terpisah di Blok C.
 */
statsRoutes.get('/api/v1/stats/overview', requireAuth, async (c) => {
  const windowHours = MAP_TIME_RANGE_HOURS[MAP_DEFAULT_TIME_RANGE];
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const [activeAlerts, vesselsTracked, darkVessels, openCases] = await Promise.all([
    prisma.alert.count({ where: { status: { in: [...ACTIVE_ALERT_STATUSES] } } }),
    prisma.vesselPosition
      .findMany({
        where: { timestamp: { gte: since } },
        distinct: ['vesselId'],
        select: { vesselId: true },
      })
      .then((rows) => rows.length),
    prisma.vesselEvent
      .findMany({
        where: {
          eventType: 'gap',
          OR: [{ endAt: null }, { endAt: { gte: since } }],
        },
        distinct: ['vesselId'],
        select: { vesselId: true },
      })
      .then((rows) => rows.length),
    prisma.case.count({ where: { status: { not: 'closed' } } }),
  ]);

  return c.json({ activeAlerts, vesselsTracked, darkVessels, openCases, windowHours });
});
