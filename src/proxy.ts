/**
 * Next.js 16 Proxy — replaces the deprecated middleware.ts convention.
 *
 * Refreshes the Supabase auth session cookie on each page navigation
 * so the session stays current.  API routes (/api/*) are excluded via the
 * matcher — they validate Bearer tokens directly.
 */
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
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
