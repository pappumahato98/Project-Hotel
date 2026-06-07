import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Increase static page generation timeout for large components
  staticPageGenerationTimeout: 120,
  // Webpack optimizations to prevent ChunkLoadError in sandbox
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Merge chunks to reduce the number of files that need to load
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...((config.optimization as Record<string, unknown>)?.splitChunks as Record<string, unknown>),
          // Increase minimum chunk size to reduce number of chunks
          minSize: 20000,
          // Keep maxAsyncRequests and maxInitialRequests low to reduce parallel loading
          maxAsyncRequests: 6,
          maxInitialRequests: 4,
        },
      }
    }
    return config
  },
};

export default nextConfig;
