import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/reservations/[id]/check-in — Enhanced check-in endpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { advanceAmount, documentSkipped, checkedInBy } = body

    // 1. Validate reservation exists and status is confirmed/tentative
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            vipLevel: true,
          },
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
            wing: true,
            status: true,
            type: { select: { name: true, code: true } },
          },
        },
        folios: {
          select: { id: true, balance: true, status: true },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!['confirmed', 'tentative'].includes(reservation.status)) {
      return NextResponse.json(
        { error: `Cannot check in a reservation with status "${reservation.status}". Only confirmed or tentative reservations can be checked in.` },
        { status: 400 }
      )
    }

    // Validate room exists and is not out_of_order if assigned
    if (reservation.roomId && reservation.room) {
      if (reservation.room.status === 'out_of_order') {
        return NextResponse.json(
          { error: `Room ${reservation.room.number} is out of order and cannot be checked into` },
          { status: 400 }
        )
      }
    }

    // 2. Build update data
    const updateData: Record<string, unknown> = {
      status: 'checked_in',
    }

    // Handle advance amount
    const effectiveAdvance = advanceAmount && advanceAmount > 0 ? advanceAmount : 0
    if (effectiveAdvance > 0) {
      updateData.advanceAmount = effectiveAdvance
      updateData.paidAmount = {
        increment: effectiveAdvance,
      }
    }

    // 3. Update room status to occupied if roomId is assigned
    if (reservation.roomId) {
      await db.room.update({
        where: { id: reservation.roomId },
        data: { status: 'occupied' },
      })
    }

    // 4. Create a guest folio if not exists
    if (reservation.guestId) {
      const existingFolio = await db.folio.findFirst({
        where: {
          reservationId: id,
          guestId: reservation.guestId,
          folioType: 'guest',
        },
      })

      if (!existingFolio) {
        await db.folio.create({
          data: {
            reservationId: id,
            guestId: reservation.guestId,
            folioType: 'guest',
            status: 'open',
            balance: 0,
          },
        })
      }
    }

    // 5. Update the reservation
    const updatedReservation = await db.reservation.update({
      where: { id },
      data: updateData,
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            vipLevel: true,
          },
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
            wing: true,
            type: { select: { name: true, code: true } },
          },
        },
        folios: {
          select: { id: true, balance: true, status: true },
        },
      },
    })

    return NextResponse.json({ reservation: updatedReservation })
  } catch (error) {
    console.error('Check-in error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to check in reservation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}