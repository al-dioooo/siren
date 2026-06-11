// CLI trigger alert engine (plan 05 P1.2.2) — juga dipakai pg-boss (plan 04 opsional).
// Pakai:
//   pnpm --filter api exec tsx scripts/run-alert-engine.ts
//   pnpm --filter api exec tsx scripts/run-alert-engine.ts --window-hours 24
import '../src/lib/env';
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma';
import { runAlertEngine } from '../src/services/alert-engine.service';

const { values: args } = parseArgs({
  options: { 'window-hours': { type: 'string' } },
});

const windowHours = args['window-hours'] ? Number(args['window-hours']) : undefined;
if (windowHours !== undefined && (!Number.isFinite(windowHours) || windowHours <= 0)) {
  throw new Error(`--window-hours tidak valid: ${args['window-hours']}`);
}

const result = await runAlertEngine(
  windowHours ? { windowStart: new Date(Date.now() - windowHours * 3_600_000) } : undefined,
);

console.log(
  `[alert-engine] window sejak ${result.windowStart.toISOString()} — ` +
    `candidates: ${result.candidates}, created: ${result.created}, deduped: ${result.deduped}, invalid: ${result.invalid}`,
);
await prisma.$disconnect();
process.exit(0);
