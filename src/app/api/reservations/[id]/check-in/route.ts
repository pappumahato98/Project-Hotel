import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

// POST /api/reservations/[id]/check-in — Enhanced check-in endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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
            type: { select: { name: true, code: true, bedConfig: true } },
          },
        },
        folios: {
          select: { id: true, balance: true, status: true },
        },
      },
    })

    if (!reservation) {
      return cachedError('Reservation not found', 404)
    }

    if (!['confirmed', 'tentative'].includes(reservation.status)) {
      return cachedError(`Cannot check in a reservation with status "${reservation.status}". Only confirmed or tentative reservations can be checked in.`, 400)
    }

    // Validate room exists and is not out_of_order if assigned
    if (reservation.roomId && reservation.room) {
      if (reservation.room.status === 'out_of_order') {
        return cachedError(`Room ${reservation.room.number} is out of order and cannot be checked into`, 400)
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

    // Wrap sequential DB writes in withRetry for transient error resilience
    const updatedReservation = await withRetry(async () => {
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
      return db.reservation.update({
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
              type: { select: { name: true, code: true, bedConfig: true } },
            },
          },
          folios: {
            select: { id: true, balance: true, status: true },
          },
        },
      })
    })

    afterMutation('reservations')
    return NextResponse.json({ reservation: updatedReservation }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Check-in error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to check in reservation', 500, msg.substring(0, 300))
  }
}