/**
 * Shared dashboard data-fetching functions.
 *
 * Performance strategy:
 * - Default range = "7d" (last 7 completed days, excludes today)
 * - When today is excluded, ALL data comes from night_audit table
 *   (pre-aggregated, single table scan, no live counts → ~2-5ms)
 * - When range includes today, falls back to live room/reservation counts
 * - Each function is cached via getOrSet() with a 5-minute TTL.
 */

import { db, withPoolRetry } from '@/lib/db'
import { getOrSet, getSettingsMap } from '@/lib/cache'

// ─── Date Range Types ───────────────────────────────────────────

export type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom'

export interface DateRange {
  type: DateRangeType
  from: Date  // inclusive
  to: Date    // exclusive (like Prisma lt)
  label: string
  includesToday: boolean
}

/**
 * Parse a date range from query params.
 * Defaults to '7d' (last 7 completed days, excludes today).
 */
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const range = searchParams.get('range') || '7d'
  const customFrom = searchParams.get('from')
  const customTo = searchParams.get('to')

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  switch (range) {
    case 'today':
      return { type: 'today', from: today, to: tomorrow, label: 'Today', includesToday: true }
    case 'yesterday': {
      const from = new Date(today); from.setDate(from.getDate() - 1)
      return { type: 'yesterday', from, to: today, label: 'Yesterday', includesToday: false }
    }
    case '7d': {
      const from = new Date(today); from.setDate(from.getDate() - 7)
      return { type: '7d', from, to: today, label: 'Last 7 Days', includesToday: false }
    }
    case '30d': {
      const from = new Date(today); from.setDate(from.getDate() - 30)
      return { type: '30d', from, to: today, label: 'Last 30 Days', includesToday: false }
    }
    case 'month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { type: 'month', from, to: today, label: 'This Month', includesToday: false }
    }
    case 'custom': {
      const from = customFrom ? new Date(customFrom) : new Date(today.getTime() - 7 * 86400000)
      const to = customTo ? new Date(customTo) : today
      from.setHours(0, 0, 0, 0)
      to.setHours(0, 0, 0, 0)
      // If "to" is today or later, mark as including today
      const inclToday = to >= today
      return {
        type: 'custom', from, to,
        label: `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        includesToday: inclToday,
      }
    }
    default:
      // Fallback to 7d
      const from = new Date(today); from.setDate(from.getDate() - 7)
      return { type: '7d', from, to: today, label: 'Last 7 Days', includesToday: false }
  }
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
  range: { type: string; label: string; from: string; to: string }
}

/**
 * Fetch KPIs for a given date range.
 *
 * FAST PATH (excludes today): All data from night_audit table.
 *   - 1 query for revenue chart data
 *   - 1 query for settings
 *   - Total: ~2-5ms with cache
 *
 * SLOW PATH (includes today): Falls back to live counts.
 *   - 10 parallel queries for room/reservation counts
 *   - Total: ~100-500ms (network latency to Supabase)
 */
export async function fetchKpis(dateRange?: DateRange): Promise<KpisData> {
  // Default to 7d (excludes today = fast)
  const range = dateRange ?? parseDateRange(new URLSearchParams('range=7d'))
  const cacheKey = `dashboard:kpis:${range.type}:${range.from.toISOString()}:${range.to.toISOString()}`

  return getOrSet(cacheKey, async () => {
    const [settingsMap, audits] = await withPoolRetry(() => Promise.all([
      getSettingsMap(),
      db.nightAudit.findMany({
        where: { status: 'completed', businessDate: { gte: range.from, lt: range.to } },
        orderBy: { businessDate: 'asc' },
        select: {
          businessDate: true, roomRevenue: true, fAndBRevenue: true,
          totalRevenue: true, otherRevenue: true, occupancy: true,
          arrivals: true, departures: true, adr: true, revpar: true,
          totalRooms: true, occupiedRooms: true,
        },
      }),
    ]))

    const defaultCreditLimit = (settingsMap['defaultCreditLimit'] as number) ?? 15000

    if (range.includesToday) {
      // SLOW PATH — includes today, need live counts
      return fetchKpisLive(range, settingsMap, audits, defaultCreditLimit)
    }

    // FAST PATH — excludes today, aggregate from night audits only
    return aggregateFromAudits(range, settingsMap, audits, defaultCreditLimit)
  })
}

/** Aggregate all KPIs from night audit data (no live DB counts). */
function aggregateFromAudits(
  range: DateRange,
  settingsMap: Record<string, unknown>,
  audits: Array<{
    businessDate: Date; roomRevenue: number; fAndBRevenue: number
    totalRevenue: number; otherRevenue: number; occupancy: number
    arrivals: number; departures: number; adr: number; revpar: number
    totalRooms: number; occupiedRooms: number
  }>,
  defaultCreditLimit: number,
): KpisData {
  // Revenue chart from audits
  const revenueChart = audits.map((d) => ({
    date: d.businessDate.toISOString().split('T')[0],
    roomRevenue: d.roomRevenue,
    fAndBRevenue: d.fAndBRevenue,
    totalRevenue: d.totalRevenue,
  }))

  // Sum across all days in range
  const totals = audits.reduce(
    (acc, d) => ({
      totalRevenue: acc.totalRevenue + d.totalRevenue,
      roomRevenue: acc.roomRevenue + d.roomRevenue,
      fAndBRevenue: acc.fAndBRevenue + d.fAndBRevenue,
      otherRevenue: acc.otherRevenue + d.otherRevenue,
      arrivals: acc.arrivals + d.arrivals,
      departures: acc.departures + d.departures,
    }),
    { totalRevenue: 0, roomRevenue: 0, fAndBRevenue: 0, otherRevenue: 0, arrivals: 0, departures: 0 },
  )

  // Use latest audit for current state (occupancy, ADR, RevPAR)
  const latest = audits[audits.length - 1]
  const previous = audits.length >= 2 ? audits[audits.length - 2] : null

  const occupancy = latest?.occupancy ?? 0
  const occupancyTrend = previous?.occupancy
    ? Math.round(occupancy - previous.occupancy) : 0

  const adr = latest?.adr ?? 0
  const revpar = latest?.revpar ?? 0
  const totalRooms = latest?.totalRooms ?? 0
  const occupiedRooms = latest?.occupiedRooms ?? 0

  // Trends vs previous period day
  const revenueTrend = previous?.totalRevenue && previous.totalRevenue > 0
    ? Math.round(((latest?.totalRevenue ?? 0) - previous.totalRevenue) / previous.totalRevenue * 100) : 0
  const adrTrend = previous?.adr && previous.adr > 0
    ? Math.round(((latest?.adr ?? 0) - previous.adr) / previous.adr * 100) : 0
  const revparTrend = previous?.revpar && previous.revpar > 0
    ? Math.round(((latest?.revpar ?? 0) - previous.revpar) / previous.revpar * 100) : 0

  // vacantClean from latest snapshot (or default)
  const vacantClean = totalRooms > 0 ? totalRooms - occupiedRooms : 0

  return {
    kpis: {
      totalRooms, occupiedRooms,
      occupancy: Math.round(occupancy),
      occupancyTrend,
      arrivals: totals.arrivals,
      departures: totals.departures,
      vacantClean,
      totalRevenue: totals.totalRevenue,
      roomRevenue: totals.roomRevenue,
      fAndBRevenue: totals.fAndBRevenue,
      otherRevenue: totals.otherRevenue,
      adr, revpar, revenueTrend, adrTrend, revparTrend,
    },
    roomStatusBreakdown: { occupied: occupiedRooms, vacant_clean: vacantClean },
    revenueChart,
    defaultCreditLimit,
    range: { type: range.type, label: range.label, from: range.from.toISOString(), to: range.to.toISOString() },
  }
}

/** Live path — includes today, needs real-time room/reservation counts. */
async function fetchKpisLive(
  range: DateRange,
  settingsMap: Record<string, unknown>,
  audits: Array<{
    businessDate: Date; roomRevenue: number; fAndBRevenue: number
    totalRevenue: number; otherRevenue: number; occupancy: number
    arrivals: number; departures: number; adr: number; revpar: number
    totalRooms: number; occupiedRooms: number
  }>,
  defaultCreditLimit: number,
): Promise<KpisData> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  const [totalRooms, occupiedRooms, vacantClean, yesterdayAudit, roomStatusBreakdown, arrivals, departures] =
    await withPoolRetry(() => Promise.all([
      db.room.count(),
      db.room.count({ where: { status: 'occupied' } }),
      db.room.count({ where: { status: 'vacant_clean' } }),
      db.nightAudit.findFirst({
        where: { status: 'completed', businessDate: yesterday },
        orderBy: { businessDate: 'desc' },
      }),
      db.room.groupBy({ by: ['status'], _count: { status: true } }),
      db.reservation.count({
        where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed' },
      }),
      db.reservation.count({
        where: { checkOut: { gte: today, lt: tomorrow }, status: 'checked_in' },
      }),
    ]))

  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
  const occupancyTrend = yesterdayAudit?.occupancy
    ? occupancy - Math.round(yesterdayAudit.occupancy) : 0

  const latest = audits[audits.length - 1]
  const previous = audits.length >= 2 ? audits[audits.length - 2] : yesterdayAudit

  const totalRevenue = latest?.totalRevenue ?? 0
  const roomRevenue = latest?.roomRevenue ?? 0
  const fAndBRevenue = latest?.fAndBRevenue ?? 0
  const otherRevenue = latest?.otherRevenue ?? 0
  const adr = latest?.adr ?? 0
  const revpar = latest?.revpar ?? 0

  const prevRevenue = previous?.totalRevenue ?? 0
  const prevAdr = previous?.adr ?? 0
  const prevRevpar = previous?.revpar ?? 0

  const revenueTrend = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0
  const adrTrend = prevAdr > 0 ? Math.round(((adr - prevAdr) / prevAdr) * 100) : 0
  const revparTrend = prevRevpar > 0 ? Math.round(((revpar - prevRevpar) / prevRevpar) * 100) : 0

  const roomStatusMap: Record<string, number> = {}
  for (const item of roomStatusBreakdown) roomStatusMap[item.status] = item._count.status

  const revenueChart = audits.map((d) => ({
    date: d.businessDate.toISOString().split('T')[0],
    roomRevenue: d.roomRevenue,
    fAndBRevenue: d.fAndBRevenue,
    totalRevenue: d.totalRevenue,
  }))

  return {
    kpis: { totalRooms, occupiedRooms, occupancy, occupancyTrend, arrivals, departures, vacantClean,
      totalRevenue, roomRevenue, fAndBRevenue, otherRevenue, adr, revpar, revenueTrend, adrTrend, revparTrend },
    roomStatusBreakdown: roomStatusMap,
    revenueChart,
    defaultCreditLimit,
    range: { type: range.type, label: range.label, from: range.from.toISOString(), to: range.to.toISOString() },
  }
}

// ─── Alerts (unchanged — always current state) ──────────────────────────

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
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      settingsMap, vipArrivals, overdueCheckouts, emergencyWorkOrders,
      outOfOrderRoomsList, unassignedArrivals, creditLimitBreaches,
      pendingHkTasks, openWorkflowTasks, highPriorityWorkflowTasks, openPosOrders,
    ] = await withPoolRetry(() => Promise.all([
      getSettingsMap(),
      db.reservation.findMany({
        where: {
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['confirmed', 'checked_in'] },
          guest: { vipLevel: { in: ['gold', 'platinum'] } },
        },
        include: { guest: true, room: true }, take: 5,
      }),
      db.reservation.count({
        where: { checkOut: { lt: today }, status: 'checked_in' },
      }),
      db.workOrder.findMany({
        where: { priority: 'emergency', status: { in: ['open', 'in_progress'] } }, take: 5,
      }),
      db.room.findMany({
        where: { status: 'out_of_order' },
        select: { id: true, number: true, floor: true }, take: 10,
      }),
      db.reservation.count({
        where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed', roomId: null },
      }),
      db.folio.findMany({
        where: { status: 'open', balance: { gt: 15000 }, reservation: { status: 'checked_in' } },
        include: { reservation: { include: { guest: true, room: true } } }, take: 5,
      }),
      db.hkTask.count({ where: { status: { in: ['pending', 'assigned', 'in_progress'] } } }),
      db.hkWorkFlow.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      db.hkWorkFlow.findMany({
        where: { status: { in: ['open', 'in_progress'] }, priority: { in: ['high', 'medium'] } },
        include: { room: { select: { id: true, number: true, floor: true, wing: true } } },
        orderBy: { requestedDate: 'asc' }, take: 5,
      }),
      db.posOrder.count({ where: { status: { in: ['open', 'in_progress', 'ready'] } } }),
    ]))

    const defaultCreditLimit = (settingsMap['defaultCreditLimit'] as number) ?? 15000

    return {
      alerts: {
        vipArrivals: vipArrivals.map((r) => ({
          id: r.id, confirmationNo: r.confirmationNo,
          guestName: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
          vipLevel: r.guest?.vipLevel, roomNumber: r.room?.number, checkIn: r.checkIn,
        })),
        overdueCheckouts,
        emergencyWorkOrders: emergencyWorkOrders.map((w) => ({
          id: w.id, title: w.title, category: w.category,
          priority: w.priority, status: w.status, createdAt: w.createdAt,
        })),
        outOfOrderRooms: outOfOrderRoomsList.map((r) => ({ id: r.id, number: r.number, floor: r.floor })),
        outOfOrderCount: outOfOrderRoomsList.length,
        unassignedArrivals,
        creditLimitBreaches: creditLimitBreaches.map((f) => ({
          id: f.id,
          guestName: f.reservation.guest ? `${f.reservation.guest.firstName} ${f.reservation.guest.lastName}` : 'Unknown',
          roomNumber: f.reservation.room?.number, balance: f.balance, creditLimit: defaultCreditLimit,
        })),
        pendingHkTasks, openWorkflowTasks,
        highPriorityWorkflowTasks: highPriorityWorkflowTasks.map((w) => ({
          id: w.id, title: w.title, priority: w.priority, status: w.status,
          category: w.category, area: w.area,
          room: w.room ? { number: w.room.number, floor: w.room.floor } : null,
          assignedByName: w.assignedByName, dueDate: w.dueDate, requestedDate: w.requestedDate,
        })),
        openPosOrders,
      },
    }
  })
}

// ─── Activity (unchanged — always latest) ────────────────────────────────

export interface ActivityData {
  recentActivity: Array<{
    id: string; type: string; title: string; detail: string;
    status: string; amount?: number; timestamp: string;
  }>
}

export async function fetchActivity(): Promise<ActivityData> {
  return getOrSet('dashboard:activity', async () => {
    const [recentReservations, recentTransactions, recentPosOrders, recentWorkOrders] =
      await withPoolRetry(() => Promise.all([
        db.reservation.findMany({ orderBy: { createdAt: 'desc' }, take: 3, include: { guest: true, room: true } }),
        db.folioTransaction.findMany({
          orderBy: { createdAt: 'desc' }, take: 2,
          include: { folio: { include: { reservation: { include: { guest: true } } } } },
        }),
        db.posOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 2, include: { outlet: true } }),
        db.workOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 2 }),
      ]))

    const recentActivity = [
      ...recentReservations.map((r) => ({
        id: r.id, type: 'reservation' as const,
        title: `New reservation ${r.confirmationNo}`,
        detail: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Walk-in',
        status: r.status, timestamp: r.createdAt.toISOString(),
      })),
      ...recentTransactions.map((t) => ({
        id: t.id, type: 'folio' as const,
        title: `${t.transactionType} charge posted`,
        detail: t.description, status: 'posted', amount: t.totalAmount,
        timestamp: t.createdAt.toISOString(),
      })),
      ...recentPosOrders.map((o) => ({
        id: o.id, type: 'pos' as const,
        title: `POS Order #${o.id.slice(-6)}`,
        detail: o.outlet?.name ?? 'Unknown Outlet', status: o.status, amount: o.totalAmount,
        timestamp: o.createdAt.toISOString(),
      })),
      ...recentWorkOrders.map((w) => ({
        id: w.id, type: 'work_order' as const,
        title: w.title, detail: w.category, status: w.status,
        timestamp: w.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return { recentActivity }
  })
}
