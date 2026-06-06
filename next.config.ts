import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Increase static page generation timeout for large components
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
