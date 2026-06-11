import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { auth } from './lib/auth';
import { PORT } from './lib/env';
import { loginRateLimit } from './lib/ratelimit';
import { requireAuth } from './middleware/require-auth';
import { prisma } from './lib/prisma';
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
  const agencyId = c.get('agencyId');
  const agency = agencyId
    ? await prisma.agency.findUnique({ where: { id: agencyId }, select: { code: true, name: true } })
    : null;
  return c.json({
    id: c.get('userId'),
    name: c.get('userName'),
    email: c.get('userEmail'),
    role: c.get('role'),
    agency,
  });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[api] listening on :${info.port}`);
});

export { app };
