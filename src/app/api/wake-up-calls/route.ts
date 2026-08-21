import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { date }

    if (status) {
      const statuses = status.split(',').map(s => s.trim())
      if (statuses.length === 1) {
        where.status = statuses[0]
      } else {
        where.status = { in: statuses }
      }
    }

    const calls = await db.wakeUpCall.findMany({
      where,
      orderBy: [{ scheduledTime: 'asc' }],
    })

    return cachedJson({ calls }, request, { tier: 'short' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('WakeUpCalls GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch wake-up calls', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { reservationId, roomId, roomNumber, guestName, scheduledTime, phoneExtension, notes, date } = body

    if (!roomNumber || !guestName || !scheduledTime) {
      return cachedError('roomNumber, guestName, and scheduledTime are required', 400)
    }

    const callDate = date || new Date().toISOString().split('T')[0]

    const call = await db.wakeUpCall.create({
      data: {
        reservationId: reservationId || null,
        roomId: roomId || null,
        roomNumber,
        guestName,
        scheduledTime,
        phoneExtension: phoneExtension || roomNumber,
        notes: notes || null,
        date: callDate,
      },
    })

    return NextResponse.json({ call }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('WakeUpCalls POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create wake-up call', 500, msg.substring(0, 300))
  }
}