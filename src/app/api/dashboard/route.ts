import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Total rooms
    const totalRooms = await db.room.count()

    // Occupied rooms
    const occupiedRooms = await db.room.count({ where: { status: 'occupied' } })

    // Vacant clean rooms
    const vacantClean = await db.room.count({ where: { status: 'vacant_clean' } })

    // Occupancy percentage
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    // Yesterday's occupancy for trend
    const yesterdayAudit = await db.nightAudit.findFirst({
      where: { status: 'completed', businessDate: yesterday },
      orderBy: { businessDate: 'desc' },
    })
    const occupancyTrend = yesterdayAudit?.occupancy ? occupancy - Math.round(yesterdayAudit.occupancy) : 0

    // Today's arrivals (confirmed only)
    const arrivals = await db.reservation.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
        status: 'confirmed',
      },
    })

    // Today's departures (checked_in)
    const departures = await db.reservation.count({
      where: {
        checkOut: { gte: today, lt: tomorrow },
        status: 'checked_in',
      },
    })

    // Revenue calculations from night audits (last completed)
    const lastAudit = await db.nightAudit.findFirst({
      where: { status: 'completed' },
      orderBy: { businessDate: 'desc' },
    })

    const roomRevenue = lastAudit?.roomRevenue ?? 0
    const fAndBRevenue = lastAudit?.fAndBRevenue ?? 0
    const otherRevenue = lastAudit?.otherRevenue ?? 0
    const totalRevenue = lastAudit?.totalRevenue ?? 0
    const adr = lastAudit?.adr ?? 0
    const revpar = lastAudit?.revpar ?? 0

    // Yesterday's revenue for trends
    const yesterdayTotalRevenue = yesterdayAudit?.totalRevenue ?? 0
    const yesterdayAdr = yesterdayAudit?.adr ?? 0
    const yesterdayRevpar = yesterdayAudit?.revpar ?? 0

    const revenueTrend = yesterdayTotalRevenue > 0
      ? Math.round(((totalRevenue - yesterdayTotalRevenue) / yesterdayTotalRevenue) * 100)
      : 0
    const adrTrend = yesterdayAdr > 0
      ? Math.round(((adr - yesterdayAdr) / yesterdayAdr) * 100)
      : 0
    const revparTrend = yesterdayRevpar > 0
      ? Math.round(((revpar - yesterdayRevpar) / yesterdayRevpar) * 100)
      : 0

    // Room status breakdown
    const roomStatusBreakdown = await db.room.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const roomStatusMap: Record<string, number> = {}
    for (const item of roomStatusBreakdown) {
      roomStatusMap[item.status] = item._count.status
    }

    // Alerts: VIP arrivals today
    const vipArrivals = await db.reservation.findMany({
      where: {
        checkIn: { gte: today, lt: tomorrow },
        status: { in: ['confirmed', 'checked_in'] },
        guest: { vipLevel: { in: ['gold', 'platinum'] } },
      },
      include: { guest: true, room: true },
      take: 5,
    })

    // Alerts: Overdue check-outs
    const overdueCheckouts = await db.reservation.count({
      where: {
        checkOut: { lt: today },
        status: 'checked_in',
      },
    })

    // Alerts: Maintenance emergencies
    const emergencyWorkOrders = await db.workOrder.findMany({
      where: { priority: 'emergency', status: { in: ['open', 'in_progress'] } },
      take: 5,
    })

    // Alerts: Rooms out of order
    const outOfOrderRoomsList = await db.room.findMany({
      where: { status: 'out_of_order' },
      select: { id: true, number: true, floor: true },
      take: 10,
    })

    // Unassigned arrivals (confirmed but no room assigned)
    const unassignedArrivals = await db.reservation.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
        status: 'confirmed',
        roomId: null,
      },
    })

    // Credit limit breaches (checked_in guests with balance > credit limit)
    const creditLimitBreaches = await db.folio.findMany({
      where: {
        status: 'open',
        balance: { gt: 15000 },
        reservation: { status: 'checked_in' },
      },
      include: { reservation: { include: { guest: true, room: true } } },
      take: 5,
    })

    // Open HK tasks
    const pendingHkTasks = await db.hkTask.count({
      where: { status: { in: ['pending', 'assigned', 'in_progress'] } },
    })

    // Open POS orders
    const openPosOrders = await db.posOrder.count({
      where: { status: { in: ['open', 'in_progress', 'ready'] } },
    })

    // ─── 7-day Revenue Trend ──────────────────────────────────
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const revenueHistory = await db.nightAudit.findMany({
      where: {
        status: 'completed',
        businessDate: { gte: sevenDaysAgo, lt: today },
      },
      orderBy: { businessDate: 'asc' },
      select: {
        businessDate: true,
        roomRevenue: true,
        fAndBRevenue: true,
        totalRevenue: true,
      },
    })

    const revenueChartData = revenueHistory.map((d) => ({
      date: d.businessDate.toISOString().split('T')[0],
      roomRevenue: d.roomRevenue,
      fAndBRevenue: d.fAndBRevenue,
      totalRevenue: d.totalRevenue,
    }))

    // ─── Recent Activity ──────────────────────────────────────
    const recentReservations = await db.reservation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { guest: true, room: true },
    })

    const recentTransactions = await db.folioTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { folio: { include: { reservation: { include: { guest: true } } } } },
    })

    const recentPosOrders = await db.posOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { outlet: true },
    })

    const recentWorkOrders = await db.workOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2,
    })

    const recentActivity = [
      ...recentReservations.map((r) => ({
        id: r.id,
        type: 'reservation' as const,
        title: `New reservation ${r.confirmationNo}`,
        detail: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Walk-in',
        status: r.status,
        timestamp: r.createdAt.toISOString(),
      })),
      ...recentTransactions.map((t) => ({
        id: t.id,
        type: 'folio' as const,
        title: `${t.transactionType} charge posted`,
        detail: t.description,
        status: 'posted',
        amount: t.totalAmount,
        timestamp: t.createdAt.toISOString(),
      })),
      ...recentPosOrders.map((o) => ({
        id: o.id,
        type: 'pos' as const,
        title: `POS Order #${o.id.slice(-6)}`,
        detail: o.outlet.name,
        status: o.status,
        amount: o.totalAmount,
        timestamp: o.createdAt.toISOString(),
      })),
      ...recentWorkOrders.map((w) => ({
        id: w.id,
        type: 'work_order' as const,
        title: w.title,
        detail: w.category,
        status: w.status,
        timestamp: w.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({
      kpis: {
        totalRooms,
        occupiedRooms,
        occupancy,
        occupancyTrend,
        arrivals,
        departures,
        vacantClean,
        totalRevenue,
        roomRevenue,
        fAndBRevenue,
        otherRevenue,
        adr,
        revpar,
        revenueTrend,
        adrTrend,
        revparTrend,
      },
      roomStatusBreakdown: roomStatusMap,
      alerts: {
        vipArrivals: vipArrivals.map((r) => ({
          id: r.id,
          confirmationNo: r.confirmationNo,
          guestName: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          vipLevel: r.guest?.vipLevel,
          roomNumber: r.room?.number,
          checkIn: r.checkIn,
        })),
        overdueCheckouts,
        emergencyWorkOrders: emergencyWorkOrders.map((w) => ({
          id: w.id,
          title: w.title,
          category: w.category,
          priority: w.priority,
          status: w.status,
          createdAt: w.createdAt,
        })),
        outOfOrderRooms: outOfOrderRoomsList.map((r) => ({
          id: r.id,
          number: r.number,
          floor: r.floor,
        })),
        outOfOrderCount: outOfOrderRoomsList.length,
        unassignedArrivals,
        creditLimitBreaches: creditLimitBreaches.map((f) => ({
          id: f.id,
          guestName: f.reservation.guest ? `${f.reservation.guest.firstName} ${f.reservation.guest.lastName}` : 'Unknown',
          roomNumber: f.reservation.room?.number,
          balance: f.balance,
          creditLimit: 15000,
        })),
        pendingHkTasks,
        openPosOrders,
      },
      revenueChart: revenueChartData,
      recentActivity,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
