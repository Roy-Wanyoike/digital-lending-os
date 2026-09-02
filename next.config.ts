import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output only for production builds.
  // In dev, standalone mode adds unnecessary memory overhead
  // that causes OOM in containerized environments with Turbopack.
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  // Security: remove the X-Powered-By response header
  poweredByHeader: false,

  reactStrictMode: true,

  // Tree-shake heavy libraries so only the actually-imported symbols
  // are included in each chunk rather than the entire barrel export.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
  },

  // Keep native/heavy packages external to the server bundle.
  // sharp: 33MB of native image libs — not needed (no server-side image optimization)
  // typescript: 8.8MB — only needed at build time, never at runtime
  // @prisma/client: uses external engine, keep external
  // ioredis/redis-parser: optional, external
  // @opentelemetry: telemetry, external
  serverExternalPackages: [
    "sharp",
    "@img/sharp",
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
    "typescript",
    "bcryptjs",
    "@prisma/client",
    "ioredis",
    "redis-parser",
    "@opentelemetry/api",
  ],

  // Image optimization: unoptimized mode avoids bundling 33MB sharp native libs.
  // This is the single biggest bundle size win. AVIF/WebP generation
  // can be offloaded to a CDN or image proxy in production.
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      // Add specific external domains as needed, e.g.:
      // { protocol: "https", hostname: "cdn.digitallendingos.co.ke" },
      // { protocol: "https", hostname: "digitallendingos.co.ke" },
    ],
    minimumCacheTTL: 60,
  },

  // Permanent redirect for legacy /dashboard path
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // Security headers applied to all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(),microphone=(),geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
