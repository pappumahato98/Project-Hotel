import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'

// ─── Types ───────────────────────────────────────────────────────────
export interface TableItem {
  id: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'needs_cleaning'
  guestCount?: number
  orderId?: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  allergens?: string[]
  available: boolean
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export interface Order {
  id: string
  tableId: number
  items: OrderItem[]
  status: string
  createdAt: string
  rush?: boolean
  station?: string
  guestName?: string
  specialInstructions?: string
}

export interface BarStool {
  id: number
  status: 'available' | 'occupied' | 'reserved'
  tabId?: string
  guestName?: string
}

export interface BarTab {
  id: string
  stoolId: number
  guestName: string
  items: OrderItem[]
  total: number
  openedAt: string
  status: 'open' | 'closed'
}

export interface SpaService {
  id: string
  name: string
  duration: number
  price: number
  category: string
}

export interface Therapist {
  id: string
  name: string
  specialties: string[]
  status: 'available' | 'busy' | 'break'
}

export interface SpaAppointment {
  id: string
  serviceId: string
  serviceName: string
  therapistId: string
  therapistName: string
  guestName: string
  startTime: string
  endTime: string
  status: string
  room: string
}

export interface BizService {
  id: string
  name: string
  category: string
  pricePerUnit: number
  unit: string
  description: string
}

export interface MeetingRoom {
  id: string
  name: string
  capacity: number
  hourlyRate: number
  status: string
}

export interface ActiveRental {
  id: string
  serviceId: string
  serviceName: string
  guestName: string
  roomNumber: string
  startedAt: string
  estimatedEnd: string
  charges: number
}

export interface KitchenTicket {
  id: string
  orderId: string
  tableId: number
  items: { name: string; quantity: number }[]
  station: string
  status: string
  rush: boolean
  specialInstructions?: string
  createdAt: string
  completedAt?: string
}

export interface PosStats {
  openTables: number
  totalCovers: number
  revenueToday: number
  openOrders: number
  completedOrders: number
}

// ─── Static mock data for non-DB sections (bar stools, tables, spa, biz center, kitchen) ────────────
const TABLES: TableItem[] = [
  { id: 1, seats: 2, status: 'available' },
  { id: 2, seats: 4, status: 'occupied', guestCount: 3, orderId: 'ORD-001' },
  { id: 3, seats: 4, status: 'reserved' },
  { id: 4, seats: 6, status: 'available' },
  { id: 5, seats: 2, status: 'needs_cleaning' },
  { id: 6, seats: 8, status: 'occupied', guestCount: 6, orderId: 'ORD-002' },
  { id: 7, seats: 4, status: 'available' },
  { id: 8, seats: 2, status: 'occupied', guestCount: 2, orderId: 'ORD-003' },
  { id: 9, seats: 6, status: 'reserved' },
  { id: 10, seats: 4, status: 'available' },
  { id: 11, seats: 2, status: 'needs_cleaning' },
  { id: 12, seats: 4, status: 'occupied', guestCount: 4, orderId: 'ORD-004' },
  { id: 13, seats: 8, status: 'available' },
  { id: 14, seats: 6, status: 'available' },
  { id: 15, seats: 4, status: 'reserved' },
]

const BAR_STOOLS: BarStool[] = [
  { id: 1, status: 'occupied', tabId: 'TAB-001', guestName: 'Mr. Anderson' },
  { id: 2, status: 'occupied', tabId: 'TAB-002', guestName: 'Ms. Sherpa' },
  { id: 3, status: 'available' },
  { id: 4, status: 'available' },
  { id: 5, status: 'reserved' },
  { id: 6, status: 'occupied', tabId: 'TAB-003', guestName: 'Dr. Patel' },
  { id: 7, status: 'available' },
  { id: 8, status: 'occupied', tabId: 'TAB-004', guestName: 'Col. Rai' },
  { id: 9, status: 'available' },
  { id: 10, status: 'available' },
]

const BAR_TABS: BarTab[] = [
  { id: 'TAB-001', stoolId: 1, guestName: 'Mr. Anderson', items: [{ id: 'bi1', menuItemId: 'b4', name: 'Mojito', price: 650, quantity: 2 }, { id: 'bi2', menuItemId: 'b11', name: 'Mixed Nuts', price: 350, quantity: 1 }], total: 1650, openedAt: new Date(Date.now() - 45 * 60000).toISOString(), status: 'open' },
  { id: 'TAB-002', stoolId: 2, guestName: 'Ms. Sherpa', items: [{ id: 'bi3', menuItemId: 'b8', name: 'Nepali Wine (Glass)', price: 550, quantity: 3 }, { id: 'bi4', menuItemId: 'b12', name: 'Olives & Cheese Board', price: 550, quantity: 1 }], total: 2200, openedAt: new Date(Date.now() - 60 * 60000).toISOString(), status: 'open' },
  { id: 'TAB-003', stoolId: 6, guestName: 'Dr. Patel', items: [{ id: 'bi5', menuItemId: 'b6', name: 'Old Fashioned', price: 750, quantity: 1 }, { id: 'bi6', menuItemId: 'b2', name: 'Gorkha Beer', price: 500, quantity: 2 }], total: 1750, openedAt: new Date(Date.now() - 25 * 60000).toISOString(), status: 'open' },
  { id: 'TAB-004', stoolId: 8, guestName: 'Col. Rai', items: [{ id: 'bi7', menuItemId: 'b1', name: 'Tuborg Lager', price: 450, quantity: 4 }, { id: 'bi8', menuItemId: 'b7', name: 'Gin & Tonic', price: 600, quantity: 2 }], total: 3000, openedAt: new Date(Date.now() - 15 * 60000).toISOString(), status: 'open' },
]

const SPA_SERVICES: SpaService[] = [
  { id: 's1', name: 'Swedish Massage', duration: 60, price: 4500, category: 'massage' },
  { id: 's2', name: 'Deep Tissue Massage', duration: 60, price: 5500, category: 'massage' },
  { id: 's3', name: 'Hot Stone Therapy', duration: 90, price: 7000, category: 'massage' },
  { id: 's4', name: 'Aromatherapy Massage', duration: 60, price: 5000, category: 'massage' },
  { id: 's5', name: 'Herbal Facial', duration: 45, price: 3500, category: 'facial' },
  { id: 's6', name: 'Gold Facial', duration: 60, price: 6000, category: 'facial' },
  { id: 's7', name: 'Body Scrub', duration: 45, price: 3000, category: 'body_treatment' },
  { id: 's8', name: 'Body Wrap', duration: 60, price: 4500, category: 'body_treatment' },
  { id: 's9', name: 'Yoga Session', duration: 60, price: 2000, category: 'wellness' },
  { id: 's10', name: 'Meditation Session', duration: 30, price: 1500, category: 'wellness' },
]

const THERAPISTS: Therapist[] = [
  { id: 't1', name: 'Anita Gurung', specialties: ['massage', 'body_treatment'], status: 'available' },
  { id: 't2', name: 'Priya Sharma', specialties: ['facial', 'wellness'], status: 'busy' },
  { id: 't3', name: 'Dawa Tenzin', specialties: ['massage'], status: 'available' },
  { id: 't4', name: 'Sunita Rai', specialties: ['facial', 'body_treatment'], status: 'break' },
  { id: 't5', name: 'Bikash Thapa', specialties: ['massage', 'wellness'], status: 'busy' },
]

const SPA_APPOINTMENTS: SpaAppointment[] = [
  { id: 'APT-001', serviceId: 's1', serviceName: 'Swedish Massage', therapistId: 't2', therapistName: 'Priya Sharma', guestName: 'Mrs. Johnson', startTime: '2025-07-10T09:00:00', endTime: '2025-07-10T10:00:00', status: 'in_progress', room: 'Spa Room 1' },
  { id: 'APT-002', serviceId: 's2', serviceName: 'Deep Tissue Massage', therapistId: 't5', therapistName: 'Bikash Thapa', guestName: 'Mr. Williams', startTime: '2025-07-10T09:30:00', endTime: '2025-07-10T10:30:00', status: 'in_progress', room: 'Spa Room 2' },
  { id: 'APT-003', serviceId: 's5', serviceName: 'Herbal Facial', therapistId: 't1', therapistName: 'Anita Gurung', guestName: 'Ms. Gurung', startTime: '2025-07-10T10:30:00', endTime: '2025-07-10T11:15:00', status: 'scheduled', room: 'Spa Room 3' },
  { id: 'APT-004', serviceId: 's9', serviceName: 'Yoga Session', therapistId: 't3', therapistName: 'Dawa Tenzin', guestName: 'Mr. Baker', startTime: '2025-07-10T11:00:00', endTime: '2025-07-10T12:00:00', status: 'scheduled', room: 'Wellness Studio' },
  { id: 'APT-005', serviceId: 's3', serviceName: 'Hot Stone Therapy', therapistId: 't1', therapistName: 'Anita Gurung', guestName: 'Mrs. Chen', startTime: '2025-07-10T14:00:00', endTime: '2025-07-10T15:30:00', status: 'scheduled', room: 'Spa Room 1' },
  { id: 'APT-006', serviceId: 's6', serviceName: 'Gold Facial', therapistId: 't4', therapistName: 'Sunita Rai', guestName: 'Ms. Tamang', startTime: '2025-07-10T15:00:00', endTime: '2025-07-10T16:00:00', status: 'scheduled', room: 'Spa Room 3' },
]

const BIZ_SERVICES: BizService[] = [
  { id: 'ws1', name: 'Workstation (Basic)', category: 'workstation', pricePerUnit: 200, unit: 'hour', description: 'Desktop with internet access' },
  { id: 'ws2', name: 'Workstation (Premium)', category: 'workstation', pricePerUnit: 400, unit: 'hour', description: 'Laptop, printer, scanner access' },
  { id: 'mr1', name: 'Meeting Room A', category: 'meeting_room', pricePerUnit: 3000, unit: 'hour', description: 'Seats 8, projector, whiteboard' },
  { id: 'mr2', name: 'Meeting Room B', category: 'meeting_room', pricePerUnit: 5000, unit: 'hour', description: 'Seats 16, AV system, video conferencing' },
  { id: 'mr3', name: 'Board Room', category: 'meeting_room', pricePerUnit: 8000, unit: 'hour', description: 'Seats 24, full AV suite, catering available' },
  { id: 'p1', name: 'B&W Print', category: 'printing', pricePerUnit: 10, unit: 'page', description: 'A4 black & white' },
  { id: 'p2', name: 'Color Print', category: 'printing', pricePerUnit: 50, unit: 'page', description: 'A4 color' },
  { id: 'p3', name: 'A3 Print', category: 'printing', pricePerUnit: 80, unit: 'page', description: 'A3 color' },
  { id: 'c1', name: 'Local Call', category: 'calls', pricePerUnit: 5, unit: 'minute', description: 'Local landline calls' },
  { id: 'c2', name: 'International Call', category: 'calls', pricePerUnit: 30, unit: 'minute', description: 'ISD calls' },
  { id: 'cu1', name: 'Same-Day Courier', category: 'courier', pricePerUnit: 500, unit: 'delivery', description: 'Within Kathmandu Valley' },
  { id: 'cu2', name: 'Next-Day Courier', category: 'courier', pricePerUnit: 300, unit: 'delivery', description: 'Domestic delivery' },
]

const MEETING_ROOMS: MeetingRoom[] = [
  { id: 'mr1', name: 'Meeting Room A', capacity: 8, hourlyRate: 3000, status: 'available' },
  { id: 'mr2', name: 'Meeting Room B', capacity: 16, hourlyRate: 5000, status: 'occupied' },
  { id: 'mr3', name: 'Board Room', capacity: 24, hourlyRate: 8000, status: 'available' },
]

const ACTIVE_RENTALS: ActiveRental[] = [
  { id: 'RNT-001', serviceId: 'ws2', serviceName: 'Workstation (Premium)', guestName: 'Mr. Nakamura', roomNumber: '502', startedAt: new Date(Date.now() - 90 * 60000).toISOString(), estimatedEnd: new Date(Date.now() + 30 * 60000).toISOString(), charges: 600 },
  { id: 'RNT-002', serviceId: 'mr2', serviceName: 'Meeting Room B', guestName: 'ABC Corp', roomNumber: '—', startedAt: new Date(Date.now() - 120 * 60000).toISOString(), estimatedEnd: new Date(Date.now() + 60 * 60000).toISOString(), charges: 15000 },
  { id: 'RNT-003', serviceId: 'ws1', serviceName: 'Workstation (Basic)', guestName: 'Ms. Limbu', roomNumber: '312', startedAt: new Date(Date.now() - 30 * 60000).toISOString(), estimatedEnd: new Date(Date.now() + 60 * 60000).toISOString(), charges: 100 },
]

const KITCHEN_TICKETS: KitchenTicket[] = [
  { id: 'KT-001', orderId: 'ORD-002', tableId: 6, items: [{ name: 'Mutton Biryani', quantity: 2 }, { name: 'Grilled Trout', quantity: 1 }, { name: 'Spring Rolls', quantity: 1 }], station: 'hot_kitchen', status: 'pending', rush: true, specialInstructions: 'No onions in biryani', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'KT-002', orderId: 'ORD-001', tableId: 2, items: [{ name: 'Chicken Curry', quantity: 2 }, { name: 'Momo Platter', quantity: 1 }, { name: 'Garlic Naan', quantity: 3 }], station: 'hot_kitchen', status: 'preparing', createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: 'KT-003', orderId: 'ORD-004', tableId: 12, items: [{ name: 'Tandoori Chicken', quantity: 1 }, { name: 'Dal Tarka', quantity: 2 }, { name: 'Vegetable Fried Rice', quantity: 2 }], station: 'hot_kitchen', status: 'preparing', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'KT-004', orderId: 'ORD-003', tableId: 8, items: [{ name: 'Tomato Soup', quantity: 2 }, { name: 'Paneer Tikka Masala', quantity: 1 }], station: 'cold_kitchen', status: 'ready', createdAt: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: 'KT-005', orderId: 'ORD-001', tableId: 2, items: [{ name: 'Masala Chai', quantity: 3 }], station: 'bar', status: 'ready', createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: 'KT-006', orderId: 'ORD-004', tableId: 12, items: [{ name: 'Fresh Lime Soda', quantity: 4 }], station: 'bar', status: 'pending', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'KT-007', orderId: 'ORD-002', tableId: 6, items: [{ name: 'Mango Lassi', quantity: 4 }], station: 'bar', status: 'preparing', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
]

const GUEST_RESERVATIONS = [
  { id: 'RES-001', guestName: 'Raj Sharma', roomNumber: '301' },
  { id: 'RES-002', guestName: 'Emily Johnson', roomNumber: '502' },
  { id: 'RES-003', guestName: 'Chen Wei', roomNumber: '415' },
  { id: 'RES-004', guestName: 'Maria Garcia', roomNumber: '208' },
  { id: 'RES-005', guestName: 'Ahmed Hassan', roomNumber: '610' },
]

// ─── GET Handler ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') ?? 'all'

  const data: Record<string, unknown> = {}

  if (section === 'all' || section === 'restaurant') {
    // Fetch from DB: outlets, menu items, orders
    const outlets = await db.outlet.findMany({ where: { active: true }, include: { menuItems: true }, orderBy: { name: 'asc' } })
    const restaurantOutlets = outlets.filter((o) => o.type === 'restaurant')
    const menuItems = restaurantOutlets.flatMap((o) => o.menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      category: m.category,
      available: m.available,
      allergens: m.allergens ? JSON.parse(m.allergens) : undefined,
    })))

    // Fetch active orders for restaurant outlets
    const restaurantOutletIds = restaurantOutlets.map((o) => o.id)
    const activeOrders = await db.posOrder.findMany({
      where: { outletId: { in: restaurantOutletIds }, status: { not: 'closed' } },
      include: { items: { include: { menuItem: { select: { name: true } } } }, outlet: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const orders = activeOrders.map((o) => ({
      id: o.id,
      tableId: o.tableNumber || 1,
      items: o.items.map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.menuItem?.name || 'Unknown',
        price: i.unitPrice,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      station: 'hot_kitchen',
      guestName: o.serverName || `Table ${o.tableNumber}`,
    }))

    data.tables = TABLES
    data.menuItems = menuItems.length > 0 ? menuItems : outlets.flatMap((o) => o.menuItems.map((m) => ({
      id: m.id, name: m.name, price: m.price, category: m.category, available: m.available,
    })))
    data.orders = orders.length > 0 ? orders : activeOrders.map((o) => ({
      id: o.id, tableId: o.tableNumber || 1,
      items: o.items.map((i) => ({ id: i.id, menuItemId: i.menuItemId, name: i.menuItem?.name || 'Unknown', price: i.unitPrice, quantity: i.quantity })),
      status: o.status, createdAt: o.createdAt.toISOString(), station: 'hot_kitchen', guestName: o.serverName || 'Guest',
    }))
    data.guestReservations = GUEST_RESERVATIONS
  }

  if (section === 'all' || section === 'bar') {
    // Fetch bar menu items from DB
    const barOutlets = await db.outlet.findMany({ where: { type: 'bar', active: true }, include: { menuItems: true } })
    const barMenuItems = barOutlets.flatMap((o) => o.menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      category: m.category,
      available: m.available,
      allergens: m.allergens ? JSON.parse(m.allergens) : undefined,
    })))

    data.barStools = BAR_STOOLS
    data.barTabs = BAR_TABS.filter((t) => t.status === 'open')
    data.barMenuItems = barMenuItems.length > 0 ? barMenuItems : [
      { id: 'b1', name: 'Tuborg Lager', price: 450, category: 'beer', available: true },
      { id: 'b2', name: 'Gorkha Beer', price: 500, category: 'beer', available: true },
      { id: 'b4', name: 'Mojito', price: 650, category: 'cocktail', available: true },
      { id: 'b5', name: 'Margarita', price: 700, category: 'cocktail', available: true },
      { id: 'b8', name: 'Nepali Wine (Glass)', price: 550, category: 'wine', available: true },
    ]
  }

  if (section === 'all' || section === 'spa') {
    data.spaServices = SPA_SERVICES
    data.therapists = THERAPISTS
    data.appointments = SPA_APPOINTMENTS
  }

  if (section === 'all' || section === 'business-center') {
    data.bizServices = BIZ_SERVICES
    data.meetingRooms = MEETING_ROOMS
    data.activeRentals = ACTIVE_RENTALS
  }

  if (section === 'all' || section === 'kitchen-display') {
    data.kitchenTickets = KITCHEN_TICKETS
  }

  if (section === 'order-history') {
    const dateFilter = searchParams.get('date')
    const statusFilter = searchParams.get('status') ?? 'all'

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Build where clause
    const where: Record<string, unknown> = {}
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      const filterStart = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())
      const filterEnd = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59, 999)
      where.createdAt = { gte: filterStart, lte: filterEnd }
    }
    if (statusFilter !== 'all') {
      where.status = statusFilter
    }

    const historyOrders = await db.posOrder.findMany({
      where,
      include: {
        items: {
          include: { menuItem: { select: { name: true } } },
          },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedOrders = historyOrders.map((o) => {
      const subtotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
      return {
        id: o.id,
        tableId: o.tableNumber,
        items: o.items.map((i) => ({
          id: i.id,
          name: i.menuItem?.name || 'Unknown',
          price: i.unitPrice,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
        itemCount: o.items.length,
        subtotal,
        taxAmount: o.taxAmount,
        discountAmount: o.discountAmount,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      }
    })

    // Stats (always for today)
    const allTodayOrders = await db.posOrder.findMany({
      where: { createdAt: { gte: todayStart } },
    })
    const todayClosed = allTodayOrders.filter((o) => o.status === 'closed')
    const todayRevenue = todayClosed.reduce((s, o) => s + o.totalAmount, 0)
    const todayVoided = allTodayOrders.filter((o) => o.status === 'voided')

    data.orders = formattedOrders
    data.stats = {
      todayOrders: allTodayOrders.length,
      todayRevenue,
      avgOrderValue: todayClosed.length > 0 ? Math.round(todayRevenue / todayClosed.length) : 0,
      voidCount: todayVoided.length,
    }

    return NextResponse.json(data)
  }

  // Compute stats from DB
  const allOrders = await db.posOrder.findMany()
  const openOrders = allOrders.filter((o) => o.status !== 'closed' && o.status !== 'voided')
  const completedOrders = allOrders.filter((o) => o.status === 'closed')
  const revenueToday = allOrders
    .filter((o) => {
      const today = new Date()
      const orderDate = new Date(o.createdAt)
      return orderDate.getFullYear() === today.getFullYear() && orderDate.getMonth() === today.getMonth() && orderDate.getDate() === today.getDate()
    })
    .reduce((sum, o) => sum + o.totalAmount, 0)
  const totalCovers = openOrders.reduce((sum, o) => sum + o.guestCount, 0)

  data.stats = {
    openTables: TABLES.filter((t) => t.status === 'occupied').length,
    totalCovers,
    revenueToday,
    openOrders: openOrders.length,
    completedOrders: completedOrders.length,
  }

  return NextResponse.json(data)
}

// ─── POST Handler - Create Order ────────────────────────────────────
export async function POST(request: Request) {
  try {
    // ─── Fetch system settings ─────────────────────────────
    const dbSettings = await db.systemSetting.findMany()
    const sMap: Record<string, any> = {}
    dbSettings.forEach(s => {
      const val = s.type === 'number' ? parseFloat(s.value) : s.type === 'boolean' ? s.value === 'true' : s.type === 'json' ? JSON.parse(s.value) : s.value
      sMap[s.key] = val
    })
    const taxRateDecimal = (sMap.taxRate || 13) / 100

    const body = await request.json()
    const { action, outletId, tableNumber, items, guestCount, serverName, guestName, rush, specialInstructions } = body

    if (action === 'create_order') {
      const order = await db.posOrder.create({
        data: {
          outletId: outletId || '',
          tableNumber: tableNumber || null,
          guestCount: guestCount || 1,
          serverName: serverName || null,
          status: 'open',
          totalAmount: 0,
          taxAmount: 0,
        },
      })

      // Create order items
      let totalAmount = 0
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const menuItem = await db.menuItem.findUnique({ where: { id: item.menuItemId } })
          const qty = item.quantity || 1
          const unitPrice = item.price || menuItem?.price || 0
          const itemTotal = unitPrice * qty
          totalAmount += itemTotal

          await db.orderItem.create({
            data: {
              orderId: order.id,
              menuItemId: item.menuItemId,
              quantity: qty,
              unitPrice,
              totalPrice: itemTotal,
              status: 'pending',
              notes: item.notes || null,
            },
          })
        }
      }

      // Update order totals
      const updated = await db.posOrder.update({
        where: { id: order.id },
        data: { totalAmount, taxAmount: Math.round(totalAmount * taxRateDecimal) },
      })

      broadcastEvent('pos:order_created', updated)
      return NextResponse.json(updated, { status: 201 })
    }

    if (action === 'update_order_status') {
      const { orderId, status } = body
      const updated = await db.posOrder.update({
        where: { id: orderId },
        data: { status },
      })
      broadcastEvent('pos:order_updated', updated)
      return NextResponse.json(updated)
    }

    if (action === 'update_item_status') {
      const { itemId, status: itemStatus } = body
      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { status: itemStatus },
      })
      broadcastEvent('pos:item_updated', updated)
      return NextResponse.json(updated)
    }

    if (action === 'apply_discount') {
      const { orderId: discOrderId, discountType: discType, discountValue: discValue, reason: discReason } = body

      const existingOrder = await db.posOrder.findUnique({
        where: { id: discOrderId },
        include: { items: true },
      })

      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const subtotal = existingOrder.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
      const discountAmount = Math.min(discValue, subtotal)
      const taxableAmount = subtotal - discountAmount
      const taxAmount = Math.round(taxableAmount * taxRateDecimal)
      const totalAmount = taxableAmount + taxAmount

      const updated = await db.posOrder.update({
        where: { id: discOrderId },
        data: {
          discountAmount,
          taxAmount,
          totalAmount,
        },
      })

      broadcastEvent('pos:discount_applied', { orderId: discOrderId, discountAmount, reason: discReason })
      return NextResponse.json(updated)
    }

    if (action === 'split_bill') {
      const { orderId: splitOrderId, assignments: splitAssignments, splitSubtotals } = body

      const existingOrder = await db.posOrder.findUnique({ where: { id: splitOrderId } })
      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Store split bill info as a special order item note
      const splitInfo = JSON.stringify({
        type: 'split_bill',
        assignments: splitAssignments,
        splitSubtotals,
        createdAt: new Date().toISOString(),
      })

      await db.orderItem.create({
        data: {
          orderId: splitOrderId,
          menuItemId: '',
          quantity: 0,
          unitPrice: 0,
          totalPrice: 0,
          status: 'served',
          notes: splitInfo,
        },
      })

      broadcastEvent('pos:bill_split', { orderId: splitOrderId, splitSubtotals })
      return NextResponse.json({ success: true, orderId: splitOrderId, splitSubtotals })
    }

    if (action === 'charge_to_room') {
      const { reservationId, amount, description } = body

      // Find folio for this reservation
      let folio = await db.folio.findFirst({ where: { reservationId } })
      if (!folio) {
        const reservation = await db.reservation.findUnique({ where: { id: reservationId }, select: { guestId: true } })
        if (!reservation) {
          return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
        }
        folio = await db.folio.create({ data: { reservationId, guestId: reservation.guestId } })
      }

      // Post charge to folio
      const taxAmt = Math.round(amount * taxRateDecimal)
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionType: 'restaurant',
          description: description || 'Restaurant charge',
          amount,
          taxAmount: taxAmt,
          totalAmount: amount + taxAmt,
          quantity: 1,
          outlet: 'Restaurant',
          postedBy: 'POS',
        },
      })

      // Recalculate folio balance
      const allCharges = await db.folioTransaction.findMany({ where: { folioId: folio.id }, select: { totalAmount: true } })
      const allPayments = await db.folioPayment.findMany({ where: { folioId: folio.id }, select: { amount: true } })
      const newBalance = allCharges.reduce((s, c) => s + c.totalAmount, 0) - allPayments.reduce((s, p) => s + p.amount, 0)
      await db.folio.update({ where: { id: folio.id }, data: { balance: newBalance } })

      broadcastEvent('pos:charge_to_room', { folioId: folio.id, amount, reservationId })
      return NextResponse.json({ success: true, folioId: folio.id, amount })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('POS POST error:', error)
    return NextResponse.json({ error: 'Failed to process POS request' }, { status: 500 })
  }
}
