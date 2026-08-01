/**
 * Shared dashboard data-fetching functions.
 *
 * Each function is independently cached via getOrSet() with a 5-minute TTL.
 * Both the individual sub-endpoints AND the orchestrator import these — so
 * within a single function invocation the cache is shared, and across
 * invocations the 5-min TTL prevents duplicate DB work.
 *
 * In a single-function invocation (the orchestrator), all three functions
 * share the same Map cache → only uncached keys trigger DB queries.
 */

import { db } from '@/lib/db'
import { getOrSet, getSettingsMap } from '@/lib/cache'

// ─── Date Helpers ────────────────────────────────────────────────────────

function getDates() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return { today, tomorrow, yesterday, sevenDaysAgo }
}

// ─── KPIs ────────────────────────────────────────────────────────────────

export interface KpisData {
  kpis: {
    totalRooms: number
    occupiedRooms: number
    occupancy: number
    occupancyTrend: number
    arrivals: number
    departures: number
    vacantClean: number
    totalRevenue: number
    roomRevenue: number
    fAndBRevenue: number
    otherRevenue: number
    adr: number
    revpar: number
    revenueTrend: number
    adrTrend: number
    revparTrend: number
  }
  roomStatusBreakdown: Record<string, number>
  revenueChart: Array<{
    date: string
    roomRevenue: number
    fAndBRevenue: number
    totalRevenue: number
  }>
  defaultCreditLimit: number
}

export async function fetchKpis(): Promise<KpisData> {
  return getOrSet('dashboard:kpis', async () => {
    const { today, tomorrow, yesterday, sevenDaysAgo } = getDates()

    // Single batch — ALL independent queries (settings + counts + breakdown + revenue)
    const [
      settingsMap, totalRooms, occupiedRooms, vacantClean,
      yesterdayAudit, lastAudit, arrivals, departures,
      roomStatusBreakdown, revenueHistory,
    ] = await Promise.all([
      getSettingsMap(),
      db.room.count(),
      db.room.count({ where: { status: 'occupied' } }),
      db.room.count({ where: { status: 'vacant_clean' } }),
      db.nightAudit.findFirst({
        where: { status: 'completed', businessDate: yesterday },
        orderBy: { businessDate: 'desc' },
      }),
      db.nightAudit.findFirst({
        where: { status: 'completed' },
        orderBy: { businessDate: 'desc' },
      }),
      db.reservation.count({
        where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed' },
      }),
      db.reservation.count({
        where: { checkOut: { gte: today, lt: tomorrow }, status: 'checked_in' },
      }),
      db.room.groupBy({ by: ['status'], _count: { status: true } }),
      db.nightAudit.findMany({
        where: { status: 'completed', businessDate: { gte: sevenDaysAgo, lt: today } },
        orderBy: { businessDate: 'asc' },
        select: { businessDate: true, roomRevenue: true, fAndBRevenue: true, totalRevenue: true },
      }),
    ])

    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
    const occupancyTrend = yesterdayAudit?.occupancy
      ? occupancy - Math.round(yesterdayAudit.occupancy) : 0

    const roomRevenue = lastAudit?.roomRevenue ?? 0
    const fAndBRevenue = lastAudit?.fAndBRevenue ?? 0
    const otherRevenue = lastAudit?.otherRevenue ?? 0
    const totalRevenue = lastAudit?.totalRevenue ?? 0
    const adr = lastAudit?.adr ?? 0
    const revpar = lastAudit?.revpar ?? 0

    const yesterdayTotalRevenue = yesterdayAudit?.totalRevenue ?? 0
    const yesterdayAdr = yesterdayAudit?.adr ?? 0
    const yesterdayRevpar = yesterdayAudit?.revpar ?? 0

    const revenueTrend = yesterdayTotalRevenue > 0
      ? Math.round(((totalRevenue - yesterdayTotalRevenue) / yesterdayTotalRevenue) * 100) : 0
    const adrTrend = yesterdayAdr > 0
      ? Math.round(((adr - yesterdayAdr) / yesterdayAdr) * 100) : 0
    const revparTrend = yesterdayRevpar > 0
      ? Math.round(((revpar - yesterdayRevpar) / yesterdayRevpar) * 100) : 0

    const roomStatusMap: Record<string, number> = {}
    for (const item of roomStatusBreakdown) roomStatusMap[item.status] = item._count.status

    const revenueChartData = revenueHistory.map((d) => ({
      date: d.businessDate.toISOString().split('T')[0],
      roomRevenue: d.roomRevenue,
      fAndBRevenue: d.fAndBRevenue,
      totalRevenue: d.totalRevenue,
    }))

    return {
      kpis: {
        totalRooms, occupiedRooms, occupancy, occupancyTrend,
        arrivals, departures, vacantClean,
        totalRevenue, roomRevenue, fAndBRevenue, otherRevenue,
        adr, revpar, revenueTrend, adrTrend, revparTrend,
      },
      roomStatusBreakdown: roomStatusMap,
      revenueChart: revenueChartData,
      defaultCreditLimit: (settingsMap['defaultCreditLimit'] as number) ?? 15000,
    }
  })
}

// ─── Alerts ──────────────────────────────────────────────────────────────

export interface AlertsData {
  alerts: {
    vipArrivals: Array<{
      id: string; confirmationNo: string; guestName: string;
      vipLevel: string | null; roomNumber: string | null; checkIn: Date;
    }>
    overdueCheckouts: number
    emergencyWorkOrders: Array<{
      id: string; title: string; category: string;
      priority: string; status: string; createdAt: Date;
    }>
    outOfOrderRooms: Array<{ id: string; number: string; floor: number }>
    outOfOrderCount: number
    unassignedArrivals: number
    creditLimitBreaches: Array<{
      id: string; guestName: string; roomNumber: string | null;
      balance: number; creditLimit: number;
    }>
    pendingHkTasks: number
    openWorkflowTasks: number
    highPriorityWorkflowTasks: Array<{
      id: string; title: string; priority: string; status: string;
      category: string; area: string | null;
      room: { number: string; floor: number } | null;
      assignedByName: string | null; dueDate: Date | null; requestedDate: Date;
    }>
    openPosOrders: number
  }
}

export async function fetchAlerts(): Promise<AlertsData> {
  return getOrSet('dashboard:alerts', async () => {
    const { today, tomorrow } = getDates()

    const [
      settingsMap, vipArrivals, overdueCheckouts, emergencyWorkOrders,
      outOfOrderRoomsList, unassignedArrivals, creditLimitBreaches,
      pendingHkTasks, openWorkflowTasks, highPriorityWorkflowTasks, openPosOrders,
    ] = await Promise.all([
      getSettingsMap(),
      db.reservation.findMany({
        where: {
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['confirmed', 'checked_in'] },
          guest: { vipLevel: { in: ['gold', 'platinum'] } },
        },
        include: { guest: true, room: true },
        take: 5,
      }),
      db.reservation.count({
        where: { checkOut: { lt: new Date(new Date().setHours(0, 0, 0, 0)) }, status: 'checked_in' },
      }),
      db.workOrder.findMany({
        where: { priority: 'emergency', status: { in: ['open', 'in_progress'] } },
        take: 5,
      }),
      db.room.findMany({
        where: { status: 'out_of_order' },
        select: { id: true, number: true, floor: true },
        take: 10,
      }),
      db.reservation.count({
        where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed', roomId: null },
      }),
      db.folio.findMany({
        where: {
          status: 'open',
          balance: { gt: 15000 },
          reservation: { status: 'checked_in' },
        },
        include: { reservation: { include: { guest: true, room: true } } },
        take: 5,
      }),
      db.hkTask.count({
        where: { status: { in: ['pending', 'assigned', 'in_progress'] } },
      }),
      db.hkWorkFlow.count({
        where: { status: { in: ['open', 'in_progress'] } },
      }),
      db.hkWorkFlow.findMany({
        where: {
          status: { in: ['open', 'in_progress'] },
          priority: { in: ['high', 'medium'] },
        },
        include: { room: { select: { id: true, number: true, floor: true, wing: true } } },
        orderBy: { requestedDate: 'asc' },
        take: 5,
      }),
      db.posOrder.count({
        where: { status: { in: ['open', 'in_progress', 'ready'] } },
      }),
    ])

    const defaultCreditLimit = (settingsMap['defaultCreditLimit'] as number) ?? 15000

    return {
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
          id: w.id, title: w.title, category: w.category,
          priority: w.priority, status: w.status, createdAt: w.createdAt,
        })),
        outOfOrderRooms: outOfOrderRoomsList.map((r) => ({
          id: r.id, number: r.number, floor: r.floor,
        })),
        outOfOrderCount: outOfOrderRoomsList.length,
        unassignedArrivals,
        creditLimitBreaches: creditLimitBreaches.map((f) => ({
          id: f.id,
          guestName: f.reservation.guest
            ? `${f.reservation.guest.firstName} ${f.reservation.guest.lastName}` : 'Unknown',
          roomNumber: f.reservation.room?.number,
          balance: f.balance,
          creditLimit: defaultCreditLimit,
        })),
        pendingHkTasks,
        openWorkflowTasks,
        highPriorityWorkflowTasks: highPriorityWorkflowTasks.map((w) => ({
          id: w.id, title: w.title, priority: w.priority, status: w.status,
          category: w.category, area: w.area,
          room: w.room ? { number: w.room.number, floor: w.room.floor } : null,
          assignedByName: w.assignedByName,
          dueDate: w.dueDate, requestedDate: w.requestedDate,
        })),
        openPosOrders,
      },
    }
  })
}

// ─── Activity ────────────────────────────────────────────────────────────

export interface ActivityData {
  recentActivity: Array<{
    id: string; type: string; title: string; detail: string;
    status: string; amount?: number; timestamp: string;
  }>
}

export async function fetchActivity(): Promise<ActivityData> {
  return getOrSet('dashboard:activity', async () => {
    const [recentReservations, recentTransactions, recentPosOrders, recentWorkOrders] =
      await Promise.all([
        db.reservation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { guest: true, room: true },
        }),
        db.folioTransaction.findMany({
          orderBy: { createdAt: 'desc' },
          take: 2,
          include: { folio: { include: { reservation: { include: { guest: true } } } } },
        }),
        db.posOrder.findMany({
          orderBy: { createdAt: 'desc' },
          take: 2,
          include: { outlet: true },
        }),
        db.workOrder.findMany({
          orderBy: { createdAt: 'desc' },
          take: 2,
        }),
      ])

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

    return { recentActivity }
  })
}
