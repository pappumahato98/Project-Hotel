/**
 * Global API error handler — catches pool timeout (P2024) and returns 503.
 *
 * Usage: wrap any route handler with `withApiCatch()`:
 *
 *   export const GET = withApiCatch(async (req) => {
 *     const data = await db.room.findMany()
 *     return NextResponse.json(data)
 *   })
 *
 * This ensures P2024 pool timeout errors ALWAYS return 503 (not 500),
 * even if the route forgets to check `isPoolTimeoutError()`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'

type RouteHandler = (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response | NextResponse>

export function withApiCatch(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      // P2024 pool timeout → 503 (retryable)
      if (isPoolTimeoutError(error)) return poolTimeoutResponse()

      // Log unexpected errors
      console.error('[api-catch] Unhandled error:', error)
      const msg = error instanceof Error ? error.message : String(error)

      // Prisma validation/known request errors → 400
      const code = (error as Record<string, unknown>)?.code
      if (typeof code === 'string' && code.startsWith('P2')) {
        return NextResponse.json(
          { error: 'Request error', code, detail: msg.substring(0, 300) },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }

      // Everything else → 500
      return NextResponse.json(
        { error: 'Internal server error', detail: msg.substring(0, 300) },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }
}
