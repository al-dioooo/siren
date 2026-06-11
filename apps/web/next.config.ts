import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PPR + 'use cache' (OPTIMIZATIONS.md §2)
  cacheComponents: true,
  reactCompiler: true,
  // echarts/zrender wajib transpile; @siren/shared dikonsumsi sebagai raw TS
  transpilePackages: ['echarts', 'zrender', '@siren/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' }, // static images
      { protocol: 'https', hostname: '*.supabase.co' }, // attachments
    ],
  },
  // Satu origin untuk browser: /api/v1/* diproxy ke VPS (DEPENDENCIES.md §0).
  // Menghilangkan masalah CORS/SameSite cookie.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
