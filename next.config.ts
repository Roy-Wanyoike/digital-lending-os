import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output only for production builds.
  // In dev, standalone mode adds unnecessary memory overhead
  // that causes OOM in containerized environments with Turbopack.
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  // Security: remove the X-Powered-By response header
  poweredByHeader: false,

  reactStrictMode: true,

  // Keep native/heavy packages external to the server bundle
  serverExternalPackages: ["bcryptjs", "@prisma/client", "ioredis"],

  // Image optimization: prefer modern formats, limit generated sizes
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
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
