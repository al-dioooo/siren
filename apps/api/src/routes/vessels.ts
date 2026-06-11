// Vessels registry + dark vessels (plan 08 Stage 1).
import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/require-auth';
import { findAisGaps } from '../services/ais-gap.service';
import type { AppEnv } from '../types';

export const vesselRoutes = new Hono<AppEnv>();

const LIST_LIMIT = 50;
const DARK_VESSEL_WINDOW_DAYS = 7;

// ── Registry: search MMSI/nama/flag/type + pagination cursor (P1.1.1) ──
vesselRoutes.get('/api/v1/vessels', requireAuth, async (c) => {
  const q = c.req.query('q')?.trim();
  const cursor = c.req.query('cursor');

  const vessels = await prisma.vessel.findMany({
    where: q
      ? {
          OR: [
            { mmsi: { contains: q } },
            { name: { contains: q, mode: 'insensitive' } },
            { flag: { equals: q.toUpperCase() } },
            { vesselType: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {},
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: LIST_LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { alerts: true } },
      licensedWpp: { select: { zoneId: true } },
    },
  });

  const hasMore = vessels.length > LIST_LIMIT;
  const page = hasMore ? vessels.slice(0, LIST_LIMIT) : vessels;

  return c.json({
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    vessels: page.map((v) => ({
      id: v.id,
      mmsi: v.mmsi,
      imo: v.imo,
      name: v.name,
      flag: v.flag,
      vesselType: v.vesselType,
      licensedWpp: v.licensedWpp?.zoneId ?? null,
      alertCount: v._count.alerts,
    })),
  });
});

// ── Profil kapal: identitas + riwayat alert + posisi terakhir (P1.1.2) ──
vesselRoutes.get('/api/v1/vessels/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const vessel = await prisma.vessel.findUnique({
    where: { id },
    include: {
      licensedWpp: { select: { zoneId: true, name: true } },
      alerts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { assignedAgency: { select: { code: true } } },
      },
    },
  });
  if (!vessel) return c.json({ error: 'Vessel tidak ditemukan' }, 404);

  const [lastPosition, positionCount] = await Promise.all([
    prisma.vesselPosition.findFirst({
      where: { vesselId: id },
      orderBy: { timestamp: 'desc' },
      select: { lat: true, lng: true, timestamp: true, sog: true },
    }),
    prisma.vesselPosition.count({ where: { vesselId: id } }),
  ]);

  return c.json({
    id: vessel.id,
    mmsi: vessel.mmsi,
    imo: vessel.imo,
    name: vessel.name,
    flag: vessel.flag,
    vesselType: vessel.vesselType,
    gfwVesselId: vessel.gfwVesselId,
    licensedWpp: vessel.licensedWpp,
    lastPosition: lastPosition
      ? { ...lastPosition, timestamp: lastPosition.timestamp.toISOString() }
      : null,
    positionCount,
    alerts: vessel.alerts.map((a) => ({
      id: a.id,
      ruleType: a.ruleType,
      severity: a.severity,
      status: a.status,
      agencyCode: a.assignedAgency?.code ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

// ── Dark vessels: AIS gap > threshold dalam 7 hari (P1.2.1, shared util) ──
vesselRoutes.get('/api/v1/dark-vessels', requireAuth, async (c) => {
  const windowStart = new Date(Date.now() - DARK_VESSEL_WINDOW_DAYS * 24 * 3_600_000);
  const gaps = await findAisGaps(windowStart);

  const vessels = await prisma.vessel.findMany({
    where: { id: { in: gaps.map((g) => g.vesselId) } },
    select: { id: true, mmsi: true, name: true, flag: true, vesselType: true },
  });
  const byId = new Map(vessels.map((v) => [v.id, v]));

  return c.json({
    windowDays: DARK_VESSEL_WINDOW_DAYS,
    darkVessels: gaps
      .sort((a, b) => Number(b.gapHours) - Number(a.gapHours))
      .map((g) => ({
        vessel: byId.get(g.vesselId) ?? { id: g.vesselId, mmsi: '?', name: null, flag: null, vesselType: null },
        gapHours: Math.round(Number(g.gapHours) * 10) / 10,
        lastSeenAt: g.lastSeenAt.toISOString(),
        resumeAt: g.resumeAt.toISOString(),
        lastKnownPosition: { lat: g.lastLat, lng: g.lastLng },
      })),
  });
});
