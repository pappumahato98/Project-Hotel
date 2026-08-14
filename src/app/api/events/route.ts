import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const eventType = searchParams.get('eventType')

    const where: Prisma.EventWhereInput = {}

    if (status) where.status = status
    if (eventType) where.eventType = eventType

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 50,
    })

    const total = await db.event.count({ where })

    const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0)
    const totalDepositsPaid = events.reduce((sum, e) => sum + e.depositPaid, 0)
    const totalDepositsPending = events.reduce((sum, e) => sum + (e.depositAmount - e.depositPaid), 0)

    return cachedJson({
      events,
      total,
      summary: { totalRevenue, totalDepositsPaid, totalDepositsPending },
    }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Events API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch events', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const event = await db.event.create({
      data: {
        name: body.name,
        organizerName: body.organizerName || '',
        organizerPhone: body.organizerPhone || null,
        organizerEmail: body.organizerEmail || null,
        eventType: body.eventType || 'corporate',
        venue: body.venue || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        expectedPax: body.expectedPax || 0,
        status: body.status || 'tentative',
        totalRevenue: body.totalRevenue || 0,
        depositAmount: body.depositAmount || 0,
        depositPaid: body.depositPaid || 0,
        notes: body.notes || null,
      },
    })

    broadcastEvent('event:created', event)
    return NextResponse.json(event, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Events POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create event', 500, msg.substring(0, 300))
  }
}
