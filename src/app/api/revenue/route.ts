import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

// Nepal timezone offset: UTC+5:45
function getNepalToday(): Date {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 5 * 3600000 + 45 * 60000)
}

// Generate demand calendar from real reservation data for the next 30 days
async function generateDemandCalendar() {
  const today = getNepalToday()
  today.setHours(0, 0, 0, 0)

  // Fetch rooms count
  const totalRooms = await db.room.count()

  // Fetch reservations that overlap the next 30 days
  const startDate = today
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)

  const reservations = await db.reservation.findMany({
    where: {
      status: { in: ['confirmed', 'checked_in'] },
      OR: [
        { checkIn: { lt: endDate } },
        { checkOut: { gt: startDate } },
      ],
    },
    select: {
      checkIn: true,
      checkOut: true,
      status: true,
    },
  })

  const days = []
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const nextDay = new Date(date)
    nextDay.setDate(date.getDate() + 1)

    // Count guests in-house on this day
    const inHouseCount = reservations.filter((r) =>
      r.checkIn < nextDay && r.checkOut > date && r.status === 'checked_in'
    ).length

    // Count expected check-ins (confirmed arriving today)
    const arrivalsCount = reservations.filter((r) =>
      r.checkIn >= date && r.checkIn < nextDay && r.status === 'confirmed'
    ).length

    const occupancy = totalRooms > 0 ? Math.round((inHouseCount / totalRooms) * 100) : 0
    const demandLevel = occupancy > 80 ? 'high' : occupancy > 50 ? 'medium' : 'low'

    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      demandLevel,
      occupancy,
      availableRooms: Math.max(0, totalRooms - inHouseCount),
      totalRooms,
    })
  }

  return days
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    // Fetch rate plans from DB
    const ratePlans = await db.ratePlan.findMany({
      include: { roomType: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    const mappedPlans = ratePlans.map((rp) => ({
      id: rp.id,
      name: rp.name,
      roomType: rp.roomType?.name || 'All',
      baseRate: rp.baseRate,
      channel: rp.channel || 'Direct',
      active: rp.active,
    }))

    // Fetch active rate rules from DB
    const roomRatePostings = await db.roomRatePosting.findMany({
      where: {
        status: 'active',
        endDate: { gte: new Date() },
      },
      include: { roomType: { select: { name: true } } },
      orderBy: { startDate: 'asc' },
    })

    const pricingRules = roomRatePostings.map((rr) => ({
      id: rr.id,
      name: rr.description || `Rate: ${rr.rateType}`,
      type: rr.rateType === 'increase' ? 'surcharge' : rr.rateType === 'decrease' ? 'discount' : 'override',
      value: rr.amount || 0,
      appliesTo: rr.roomType?.name || 'All Room Types',
      dates: `${rr.startDate?.toISOString().split('T')[0] ?? ''} - ${rr.endDate?.toISOString().split('T')[0] ?? ''}`,
      active: rr.status === 'active',
    }))

    // Demand calendar from real reservation data
    const demandCalendar = await generateDemandCalendar()
    const highDays = demandCalendar.filter((d) => d.demandLevel === 'high').length
    const mediumDays = demandCalendar.filter((d) => d.demandLevel === 'medium').length
    const lowDays = demandCalendar.filter((d) => d.demandLevel === 'low').length

    return NextResponse.json({
      demandCalendar,
      ratePlans: mappedPlans,
      pricingRules,
      summary: { highDays, mediumDays, lowDays },
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'create_rate_plan') {
      const ratePlan = await db.ratePlan.create({
        data: {
          name: data.name,
          code: data.code || `RP-${Date.now()}`,
          propertyId: data.propertyId || '',
          roomTypeId: data.roomTypeId || null,
          baseRate: data.baseRate || 0,
          channel: data.channel || 'direct',
          active: data.active !== false,
        },
      })
      broadcastEvent('rate_plan:created', ratePlan)
      return NextResponse.json(ratePlan, { status: 201 })
    }

    if (action === 'create_daily_rate') {
      const dailyRate = await db.dailyRate.create({
        data: {
          ratePlanId: data.ratePlanId,
          date: new Date(data.date),
          rate: data.rate,
          available: data.available || 0,
        },
      })
      broadcastEvent('daily_rate:created', dailyRate)
      return NextResponse.json(dailyRate, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Revenue POST error:', error)
    return NextResponse.json({ error: 'Failed to create revenue data' }, { status: 500 })
  }
}
