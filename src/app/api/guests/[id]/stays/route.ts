import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/guests/[id]/stays — Fetch guest's past and current stays
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const guest = await db.guest.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    const reservations = await db.reservation.findMany({
      where: {
        guestId: id,
        status: { in: ['checked_in', 'checked_out'] },
      },
      orderBy: { checkIn: 'desc' },
      take: 20,
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        room: { select: { number: true } },
      },
    })

    const stays = reservations.map((r) => ({
      id: r.id,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      roomNumber: r.room?.number || 'N/A',
      status: r.status,
      guestName: `${guest.firstName} ${guest.lastName}`,
    }))

    return NextResponse.json(stays)
  } catch (error) {
    console.error('Fetch guest stays error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}