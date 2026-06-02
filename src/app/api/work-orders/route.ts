import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    const where: Prisma.WorkOrderWhereInput = {}

    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const workOrder = await db.workOrder.create({
      data: {
        title: body.title,
        description: body.description || '',
        priority: body.priority || 'normal',
        status: body.status || 'open',
        category: body.category || 'general',
        roomId: body.roomId || null,
        assignedTo: body.assignedTo || null,
        reportedBy: body.reportedBy || null,
      },
    })

    broadcastEvent('work_order:created', workOrder)
    return NextResponse.json(workOrder, { status: 201 })
  } catch (error) {
    console.error('Work Orders POST error:', error)
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
  }
}
