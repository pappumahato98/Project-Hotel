/**
 * Session refresh middleware — stubbed out.
 *
 * Auth is now self-contained JWT. Token refresh happens via
 * POST /api/auth/refresh (handled by the client in api.ts).
 * This file is kept as a stub for any remaining imports.
 */
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request })
}
