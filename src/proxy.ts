/**
 * Next.js 16 Proxy — replaces the deprecated middleware.ts convention.
 *
 * With self-contained JWT auth, the proxy does NOT need to refresh
 * any external session. It simply passes through page requests.
 * API routes (/api/*) are excluded via the matcher.
 */
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // No-op: JWT auth is handled by API routes directly.
  // The access token is stored in memory on the client and
  // sent via Authorization header. No middleware session refresh needed.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes (they handle their own auth via Bearer tokens)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, fonts, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
