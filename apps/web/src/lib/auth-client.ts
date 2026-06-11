import { createAuthClient } from 'better-auth/client';

// Relative baseURL: browser hanya bicara ke origin Vercel,
// rewrites meneruskan /api/v1/auth/* ke VPS (DEPENDENCIES.md §0).
export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1/auth`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/v1/auth`,
});
