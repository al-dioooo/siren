// Muat .env (Node 20.12+ built-in, tanpa dependency dotenv).
// File boleh tidak ada (mis. CI) — env bisa juga datang dari pm2/shell.
try {
  process.loadEnvFile();
} catch {
  // .env tidak ditemukan — lanjut pakai process.env apa adanya
}

/** Ambil env wajib — throw dengan pesan jelas kalau kosong. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env ${name} belum di-set. Lengkapi apps/api/.env (lihat .env.example).`);
  return value;
}

export const PORT = Number(process.env.PORT ?? 4000);

// Default loopback: di VPS API hanya dikonsumsi nginx + Next.js di host yang
// sama, jadi jangan buka ke publik. Set HOST=0.0.0.0 hanya bila memang perlu
// (mis. container).
export const HOST = process.env.HOST ?? '127.0.0.1';
