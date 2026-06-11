import { NextResponse, type NextRequest } from 'next/server';

// Guard optimistik: cek keberadaan cookie session Better Auth.
// Validasi session sesungguhnya terjadi di API VPS (requireAuth) —
// proxy hanya mencegah flash halaman dashboard tanpa login (plan 02 P2.1.2).
const SESSION_COOKIE = 'better-auth.session_token';

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
