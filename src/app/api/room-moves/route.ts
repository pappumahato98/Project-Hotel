import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const reservationId = searchParams.get('reservationId')

    const where: Record<string, unknown> = {}
    if (reservationId) {
      where.reservationId = reservationId
    }

    const moves = await db.roomMoveLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await db.roomMoveLog.count({ where })

    return cachedJson({ moves, total }, request, { tier: 'short' })
  } catch (error) {
    console.error('Room moves API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch room moves', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      reservationId,
      confirmationNo,
      fromRoomId,
      fromRoomNumber,
      toRoomId,
      toRoomNumber,
      fromCheckIn,
      toCheckIn,
      fromCheckOut,
      toCheckOut,
      moveType,
      reason,
      changedBy,
      changedByName,
    } = body

    if (!reservationId || !reason) {
      return cachedError('Reservation ID and reason are required', 400)
    }

    const move = await db.roomMoveLog.create({
      data: {
        reservationId,
        confirmationNo: confirmationNo || null,
        fromRoomId: fromRoomId || null,
        fromRoomNumber: fromRoomNumber || null,
        toRoomId: toRoomId || null,
        toRoomNumber: toRoomNumber || null,
        fromCheckIn: fromCheckIn ? new Date(fromCheckIn) : null,
        toCheckIn: toCheckIn ? new Date(toCheckIn) : null,
        fromCheckOut: fromCheckOut ? new Date(fromCheckOut) : null,
        toCheckOut: toCheckOut ? new Date(toCheckOut) : null,
        moveType: moveType || 'room_change',
        reason,
        changedBy: changedBy || null,
        changedByName: changedByName || null,
      },
    })

    return NextResponse.json({ move }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Create room move error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create room move log', 500, msg.substring(0, 300))
  }
}
