import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettingsMap, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ──────────────────────────────────────────────────────
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

// ─── GET Handler ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') ?? 'all'

  const data: Record<string, unknown> = {}

  // ─── Pre-fetch all outlets grouped by type (used by multiple sections) ───
  const allOutlets = await db.outlet.findMany({
    where: { active: true },
    include: { menuItems: true },
    orderBy: { name: 'asc' },
  })

  const restaurantOutlets = allOutlets.filter((o) => o.type === 'restaurant')
  const barOutlets = allOutlets.filter((o) => o.type === 'bar')
  const spaOutlets = allOutlets.filter((o) => o.type === 'spa')
  const bizCenterOutlets = allOutlets.filter((o) => o.type === 'business_center')

  const restaurantOutletIds = restaurantOutlets.map((o) => o.id)
  const barOutletIds = barOutlets.map((o) => o.id)
  const spaOutletIds = spaOutlets.map((o) => o.id)
  const bizCenterOutletIds = bizCenterOutlets.map((o) => o.id)

  // ─── Restaurant section ───
  if (section === 'all' || section === 'restaurant') {
    // Menu items from restaurant outlets
    const menuItems: MenuItem[] = restaurantOutlets.flatMap((o) =>
      o.menuItems.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        category: m.category,
        available: m.available,
        allergens: m.allergens ? JSON.parse(m.allergens) : undefined,
      }))
    )

    // Active orders for restaurant outlets
    const activeOrders = await db.posOrder.findMany({
      where: { outletId: { in: restaurantOutletIds }, status: { notIn: ['closed', 'voided'] } },
      include: { items: { include: { menuItem: { select: { name: true, category: true } } } }, outlet: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const orders: Order[] = activeOrders.map((o) => ({
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

    // Build virtual table layout from DB orders
    // Find all table numbers ever used for restaurant outlets
    const allRestaurantOrders = await db.posOrder.findMany({
      where: { outletId: { in: restaurantOutletIds }, tableNumber: { not: null } },
      select: { tableNumber: true },
      distinct: ['tableNumber'],
      orderBy: { tableNumber: 'asc' },
    })
    const allTableNumbers = allRestaurantOrders.map((o) => o.tableNumber!)
    const occupiedTableNumbers = new Set(
      activeOrders.filter((o) => o.tableNumber != null).map((o) => o.tableNumber!)
    )

    // Create table entries for each known table number
    const tables: TableItem[] = allTableNumbers.map((tn) => {
      const activeOrder = activeOrders.find((o) => o.tableNumber === tn)
      if (activeOrder) {
        return {
          id: tn,
          seats: activeOrder.guestCount || 4,
          status: 'occupied' as const,
          guestCount: activeOrder.guestCount,
          orderId: activeOrder.id,
        }
      }
      return { id: tn, seats: 4, status: 'available' as const }
    })

    // Guest reservations (in-house guests)
    const guestReservations = await db.reservation.findMany({
      where: { status: 'checked_in' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const formattedGuestReservations = guestReservations.map((r) => ({
      id: r.id,
      guestName: r.guest
        ? `${r.guest.firstName} ${r.guest.lastName}`
        : 'Unknown Guest',
      roomNumber: r.room?.roomNumber || '—',
    }))

    data.tables = tables
    data.menuItems = menuItems
    data.orders = orders
    data.guestReservations = formattedGuestReservations
  }

  // ─── Bar section ───
  if (section === 'all' || section === 'bar') {
    const barMenuItems: MenuItem[] = barOutlets.flatMap((o) =>
      o.menuItems.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        category: m.category,
        available: m.available,
        allergens: m.allergens ? JSON.parse(m.allergens) : undefined,
      }))
    )

    // Active bar orders represent occupied stools
    const activeBarOrders = await db.posOrder.findMany({
      where: { outletId: { in: barOutletIds }, status: { notIn: ['closed', 'voided'] } },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Determine stool count from all historical bar orders with tableNumber
    const allBarOrders = await db.posOrder.findMany({
      where: { outletId: { in: barOutletIds }, tableNumber: { not: null } },
      select: { tableNumber: true },
      distinct: ['tableNumber'],
      orderBy: { tableNumber: 'asc' },
    })
    const allStoolNumbers = allBarOrders.map((o) => o.tableNumber!)
    const maxStoolNumber = allStoolNumbers.length > 0 ? Math.max(...allStoolNumbers) : 0

    // Map active orders to their stool numbers
    const orderToStool = new Map<string, number>()
    for (const order of activeBarOrders) {
      if (order.tableNumber != null) {
        orderToStool.set(order.id, order.tableNumber)
      }
    }
    // For orders without tableNumber, assign sequential stool numbers starting after max used
    let nextStool = maxStoolNumber + 1
    for (const order of activeBarOrders) {
      if (order.tableNumber == null) {
        orderToStool.set(order.id, nextStool++)
      }
    }

    const totalStoolCount = Math.max(maxStoolNumber, nextStool - 1, 0)
    const barStools: BarStool[] = []
    for (let i = 1; i <= totalStoolCount; i++) {
      const activeOrder = activeBarOrders.find((o) => orderToStool.get(o.id) === i)
      if (activeOrder) {
        barStools.push({
          id: i,
          status: 'occupied',
          tabId: activeOrder.id,
          guestName: activeOrder.serverName || `Guest ${i}`,
        })
      } else {
        barStools.push({ id: i, status: 'available' })
      }
    }

    // Build bar tabs from active orders
    const barTabs: BarTab[] = activeBarOrders.map((o) => {
      const stoolId = orderToStool.get(o.id) || 1
      return {
        id: o.id,
        stoolId,
        guestName: o.serverName || `Guest ${stoolId}`,
        items: o.items.map((i) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          name: i.menuItem?.name || 'Unknown',
          price: i.unitPrice,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
        total: o.totalAmount,
        openedAt: o.createdAt.toISOString(),
        status: 'open' as const,
      }
    })

    data.barStools = barStools
    data.barTabs = barTabs.filter((t) => t.status === 'open')
    data.barMenuItems = barMenuItems
  }

  // ─── Spa section ───
  if (section === 'all' || section === 'spa') {
    // Spa services from menu items
    const spaServices: SpaService[] = spaOutlets.flatMap((o) =>
      o.menuItems.map((m) => ({
        id: m.id,
        name: m.name,
        duration: 60, // default since MenuItem has no duration field
        price: m.price,
        category: m.category,
      }))
    )

    // Therapists from Employee records in Spa department
    const therapists = await db.employee.findMany({
      where: { department: { contains: 'Spa', mode: 'insensitive' }, status: 'active' },
      orderBy: { firstName: 'asc' },
    })
    const formattedTherapists: Therapist[] = therapists.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      specialties: [e.position || 'general'],
      status: 'available' as const,
    }))

    // Spa appointments from active PosOrders for spa outlets
    const activeSpaOrders = await db.posOrder.findMany({
      where: {
        outletId: { in: spaOutletIds },
        status: { in: ['open', 'in_progress'] },
      },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        outlet: { select: { name: true, location: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const spaAppointments: SpaAppointment[] = activeSpaOrders.map((o) => {
      const firstItem = o.items[0]
      return {
        id: o.id,
        serviceId: firstItem?.menuItemId || '',
        serviceName: firstItem?.menuItem?.name || 'Spa Service',
        therapistId: '',
        therapistName: o.serverName || '',
        guestName: o.serverName || 'Guest',
        startTime: o.createdAt.toISOString(),
        endTime: new Date(o.createdAt.getTime() + 60 * 60000).toISOString(),
        status: o.status === 'in_progress' ? 'in_progress' : 'scheduled',
        room: o.outlet?.location || o.outlet?.name || 'Spa Room',
      }
    })

    // Mark therapists as busy if they are assigned to an active appointment
    for (const apt of spaAppointments) {
      if (apt.therapistName) {
        const therapist = formattedTherapists.find((t) => t.name === apt.therapistName)
        if (therapist) {
          therapist.status = 'busy'
        }
      }
    }

    data.spaServices = spaServices
    data.therapists = formattedTherapists
    data.appointments = spaAppointments
  }

  // ─── Business Center section ───
  if (section === 'all' || section === 'business-center') {
    // All business center menu items as services
    const bizServices: BizService[] = bizCenterOutlets.flatMap((o) =>
      o.menuItems.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        pricePerUnit: m.price,
        unit: m.category === 'printing' ? 'page' : m.category === 'calls' ? 'minute' : m.category === 'courier' ? 'delivery' : 'hour',
        description: '',
      }))
    )

    // Meeting rooms from business center menu items with category 'meeting_room'
    const meetingRoomItems = bizCenterOutlets.flatMap((o) =>
      o.menuItems.filter((m) => m.category === 'meeting_room')
    )
    // Get active orders for meeting room items to determine status
    const meetingRoomOrderIds = new Set<string>()
    const activeBizOrders = await db.posOrder.findMany({
      where: { outletId: { in: bizCenterOutletIds }, status: { notIn: ['closed', 'voided'] } },
      include: { items: { select: { menuItemId: true } } },
    })
    for (const order of activeBizOrders) {
      for (const item of order.items) {
        if (meetingRoomItems.some((m) => m.id === item.menuItemId)) {
          meetingRoomOrderIds.add(item.menuItemId)
        }
      }
    }
    const meetingRooms: MeetingRoom[] = meetingRoomItems.map((m) => ({
      id: m.id,
      name: m.name,
      capacity: 8, // default since MenuItem has no capacity field
      hourlyRate: m.price,
      status: meetingRoomOrderIds.has(m.id) ? 'occupied' : 'available',
    }))

    // Active rentals from open business center orders (excluding meeting rooms)
    const rentalOrders = activeBizOrders.filter((o) =>
      o.items.some((item) => !meetingRoomItems.some((m) => m.id === item.menuItemId))
    )
    // Enrich with reservation info for guest name and room number
    const rentalReservationIds = rentalOrders
      .map((o) => o.reservationId)
      .filter((id): id is string => id != null)
    const rentalReservations = rentalReservationIds.length > 0
      ? await db.reservation.findMany({
          where: { id: { in: rentalReservationIds } },
          include: {
            guest: { select: { firstName: true, lastName: true } },
            room: { select: { roomNumber: true } },
          },
        })
      : []
    const reservationMap = new Map(rentalReservations.map((r) => [r.id, r]))

    // Build a lookup for menu item names across all biz center outlets
    const allBizMenuItems = bizCenterOutlets.flatMap((o) => o.menuItems)
    const menuItemLookup = new Map(allBizMenuItems.map((m) => [m.id, m]))

    const activeRentals: ActiveRental[] = rentalOrders.map((o) => {
      const firstNonMeetingItem = o.items.find(
        (item) => !meetingRoomItems.some((m) => m.id === item.menuItemId)
      )
      const res = o.reservationId ? reservationMap.get(o.reservationId) : null
      const serviceMenuItem = firstNonMeetingItem ? menuItemLookup.get(firstNonMeetingItem.menuItemId) : null
      return {
        id: o.id,
        serviceId: firstNonMeetingItem?.menuItemId || '',
        serviceName: serviceMenuItem?.name || 'Service',
        guestName: res?.guest
          ? `${res.guest.firstName} ${res.guest.lastName}`
          : o.serverName || 'Guest',
        roomNumber: res?.room?.roomNumber || '—',
        startedAt: o.createdAt.toISOString(),
        estimatedEnd: new Date(o.createdAt.getTime() + 60 * 60000).toISOString(),
        charges: o.totalAmount,
      }
    })

    data.bizServices = bizServices
    data.meetingRooms = meetingRooms
    data.activeRentals = activeRentals
  }

  // ─── Kitchen Display section ───
  if (section === 'all' || section === 'kitchen-display') {
    // Kitchen tickets from OrderItems with pending/preparing/ready status
    // for restaurant and bar outlets
    const fAndBOutletIds = [...restaurantOutletIds, ...barOutletIds]
    const kitchenOrderItems = await db.orderItem.findMany({
      where: {
        status: { in: ['pending', 'preparing', 'ready'] },
        order: {
          outletId: { in: fAndBOutletIds },
          status: { notIn: ['closed', 'voided'] },
        },
      },
      include: {
        order: {
          include: {
            outlet: { select: { type: true, name: true } },
          },
        },
        menuItem: { select: { name: true, category: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group items by orderId to form tickets
    const ticketMap = new Map<string, (typeof kitchenOrderItems)[number][]>()
    for (const item of kitchenOrderItems) {
      const existing = ticketMap.get(item.orderId) || []
      existing.push(item)
      ticketMap.set(item.orderId, existing)
    }

    const kitchenTickets: KitchenTicket[] = []
    for (const [orderId, items] of ticketMap) {
      const order = items[0].order
      const station = order.outlet?.type === 'bar' ? 'bar' : 'hot_kitchen'
      // Check if any item has notes containing 'rush' or 'urgent'
      const isRush = items.some(
        (i) => i.notes?.toLowerCase().includes('rush') || i.notes?.toLowerCase().includes('urgent')
      )
      const specialNotes = items
        .map((i) => i.notes)
        .filter((n): n is string => n != null && n.length > 0 && !n.toLowerCase().includes('rush') && !n.toLowerCase().includes('urgent'))
        .join('; ') || undefined

      kitchenTickets.push({
        id: `KT-${orderId.slice(0, 8)}`,
        orderId,
        tableId: order.tableNumber || 0,
        items: items.map((i) => ({
          name: i.menuItem?.name || 'Unknown',
          quantity: i.quantity,
        })),
        station,
        status: items[0].status,
        rush: isRush,
        specialInstructions: specialNotes,
        createdAt: items[0].createdAt.toISOString(),
      })
    }

    data.kitchenTickets = kitchenTickets
  }

  // ─── Order History section ───
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

  // ─── Compute stats from DB ───
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const [allOrders, todayOrders] = await Promise.all([
    db.posOrder.findMany(),
    db.posOrder.findMany({ where: { createdAt: { gte: todayStart } } }),
  ])

  const openOrders = allOrders.filter((o) => o.status !== 'closed' && o.status !== 'voided')
  const completedOrders = allOrders.filter((o) => o.status === 'closed')
  const revenueToday = todayOrders
    .filter((o) => o.status === 'closed')
    .reduce((sum, o) => sum + o.totalAmount, 0)
  const totalCovers = openOrders.reduce((sum, o) => sum + o.guestCount, 0)

  // Count occupied restaurant tables from DB
  const occupiedTableCount = await db.posOrder.groupBy({
    by: ['tableNumber'],
    where: {
      outletId: { in: restaurantOutletIds },
      tableNumber: { not: null },
      status: { notIn: ['closed', 'voided'] },
    },
  })

  data.stats = {
    openTables: occupiedTableCount.length,
    totalCovers,
    revenueToday,
    openOrders: openOrders.length,
    completedOrders: completedOrders.length,
  }

  return NextResponse.json(data)
}

// ─── POST Handler - Create Order ────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    // ─── Fetch system settings ─────────────────────────────
    const sMap = await getSettingsMap()
    const taxRateDecimal = ((sMap.taxRate as number) || 13) / 100

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

      // Create order items — batch fetch menu prices, then createMany
      let totalAmount = 0
      if (items && Array.isArray(items)) {
        // Batch fetch all menu items
        const menuItemIds = items.map(i => i.menuItemId).filter(Boolean)
        const menuItems = menuItemIds.length > 0
          ? await db.menuItem.findMany({ where: { id: { in: menuItemIds } }, select: { id: true, price: true } })
          : []
        const priceMap = new Map(menuItems.map(m => [m.id, m.price]))

        const orderItemsData = items.map(item => {
          const qty = item.quantity || 1
          const unitPrice = item.price || priceMap.get(item.menuItemId) || 0
          const itemTotal = unitPrice * qty
          totalAmount += itemTotal
          return {
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: qty,
            unitPrice,
            totalPrice: itemTotal,
            status: 'pending' as const,
            notes: item.notes || null,
          }
        })

        if (orderItemsData.length > 0) {
          await db.orderItem.createMany({ data: orderItemsData })
        }
      }

      // Update order totals
      const updated = await db.posOrder.update({
        where: { id: order.id },
        data: { totalAmount, taxAmount: Math.round(totalAmount * taxRateDecimal) },
      })

      broadcastEvent('pos:order_created', updated)
      afterMutation('pos')
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
      const [allCharges, allPayments] = await Promise.all([
        db.folioTransaction.findMany({ where: { folioId: folio.id }, select: { totalAmount: true } }),
        db.folioPayment.findMany({ where: { folioId: folio.id }, select: { amount: true } }),
      ])
      const newBalance = allCharges.reduce((s, c) => s + c.totalAmount, 0) - allPayments.reduce((s, p) => s + p.amount, 0)
      await db.folio.update({ where: { id: folio.id }, data: { balance: newBalance } })

      afterMutation('folio')
      broadcastEvent('pos:charge_to_room', { folioId: folio.id, amount, reservationId })
      return NextResponse.json({ success: true, folioId: folio.id, amount })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('POS POST error:', error)
    return NextResponse.json({ error: 'Failed to process POS request' }, { status: 500 })
  }
}
