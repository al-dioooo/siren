import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  agency: { id: string; code: string; name: string } | null;
};

/**
 * Ambil profil user dari API VPS dengan meneruskan cookie request.
 * Dipakai layout/page dashboard (Server Component). Redirect ke /login kalau 401.
 */
export async function getSessionOrRedirect(): Promise<SessionUser> {
  const h = await headers();
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}/api/v1/me`, {
    headers: { cookie: h.get('cookie') ?? '' },
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`API /me gagal: ${res.status}`);
  return res.json();
}
