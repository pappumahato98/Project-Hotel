import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet, getSettingsMap } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const result = await getOrSet('front-desk:dashboard', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDay = new Date(today)
    nextDay.setDate(nextDay.getDate() + 1)
    const dayAfter = new Date(nextDay)
    dayAfter.setDate(dayAfter.getDate() + 1)

    // ─── Single batch: ALL independent queries ────
    const [
      sMap,
      totalRooms,
      arrivals,
      departures,
      inHouse,
      roomsBreakdown,
      roomCounts,
      todayCheckIns,
      todayCheckOuts,
      todayMoves,
      upcomingArrivals,
      // New queries for enhanced dashboard
      todayTransactions,
      todayPayments,
      checkedInReservations,
      dueOutTomorrow,
      hkStatusBreakdown,
    ] = await Promise.all([
      getSettingsMap(),
      db.room.count(),
      db.reservation.count({
        where: {
          checkIn: { gte: today, lt: nextDay },
          status: { notIn: ['cancelled', 'checked_out', 'no_show'] },
        },
      }),
      db.reservation.count({
        where: {
          checkOut: { gte: today, lt: nextDay },
          status: { in: ['confirmed', 'checked_in'] },
        },
      }),
      db.reservation.count({ where: { status: 'checked_in' } }),
      db.room.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // Overbooking detection via groupBy
      db.reservation.groupBy({
        by: ['roomId'],
        where: { status: 'checked_in', roomId: { not: null } },
        _count: { roomId: true },
        having: { roomId: { _count: { gt: 1 } } },
      }),
      // Timeline: recent check-ins
      db.reservation.findMany({
        where: { status: 'checked_in', updatedAt: { gte: today } },
        include: { guest: { select: { firstName: true, lastName: true } }, room: { select: { number: true } } },
        orderBy: { updatedAt: 'desc' }, take: 10,
      }),
      // Timeline: recent check-outs
      db.reservation.findMany({
        where: { status: 'checked_out', updatedAt: { gte: today } },
        include: { guest: { select: { firstName: true, lastName: true } }, room: { select: { number: true } } },
        orderBy: { updatedAt: 'desc' }, take: 10,
      }),
      // Timeline: room moves
      db.roomMoveLog.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' }, take: 10,
      }),
      // Upcoming arrivals (next 5 expected today)
      db.reservation.findMany({
        where: {
          checkIn: { gte: today, lt: nextDay },
          status: { in: ['confirmed', 'tentative'] },
        },
        include: {
          guest: { select: { firstName: true, lastName: true, vipLevel: true } },
          room: { select: { number: true, type: { select: { name: true, code: true, bedConfig: true } } } },
        },
        orderBy: { checkIn: 'asc' }, take: 5,
      }),
      // Today's folio transactions
      db.folioTransaction.findMany({
        where: { createdAt: { gte: today, lt: nextDay } },
        select: { totalAmount: true },
      }),
      // Today's folio payments
      db.folioPayment.findMany({
        where: { createdAt: { gte: today, lt: nextDay } },
        select: { amount: true },
      }),
      // Checked-in reservations for ADR calculation
      db.reservation.findMany({
        where: { status: 'checked_in' },
        select: { roomRate: true },
      }),
      // Due out tomorrow
      db.reservation.count({
        where: {
          checkOut: { gte: nextDay, lt: dayAfter },
          status: { in: ['confirmed', 'checked_in'] },
        },
      }),
      // Housekeeping status breakdown
      db.room.groupBy({
        by: ['status'],
        where: { status: { in: ['vacant_dirty', 'cleaning', 'inspected'] } },
        _count: { status: true },
      }),
    ])

    // Build status map
    const statusMap: Record<string, number> = {}
    for (const item of roomsBreakdown) {
      statusMap[item.status] = item._count.status
    }

    const available = (statusMap['vacant_clean'] || 0) + (statusMap['inspected'] || 0)
    const occupancyPct = totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0
    const overbookingCount = roomCounts.filter(rc => rc.roomId !== null).length

    // ─── New KPIs ──────────────────────────────────────────
    // Today's Revenue = sum of folio transaction totals + sum of payment amounts
    const todayRevenue = todayTransactions.reduce((s, t) => s + t.totalAmount, 0)
      + todayPayments.reduce((s, p) => s + p.amount, 0)

    // ADR = Average room rate of currently checked-in reservations
    const adr = checkedInReservations.length > 0
      ? checkedInReservations.reduce((s, r) => s + r.roomRate, 0) / checkedInReservations.length
      : 0

    // RevPAR = todayRevenue / totalRooms
    const revpar = totalRooms > 0 ? todayRevenue / totalRooms : 0

    // Housekeeping status counts
    const hkStatusMap: Record<string, number> = {}
    for (const item of hkStatusBreakdown) {
      hkStatusMap[item.status] = item._count.status
    }
    const housekeepingStatus = {
      vacant_dirty: hkStatusMap['vacant_dirty'] || 0,
      cleaning: hkStatusMap['cleaning'] || 0,
      inspected: hkStatusMap['inspected'] || 0,
    }

    // Build unified timeline (CPU-only)
    const timeline: Array<{
      id: string
      type: 'check_in' | 'check_out' | 'room_move' | 'reservation_modified'
      time: string
      description: string
      guestName: string
      roomNumber?: string
      details?: string
    }> = []

    for (const ci of todayCheckIns) {
      timeline.push({
        id: ci.id, type: 'check_in',
        time: ci.updatedAt.toISOString(), description: 'Checked in',
        guestName: ci.guest ? `${ci.guest.firstName} ${ci.guest.lastName}` : 'Unknown Guest',
        roomNumber: ci.room?.number,
      })
    }
    for (const co of todayCheckOuts) {
      timeline.push({
        id: co.id, type: 'check_out',
        time: co.updatedAt.toISOString(), description: 'Checked out',
        guestName: co.guest ? `${co.guest.firstName} ${co.guest.lastName}` : 'Unknown Guest',
        roomNumber: co.room?.number,
      })
    }
    for (const move of todayMoves) {
      timeline.push({
        id: move.id, type: 'room_move',
        time: move.createdAt.toISOString(), description: 'Room transferred',
        guestName: move.confirmationNo || '—',
        roomNumber: `${move.fromRoomNumber || '?'} → ${move.toRoomNumber || '?'}`,
        details: move.reason || undefined,
      })
    }
    timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return {
      snapshot: {
        totalRooms, arrivals, departures, inHouse, available, occupancyPct, overbookingCount,
        todayRevenue: Math.round(todayRevenue),
        adr: Math.round(adr),
        revpar: Math.round(revpar),
        dueOutTomorrow,
        housekeepingStatus,
      },
      timeline,
      upcomingArrivals,
      settings: {
        hotelName: sMap.hotelName,
        taxRate: sMap.taxRate,
        serviceCharge: sMap.serviceCharge,
        defaultCheckIn: sMap.defaultCheckIn,
        defaultCheckOut: sMap.defaultCheckOut,
        starRating: sMap.starRating,
      },
    }
    }, 120000)
    return cachedJson(result, req, { tier: 'short' })
  } catch (error) {
    console.error('Front Desk Dashboard API error:', error)
    return cachedError('Failed to fetch dashboard data', 500)
  }
}
