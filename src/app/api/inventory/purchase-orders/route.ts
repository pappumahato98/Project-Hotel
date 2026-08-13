import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ── Helpers ──────────────────────────────────────────────────
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`
  const last = await db.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  })
  const nextNum = last
    ? parseInt(last.poNumber.replace(prefix, ''), 10) + 1
    : 1
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')

    const where: Prisma.PurchaseOrderWhereInput = {}
    if (status) where.status = status
    if (vendorId) where.vendorId = vendorId

    const orders = await db.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Parse JSON items and shape response
    const purchaseOrders = orders.map((o) => ({
      id: o.id,
      poNumber: o.poNumber,
      vendor: o.vendor,
      vendorId: o.vendorId,
      date: o.date.toISOString(),
      expectedDelivery: o.expectedDelivery ?? '',
      items: JSON.parse(o.items || '[]'),
      totalAmount: o.totalAmount,
      priority: o.priority,
      status: o.status,
      notes: o.notes ?? undefined,
      terms: o.terms ?? undefined,
      approvedBy: o.approvedBy ?? undefined,
      approvedAt: o.approvedAt?.toISOString() ?? undefined,
      createdAt: o.createdAt.toISOString(),
    }))

    return cachedJson({ purchaseOrders }, request, { tier: 'medium' })
  } catch (error) {
    console.error('PurchaseOrders GET error:', error)
    return cachedError('Failed to fetch purchase orders', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const poNumber = await generatePONumber()
    const items = body.items || []
    const totalAmount = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + (i.quantity || 0) * (i.unitPrice || 0),
      0,
    )

    const order = await db.purchaseOrder.create({
      data: {
        poNumber,
        vendor: body.vendor,
        vendorId: body.vendorId,
        expectedDelivery: body.expectedDelivery
          ? new Date(body.expectedDelivery)
          : null,
        items: JSON.stringify(items),
        totalAmount,
        priority: (body.priority || 'normal').toLowerCase(),
        status: 'draft',
        notes: body.notes || null,
        terms: body.terms || null,
      },
    })

    broadcastEvent('purchase-order:created', order)
    return NextResponse.json(
      {
        id: order.id,
        poNumber: order.poNumber,
        vendor: order.vendor,
        vendorId: order.vendorId,
        date: order.date.toISOString(),
        expectedDelivery: order.expectedDelivery ?? '',
        items: JSON.parse(order.items || '[]'),
        totalAmount: order.totalAmount,
        priority: order.priority,
        status: order.status,
        notes: order.notes ?? undefined,
        terms: order.terms ?? undefined,
        createdAt: order.createdAt.toISOString(),
      },
      { status: 201, headers: clearCacheHeaders() },
    )
  } catch (error) {
    console.error('PurchaseOrders POST error:', error)
    return cachedError('Failed to create purchase order', 500)
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

    const updateData: Record<string, unknown> = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.terms !== undefined) updateData.terms = data.terms || null
    if (data.expectedDelivery !== undefined)
      updateData.expectedDelivery = data.expectedDelivery
        ? new Date(data.expectedDelivery)
        : null
    if (data.items !== undefined)
      updateData.items =
        typeof data.items === 'string' ? data.items : JSON.stringify(data.items)
    if (data.approvedBy !== undefined)
      updateData.approvedBy = data.approvedBy || null
    if (data.approvedAt !== undefined)
      updateData.approvedAt = data.approvedAt
        ? new Date(data.approvedAt)
        : null

    // Recalculate total if items changed
    if (data.items !== undefined) {
      const parsed =
        typeof data.items === 'string'
          ? JSON.parse(data.items)
          : data.items
      updateData.totalAmount = parsed.reduce(
        (sum: number, i: { quantity: number; unitPrice: number }) =>
          sum + (i.quantity || 0) * (i.unitPrice || 0),
        0,
      )
    }

    const order = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
    })

    broadcastEvent('purchase-order:updated', order)
    return NextResponse.json({
      id: order.id,
      poNumber: order.poNumber,
      vendor: order.vendor,
      vendorId: order.vendorId,
      date: order.date.toISOString(),
      expectedDelivery: order.expectedDelivery ?? '',
      items: JSON.parse(order.items || '[]'),
      totalAmount: order.totalAmount,
      priority: order.priority,
      status: order.status,
      notes: order.notes ?? undefined,
      terms: order.terms ?? undefined,
      approvedBy: order.approvedBy ?? undefined,
      approvedAt: order.approvedAt?.toISOString() ?? undefined,
      createdAt: order.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('PurchaseOrders PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return cachedError('ID is required', 400)
    }

    await db.purchaseOrder.delete({ where: { id } })
    broadcastEvent('purchase-order:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('PurchaseOrders DELETE error:', error)
    return cachedError('Failed to delete purchase order', 500)
  }
}
