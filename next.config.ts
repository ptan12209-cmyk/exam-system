import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate unique build ID to bust browser cache on each deploy
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Explicitly use webpack (avoid turbopack conflicts)
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.supabase.co https://*.youtube.com https://i.ytimg.com",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://api-merchant.payos.vn",
          "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://iframe.mediadelivery.net https://*.mediadelivery.net https://challenges.cloudflare.com",
          "media-src 'self' blob: https://*.supabase.co https://*.mediadelivery.net",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ];

    return [
      {
        // Only apply no-cache to HTML pages, not static assets
        source: '/((?!_next/static|_next/image|icons|fonts|favicon\\.ico|manifest\\.json|sw\\.js).*)',
        headers: [
          // private + must-revalidate: browser may revalidate without public CDN caching auth HTML
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          ...securityHeaders,
        ],
      },
    ];
  },
  // Required for react-pdf (canvas SSR polyfill)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
