import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed "output: standalone" — it causes static asset 404s in Next.js 16.1.3
  // and conflicts with next start. Use 'next start' for production.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin preview iframe requests
  allowedDevOrigins: ["*.space-z.ai"],
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;