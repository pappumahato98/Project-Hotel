import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const area = searchParams.get('area')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category
    if (area) where.area = area
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { assignedByName: { contains: search } },
      ]
    }

    const items = await db.hkWorkFlow.findMany({
      where,
      include: {
        room: {
          select: { id: true, number: true, floor: true, wing: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { requestedDate: 'asc' },
      ],
    })

    const summary = {
      total: items.length,
      open: items.filter((i) => i.status === 'open').length,
      inProgress: items.filter((i) => i.status === 'in_progress').length,
      completed: items.filter((i) => i.status === 'completed').length,
    }

    return NextResponse.json({ items, summary })
  } catch (error) {
    console.error('Workflow GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch workflow items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { action } = body

    // ─── Create new workflow task ─────────────────────────
    if (action === 'create') {
      const { title, description, priority, category, area, roomId, assignedTo, assignedByName, dueDate } = body
      if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

      const item = await db.hkWorkFlow.create({
        data: {
          title,
          description: description || null,
          priority: priority || 'low',
          category: category || 'maintenance',
          area: area || null,
          roomId: roomId || null,
          assignedTo: assignedTo || null,
          assignedByName: assignedByName || null,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      })
      return NextResponse.json(item, { status: 201 })
    }

    // ─── Update workflow task status ──────────────────────
    if (action === 'update-status') {
      const { id, status } = body
      if (!id || !status) return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })

      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') updateData.completedAt = new Date()

      const item = await db.hkWorkFlow.update({
        where: { id },
        data: updateData,
      })
      return NextResponse.json(item)
    }

    // ─── Update workflow task (full) ──────────────────────
    if (action === 'update') {
      const { id, title, description, priority, category, area, roomId, assignedTo, assignedByName, dueDate } = body
      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

      const updateData: Record<string, unknown> = {}
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (priority !== undefined) updateData.priority = priority
      if (category !== undefined) updateData.category = category
      if (area !== undefined) updateData.area = area
      if (roomId !== undefined) updateData.roomId = roomId || null
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null
      if (assignedByName !== undefined) updateData.assignedByName = assignedByName || null
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

      const item = await db.hkWorkFlow.update({
        where: { id },
        data: updateData,
      })
      return NextResponse.json(item)
    }

    // ─── Delete workflow task ─────────────────────────────
    if (action === 'delete') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

      await db.hkWorkFlow.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Workflow POST error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
