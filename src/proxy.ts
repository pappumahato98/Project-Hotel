/**
 * Next.js 16 Proxy — replaces the deprecated middleware.ts convention.
 *
 * Two responsibilities:
 * 1. Page routes: no-op pass-through (JWT auth handled by API routes directly)
 * 2. API GET routes: add Cache-Control / CDN-Cache-Control headers for edge caching
 *
 * With self-contained JWT auth, the proxy does NOT need to refresh
 * any external session. The access token is stored in memory on the client and
 * sent via Authorization header.
 */
import { type NextRequest, NextResponse } from 'next/server'

// ── Cache rules for API GET responses ─────────────────────────────────────

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
  // Real-time endpoints — no cache
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // For API GET requests, add Cache-Control headers
  if (pathname.startsWith('/api/') && request.method === 'GET') {
    const rule = getCacheRule(pathname)
    const response = NextResponse.next()

    if (rule.maxAge === 0) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return response
    }

    response.headers.set(
      'Cache-Control',
      `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`,
    )
    response.headers.set(
      'CDN-Cache-Control',
      `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`,
    )
    response.headers.set('Vary', 'Authorization')

    return response
  }

  // Page routes: no-op pass-through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, fonts, etc.)
     *
     * NOTE: API routes ARE included so we can add Cache-Control headers.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
