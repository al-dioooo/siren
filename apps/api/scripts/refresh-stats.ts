// Refresh materialized view analytics (plan 08 P3.1.1).
// Jalankan manual / cron: pnpm --filter api exec tsx scripts/refresh-stats.ts
import { prisma } from '../src/lib/prisma';

const started = Date.now();
await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY alert_stats_daily');
const [{ count }] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
  'SELECT COUNT(*)::bigint AS count FROM alert_stats_daily',
);
console.log(`[refresh-stats] alert_stats_daily ter-refresh: ${count} baris (${Date.now() - started}ms)`);
await prisma.$disconnect();
