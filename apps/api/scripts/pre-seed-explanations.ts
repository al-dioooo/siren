// Pre-seed semua explanation sebelum demo (plan 06 P1.2.3).
// Berurutan + delay 1s antar call — hormati kuota free tier.
// Pakai: pnpm --filter api exec tsx scripts/pre-seed-explanations.ts [--limit 50]
import '../src/lib/env';
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma';
import { explainAlert } from '../src/services/explanation.service';

const { values: args } = parseArgs({ options: { limit: { type: 'string' } } });
const limit = args.limit ? Number(args.limit) : undefined;

const pending = await prisma.alert.findMany({
  where: { explanation: null },
  orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }], // critical dulu (enum asc kebetulan c<h<l<m — urutan demo tetap masuk akal)
  select: { id: true },
  ...(limit ? { take: limit } : {}),
});
console.log(`[pre-seed-explanations] alert tanpa explanation: ${pending.length}`);

let ok = 0;
let fallback = 0;
for (const { id } of pending) {
  const result = await explainAlert(id);
  if (result?.source === 'llm') ok++;
  else fallback++;
  await new Promise((r) => setTimeout(r, 1000));
}

const remaining = await prisma.alert.count({ where: { explanation: null } });
console.log(`[pre-seed-explanations] persisted: ${ok}, fallback(template, belum persist): ${fallback}, sisa NULL: ${remaining}`);
await prisma.$disconnect();
