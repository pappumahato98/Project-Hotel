import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError } from '@/lib/api-response'

// ─── Date helpers ─────────────────────────────────────────
function toDateOnlyLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

// ──────────────────────────────────────────────────────────
// GET /api/room-rate-posting/pending
// Returns all in-house reservations with unposted nights
// ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all in-house reservations with room, guest, and folio info
    const inHouseReservations = await db.reservation.findMany({
      where: {
        status: { in: ['in-house', 'checked_in'] },
      },
      include: {
        room: { select: { id: true, number: true, type: { select: { name: true } } } },
        guest: { select: { id: true, firstName: true, lastName: true } },
        folios: { select: { id: true, balance: true, status: true } },
      },
      orderBy: { checkIn: 'asc' },
    })

    // For each reservation, check which nights are already posted
    const pendingList = []

    for (const res of inHouseReservations) {
      const checkIn = new Date(res.checkIn)
      checkIn.setHours(0, 0, 0, 0)
      const checkOut = new Date(res.checkOut)
      checkOut.setHours(0, 0, 0, 0)

      // Get existing postings for this reservation
      const existingPostings = await db.roomRatePosting.findMany({
        where: {
          reservationId: res.id,
          status: 'posted',
        },
        select: { postingDate: true },
      })

      const postedDateSet = new Set(
        existingPostings.map((p) => toDateOnlyLocal(new Date(p.postingDate))),
      )

      // Calculate which nights need posting
      const pendingNights: string[] = []
      const postedNights: string[] = []
      const futureNights: string[] = []
      const todayStr = toDateOnlyLocal(today)

      let current = new Date(checkIn)
      while (current < checkOut) {
        const dateStr = toDateOnlyLocal(current)
        if (postedDateSet.has(dateStr)) {
          postedNights.push(dateStr)
        } else if (dateStr <= todayStr) {
          pendingNights.push(dateStr)
        } else {
          futureNights.push(dateStr)
        }
        current = addDays(current, 1)
      }

      if (pendingNights.length > 0) {
        pendingList.push({
          reservationId: res.id,
          confirmationNo: res.confirmationNo,
          guest: res.guest,
          room: res.room,
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          roomRate: res.roomRate,
          folio: res.folios[0] || null,
          pendingNights,
          postedNights,
          futureNights,
          totalNights: pendingNights.length + postedNights.length + futureNights.length,
          pendingAmount: pendingNights.length * res.roomRate,
        })
      }
    }

    // Sort by room number
    pendingList.sort((a, b) => (a.room?.number || '').localeCompare(b.room?.number || '', undefined, { numeric: true }))

    const totalPendingNights = pendingList.reduce((sum, r) => sum + r.pendingNights.length, 0)
    const totalPendingAmount = pendingList.reduce((sum, r) => sum + r.pendingAmount, 0)

    return cachedJson({
      pendingReservations: pendingList,
      summary: {
        totalReservations: pendingList.length,
        totalPendingNights,
        totalPendingAmount,
      },
    }, req, { tier: 'short' })
  } catch (error) {
    console.error('Room Rate Posting pending GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch pending postings', 500, msg.substring(0, 300))
  }
}