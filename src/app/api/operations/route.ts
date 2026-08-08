import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { postNightAuditSummary } from '@/lib/accounting/auto-post'
import { getHotelNow, getHotelToday, DEFAULT_TIMEZONE } from '@/lib/timezone'

// ─── Hotel timezone helpers (replaces manual offset math) ──────
function getNepalNow(): Date { return getHotelNow() }
function getNepalToday(): Date { return getHotelToday() }

function getNepalTomorrow(): Date {
  const d = getHotelNow()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}

// ─── Friendly label for transaction types ───────────────────────
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  room: 'Room Revenue',
  f_and_b: 'Food & Beverage',
  laundry: 'Laundry',
  spa: 'Spa & Wellness',
  phone: 'Phone',
  minibar: 'Minibar',
  business_center: 'Business Center',
  miscellaneous: 'Other Services',
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const data = await getOrSet('operations:dashboard', async () => {
    const nepalToday = getNepalToday()
    const nepalTomorrow = getNepalTomorrow()
    const todayStr = nepalToday.toISOString().split('T')[0]
    const dayOfWeek = getNepalNow().toLocaleDateString('en-US', { weekday: 'long' })

    // ── Parallel queries ───────────────────────────────────────────
    const [
      nightAudits,
      cashierShifts,
      allRooms,
      inHouseReservations,
      todayArrivals,
      todayDepartures,
      walkInReservations,
      noShowReservations,
      cancelledReservations,
      todayTransactions,
      todayPayments,
      todayHkTasks,
      openWorkOrders,
      openPosOrders,
      vipInHouseReservations,
      openFolios,
      property,
      todayArrivalsCheckedIn,
      todayDeparturesDone,
      foliosAboveCredit,
    ] = await Promise.all([
      // Night audits (last 30)
      db.nightAudit.findMany({
        orderBy: { businessDate: 'desc' },
        take: 30,
      }),

      // Cashier shifts (last 30)
      db.cashierShift.findMany({
        orderBy: { startDate: 'desc' },
        take: 30,
      }),

      // All rooms
      db.room.findMany({
        select: { id: true, number: true, status: true, floor: true },
      }),

      // In-house reservations (checked_in, where today falls within stay)
      db.reservation.findMany({
        where: {
          status: 'checked_in',
          checkIn: { lt: nepalTomorrow },
          checkOut: { gt: nepalToday },
        },
        include: { guest: true, room: true },
      }),

      // Today's arrivals (confirmed/checked_in with checkIn today)
      db.reservation.count({
        where: {
          checkIn: { gte: nepalToday, lt: nepalTomorrow },
          status: { in: ['confirmed', 'checked_in'] },
        },
      }),

      // Today's departures (checked_out with checkOut today, OR checked_in with checkOut today)
      db.reservation.count({
        where: {
          checkOut: { gte: nepalToday, lt: nepalTomorrow },
          status: { in: ['checked_in', 'checked_out'] },
        },
      }),

      // Walk-in reservations today
      db.reservation.count({
        where: {
          reservationType: 'walk_in',
          checkIn: { gte: nepalToday, lt: nepalTomorrow },
          status: { not: 'cancelled' },
        },
      }),

      // No-show reservations today
      db.reservation.count({
        where: {
          status: 'no_show',
          checkIn: { gte: nepalToday, lt: nepalTomorrow },
        },
      }),

      // Cancelled reservations today
      db.reservation.count({
        where: {
          status: 'cancelled',
          createdAt: { gte: nepalToday, lt: nepalTomorrow },
        },
      }),

      // Today's folio transactions
      db.folioTransaction.findMany({
        where: {
          createdAt: { gte: nepalToday, lt: nepalTomorrow },
        },
        select: { transactionType: true, amount: true, taxAmount: true, totalAmount: true },
      }),

      // Today's folio payments
      db.folioPayment.findMany({
        where: {
          createdAt: { gte: nepalToday, lt: nepalTomorrow },
          status: 'completed',
        },
        select: { paymentMethod: true, amount: true },
      }),

      // Today's HK tasks
      db.hkTask.findMany({
        where: {
          scheduledTime: { gte: nepalToday, lt: nepalTomorrow },
        },
        select: { id: true, status: true },
      }),

      // Open work orders
      db.workOrder.findMany({
        where: {
          status: { in: ['open', 'assigned', 'in_progress'] },
        },
        select: { id: true },
      }),

      // Open POS orders
      db.posOrder.findMany({
        where: {
          status: { in: ['open', 'in_progress', 'ready', 'served'] },
        },
        select: { id: true, totalAmount: true },
      }),

      // VIP in-house guests
      db.reservation.findMany({
        where: {
          status: 'checked_in',
          checkIn: { lt: nepalTomorrow },
          checkOut: { gt: nepalToday },
          guest: {
            vipLevel: { not: 'none' },
          },
        },
        include: { guest: true, room: true },
      }),

      // Open folios with balance (for pending folio balance)
      db.folio.findMany({
        where: {
          status: 'open',
          balance: { gt: 0 },
        },
        select: { balance: true },
      }),

      // Property config
      db.property.findFirst({
        select: { totalRooms: true },
      }),

      // Today's arrivals: already checked in
      db.reservation.count({
        where: {
          checkIn: { gte: nepalToday, lt: nepalTomorrow },
          status: 'checked_in',
        },
      }),

      // Today's departures: already checked out
      db.reservation.count({
        where: {
          checkOut: { gte: nepalToday, lt: nepalTomorrow },
          status: 'checked_out',
        },
      }),

      // Folios above credit limit
      db.reservation.findMany({
        where: {
          status: 'checked_in',
          checkIn: { lt: nepalTomorrow },
          checkOut: { gt: nepalToday },
          folios: {
            some: {
              status: 'open',
              balance: { gt: 15000 },
            },
          },
        },
        select: {
          id: true,
          confirmationNo: true,
          creditLimit: true,
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { number: true } },
        },
      }),
    ])

    // ─── Derive values ────────────────────────────────────────────

    const latestAudit = nightAudits[0] ?? null

    const openShifts = cashierShifts.filter((s) => s.status === 'open')
    const closedShifts = cashierShifts.filter((s) => s.status === 'closed')

    // Room counts
    const totalRooms = property?.totalRooms ?? allRooms.length
    const occupiedRooms = allRooms.filter((r) => r.status === 'occupied').length
    const outOfOrderRooms = allRooms.filter((r) => r.status === 'out_of_order').length
    const availableRooms = totalRooms - occupiedRooms - outOfOrderRooms
    const occupancyPercent = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    // ADR = total room revenue from in-house guests / occupied rooms
    const totalRoomRevenueInHouse = inHouseReservations.reduce((sum, r) => sum + r.roomRate, 0)
    const adr = occupiedRooms > 0 ? Math.round(totalRoomRevenueInHouse / occupiedRooms) : 0

    // RevPAR = ADR × occupancy rate (as decimal)
    const revpar = Math.round(adr * (occupancyPercent / 100))

    // ─── Night Audit Data ────────────────────────────────────────
    // Use latest audit's revenue data if available, otherwise compute from in-house reservations
    const nightAuditRevenue = latestAudit
      ? {
          roomRevenue: latestAudit.roomRevenue,
          fAndBRevenue: latestAudit.fAndBRevenue,
          otherRevenue: latestAudit.otherRevenue,
          totalRevenue: latestAudit.totalRevenue,
          totalTax: latestAudit.totalTax,
          netRevenue: latestAudit.totalRevenue - latestAudit.totalTax,
        }
      : {
          roomRevenue: totalRoomRevenueInHouse,
          fAndBRevenue: 0,
          otherRevenue: 0,
          totalRevenue: totalRoomRevenueInHouse,
          totalTax: 0,
          netRevenue: totalRoomRevenueInHouse,
        }

    const nightAuditData = {
      status: latestAudit?.status ?? 'pending',
      checklist: [
        { id: 'arrivals', label: 'All arrivals checked in or acknowledged', checked: false },
        { id: 'departures', label: 'All departures checked out or acknowledged', checked: false },
        { id: 'pos_tables', label: 'No open POS tables', checked: openPosOrders.length === 0 },
        { id: 'unposted_charges', label: 'No unposted charges', checked: false },
        { id: 'cashier_recon', label: 'Cashier reconciliation complete', checked: false },
      ],
      revenue: nightAuditRevenue,
      occupancy: {
        percent: latestAudit?.occupancy ?? occupancyPercent,
        adr: latestAudit?.adr ?? adr,
        revpar: latestAudit?.revpar ?? revpar,
        totalRooms,
        occupiedRooms,
        availableRooms: Math.max(0, availableRooms),
        outOfOrderRooms,
      },
      previousAudits: nightAudits.slice(0, 7).map((a) => ({
        id: a.id,
        date: a.businessDate,
        revenue: a.totalRevenue,
        occupancy: a.occupancy,
        status: a.status,
        completedBy: a.completedBy ?? '—',
      })),
    }

    // ─── Day Close Data ───────────────────────────────────────────

    // Average room rate from today's active reservations
    const todayActiveReservations = inHouseReservations.length > 0 ? inHouseReservations : []
    const averageRate = todayActiveReservations.length > 0
      ? Math.round(todayActiveReservations.reduce((sum, r) => sum + r.roomRate, 0) / todayActiveReservations.length)
      : 0

    // Total revenue = sum of today's folio transactions
    const totalRevenueToday = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0)

    // Total payments today
    const totalPaymentsToday = todayPayments.reduce((sum, p) => sum + p.amount, 0)

    // Pending folio balance (open folios)
    const pendingFolioBalance = openFolios
      .reduce((sum, f) => sum + f.balance, 0)

    // Revenue breakdown by transaction type
    const breakdownMap = new Map<string, number>()
    for (const t of todayTransactions) {
      breakdownMap.set(t.transactionType, (breakdownMap.get(t.transactionType) ?? 0) + t.amount)
    }
    const revenueBreakdown = Array.from(breakdownMap.entries())
      .map(([type, amount]) => ({
        department: TRANSACTION_TYPE_LABELS[type] ?? type,
        amount,
        percentage: totalRevenueToday > 0 ? Math.round((amount / totalRevenueToday) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    const dayCloseData = {
      businessDate: todayStr,
      dayOfWeek,
      checklist: [
        { id: 'dc_arrivals', label: 'All arrivals processed', checked: false },
        { id: 'dc_departures', label: 'All departures processed', checked: false },
        { id: 'dc_charges', label: 'All charges posted to folios', checked: false },
        { id: 'dc_payments', label: 'All payments applied', checked: false },
        { id: 'dc_hk', label: 'Housekeeping tasks reviewed', checked: false },
        { id: 'dc_pos', label: 'All POS orders closed', checked: false },
      ],
      kpis: {
        roomsSold: occupiedRooms,
        arrivals: todayArrivals,
        departures: todayDepartures,
        walkIns: walkInReservations,
        noShows: noShowReservations,
        cancellations: cancelledReservations,
        averageRate,
        totalRevenue: totalRevenueToday,
        totalPayments: totalPaymentsToday,
        pendingFolioBalance,
      },
      revenueBreakdown,
    }

    // ─── Cashier Shift Data ──────────────────────────────────────

    // Active shift: real data or null (no fake fallback)
    const activeShift = openShifts[0] ?? null

    const shiftHistory = cashierShifts.map((s) => ({
      id: s.id,
      cashierName: s.cashierName,
      shiftType: s.shiftType,
      startDate: s.startDate,
      endDate: s.endDate,
      openingFloat: s.openingFloat,
      closingFloat: s.closingFloat,
      totalPayments: s.totalPayments,
      totalRefunds: s.totalRefunds,
      variance: s.variance ?? (s.closingFloat ? (s.closingFloat - s.openingFloat + s.totalPayments - s.totalRefunds) : 0),
      status: s.status,
    }))

    // Cashier summary aggregated by payment method
    const paymentMap = new Map<string, { count: number; amount: number }>()
    for (const p of todayPayments) {
      const existing = paymentMap.get(p.paymentMethod) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += p.amount
      paymentMap.set(p.paymentMethod, existing)
    }

    const cashierSummary = {
      cash: paymentMap.get('cash') ?? { count: 0, amount: 0 },
      card: paymentMap.get('card') ?? { count: 0, amount: 0 },
      bankTransfer: paymentMap.get('bank_transfer') ?? { count: 0, amount: 0 },
      other: (() => {
        // Aggregate all other payment methods
        const excluded = new Set(['cash', 'card', 'bank_transfer'])
        let count = 0
        let amount = 0
        for (const [method, data] of paymentMap) {
          if (!excluded.has(method)) {
            count += data.count
            amount += data.amount
          }
        }
        return { count, amount }
      })(),
    }

    // ─── Shift Handover Data ─────────────────────────────────────

    // In-house guests
    const inHouseCount = inHouseReservations.length

    const todayArrivalsPending = todayArrivals - todayArrivalsCheckedIn
    const todayDeparturesPending = todayDepartures - todayDeparturesDone

    // HK task completion rate
    const hkCompleted = todayHkTasks.filter((t) => t.status === 'cleaned' || t.status === 'inspected').length
    const hkTotal = todayHkTasks.length
    const hkTaskCompletion = hkTotal > 0 ? Math.round((hkCompleted / hkTotal) * 100) : 0

    // Cashier balance (from active shift)
    const cashierBalance = activeShift
      ? activeShift.openingFloat + activeShift.totalPayments - activeShift.totalRefunds
      : 0

    // VIP in-house guests
    const vipGuests = vipInHouseReservations.map((r) => ({
      name: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Unknown',
      room: r.room?.number ?? 'N/A',
      reason: r.guest?.vipLevel
        ? `${r.guest.vipLevel.charAt(0).toUpperCase() + r.guest.vipLevel.slice(1)} tier guest`
        : 'VIP',
    }))

    // Determine shift label from active shift
    const shiftLabel = activeShift?.shiftType
      ? `${activeShift.shiftType.charAt(0).toUpperCase() + activeShift.shiftType.slice(1)} Shift`
      : 'Day'

    const shiftHandoverData = {
      generatedAt: new Date().toISOString(),
      shiftType: shiftLabel,
      outgoingSupervisor: activeShift?.cashierName ?? '—',
      incomingSupervisor: '—',
      acknowledged: false,
      acknowledgedAt: null,
      sections: {
        inHouseGuests: inHouseCount,
        arrivals: { checkedIn: todayArrivalsCheckedIn, pending: Math.max(0, todayArrivalsPending) },
        departures: { done: todayDeparturesDone, pending: Math.max(0, todayDeparturesPending) },
        hkTaskCompletion,
        openWorkOrders: openWorkOrders.length,
        openPosTables: openPosOrders.length,
        cashierBalance,
        pendingFoliosAboveCredit: foliosAboveCredit.length,
        vipInHouse: vipGuests,
        specialNotes: [] as string[],
      },
    }

    return {
      nightAudit: nightAuditData,
      dayClose: dayCloseData,
      cashier: {
        activeShift,
        shiftHistory,
        summary: cashierSummary,
      },
      shiftHandover: shiftHandoverData,
    }
    }, 120000)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Operations API error:', error)
    return NextResponse.json({ error: 'Failed to fetch operations data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'run-audit') {
      // Calculate real revenue and occupancy from DB
      const nepalToday = getNepalToday()
      const nepalTomorrow = getNepalTomorrow()

      const [inHouseReservations, todayTransactions, allRooms, property] = await Promise.all([
        db.reservation.findMany({
          where: {
            status: 'checked_in',
            checkIn: { lt: nepalTomorrow },
            checkOut: { gt: nepalToday },
          },
          select: { roomRate: true, totalAmount: true },
        }),
        db.folioTransaction.findMany({
          where: { createdAt: { gte: nepalToday, lt: nepalTomorrow } },
          select: { transactionType: true, amount: true, taxAmount: true, totalAmount: true },
        }),
        db.room.findMany({ select: { status: true } }),
        db.property.findFirst({ select: { totalRooms: true } }),
      ])

      const totalRooms = property?.totalRooms ?? allRooms.length
      const occupiedRooms = allRooms.filter((r) => r.status === 'occupied').length
      const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

      const roomRevenue = inHouseReservations.reduce((sum, r) => sum + r.roomRate, 0)
      const fbRevenue = todayTransactions.filter((t) => t.transactionType === 'f_and_b').reduce((sum, t) => sum + t.amount, 0)
      const otherRevenue = todayTransactions.filter((t) => t.transactionType !== 'room' && t.transactionType !== 'f_and_b').reduce((sum, t) => sum + t.amount, 0)
      const totalRev = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
      const totalTax = todayTransactions.reduce((sum, t) => sum + t.taxAmount, 0)
      const calculatedAdr = occupiedRooms > 0 ? Math.round(roomRevenue / occupiedRooms) : 0
      const calculatedRevpar = Math.round(calculatedAdr * (occupancyPct / 100))

      // Use caller-provided values if present, otherwise use computed
      const audit = await db.nightAudit.create({
        data: {
          businessDate: new Date(),
          status: 'in_progress',
          startedBy: data?.startedBy ?? 'System',
          startedAt: new Date(),
          roomRevenue: data?.roomRevenue ?? roomRevenue,
          fAndBRevenue: data?.fAndBRevenue ?? fbRevenue,
          otherRevenue: data?.otherRevenue ?? otherRevenue,
          totalRevenue: data?.totalRevenue ?? totalRev,
          totalTax: data?.totalTax ?? totalTax,
          occupancy: data?.occupancy ?? occupancyPct,
          adr: data?.adr ?? calculatedAdr,
          revpar: data?.revpar ?? calculatedRevpar,
        },
      })

      // Auto-post night audit summary to journal (fire-and-forget)
      const postedBy = data?.startedBy || `${auth.user.firstName} ${auth.user.lastName}`
      const netRoom = (data?.roomRevenue ?? roomRevenue)
      const netFb = (data?.fAndBRevenue ?? fbRevenue)
      const netOther = (data?.otherRevenue ?? otherRevenue)
      const tax = (data?.totalTax ?? totalTax)
      postNightAuditSummary({
        roomRevenue: netRoom,
        fbRevenue: netFb,
        otherRevenue: netOther,
        taxCollected: tax,
        postedBy,
      }).catch(() => {})

      return NextResponse.json({ success: true, audit })
    }

    if (action === 'close-day') {
      return NextResponse.json({ success: true, message: 'Day closed successfully' })
    }

    if (action === 'close-shift') {
      return NextResponse.json({ success: true, message: 'Shift closed successfully' })
    }

    if (action === 'acknowledge-handover') {
      return NextResponse.json({
        success: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: data?.name ?? 'Unknown',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Operations POST error:', error)
    return NextResponse.json({ error: 'Failed to process operation' }, { status: 500 })
  }
}
