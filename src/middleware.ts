import { NextRequest, NextResponse } from 'next/server'

/**
 * Global API middleware — adds Cache-Control headers to all /api/* GET responses.
 *
 * This is the CDN layer: it ensures every API response has proper caching
 * directives so browsers and CDNs can serve cached data instantly (0ms).
 *
 * Strategy:
 * - GET /api/dashboard/*   → 15s max-age, 60s SWR (changes frequently)
 * - GET /api/rooms, /api/reservations, /api/folio → 30s max-age, 120s SWR
 * - GET /api/settings, /api/reports/*  → 60s max-age, 300s SWR
 * - GET /api/health  → 30s max-age (health checks are frequent)
 * - All other GET /api/*  → 30s max-age, 120s SWR
 * - POST/PUT/PATCH/DELETE → no-cache (mutations always hit server)
 */

const CACHE_RULES: Array<{
  pattern: RegExp
  maxAge: number
  swr: number
}> = [
  // Dashboard — highest change rate
  { pattern: /\/api\/dashboard\//, maxAge: 15, swr: 60 },
  // POS — active orders change frequently
  { pattern: /\/api\/pos\//, maxAge: 15, swr: 60 },
  // Operations — cashier, shifts
  { pattern: /\/api\/operations\//, maxAge: 15, swr: 60 },
  // Real-time endpoints
  { pattern: /\/api\/config\/realtime/, maxAge: 0, swr: 0 },
  // Reports — change rarely
  { pattern: /\/api\/reports\//, maxAge: 60, swr: 300 },
  // Settings — very stable
  { pattern: /\/api\/settings/, maxAge: 60, swr: 300 },
  // Health — Render health checks every 15-30s
  { pattern: /\/api\/health/, maxAge: 30, swr: 60 },
  // Revenue, channels — moderate
  { pattern: /\/api\/revenue\//, maxAge: 30, swr: 120 },
  { pattern: /\/api\/channels\//, maxAge: 30, swr: 120 },
  // Accounting — moderate
  { pattern: /\/api\/accounting\//, maxAge: 30, swr: 120 },
  { pattern: /\/api\/trial-balance\//, maxAge: 30, swr: 120 },
  { pattern: /\/api\/budget\//, maxAge: 30, swr: 120 },
  { pattern: /\/api\/cash-flow\//, maxAge: 30, swr: 120 },
  { pattern: /\/api\/invoices\//, maxAge: 30, swr: 120 },
]

const DEFAULT_API_CACHE = { maxAge: 30, swr: 120 }

function getCacheRule(pathname: string): { maxAge: number; swr: number } {
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(pathname)) return rule
  }
  return DEFAULT_API_CACHE
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept /api/* GET requests
  if (!pathname.startsWith('/api/') || request.method !== 'GET') {
    return NextResponse.next()
  }

  const rule = getCacheRule(pathname)
  const response = NextResponse.next()

  if (rule.maxAge === 0) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  }

  // Set Cache-Control with SWR
  response.headers.set(
    'Cache-Control',
    `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`,
  )

  // CDN-Cache-Control for edge caching (Cloudflare, Fastly, etc.)
  response.headers.set(
    'CDN-Cache-Control',
    `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`,
  )

  // Vary on Authorization so each user gets their own cached version
  response.headers.set('Vary', 'Authorization')

  return response
}

export const config = {
  // Match all API routes
  matcher: '/api/:path*',
}
