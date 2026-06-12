// Konsol pengujian admin (testing console) — route tipis, semua endpoint
// requireAuth + requireAdmin. Mutasi tercatat di AuditLog (action console.*).
import { Hono } from 'hono';
import {
  injectAlertSchema,
  runEngineSchema,
  seedDemoSchema,
  spawnVesselSchema,
  stepVesselSchema,
} from '@siren/shared';
import { requireAdmin, requireAuth } from '../middleware/require-auth';
import { runAlertEngine } from '../services/alert-engine.service';
import { writeAudit } from '../services/audit.service';
import {
  injectTestAlert,
  listTestVessels,
  spawnTestVessel,
  stepTestVessel,
} from '../services/console.service';
import { resetSeedData, seedDemoData } from '../services/demo-seed.service';
import type { AppEnv } from '../types';

export const consoleRoutes = new Hono<AppEnv>();

consoleRoutes.get('/api/v1/console/vessels', requireAuth, requireAdmin, async (c) => {
  return c.json({ vessels: await listTestVessels() });
});

consoleRoutes.post('/api/v1/console/vessels', requireAuth, requireAdmin, async (c) => {
  const parsed = spawnVesselSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (lat, lng wajib)' }, 400);

  const vessel = await spawnTestVessel(parsed.data);
  writeAudit({
    actorId: c.get('userId'),
    action: 'console.vessel_spawn',
    targetType: 'vessel',
    targetId: vessel.id,
    metaJson: { mmsi: vessel.mmsi, lat: parsed.data.lat, lng: parsed.data.lng },
  });
  return c.json({ vessel }, 201);
});

consoleRoutes.post('/api/v1/console/vessels/:id/step', requireAuth, requireAdmin, async (c) => {
  const parsed = stepVesselSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  const result = await stepTestVessel(c.req.param('id'), parsed.data);
  switch (result.outcome) {
    case 'not_test_vessel':
      return c.json({ error: 'Hanya kapal uji (id seed_*) yang boleh digerakkan' }, 400);
    case 'not_found':
      return c.json({ error: 'Kapal tidak ditemukan atau belum punya posisi' }, 404);
    case 'done':
      writeAudit({
        actorId: c.get('userId'),
        action: 'console.vessel_step',
        targetType: 'vessel',
        targetId: c.req.param('id'),
        metaJson: result.position,
      });
      return c.json({ position: result.position });
  }
});

consoleRoutes.post('/api/v1/console/engine/run', requireAuth, requireAdmin, async (c) => {
  const parsed = runEngineSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  const result = await runAlertEngine(
    parsed.data.windowHours !== undefined
      ? { windowStart: new Date(Date.now() - parsed.data.windowHours * 3_600_000) }
      : undefined,
  );
  writeAudit({
    actorId: c.get('userId'),
    action: 'console.engine_run',
    targetType: 'engine',
    targetId: 'alert_engine',
    metaJson: { ...result, windowStart: result.windowStart.toISOString() },
  });
  return c.json({ ...result, windowStart: result.windowStart.toISOString() });
});

consoleRoutes.post('/api/v1/console/alerts', requireAuth, requireAdmin, async (c) => {
  const parsed = injectAlertSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (vesselId, ruleType, severity)' }, 400);

  const result = await injectTestAlert(parsed.data);
  if (result.outcome === 'vessel_not_found') {
    return c.json({ error: 'Kapal tidak ditemukan' }, 404);
  }
  writeAudit({
    actorId: c.get('userId'),
    action: 'console.alert_inject',
    targetType: 'alert',
    targetId: result.id,
    metaJson: { ruleType: parsed.data.ruleType, severity: parsed.data.severity, agencyCode: result.agencyCode },
  });
  return c.json({ id: result.id, agencyCode: result.agencyCode }, 201);
});

consoleRoutes.post('/api/v1/console/seed', requireAuth, requireAdmin, async (c) => {
  const parsed = seedDemoSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  // ~1000+ insert sekuensial — bisa makan waktu hingga ~1 menit
  const counts = await seedDemoData({ reset: parsed.data.reset });
  writeAudit({
    actorId: c.get('userId'),
    action: 'console.seed',
    targetType: 'seed',
    targetId: 'demo_seed',
    metaJson: { ...counts, reset: parsed.data.reset },
  });
  return c.json({ counts });
});

consoleRoutes.post('/api/v1/console/reset', requireAuth, requireAdmin, async (c) => {
  await resetSeedData();
  writeAudit({
    actorId: c.get('userId'),
    action: 'console.reset',
    targetType: 'seed',
    targetId: 'demo_seed',
  });
  return c.json({ ok: true });
});
