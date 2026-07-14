import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

// Generate demand calendar for the next 30 days
function generateDemandCalendar() {
  const days = []
  const today = new Date()
  const pattern = [
    'medium', 'high', 'high', 'high', 'medium', 'high', 'high',
    'medium', 'medium', 'low', 'low', 'medium', 'medium', 'low',
    'low', 'medium', 'high', 'high', 'medium', 'medium',
    'high', 'high', 'high', 'medium', 'medium', 'low', 'low',
    'medium', 'medium', 'high',
  ]

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dayOfWeek = date.getDay()
    const level = pattern[i % pattern.length]
    const adjustedLevel = (dayOfWeek === 0 || dayOfWeek === 6) && level === 'low' ? 'medium' : level

    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      demandLevel: adjustedLevel,
      occupancy: adjustedLevel === 'high' ? Math.floor(Math.random() * 10) + 85 : adjustedLevel === 'medium' ? Math.floor(Math.random() * 15) + 60 : Math.floor(Math.random() * 20) + 30,
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

    const demandCalendar = generateDemandCalendar()
    const highDays = demandCalendar.filter((d) => d.demandLevel === 'high').length
    const mediumDays = demandCalendar.filter((d) => d.demandLevel === 'medium').length
    const lowDays = demandCalendar.filter((d) => d.demandLevel === 'low').length

    // Pricing rules (stored as static config since they don't need a separate table)
    const pricingRules = [
      { id: 'rule-001', name: 'High Season Surcharge', type: 'surcharge', value: 20, appliesTo: 'All Room Types', dates: 'Oct 1 - Dec 31', active: true },
      { id: 'rule-002', name: 'Early Bird Discount', type: 'discount', value: 15, appliesTo: 'All Room Types', dates: 'Book 14+ days in advance', active: true },
      { id: 'rule-003', name: 'Last Minute Premium', type: 'surcharge', value: 10, appliesTo: 'Standard & Deluxe', dates: 'Same day booking', active: true },
      { id: 'rule-004', name: 'Festival Season Premium', type: 'surcharge', value: 30, appliesTo: 'All Room Types', dates: 'Dashain & Tihar period', active: false },
      { id: 'rule-005', name: 'Extended Stay Discount', type: 'discount', value: 25, appliesTo: 'All Room Types', dates: 'Stay 14+ nights', active: true },
    ]

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
