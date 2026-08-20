import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { afterMutation, getOrSet } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { getHotelNow } from '@/lib/timezone'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// Hotel timezone helper (replaces manual offset math)
function getNepalToday(): Date {
  const d = getHotelNow()
  d.setHours(0, 0, 0, 0)
  return d
}

// Generate demand calendar from real reservation data for the next 30 days
async function generateDemandCalendar() {
  const today = getNepalToday()
  today.setHours(0, 0, 0, 0)

  const startDate = today
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)

  // Fetch rooms count and reservations in parallel
  const [totalRooms, reservations] = await Promise.all([
    db.room.count(),
    db.reservation.findMany({
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
    }),
  ])

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
    const data = await getOrSet('revenue:data', async () => {
      // Fetch rate plans, rate rules, and demand calendar in parallel
      const [ratePlans, roomRatePostings, demandCalendar] = await Promise.all([
        db.ratePlan.findMany({
          include: { roomType: { select: { name: true } } },
          orderBy: { name: 'asc' },
        }),
        db.roomRatePosting.findMany({
          where: {
            status: 'active',
            endDate: { gte: new Date() },
          },
          include: { roomType: { select: { name: true } } },
          orderBy: { startDate: 'asc' },
        }),
        generateDemandCalendar(),
      ])

      const mappedPlans = ratePlans.map((rp) => ({
        id: rp.id,
        name: rp.name,
        roomType: rp.roomType?.name || 'All',
        baseRate: rp.baseRate,
        channel: rp.channel || 'Direct',
        active: rp.active,
      }))

      const pricingRules = roomRatePostings.map((rr) => ({
        id: rr.id,
        name: rr.description || `Rate: ${rr.rateType}`,
        type: rr.rateType === 'increase' ? 'surcharge' : rr.rateType === 'decrease' ? 'discount' : 'override',
        value: rr.amount || 0,
        appliesTo: rr.roomType?.name || 'All Room Types',
        dates: `${rr.startDate?.toISOString().split('T')[0] ?? ''} - ${rr.endDate?.toISOString().split('T')[0] ?? ''}`,
        active: rr.status === 'active',
      }))
      const highDays = demandCalendar.filter((d) => d.demandLevel === 'high').length
      const mediumDays = demandCalendar.filter((d) => d.demandLevel === 'medium').length
      const lowDays = demandCalendar.filter((d) => d.demandLevel === 'low').length

      return {
        demandCalendar,
        ratePlans: mappedPlans,
        pricingRules,
        summary: { highDays, mediumDays, lowDays },
      }
    }, 120000)

    return cachedJson(data, req, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Revenue API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch revenue data', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'create_rate_plan') {
      const ratePlan = await withRetry(() =>
        db.ratePlan.create({
          data: {
            name: data.name,
            code: data.code || `RP-${Date.now()}`,
            propertyId: data.propertyId || '',
            roomTypeId: data.roomTypeId || null,
            baseRate: data.baseRate || 0,
            channel: data.channel || 'direct',
            active: data.active !== false,
          },
        }),
      )
      afterMutation('revenue')
      broadcastEvent('rate_plan:created', ratePlan)
      return NextResponse.json({ ratePlan }, { status: 201, headers: clearCacheHeaders() })
    }

    if (action === 'create_daily_rate') {
      const dailyRate = await withRetry(() =>
        db.dailyRate.create({
          data: {
            ratePlanId: data.ratePlanId,
            date: new Date(data.date),
            rate: data.rate,
            available: data.available || 0,
          },
        }),
      )
      afterMutation('revenue')
      broadcastEvent('daily_rate:created', dailyRate)
      return NextResponse.json({ dailyRate }, { status: 201, headers: clearCacheHeaders() })
    }

    return cachedError('Unknown action', 400)
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Revenue POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create revenue data', 500, msg.substring(0, 300))
  }
}
