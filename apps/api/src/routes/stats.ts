import { Hono } from 'hono';
import {
  ACTIVE_ALERT_STATUSES,
  MAP_DEFAULT_TIME_RANGE,
  MAP_TIME_RANGE_HOURS,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import type { AppEnv } from '../types';

export const statsRoutes = new Hono<AppEnv>();

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
