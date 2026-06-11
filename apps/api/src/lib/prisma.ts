import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { requireEnv } from './env';

// Pooler URL (port 6543) untuk runtime — DIRECT_URL hanya untuk migration.
const pool = new pg.Pool({ connectionString: requireEnv('DATABASE_URL') });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
