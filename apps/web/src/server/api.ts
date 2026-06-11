import { headers } from 'next/headers';

/**
 * Fetch ke API VPS dari Server Component / Server Action dengan meneruskan
 * cookie request (plan 07 — Server Actions = wrapper tipis, Prisma hanya di VPS).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  return fetch(`${base}${path}`, {
    ...init,
    headers: { cookie: h.get('cookie') ?? '', ...init?.headers },
    cache: 'no-store',
  });
}
