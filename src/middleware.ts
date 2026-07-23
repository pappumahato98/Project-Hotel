import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js middleware — API authentication gate.
 *
 * Runs on every `/api/*` request EXCEPT:
 *   - /api/auth/login   (public — how users get their session)
 *   - /api/auth/logout  (public — clearing client state)
 *   - /api              (health check / root)
 *
 * Strategy:
 *   1. Check for `x-user-id` header.  → 401 if missing.
 *   2. If present, attach a lightweight `x-authenticated: true` header
 *      and let individual route handlers do the DB lookup (Prisma is
 *      unreliable inside Next.js Edge middleware due to native bindings).
 *
 * This keeps the middleware lightweight while ensuring every protected
 * route at least receives a user-id hint. Routes that need the full
 * user object should call `requireAuth(req)` or `requireRole(req, ...)`
 * from `@/lib/api-auth`.
 */

// ─── Route whitelist (no auth required) ─────────────────────────

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api']

function isPublicPath(pathname: string): boolean {
  // Exact match on the public paths (without trailing slash variations)
  for (const p of PUBLIC_PATHS) {
    if (pathname === p) return true
    if (p !== '/api' && pathname.startsWith(p + '/')) return true
  }
  return false
}

// ─── CORS helpers ───────────────────────────────────────────────

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS =
  'Content-Type, Authorization, x-user-id, x-request-id'

function addCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

// ─── Middleware ─────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const origin = req.headers.get('origin')

  // ── CORS preflight ──────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    return addCorsHeaders(res, origin)
  }

  // ── Public routes — pass through with CORS headers ──────────
  if (isPublicPath(pathname)) {
    const res = NextResponse.next()
    return addCorsHeaders(res, origin)
  }

  // ── Protected routes — require x-user-id header ─────────────
  const userId = req.headers.get('x-user-id')

  if (!userId || !userId.trim()) {
    const res = NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Provide x-user-id header.',
      },
      { status: 401 },
    )
    return addCorsHeaders(res, origin)
  }

  // Header exists — mark request as authenticated and forward.
  // Individual routes do the real DB validation via `requireAuth()`.
  const res = NextResponse.next()
  res.headers.set('x-authenticated', 'true')
  res.headers.set('x-user-id-incoming', userId.trim())
  return addCorsHeaders(res, origin)
}

// ─── Matcher ────────────────────────────────────────────────────

export const config = {
  matcher: '/api/:path*',
}