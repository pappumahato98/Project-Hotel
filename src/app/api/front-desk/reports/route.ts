import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    switch (reportType) {
      case 'arrivals': {
        const data = await getOrSet(`front-desk:report:arrivals:${dateFrom || ''}:${dateTo || ''}`, async () => {
        const targetDate = dateFrom ? new Date(dateFrom) : new Date()
        targetDate.setHours(0, 0, 0, 0)
        const nextDay = new Date(targetDate)
        nextDay.setDate(nextDay.getDate() + 1)

        const reservations = await db.reservation.findMany({
          where: {
            checkIn: { gte: targetDate, lt: nextDay },
            status: { notIn: ['cancelled', 'checked_out', 'no_show'] },
          },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
          },
          orderBy: { checkIn: 'asc' },
        })
        return { report: 'arrivals', date: targetDate.toISOString(), reservations, total: reservations.length }
        }, 300000)
        return NextResponse.json(data)
      }

      case 'departures': {
        const data = await getOrSet(`front-desk:report:departures:${dateFrom || ''}:${dateTo || ''}`, async () => {
        const targetDate = dateFrom ? new Date(dateFrom) : new Date()
        targetDate.setHours(0, 0, 0, 0)
        const nextDay = new Date(targetDate)
        nextDay.setDate(nextDay.getDate() + 1)

        const reservations = await db.reservation.findMany({
          where: {
            checkOut: { gte: targetDate, lt: nextDay },
            status: { in: ['confirmed', 'checked_in'] },
          },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
            folios: { select: { id: true, balance: true, status: true } },
          },
          orderBy: { checkOut: 'asc' },
        })
        return { report: 'departures', date: targetDate.toISOString(), reservations, total: reservations.length }
        }, 300000)
        return NextResponse.json(data)
      }

      case 'inhouse': {
        const data = await getOrSet('front-desk:report:inhouse::', async () => {
        const reservations = await db.reservation.findMany({
          where: { status: 'checked_in' },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
            folios: { select: { id: true, balance: true, status: true } },
          },
          orderBy: { room: { number: 'asc' } },
        })
        return { report: 'inhouse', reservations, total: reservations.length }
        }, 300000)
        return NextResponse.json(data)
      }

      case 'room-moves': {
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const moves = await db.roomMoveLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        })
        const total = await db.roomMoveLog.count()
        return NextResponse.json({ report: 'room-moves', moves, total })
      }

      case 'occupancy': {
        const data = await getOrSet(`front-desk:report:occupancy:${dateFrom || ''}:${dateTo || ''}`, async () => {
        const startDate = dateFrom ? new Date(dateFrom) : new Date()
        startDate.setHours(0, 0, 0, 0)
        const endDate = dateTo ? new Date(dateTo) : new Date(startDate)
        endDate.setDate(endDate.getDate() + 7)

        const totalRooms = await db.room.count()
        const days: Array<{ date: string; total: number; occupied: number; arrivals: number; departures: number }> = []

        const [allActive, allArrivals, allDepartures] = await Promise.all([
          db.reservation.findMany({
            where: { status: 'checked_in', checkIn: { lt: endDate }, checkOut: { gt: startDate } },
            select: { checkIn: true, checkOut: true },
          }),
          db.reservation.findMany({
            where: { checkIn: { gte: startDate, lt: endDate }, status: { notIn: ['cancelled', 'checked_out', 'no_show'] } },
            select: { checkIn: true },
          }),
          db.reservation.findMany({
            where: { checkOut: { gte: startDate, lt: endDate }, status: { in: ['confirmed', 'checked_in'] } },
            select: { checkOut: true },
          }),
        ])

        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const nextD = new Date(d)
          nextD.setDate(nextD.getDate() + 1)
          const dStr = d.toISOString().split('T')[0]
          days.push({
            date: dStr, total: totalRooms,
            occupied: allActive.filter(r => r.checkIn < nextD && r.checkOut > d).length,
            arrivals: allArrivals.filter(r => r.checkIn >= d && r.checkIn < nextD).length,
            departures: allDepartures.filter(r => r.checkOut >= d && r.checkOut < nextD).length,
          })
        }

        return { report: 'occupancy', totalRooms, days }
        }, 300000)
        return NextResponse.json(data)
      }

      case 'revenue': {
        const data = await getOrSet(`front-desk:report:revenue:${dateFrom || ''}:${dateTo || ''}`, async () => {
        const start = dateFrom ? new Date(dateFrom) : new Date()
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        const end = dateTo ? new Date(dateTo) : new Date()
        end.setHours(23, 59, 59, 999)

        const reservations = await db.reservation.findMany({
          where: { createdAt: { gte: start, lte: end }, status: { not: 'cancelled' } },
          select: { totalAmount: true, paidAmount: true, roomRate: true, checkIn: true, checkOut: true, source: true, status: true },
        })

        const totalRevenue = reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
        const totalPaid = reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0)
        const totalRooms = await db.room.count()

        return {
          report: 'revenue', totalRevenue, totalPaid,
          outstanding: totalRevenue - totalPaid,
          totalReservations: reservations.length, totalRooms,
          averageRate: reservations.length > 0 ? reservations.reduce((sum, r) => sum + (r.roomRate || 0), 0) / reservations.length : 0,
        }
        }, 300000)
        return NextResponse.json(data)
      }

      default: {
        const data = await getOrSet(`front-desk:report:summary:${dateFrom || ''}:${dateTo || ''}`, async () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const nextDay = new Date(today)
        nextDay.setDate(nextDay.getDate() + 1)

        const [totalRooms, arrivals, departures, inHouse, reservations, moves] = await Promise.all([
          db.room.count(),
          db.reservation.count({ where: { checkIn: { gte: today, lt: nextDay }, status: { notIn: ['cancelled', 'checked_out', 'no_show'] } } }),
          db.reservation.count({ where: { checkOut: { gte: today, lt: nextDay }, status: { in: ['confirmed', 'checked_in'] } } }),
          db.reservation.count({ where: { status: 'checked_in' } }),
          db.reservation.count({ where: { status: { notIn: ['cancelled', 'checked_out', 'no_show'] } } }),
          db.roomMoveLog.count(),
        ])

        const totalRevenue = await db.reservation.aggregate({
          where: { status: { not: 'cancelled' } },
          _sum: { totalAmount: true, paidAmount: true },
        })

        return {
          report: 'summary', totalRooms, arrivals, departures, inHouse,
          totalReservations: reservations,
          occupancyPct: totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalPaid: totalRevenue._sum.paidAmount || 0,
          outstanding: (totalRevenue._sum.totalAmount || 0) - (totalRevenue._sum.paidAmount || 0),
          moveLogs: moves,
        }
        }, 300000)
        return NextResponse.json(data)
      }
    }
  } catch (error) {
    console.error('Front Desk Reports API error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
