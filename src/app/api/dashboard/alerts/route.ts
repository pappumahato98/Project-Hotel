import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { requireDb } from '@/lib/db'
import { fetchAlerts } from '../_data'
import { cachedJson, cachedError } from '@/lib/api-response'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof globalThis.Response) return auth

  const dbErr = await requireDb(req)
  if (dbErr) return dbErr

  try {
    const data = await fetchAlerts()
    return cachedJson(data, req, { tier: 'short' })
  } catch (error) {
    console.error('[dashboard/alerts] error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch alerts', 500, msg)
  }
}
