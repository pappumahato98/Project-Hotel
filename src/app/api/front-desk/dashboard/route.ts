import { NextRequest, NextResponse } from 'next/server'
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

    // ─── Single batch: ALL independent queries (settings + snapshot + overbooking + timeline + upcoming) ────
    const [sMap, totalRooms, arrivals, departures, inHouse, roomsBreakdown, roomCounts, todayCheckIns, todayCheckOuts, todayMoves, upcomingArrivals] = await Promise.all([
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
    ])

    // Build status map
    const statusMap: Record<string, number> = {}
    for (const item of roomsBreakdown) {
      statusMap[item.status] = item._count.status
    }

    const available = (statusMap['vacant_clean'] || 0) + (statusMap['inspected'] || 0)
    const occupancyPct = totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0
    const overbookingCount = roomCounts.filter(rc => rc.roomId !== null).length

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
    return NextResponse.json(result)
  } catch (error) {
    console.error('Front Desk Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
