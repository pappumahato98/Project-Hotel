import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { fetchKpis } from '../_data'
import { cachedJson, cachedError } from '@/lib/api-response'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof globalThis.Response) return auth

  try {
    const data = await fetchKpis()
    return cachedJson(data, req, { tier: 'short' })
  } catch (error) {
    console.error('[dashboard/kpis] error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch KPIs', 500, msg)
  }
}
