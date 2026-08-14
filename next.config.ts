import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  staticPageGenerationTimeout: 120,
  // Turbopack config
  turbopack: {},
  // Compress responses (gzip/brotli) for faster transfers
  compress: true,
  // ─── API Proxy: Vercel (frontend) → Render (backend) ────────────
  // When NEXT_PUBLIC_API_URL is set (e.g. on Vercel), all /api/* requests
  // are proxied to the backend. Cookies, auth headers, and sessions work
  // transparently — no CORS needed.
  //
  // Setup on Vercel:
  //   NEXT_PUBLIC_API_URL = https://meridian-pms.onrender.com
  //
  // On Render (monolith), leave unset — API routes serve directly.
  async rewrites() {
    if (!API_URL) return []
    const base = API_URL.replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
    ]
  },
  // Webpack fallback config
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      ioredis: false,
    }
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
            // Cache heavy UI libraries separately for better caching
            ui: {
              name: 'ui-vendor',
              chunks: 'all' as const,
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|date-fns|recharts)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
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
  // CDN-ready response headers for static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
};

export default nextConfig;