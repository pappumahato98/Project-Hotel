import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  staticPageGenerationTimeout: 120,
  // Turbopack config (Next.js 16 default)
  turbopack: {},
  // Webpack fallback config
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
            framework: {
              name: 'framework',
              chunks: 'all' as const,
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
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
  allowedDevOrigins: [
    '*.space-z.ai',
    '127.0.0.1',
    'localhost',
  ],
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
