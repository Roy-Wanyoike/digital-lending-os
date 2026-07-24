import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Required for next-auth in standalone output
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
