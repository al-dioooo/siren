import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { requireEnv } from './env';
import { prisma } from './prisma';

// Tanpa secondaryStorage/Redis — cookieCache 5 menit cukup (OPTIMIZATIONS.md §8).
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: requireEnv('BETTER_AUTH_SECRET'),
  baseURL: requireEnv('BETTER_AUTH_URL'),
  basePath: '/api/v1/auth',
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'operator', input: false },
      agencyId: { type: 'string', required: false, input: false, fieldName: 'agencyId' },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
