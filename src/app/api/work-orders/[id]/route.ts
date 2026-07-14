import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const workOrder = await db.workOrder.findUnique({
      where: { id },
      include: {
        room: {
          select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true } } },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Work Order GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch work order' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.status) data.status = body.status
    if (body.title) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.priority) data.priority = body.priority
    if (body.category) data.category = body.category
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo
    if (body.completedAt) data.completedAt = new Date(body.completedAt)

    const workOrder = await db.workOrder.update({
      where: { id },
      data,
      include: {
        room: {
          select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true } } },
        },
      },
    })

    broadcastEvent('work_order:updated', workOrder)
    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Work Order PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.workOrder.delete({ where: { id } })
    broadcastEvent('work_order:deleted', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Work Order DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 })
  }
}
