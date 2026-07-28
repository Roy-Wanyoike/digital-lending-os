import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin preview iframe requests
  allowedDevOrigins: ["*.space-z.ai"],
  // Required for next-auth in standalone output
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;