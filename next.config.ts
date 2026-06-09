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
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...((config.optimization as Record<string, unknown>)?.splitChunks as Record<string, unknown>),
          minSize: 20000,
          maxAsyncRequests: 12,
          maxInitialRequests: 4,
          cacheGroups: {
            ...((config.optimization as Record<string, unknown>)?.splitChunks as Record<string, Record<string, unknown>>)?.cacheGroups,
            // React core into its own chunk (always needed, load first)
            framework: {
              name: 'framework',
              chunks: 'all' as const,
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Socket.io into separate chunk (heavy, lazy-loaded)
            socketio: {
              name: 'socketio',
              chunks: 'all' as const,
              test: /[\\/]node_modules[\\/](socket\.io-client|engine\.io-client)[\\/]/,
              priority: 30,
              enforce: true,
            },
          },
        },
      }
    }
    return config
  },
  // Allow preview CDN domain for cross-origin asset loading
  allowedDevOrigins: [
    '*.space-z.ai',
  ],
  // Increase experimental chunk timeout for slow CDN environments
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
