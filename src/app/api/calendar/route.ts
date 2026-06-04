import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Parse dates or default to today-3 → today+13
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDate = startDateParam
      ? new Date(`${startDateParam}T00:00:00`)
      : new Date(today)
    const endDate = endDateParam
      ? new Date(`${endDateParam}T00:00:00`)
      : new Date(today)

    if (!startDateParam) {
      startDate.setDate(startDate.getDate() - 3)
    }
    if (!endDateParam) {
      endDate.setDate(endDate.getDate() + 13)
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate.' },
        { status: 400 }
      )
    }

    // Get the first property for filtering
    const property = await db.property.findFirst({
      select: { id: true },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'No property configured.' },
        { status: 400 }
      )
    }

    const propertyId = property.id

    // Fetch all rooms for the property, ordered by floor ASC, number ASC
    const rooms = await db.room.findMany({
      where: { propertyId },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      include: {
        type: {
          select: {
            id: true,
            name: true,
            code: true,
            bedConfig: true,
            baseOccupancy: true,
            maxOccupancy: true,
          },
        },
      },
    })

    // Fetch reservations overlapping the date range, excluding cancelled/no_show/checked_out
    const reservations = await db.reservation.findMany({
      where: {
        propertyId,
        checkIn: { lt: endDate },
        checkOut: { gt: startDate },
        status: { notIn: ['cancelled', 'no_show', 'checked_out'] },
      },
      orderBy: { checkIn: 'asc' },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            vipLevel: true,
            nationality: true,
          },
        },
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
            wing: true,
            type: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        folios: {
          select: {
            id: true,
            folioType: true,
            status: true,
            balance: true,
          },
        },
      },
    })

    // Build summary stats
    const totalRooms = rooms.length
    const totalReservations = reservations.length

    // Arrivals: checkIn falls within [startDate, endDate)
    const arrivals = reservations.filter(
      (r) => r.checkIn >= startDate && r.checkIn < endDate
    ).length

    // Departures: checkOut falls within [startDate, endDate)
    const departures = reservations.filter(
      (r) => r.checkOut > startDate && r.checkOut <= endDate
    ).length

    // In-house: currently checked_in
    const inHouse = reservations.filter(
      (r) => r.status === 'checked_in'
    ).length

    return NextResponse.json({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rooms,
      reservations,
      summary: {
        totalRooms,
        totalReservations,
        arrivals,
        departures,
        inHouse,
      },
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}
