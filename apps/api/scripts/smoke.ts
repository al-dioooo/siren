// Smoke test koneksi semua layanan eksternal (plan 01 P4.2.1).
// Jalankan: pnpm --filter api smoke
// Masalah kredensial harus selesai MALAM INI, bukan besok.
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { prisma } from '../src/lib/prisma';

let failed = 0;

async function check(label: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    console.log(`  ✓ ${label} OK${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${label} FAIL — ${e instanceof Error ? e.message : e}`);
  }
}

console.log('[smoke] SIREN external services\n');

await check('DB (Supabase Postgres)', async () => {
  const [row] = await prisma.$queryRaw<{ postgis: string | null; vector: string | null }[]>`
    SELECT
      (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis,
      (SELECT extversion FROM pg_extension WHERE extname = 'vector')  AS vector
  `;
  if (!row?.postgis) throw new Error('extension postgis belum aktif');
  if (!row?.vector) throw new Error('extension vector belum aktif');
  return `postgis ${row.postgis}, pgvector ${row.vector}`;
});

await check('GEMINI (Google AI Studio)', async () => {
  const { text } = await generateText({
    model: google('gemini-flash-lite-latest'),
    prompt: 'Balas dengan satu kata: siap',
  });
  return `respons: "${text.trim().slice(0, 30)}"`;
});

await check('GFW (Global Fishing Watch v3)', async () => {
  const token = process.env.GFW_API_TOKEN;
  if (!token) throw new Error('GFW_API_TOKEN kosong');
  const res = await fetch(
    'https://gateway.api.globalfishingwatch.org/v3/vessels/search?query=fishing&datasets[0]=public-global-vessel-identity:latest&limit=1',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { total?: number };
  return `total vessels tersedia: ${json.total ?? '?'}`;
});

await check('STORAGE (Supabase)', async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY kosong');
  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return `${data.length} bucket`;
});

console.log(failed === 0 ? '\n[smoke] SEMUA OK ✓' : `\n[smoke] ${failed} GAGAL ✗`);
await prisma.$disconnect();
process.exit(failed === 0 ? 0 : 1);
