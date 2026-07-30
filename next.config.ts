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

  // Fail the build on TypeScript errors — CI handles type-checking separately
  // but we want the build itself to be clean.
  typescript: {
    ignoreBuildErrors: false,
  },

  // bcryptjs uses native bindings that must remain external to the bundle
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
