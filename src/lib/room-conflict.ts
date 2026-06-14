import { db } from '@/lib/db'

export interface RoomConflictInfo {
  conflicting: boolean
  existingReservation: {
    id: string
    confirmationNo: string
    guestName: string
    checkIn: Date
    checkOut: Date
    status: string
    roomNumber: string
  } | null
}

/**
 * Check if a room has an overlapping reservation for given dates.
 * Excludes reservations with statuses that don't block the room:
 *   'cancelled', 'no_show', 'checked_out'
 * Can optionally exclude a specific reservation ID (for edits/updates).
 */
export async function checkRoomConflict(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string
): Promise<RoomConflictInfo> {
  const blockingStatuses = ['confirmed', 'checked_in']

  const overlapping = await db.reservation.findFirst({
    where: {
      roomId,
      status: { in: blockingStatuses },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
    },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      room: { select: { number: true } },
    },
    orderBy: { checkIn: 'asc' },
  })

  if (!overlapping) {
    return { conflicting: false, existingReservation: null }
  }

  return {
    conflicting: true,
    existingReservation: {
      id: overlapping.id,
      confirmationNo: overlapping.confirmationNo,
      guestName: overlapping.guest
        ? `${overlapping.guest.firstName} ${overlapping.guest.lastName}`
        : 'Unknown',
      checkIn: overlapping.checkIn,
      checkOut: overlapping.checkOut,
      status: overlapping.status,
      roomNumber: overlapping.room?.number ?? '—',
    },
  }
}