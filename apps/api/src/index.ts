import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { auth } from './lib/auth';
import { HOST, PORT } from './lib/env';
import { loginRateLimit } from './lib/ratelimit';
import { requireAuth } from './middleware/require-auth';
import { prisma } from './lib/prisma';
import { aiRoutes } from './routes/ai';
import { alertRoutes } from './routes/alerts';
import { auditRoutes } from './routes/audit';
import { caseRoutes } from './routes/cases';
import { consoleRoutes } from './routes/console';
import { mapRoutes } from './routes/map';
import { statsRoutes } from './routes/stats';
import { vesselRoutes } from './routes/vessels';
import { writeAudit } from './services/audit.service';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use(logger());
app.use(secureHeaders());

const startedAt = Date.now();

app.get('/api/v1/health', (c) =>
  c.json({ status: 'ok', uptime: Math.round((Date.now() - startedAt) / 1000) }),
);

// Rate limit hanya untuk percobaan sign-in (plan 02 P1.1.4)
app.use('/api/v1/auth/sign-in/*', loginRateLimit);

// Better Auth handler — semua route auth
app.on(['GET', 'POST'], '/api/v1/auth/*', (c) => auth.handler(c.req.raw));

// Profil user aktif (dipakai layout dashboard)
app.get('/api/v1/me', requireAuth, async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.get('userId') },
    select: {
      tutorialCompletedAt: true,
      agency: { select: { id: true, code: true, name: true } },
    },
  });
  return c.json({
    id: c.get('userId'),
    name: c.get('userName'),
    email: c.get('userEmail'),
    role: c.get('role'),
    agency: user?.agency ?? null,
    tutorialCompletedAt: user?.tutorialCompletedAt?.toISOString() ?? null,
  });
});

app.post('/api/v1/me/tutorial-complete', requireAuth, async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tutorialCompletedAt: true },
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  let completedAt = user.tutorialCompletedAt;

  if (!completedAt) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { tutorialCompletedAt: new Date() },
      select: { tutorialCompletedAt: true },
    });
    completedAt = updated.tutorialCompletedAt;

    writeAudit({
      actorId: userId,
      action: 'user.tutorial_complete',
      targetType: 'user',
      targetId: userId,
      metaJson: { source: 'dashboard_tour' },
    });
  }

  if (!completedAt) {
    return c.json({ error: 'Tutorial completion failed' }, 500);
  }

  return c.json({ tutorialCompletedAt: completedAt.toISOString() });
});

app.route('/', statsRoutes);
app.route('/', mapRoutes);
app.route('/', alertRoutes);
app.route('/', caseRoutes);
app.route('/', vesselRoutes);
app.route('/', auditRoutes);
app.route('/', aiRoutes);
app.route('/', consoleRoutes);

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[api] listening on ${HOST}:${info.port}`);
});

export { app };
