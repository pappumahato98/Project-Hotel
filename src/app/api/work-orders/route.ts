import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    const where: Prisma.WorkOrderWhereInput = {}

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (category) {
      where.category = category
    }

    const workOrders = await db.workOrder.findMany({
      where,
      include: {
        room: {
          select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true } } },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    const total = await db.workOrder.count({ where })

    // Summary
    const allOrders = await db.workOrder.findMany({ where })
    const summary = {
      total: allOrders.length,
      open: allOrders.filter((o) => o.status === 'open').length,
      assigned: allOrders.filter((o) => o.status === 'assigned').length,
      inProgress: allOrders.filter((o) => o.status === 'in_progress').length,
      completed: allOrders.filter((o) => o.status === 'completed').length,
      closed: allOrders.filter((o) => o.status === 'closed').length,
      emergency: allOrders.filter((o) => o.priority === 'emergency' && o.status !== 'closed' && o.status !== 'completed').length,
    }

    return NextResponse.json({ workOrders, total, summary })
  } catch (error) {
    console.error('Work Orders API error:', error)
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 })
  }
}
