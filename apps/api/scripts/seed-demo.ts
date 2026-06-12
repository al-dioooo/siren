// Demo seeder — wrapper CLI tipis di atas demo-seed.service (plan 04 Module 2.2).
// Logika seeding penuh ada di src/services/demo-seed.service.ts (dipakai juga
// oleh konsol pengujian admin).
//
// Pakai:
//   pnpm --filter api exec tsx scripts/seed-demo.ts            # upsert (idempotent)
//   pnpm --filter api exec tsx scripts/seed-demo.ts --reset    # hapus seed lama dulu
import '../src/lib/env';
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma';
import { seedDemoData } from '../src/services/demo-seed.service';

const { values: args } = parseArgs({
  options: { reset: { type: 'boolean', default: false } },
});

if (args.reset) {
  console.log('[seed-demo] reset: semua row seed_% akan dihapus (source gfw tidak disentuh)');
}
const counts = await seedDemoData({ reset: args.reset });
console.log('[seed-demo] vessels:', counts.vessels);
console.log('[seed-demo] positions:', counts.positions);
console.log('[seed-demo] alerts:', counts.alerts);
console.log('[seed-demo] cases:', counts.cases);

const [verify] = await prisma.$queryRaw<Array<Record<string, bigint>>>`
  SELECT
    (SELECT count(*) FROM "Vessel" WHERE id LIKE 'seed_%') AS vessels,
    (SELECT count(*) FROM "VesselPosition" WHERE source = 'seed') AS positions,
    (SELECT count(*) FROM "Alert" WHERE id LIKE 'seed_%') AS alerts,
    (SELECT count(*) FROM "Case" WHERE id LIKE 'seed_%') AS cases,
    (SELECT count(*) FROM "VesselPosition" WHERE source = 'gfw') AS gfw_positions_untouched
`;
console.log('[seed-demo] verifikasi DB:', Object.fromEntries(Object.entries(verify!).map(([k, v]) => [k, Number(v)])));
console.log('[seed-demo] selesai ✓');
await prisma.$disconnect();
