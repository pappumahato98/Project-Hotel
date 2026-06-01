import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const eventType = searchParams.get('eventType')

    const where: Prisma.EventWhereInput = {}

    if (status) {
      where.status = status
    }

    if (eventType) {
      where.eventType = eventType
    }

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
    })

    const total = await db.event.count({ where })

    // Revenue summary
    const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0)
    const totalDepositsPaid = events.reduce((sum, e) => sum + e.depositPaid, 0)
    const totalDepositsPending = events.reduce((sum, e) => sum + (e.depositAmount - e.depositPaid), 0)

    return NextResponse.json({
      events,
      total,
      summary: {
        totalRevenue,
        totalDepositsPaid,
        totalDepositsPending,
      },
    })
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
