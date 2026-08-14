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
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const where: Prisma.RequisitionWhereInput = {}

    if (department) where.department = department
    if (status) where.status = status

    const requisitions = await db.requisition.findMany({ where, orderBy: { requestDate: 'desc' } })

    const total = requisitions.length
    const pending = requisitions.filter((r) => r.status === 'pending').length
    const approved = requisitions.filter((r) => r.status === 'approved').length
    const received = requisitions.filter((r) => r.status === 'received').length

    return cachedJson({ requisitions, total, summary: { pending, approved, received } }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Requisitions API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch requisitions', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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
    return NextResponse.json(requisition, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Requisitions POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create requisition', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return cachedError('ID is required', 400)
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
    return NextResponse.json(requisition, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Requisitions PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update requisition', 500, msg.substring(0, 300))
  }
}
