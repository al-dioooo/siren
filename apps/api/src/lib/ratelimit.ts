import { RATE_LIMITS } from '@siren/shared';
import { createMiddleware } from 'hono/factory';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// VPS = proses tunggal long-running → in-memory limiter benar secara arsitektur
// (OPTIMIZATIONS.md §9). Jangan pindahkan ke serverless tanpa mengganti storage.

export const loginLimiter = new RateLimiterMemory({
  points: RATE_LIMITS.LOGIN_ATTEMPTS,
  duration: RATE_LIMITS.LOGIN_WINDOW_MINUTES * 60,
});

export const chatLimiter = new RateLimiterMemory({
  points: RATE_LIMITS.CHAT_PER_MINUTE,
  duration: 60,
});

/** Rate limit khusus endpoint sign-in, key per IP. */
export const loginRateLimit = createMiddleware(async (c, next) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';
  try {
    await loginLimiter.consume(ip);
  } catch {
    return c.json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' }, 429);
  }
  await next();
});

/** Rate limit chat, key per user (dipasang setelah requireAuth). */
export const chatRateLimit = createMiddleware(async (c, next) => {
  const userId = c.get('userId' as never) as unknown as string | undefined;
  try {
    await chatLimiter.consume(userId ?? 'anonymous');
  } catch {
    return c.json({ error: 'Terlalu banyak pesan. Coba lagi sebentar lagi.' }, 429);
  }
  await next();
});
