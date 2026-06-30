import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Fields allowed to be updated via PATCH
const ALLOWED_FIELDS = new Set([
  'status',
  'roomId',
  'roomTypeId',
  'ratePlanId',
  'guestId',
  'checkIn',
  'checkOut',
  'adults',
  'children',
  'roomRate',
  'totalAmount',
  'paidAmount',
  'specialRequests',
  'source',
  'paymentStatus',
  'guaranteed',
  'notes',
  'company',
  'poNumber',
  'bookedBy',
  'reservationType',
])

const DATE_FIELDS = ['checkIn', 'checkOut'] as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        guest: true,
        room: { include: { type: true } },
        folios: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        },
        property: { select: { id: true, name: true, currency: true, taxRate: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Reservation detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ─── Whitelist: only allow known fields ───────────────────────
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        // Convert date strings to Date objects for Prisma
        if (DATE_FIELDS.includes(key as typeof DATE_FIELDS[number]) && typeof value === 'string') {
          const parsed = new Date(value)
          if (!isNaN(parsed.getTime())) {
            updateData[key] = parsed
          }
        } else {
          updateData[key] = value
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // ─── Validate dates if changing ───────────────────────────────
    if (updateData.checkIn && updateData.checkOut) {
      const ci = new Date(updateData.checkIn as string)
      const co = new Date(updateData.checkOut as string)
      if (co <= ci) {
        return NextResponse.json(
          { error: 'Check-out must be after check-in' },
          { status: 400 }
        )
      }
    }

    // ─── Validate roomId exists if changing room ──────────────────
    if (updateData.roomId) {
      const roomExists = await db.room.findUnique({ where: { id: updateData.roomId as string } })
      if (!roomExists) {
        return NextResponse.json({ error: 'Target room not found' }, { status: 400 })
      }
    }

    // ─── Room availability validation ──────────────────────────────
    const isRoomOrDateChange = 'roomId' in body || 'checkIn' in body || 'checkOut' in body
    if (isRoomOrDateChange) {
      // Fetch the current reservation to resolve effective values
      const currentRes = await db.reservation.findUnique({
        where: { id },
        select: { roomId: true, checkIn: true, checkOut: true },
      })
      if (!currentRes) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }

      const effectiveRoomId = (updateData.roomId as string) ?? currentRes.roomId
      const effectiveCheckIn = (updateData.checkIn as Date) ?? currentRes.checkIn
      const effectiveCheckOut = (updateData.checkOut as Date) ?? currentRes.checkOut

      // Only check if we have a valid room and both dates
      if (effectiveRoomId && effectiveCheckIn && effectiveCheckOut) {
        const excludedStatuses = ['cancelled', 'no_show', 'checked_out']

        const conflicting = await db.reservation.findFirst({
          where: {
            id: { not: id },
            roomId: effectiveRoomId,
            status: { notIn: excludedStatuses },
            checkIn: { lt: effectiveCheckOut },
            checkOut: { gt: effectiveCheckIn },
          },
          include: {
            room: { select: { number: true } },
            guest: { select: { firstName: true, lastName: true } },
          },
        })

        if (conflicting) {
          const roomNumber = conflicting.room?.number ?? effectiveRoomId
          const guestName = conflicting.guest
            ? `${conflicting.guest.firstName} ${conflicting.guest.lastName}`
            : 'Unknown'
          const ci = effectiveCheckIn instanceof Date
            ? effectiveCheckIn.toISOString().slice(0, 10)
            : String(effectiveCheckIn)
          const co = effectiveCheckOut instanceof Date
            ? effectiveCheckOut.toISOString().slice(0, 10)
            : String(effectiveCheckOut)

          return NextResponse.json(
            { error: `Room ${roomNumber} is not available for ${ci} – ${co}. It conflicts with reservation ${conflicting.confirmationNo} (${guestName}).` },
            { status: 409 }
          )
        }
      }
    }

    // ─── Room status side-effects for check-in / check-out ─────────
    if (updateData.status === 'checked_in' && updateData.roomId) {
      await db.room.update({
        where: { id: updateData.roomId as string },
        data: { status: 'occupied' },
      })
    }

    // If checking out, update the OLD room status (fetch current reservation first)
    if (updateData.status === 'checked_out') {
      const currentRes = await db.reservation.findUnique({
        where: { id },
        select: { roomId: true },
      })
      if (currentRes?.roomId) {
        await db.room.update({
          where: { id: currentRes.roomId },
          data: { status: 'vacant_dirty' },
        })
      }
    }

    // ─── If changing room for a checked-in guest, update room statuses ──
    if (updateData.roomId && !updateData.status) {
      const currentRes = await db.reservation.findUnique({
        where: { id },
        select: { roomId: true, status: true },
      })
      if (currentRes?.status === 'checked_in' && currentRes?.roomId && currentRes.roomId !== updateData.roomId) {
        // Free the old room
        await db.room.update({
          where: { id: currentRes.roomId },
          data: { status: 'vacant_dirty' },
        })
        // Occupy the new room
        await db.room.update({
          where: { id: updateData.roomId as string },
          data: { status: 'occupied' },
        })
      }
    }

    const reservation = await db.reservation.update({
      where: { id },
      data: updateData,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
        folios: { select: { id: true, balance: true, status: true } },
      },
    })

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Update reservation error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to update reservation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Free the room if reservation is checked-in
    const res = await db.reservation.findUnique({
      where: { id },
      select: { roomId: true, status: true },
    })
    if (res?.roomId && res.status === 'checked_in') {
      await db.room.update({
        where: { id: res.roomId },
        data: { status: 'vacant_dirty' },
      })
    }

    await db.reservation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete reservation error:', error)
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
  }
}
