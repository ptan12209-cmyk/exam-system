import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate unique build ID to bust browser cache on each deploy
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Explicitly use webpack (avoid turbopack conflicts)
  turbopack: {},
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
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
