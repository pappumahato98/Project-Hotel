import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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

    const summary = {
      total: workOrders.length,
      open: workOrders.filter((o) => o.status === 'open').length,
      assigned: workOrders.filter((o) => o.status === 'assigned').length,
      inProgress: workOrders.filter((o) => o.status === 'in_progress').length,
      completed: workOrders.filter((o) => o.status === 'completed').length,
      closed: workOrders.filter((o) => o.status === 'closed').length,
      emergency: workOrders.filter((o) => o.priority === 'emergency' && o.status !== 'closed' && o.status !== 'completed').length,
    }

    return NextResponse.json({ workOrders, summary })
  } catch (error) {
    console.error('Work Orders API error:', error)
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const workOrder = await withRetry(() =>
      db.workOrder.create({
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
      }),
    )

    afterMutation('work-orders')
    broadcastEvent('work_order:created', workOrder)
    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (error) {
    console.error('Work Orders POST error:', error)
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
  }
}
