import { createMiddleware } from 'hono/factory';
import { auth } from '../lib/auth';
import type { AppEnv } from '../types';

/** Baca session Better Auth dari cookie; 401 kalau tidak ada. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const user = session.user as typeof session.user & { role?: string; agencyId?: string | null };
  c.set('userId', user.id);
  c.set('agencyId', user.agencyId ?? null);
  c.set('role', user.role ?? 'operator');
  c.set('userName', user.name);
  c.set('userEmail', user.email);
  await next();
});

/** Khusus role admin (audit log dsb.). Pasang SETELAH requireAuth. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('role') !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});
