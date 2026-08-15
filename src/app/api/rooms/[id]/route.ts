import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const room = await db.room.findUnique({
      where: { id },
      include: {
        type: true,
        property: true,
        reservations: {
          select: {
            id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, adults: true, children: true, source: true,
            guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
          },
          where: { status: { in: ['confirmed', 'checked_in'] } },
          orderBy: { checkIn: 'desc' },
          take: 1,
        },
      },
    })
    if (!room) {
      return cachedError('Room not found', 404)
    }
    return cachedJson({ room }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Room GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch room', 500, msg.substring(0, 300))
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const room = await db.room.findUnique({ where: { id } })
    if (!room) {
      return cachedError('Room not found', 404)
    }

    const updateData: Record<string, unknown> = {}
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    const updated = await withRetry(() =>
      db.room.update({
        where: { id },
        data: updateData,
        include: {
          type: true,
          property: true,
          reservations: {
            select: {
              id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, adults: true, children: true, source: true,
            guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
          },
          where: { status: { in: ['confirmed', 'checked_in'] } },
          orderBy: { checkIn: 'desc' },
          take: 1,
          },
        },
      }),
    )
    afterMutation('rooms')
    return NextResponse.json({ room: updated }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Room PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update room', 500, msg.substring(0, 300))
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const room = await db.room.findUnique({ where: { id } })
    if (!room) {
      return cachedError('Room not found', 404)
    }

    await withRetry(() => db.room.delete({ where: { id } }))
    afterMutation('rooms')
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Room DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete room', 500, msg.substring(0, 300))
  }
}
