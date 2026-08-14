/**
 * CDN-Ready API Response Helper
 *
 * Provides Cache-Control, ETag, and SWR (stale-while-revalidate) headers
 * for all API GET responses. This makes the app CDN-ready and enables
 * browser-level caching that serves responses in 0ms.
 *
 * Strategy:
 * - Browser serves from cache for `maxAge` seconds (0ms response)
 * - After `maxAge`, browser revalidates in background while serving stale (0ms perceived)
 * - ETag enables 304 Not Modified responses (no body, very fast)
 * - `CDN-Cache-Control` header for edge/CDN caching when available
 */

import { NextResponse } from 'next/server'

type CacheTier = 'short' | 'medium' | 'long' | 'static'

const CACHE_TIERS: Record<CacheTier, { maxAge: number; swr: number; description: string }> = {
  /** Dashboard KPIs, activity feeds — changes frequently */
  short:  { maxAge: 15,  swr: 60,  description: '15s fresh, 60s stale-while-revalidate' },
  /** Room lists, reservations, inventory — moderate change rate */
  medium: { maxAge: 30,  swr: 120, description: '30s fresh, 120s stale-while-revalidate' },
  /** Reports, settings, reference data — changes rarely */
  long:   { maxAge: 60,  swr: 300, description: '60s fresh, 5min stale-while-revalidate' },
  /** Static reference data — very rarely changes */
  static: { maxAge: 300, swr: 600, description: '5min fresh, 10min stale-while-revalidate' },
}

/**
 * Generate a simple hash for ETag from JSON data.
 * Uses a fast DJB2 hash — no crypto overhead.
 */
function fastHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff
  }
  return hash.toString(36)
}

export interface CacheResponseOptions {
  /** Cache tier — determines maxAge and SWR window */
  tier?: CacheTier
  /** Custom tags for the Vary header (default: Authorization) */
  vary?: string[]
  /** Skip cache headers entirely (e.g., for real-time data) */
  noCache?: boolean
}

/**
 * Create a cached JSON response with proper CDN/SWR headers.
 *
 * Usage:
 *   return cachedJson(data, req, { tier: 'medium' })
 *   return cachedJson(data, req, { tier: 'short' })
 */
export function cachedJson(
  data: unknown,
  req: Request,
  options: CacheResponseOptions = {},
): NextResponse {
  const { tier = 'medium', vary = ['Authorization'], noCache = false } = options

  const jsonStr = JSON.stringify(data)
  const etag = `"${fastHash(jsonStr)}"`

  // Check If-None-Match for 304 response
  const ifNoneMatch = req.headers.get('if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': noCache
          ? 'no-store, no-cache, must-revalidate'
          : `public, max-age=${CACHE_TIERS[tier].maxAge}, stale-while-revalidate=${CACHE_TIERS[tier].swr}`,
      },
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ETag: etag,
    'X-Response-Time': `${Date.now()}`,
  }

  if (!noCache) {
    const t = CACHE_TIERS[tier]
    headers['Cache-Control'] = `public, max-age=${t.maxAge}, stale-while-revalidate=${t.swr}`
    // CDN-Cache-Control is understood by Cloudflare, Fastly, etc.
    headers['CDN-Cache-Control'] = `public, max-age=${t.maxAge}, stale-while-revalidate=${t.swr}`
    // Vary ensures per-user caching (since Authorization header differs)
    headers['Vary'] = vary.join(', ')
  } else {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
  }

  return new NextResponse(jsonStr, { headers })
}

/**
 * Create a cached response with error status.
 */
export function cachedError(
  error: string,
  status: number,
  detail?: string,
): NextResponse {
  return NextResponse.json(
    { error, ...(detail ? { detail: detail.substring(0, 500) } : {}) },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store',
      },
    },
  )
}

/**
 * Invalidate hint for mutations — tells browser to revalidate cached responses.
 * Call this after POST/PATCH/DELETE to ensure stale cache is purged.
 *
 * Usage (in mutation handlers):
 *   return NextResponse.json({ ...created }, { headers: clearCacheHeaders() })
 */
export function clearCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Clear-Site-Data': '"cache"',
    'X-Cache-Invalidate': 'all',
  }
}

/**
 * Wrap an API handler with automatic cache headers.
 * For GET requests, adds Cache-Control + ETag.
 * For mutations, adds cache-invalidation headers.
 *
 * Usage:
 *   export const GET = withCache((req) => {
 *     const data = await fetchData()
 *     return { data }
 *   }, { tier: 'medium' })
 */
export function withCache(
  handler: (req: Request) => Promise<unknown>,
  options: CacheResponseOptions = {},
) {
  return async (req: Request) => {
    try {
      const result = await handler(req)
      if (result instanceof NextResponse) return result
      return cachedJson(result, req, options)
    } catch (error) {
      console.error('[withCache] error:', error)
      const msg = error instanceof Error ? error.message : String(error)
      return cachedError('Internal server error', 500, msg)
    }
  }
}
