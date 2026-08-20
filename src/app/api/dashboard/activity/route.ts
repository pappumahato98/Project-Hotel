import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { requireDb, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { fetchActivity } from '../_data'
import { cachedJson, cachedError } from '@/lib/api-response'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof globalThis.Response) return auth

  const dbErr = await requireDb(req)
  if (dbErr) return dbErr

  try {
    const data = await fetchActivity()
    return cachedJson(data, req, { tier: 'short' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    const code = (error as Record<string, unknown>)?.code ?? ''
    const meta = (error as Record<string, unknown>)?.meta ?? ''
    console.error('[dashboard/activity] error:', { message: error instanceof Error ? error.message : String(error), code, meta, name: error?.constructor?.name })
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch activity', 500, msg)
  }
}
