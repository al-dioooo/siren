// Uji GFW service layer (plan 04 Test 1.1): parameter kecil, bbox Natuna.
// Jalankan: pnpm --filter api exec tsx scripts/test-gfw.ts
import '../src/lib/env';
import {
  getEvents,
  getGfwRequestCount,
  getVesselIdentity,
  searchVessels,
} from '../src/services/gfw.service';

const NATUNA_BBOX: [number, number, number, number] = [105, 2, 110, 6];

const startedAt = Date.now();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

console.log('[test-gfw] searchVessels (flag IDN, limit 5)...');
const search = await searchVessels({ where: "flag = 'IDN'", limit: 5 });
console.log(`  entries: ${search.entries.length}, total: ${search.total}`);
if (search.entries.length === 0) throw new Error('searchVessels kosong');

const firstId = search.entries[0]?.selfReportedInfo[0]?.id;
if (!firstId) throw new Error('selfReportedInfo kosong di hasil pertama');

console.log(`[test-gfw] getVesselIdentity(${firstId}) 2x — cek LRU cache...`);
const before = getGfwRequestCount();
const identity = await getVesselIdentity(firstId);
await getVesselIdentity(firstId);
const httpCalls = getGfwRequestCount() - before;
console.log(
  `  shipname: ${identity.selfReportedInfo[0]?.shipname ?? '?'} — HTTP calls untuk 2 panggilan: ${httpCalls}`,
);
if (httpCalls !== 1) throw new Error(`cache LRU tidak bekerja (HTTP calls = ${httpCalls}, harusnya 1)`);

console.log('[test-gfw] getEvents (fishing, 3 hari, bbox Natuna, limit 5)...');
const events = await getEvents({
  types: ['fishing'],
  startDate: daysAgo(3),
  bbox: NATUNA_BBOX,
  limit: 5,
});
console.log(`  events: ${events.length}`);
for (const ev of events.slice(0, 3)) {
  console.log(`    ${ev.type} ${ev.start} vessel=${ev.vessel.ssvid ?? ev.vessel.id} pos=${ev.position?.lat},${ev.position?.lon}`);
}

console.log(
  `[test-gfw] SEMUA OK ✓ — total HTTP requests: ${getGfwRequestCount()}, durasi ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
);
