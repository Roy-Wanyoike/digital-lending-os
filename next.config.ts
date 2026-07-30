import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment.
  // Static assets are copied separately in the Dockerfile
  // (COPY --from=builder /app/.next/static ./.next/static).
  output: "standalone",

  // Security: remove the X-Powered-By response header
  poweredByHeader: false,

  // Enable React strict mode for catching common bugs early
  reactStrictMode: true,

  // TypeScript type-checking is handled separately via `tsc --noEmit` in CI.
  // Skipping here avoids OOM in memory-constrained build environments
  // (tsc needs ~400MB+ which exceeds container limits; compilation itself is fine).
  typescript: {
    ignoreBuildErrors: true,
  },

  // bcryptjs uses native bindings that must remain external to the bundle
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
