import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

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

    return NextResponse.json({ calls })
  } catch (error) {
    console.error('WakeUpCalls GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wake-up calls' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { reservationId, roomId, roomNumber, guestName, scheduledTime, phoneExtension, notes, date } = body

    if (!roomNumber || !guestName || !scheduledTime) {
      return NextResponse.json({ error: 'roomNumber, guestName, and scheduledTime are required' }, { status: 400 })
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

    return NextResponse.json({ call }, { status: 201 })
  } catch (error) {
    console.error('WakeUpCalls POST error:', error)
    return NextResponse.json({ error: 'Failed to create wake-up call' }, { status: 500 })
  }
}