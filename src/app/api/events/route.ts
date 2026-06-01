import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
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
    })

    const total = await db.event.count({ where })

    const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0)
    const totalDepositsPaid = events.reduce((sum, e) => sum + e.depositPaid, 0)
    const totalDepositsPending = events.reduce((sum, e) => sum + (e.depositAmount - e.depositPaid), 0)

    return NextResponse.json({
      events,
      total,
      summary: { totalRevenue, totalDepositsPaid, totalDepositsPending },
    })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Events POST error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
