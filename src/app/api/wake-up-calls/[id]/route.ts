import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { status, scheduledTime, notes, snoozeCount } = body

    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      data.status = status
      if (status === 'Called') data.calledAt = new Date()
      if (status === 'Completed') data.completedAt = new Date()
    }
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime
    if (notes !== undefined) data.notes = notes || null
    if (snoozeCount !== undefined) data.snoozeCount = snoozeCount

    const call = await db.wakeUpCall.update({
      where: { id },
      data,
    })

    return NextResponse.json({ call }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('WakeUpCalls PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update wake-up call', 500, msg.substring(0, 300))
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.wakeUpCall.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('WakeUpCalls DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete wake-up call', 500, msg.substring(0, 300))
  }
}