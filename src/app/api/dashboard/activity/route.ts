import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { fetchActivity } from '../_data'

export const maxDuration = 15

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const data = await fetchActivity()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[dashboard/activity] error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity', detail: msg.substring(0, 500) },
      { status: 500 },
    )
  }
}
