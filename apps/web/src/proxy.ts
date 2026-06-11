import { NextResponse, type NextRequest } from 'next/server';

// Guard optimistik: cek keberadaan cookie session Better Auth.
// Validasi session sesungguhnya terjadi di API VPS (requireAuth) —
// proxy hanya mencegah flash halaman dashboard tanpa login (plan 02 P2.1.2).
// Di HTTPS Better Auth memakai prefix __Secure- pada nama cookie.
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
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
