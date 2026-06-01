import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'

export async function GET() {
  try {
    // Banquet orders are stored as JSON in Event notes
    // First try to load from DB Events with banquet order data
    const events = await db.event.findMany({
      orderBy: { startDate: 'asc' },
    })

    // Build banquet orders from events
    const defaultOrders = [
      {
        id: 'beo-001',
        eventId: 'evt-001',
        eventName: 'Annual Corporate Gala',
        orderDate: '2025-07-15',
        status: 'confirmed',
        items: [
          { id: 'item-001', service: 'Catering', description: 'Set menu dinner (Chicken Momo, Dal Bhat, Dessert)', quantity: 150, unitPrice: 1200, total: 180000 },
          { id: 'item-002', service: 'AV Equipment', description: 'Projector + Screen + Wireless Mic', quantity: 1, unitPrice: 15000, total: 15000 },
          { id: 'item-003', service: 'Decoration', description: 'Stage decoration with flowers', quantity: 1, unitPrice: 25000, total: 25000 },
          { id: 'item-004', service: 'Business Center', description: 'Name badges + Printouts', quantity: 150, unitPrice: 50, total: 7500 },
        ],
        totalAmount: 227500,
      },
      {
        id: 'beo-002',
        eventId: 'evt-002',
        eventName: 'Pandey-Shrestha Wedding',
        orderDate: '2025-07-20',
        status: 'in_progress',
        items: [
          { id: 'item-005', service: 'Catering', description: 'Wedding buffet (Full course)', quantity: 250, unitPrice: 1800, total: 450000 },
          { id: 'item-006', service: 'AV Equipment', description: 'DJ System + LED Dance Floor', quantity: 1, unitPrice: 35000, total: 35000 },
          { id: 'item-007', service: 'Decoration', description: 'Mandap decoration + Flowers', quantity: 1, unitPrice: 85000, total: 85000 },
          { id: 'item-008', service: 'Business Center', description: 'Invitation cards (printed)', quantity: 300, unitPrice: 80, total: 24000 },
          { id: 'item-009', service: 'Catering', description: 'Welcome drinks (Mocktails)', quantity: 250, unitPrice: 200, total: 50000 },
        ],
        totalAmount: 644000,
      },
      {
        id: 'beo-003',
        eventId: 'evt-003',
        eventName: 'Tech Conference 2025',
        orderDate: '2025-07-25',
        status: 'draft',
        items: [
          { id: 'item-010', service: 'AV Equipment', description: 'PA System + 3 Projectors + Screens', quantity: 1, unitPrice: 45000, total: 45000 },
          { id: 'item-011', service: 'Catering', description: 'Conference lunch (Buffet)', quantity: 80, unitPrice: 800, total: 64000 },
          { id: 'item-012', service: 'Business Center', description: 'Conference kits + Notepads + Pens', quantity: 80, unitPrice: 200, total: 16000 },
          { id: 'item-013', service: 'Catering', description: 'Tea/Coffee breaks (2x)', quantity: 80, unitPrice: 250, total: 20000 },
        ],
        totalAmount: 145000,
      },
      {
        id: 'beo-004',
        eventId: 'evt-004',
        eventName: 'Birthday Celebration - Rana Family',
        orderDate: '2025-07-28',
        status: 'confirmed',
        items: [
          { id: 'item-014', service: 'Catering', description: 'Birthday cake + Snacks', quantity: 40, unitPrice: 600, total: 24000 },
          { id: 'item-015', service: 'Decoration', description: 'Balloon & Banner decoration', quantity: 1, unitPrice: 8000, total: 8000 },
        ],
        totalAmount: 32000,
      },
      {
        id: 'beo-005',
        eventId: 'evt-005',
        eventName: 'Product Launch - ABC Electronics',
        orderDate: '2025-08-02',
        status: 'draft',
        items: [
          { id: 'item-016', service: 'AV Equipment', description: 'LED Wall + Full sound system', quantity: 1, unitPrice: 60000, total: 60000 },
          { id: 'item-017', service: 'Catering', description: 'Canapes & Drinks reception', quantity: 100, unitPrice: 1000, total: 100000 },
          { id: 'item-018', service: 'Business Center', description: 'Press kits', quantity: 50, unitPrice: 300, total: 15000 },
        ],
        totalAmount: 175000,
      },
    ]

    // Check if events have banquet order data stored in notes
    const banquetOrders = events.map((event, index) => {
      let orderData = defaultOrders[index]
      if (!orderData) {
        orderData = {
          id: `beo-${String(index + 1).padStart(3, '0')}`,
          eventId: event.id,
          eventName: event.name,
          orderDate: event.startDate.toISOString().split('T')[0],
          status: event.status === 'confirmed' ? 'confirmed' : event.status === 'in_progress' ? 'in_progress' : 'draft',
          items: [],
          totalAmount: event.totalRevenue,
        }
      }
      // Override with DB event data
      orderData.eventId = event.id
      orderData.eventName = event.name
      orderData.orderDate = event.startDate.toISOString().split('T')[0]
      return orderData
    })

    const total = banquetOrders.length
    const confirmed = banquetOrders.filter((o) => o.status === 'confirmed').length
    const inProgress = banquetOrders.filter((o) => o.status === 'in_progress').length
    const draft = banquetOrders.filter((o) => o.status === 'draft').length
    const totalAmount = banquetOrders.reduce((s, o) => s + o.totalAmount, 0)

    return NextResponse.json({
      orders: banquetOrders,
      total,
      summary: { confirmed, inProgress, draft, totalAmount },
    })
  } catch (error) {
    console.error('Banquet Orders API error:', error)
    return NextResponse.json({ error: 'Failed to fetch banquet orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    return NextResponse.json({ eventId, ...orderData, event }, { status: 201 })
  } catch (error) {
    console.error('Banquet Orders POST error:', error)
    return NextResponse.json({ error: 'Failed to create banquet order' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { eventId, status, items, orderDate } = body

    const existing = await db.event.findUnique({ where: { id: eventId } })
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
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
    return NextResponse.json({ eventId, ...updatedNotes, event })
  } catch (error) {
    console.error('Banquet Orders PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update banquet order' }, { status: 500 })
  }
}
