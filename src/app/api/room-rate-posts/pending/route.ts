import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

// GET /api/room-rate-posts/pending — Get pending rate posts for today
// Finds all checked_in reservations missing today's room rate post
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // 1. Find all checked-in reservations
    const checkedInReservations = await db.reservation.findMany({
      where: {
        status: 'checked_in',
      },
      include: {
        guest: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        room: {
          select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true } } },
        },
        folios: {
          select: { id: true, balance: true, status: true },
        },
      },
      orderBy: { checkIn: 'asc' },
    })

    // 2. For each reservation, check if today's rate has been posted
    const pending: typeof checkedInReservations = []

    for (const reservation of checkedInReservations) {
      // Check if a rate post exists for today
      const todayPost = await db.roomRatePost.findFirst({
        where: {
          reservationId: reservation.id,
          postDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        select: { id: true },
      })

      // If no post found for today, this reservation is pending
      if (!todayPost) {
        pending.push(reservation)
      }
    }

    return NextResponse.json({
      pending,
      count: pending.length,
      date: todayStart.toISOString().split('T')[0],
    })
  } catch (error) {
    console.error('Pending rate posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending rate posts' },
      { status: 500 }
    )
  }
}