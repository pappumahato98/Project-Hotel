import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const where: Prisma.RequisitionWhereInput = {}

    if (department) where.department = department
    if (status) where.status = status

    const requisitions = await db.requisition.findMany({ where, orderBy: { requestDate: 'desc' } })
    const allReqs = await db.requisition.findMany({ where: {} })

    const total = allReqs.length
    const pending = allReqs.filter((r) => r.status === 'pending').length
    const approved = allReqs.filter((r) => r.status === 'approved').length
    const received = allReqs.filter((r) => r.status === 'received').length

    return NextResponse.json({ requisitions, total, summary: { pending, approved, received } })
  } catch (error) {
    console.error('Requisitions API error:', error)
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const requisition = await db.requisition.create({
      data: {
        department: body.department || '',
        requestor: body.requestor || '',
        items: typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []),
        status: body.status || 'pending',
        priority: body.priority || 'normal',
        totalItems: body.totalItems || 0,
        notes: body.notes || null,
        approvedBy: body.approvedBy || null,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
      },
    })

    broadcastEvent('requisition:created', requisition)
    return NextResponse.json(requisition, { status: 201 })
  } catch (error) {
    console.error('Requisitions POST error:', error)
    return NextResponse.json({ error: 'Failed to create requisition' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const requisition = await db.requisition.update({
      where: { id },
      data: {
        status: data.status ?? undefined,
        priority: data.priority ?? undefined,
        items: typeof data.items === 'string' ? data.items : data.items ? JSON.stringify(data.items) : undefined,
        notes: data.notes ?? undefined,
        approvedBy: data.approvedBy ?? undefined,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      },
    })

    broadcastEvent('requisition:updated', requisition)
    return NextResponse.json(requisition)
  } catch (error) {
    console.error('Requisitions PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update requisition' }, { status: 500 })
  }
}
