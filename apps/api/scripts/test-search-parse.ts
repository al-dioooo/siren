// Test matrix NL search router (plan 06 Test 3.1).
// Pakai: pnpm --filter api exec tsx scripts/test-search-parse.ts
// Butuh web+api dev jalan (login lewat proxy :3000 — origin check Better Auth).
export {};

const BASE = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

const login = await fetch(`${BASE}/api/v1/auth/sign-in/email`, {
  method: 'POST',
  // node fetch mengirim "Origin: null" → ditolak Better Auth; set eksplisit
  headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ email: 'admin@siren.id', password: 'password' }),
});
if (!login.ok) throw new Error(`login gagal: ${login.status}`);
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

const CASES = [
  'alert kritis minggu ini',
  'ais gap di WPP-711',
  'kasus BAKAMLA yang belum selesai',
  'kapal asing bulan lalu',
  'asdfghjkl',
];

let failed = 0;
for (const query of CASES) {
  const res = await fetch(`${BASE}/api/v1/search/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    failed++;
    console.error(`  ✗ "${query}" → HTTP ${res.status}`);
    continue;
  }
  const { filter, source } = (await res.json()) as { filter: Record<string, unknown>; source: string };
  const active = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== null));
  console.log(`  ✓ "${query}" [${source}] →`, JSON.stringify(active));
}
console.log(failed === 0 ? '[test-search-parse] SEMUA OK ✓' : `[test-search-parse] ${failed} GAGAL ✗`);
process.exit(failed === 0 ? 0 : 1);
