import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    // Banquet orders are stored as JSON in Event notes
    // First try to load from DB Events with banquet order data
    const events = await db.event.findMany({
      orderBy: { startDate: 'asc' },
      take: 50,
    })

    // Build banquet orders from events — parse order data from event.notes JSON
    const banquetOrders = events.map((event) => {
      // Parse banquet order data from event notes (stored by POST/PATCH handlers)
      let orderData: { items?: Array<{ id?: string; service: string; description: string; quantity: number; unitPrice: number; total: number }>; status?: string; orderDate?: string; totalAmount?: number } = {}
      if (event.notes) {
        try {
          orderData = JSON.parse(event.notes)
        } catch {
          // notes is not JSON — ignore
        }
      }

      const items = orderData.items || []
      const totalAmount = orderData.totalAmount ?? event.totalRevenue ?? 0

      return {
        id: event.id,
        eventId: event.id,
        eventName: event.name,
        orderDate: orderData.orderDate || event.startDate.toISOString().split('T')[0],
        status: orderData.status || (event.status === 'confirmed' ? 'confirmed' : event.status === 'in_progress' ? 'in_progress' : 'draft'),
        items,
        totalAmount,
      }
    })

    const total = banquetOrders.length
    const confirmed = banquetOrders.filter((o) => o.status === 'confirmed').length
    const inProgress = banquetOrders.filter((o) => o.status === 'in_progress').length
    const draft = banquetOrders.filter((o) => o.status === 'draft').length
    const totalAmount = banquetOrders.reduce((s, o) => s + o.totalAmount, 0)

    return cachedJson({
      orders: banquetOrders,
      total,
      summary: { confirmed, inProgress, draft, totalAmount },
    }, req, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Banquet Orders API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch banquet orders', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { eventId, eventName, items, status, orderDate } = body

    // Store banquet order data in the event's notes field as JSON
    const orderData = {
      items,
      status: status || 'draft',
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      totalAmount: items?.reduce((sum: number, item: { total: number }) => sum + item.total, 0) || 0,
    }

    const event = await db.event.update({
      where: { id: eventId },
      data: {
        notes: JSON.stringify(orderData),
        totalRevenue: orderData.totalAmount,
      },
    })

    broadcastEvent('banquet_order:created', { eventId, ...orderData })
    return NextResponse.json({ eventId, ...orderData, event }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Banquet Orders POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create banquet order', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { eventId, status, items, orderDate } = body

    const existing = await db.event.findUnique({ where: { id: eventId } })
    if (!existing) {
      return cachedError('Event not found', 404)
    }

    const existingNotes = existing.notes ? (() => { try { return JSON.parse(existing.notes) } catch { return {} } })() : {}
    const updatedNotes = {
      ...existingNotes,
      ...(items && { items }),
      ...(status && { status }),
      ...(orderDate && { orderDate }),
    }

    const totalAmount = updatedNotes.items?.reduce((sum: number, item: { total: number }) => sum + item.total, 0) || existing.totalRevenue

    const event = await db.event.update({
      where: { id: eventId },
      data: {
        notes: JSON.stringify(updatedNotes),
        totalRevenue: totalAmount,
      },
    })

    broadcastEvent('banquet_order:updated', { eventId, ...updatedNotes })
    return NextResponse.json({ eventId, ...updatedNotes, event }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Banquet Orders PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update banquet order', 500, msg.substring(0, 300))
  }
}
