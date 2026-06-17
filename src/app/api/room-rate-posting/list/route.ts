import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Date helpers ─────────────────────────────────────────
function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ──────────────────────────────────────────────────────────
// GET /api/room-rate-posting/list
// Fetches ALL rate postings across the property with filters
// Query params: status, dateFrom, dateTo, roomId, search, page, limit
// ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')           // posted | voided | adjusted | all
    const dateFrom = searchParams.get('dateFrom')       // YYYY-MM-DD
    const dateTo = searchParams.get('dateTo')           // YYYY-MM-DD
    const roomId = searchParams.get('roomId')
    const search = searchParams.get('search')?.trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.postingDate = {} as Record<string, unknown>
      if (dateFrom) {
        (where.postingDate as Record<string, unknown>).gte = new Date(dateFrom + 'T00:00:00.000Z')
      }
      if (dateTo) {
        (where.postingDate as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    if (roomId) {
      where.roomId = roomId
    }

    // Search by guest name, reservation confirmation no, or room number
    let reservationWhere: Record<string, unknown> | undefined
    if (search) {
      reservationWhere = {
        OR: [
          { confirmationNo: { contains: search } },
          { guest: { OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ]}},
        ],
      }
    }

    const skip = (page - 1) * limit

    const [postings, total] = await Promise.all([
      db.roomRatePosting.findMany({
        where: {
          ...where,
          ...(reservationWhere ? { reservation: reservationWhere } : {}),
        },
        include: {
          reservation: {
            select: {
              id: true,
              confirmationNo: true,
              status: true,
              checkIn: true,
              checkOut: true,
              roomRate: true,
              guest: {
                select: { id: true, firstName: true, lastName: true },
              },
              room: {
                select: { id: true, number: true, type: { select: { name: true } } },
              },
            },
          },
          folio: {
            select: {
              id: true,
              balance: true,
              status: true,
            },
          },
        },
        orderBy: { postingDate: 'desc' },
        skip,
        take: limit,
      }),
      db.roomRatePosting.count({
        where: {
          ...where,
          ...(reservationWhere ? { reservation: reservationWhere } : {}),
        },
      }),
    ])

    // Calculate summary stats
    const todayStr = toDateOnly(new Date())
    const todayStart = new Date(todayStr + 'T00:00:00.000Z')
    const todayEnd = new Date(todayStr + 'T23:59:59.999Z')

    const [totalPosted, postedToday, inHouseCount, voidedCount] = await Promise.all([
      db.roomRatePosting.count({ where: { status: 'posted' } }),
      db.roomRatePosting.count({
        where: {
          status: 'posted',
          postingDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.reservation.count({ where: { status: { in: ['in-house', 'checked_in'] } } }),
      db.roomRatePosting.count({ where: { status: 'voided' } }),
    ])

    const totalRevenue = await db.roomRatePosting.aggregate({
      where: { status: 'posted' },
      _sum: { totalAmount: true },
    })

    const todayRevenue = await db.roomRatePosting.aggregate({
      where: {
        status: 'posted',
        postingDate: { gte: todayStart, lte: todayEnd },
      },
      _sum: { totalAmount: true },
    })

    return NextResponse.json({
      postings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalPosted,
        postedToday,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        inHouseReservations: inHouseCount,
        voidedCount,
      },
    })
  } catch (error) {
    console.error('Room Rate Posting list GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate postings' },
      { status: 500 },
    )
  }
}