import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    switch (reportType) {
      case 'arrivals': {
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
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
          },
          orderBy: { checkIn: 'asc' },
        })
        return NextResponse.json({ report: 'arrivals', date: targetDate.toISOString(), reservations, total: reservations.length })
      }

      case 'departures': {
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
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
            folios: { select: { id: true, balance: true, status: true } },
          },
          orderBy: { checkOut: 'asc' },
        })
        return NextResponse.json({ report: 'departures', date: targetDate.toISOString(), reservations, total: reservations.length })
      }

      case 'inhouse': {
        const reservations = await db.reservation.findMany({
          where: { status: 'checked_in' },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
            room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
            folios: { select: { id: true, balance: true, status: true } },
          },
          orderBy: { room: { number: 'asc' } },
        })
        return NextResponse.json({ report: 'inhouse', reservations, total: reservations.length })
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
        const startDate = dateFrom ? new Date(dateFrom) : new Date()
        startDate.setHours(0, 0, 0, 0)
        const endDate = dateTo ? new Date(dateTo) : new Date(startDate)
        endDate.setDate(endDate.getDate() + 7)

        const totalRooms = await db.room.count()
        const days: Array<{ date: string; total: number; occupied: number; arrivals: number; departures: number }> = []

        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const nextD = new Date(d)
          nextD.setDate(nextD.getDate() + 1)

          const [active, arrivals, departures] = await Promise.all([
            db.reservation.count({
              where: {
                status: 'checked_in',
                checkIn: { lt: nextD },
                checkOut: { gt: d },
              },
            }),
            db.reservation.count({
              where: {
                checkIn: { gte: d, lt: nextD },
                status: { notIn: ['cancelled', 'checked_out', 'no_show'] },
              },
            }),
            db.reservation.count({
              where: {
                checkOut: { gte: d, lt: nextD },
                status: { in: ['confirmed', 'checked_in'] },
              },
            }),
          ])

          days.push({
            date: d.toISOString().split('T')[0],
            total: totalRooms,
            occupied: active,
            arrivals,
            departures,
          })
        }

        return NextResponse.json({ report: 'occupancy', totalRooms, days })
      }

      case 'revenue': {
        const start = dateFrom ? new Date(dateFrom) : new Date()
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        const end = dateTo ? new Date(dateTo) : new Date()
        end.setHours(23, 59, 59, 999)

        const reservations = await db.reservation.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            status: { not: 'cancelled' },
          },
          select: {
            totalAmount: true,
            paidAmount: true,
            roomRate: true,
            checkIn: true,
            checkOut: true,
            source: true,
            status: true,
          },
        })

        const totalRevenue = reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
        const totalPaid = reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0)
        const totalRooms = await db.room.count()

        return NextResponse.json({
          report: 'revenue',
          totalRevenue,
          totalPaid,
          outstanding: totalRevenue - totalPaid,
          totalReservations: reservations.length,
          totalRooms,
          averageRate: reservations.length > 0
            ? reservations.reduce((sum, r) => sum + (r.roomRate || 0), 0) / reservations.length
            : 0,
        })
      }

      default: {
        // Summary report
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const nextDay = new Date(today)
        nextDay.setDate(nextDay.getDate() + 1)

        const [totalRooms, arrivals, departures, inHouse, reservations, moves] = await Promise.all([
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
          db.reservation.count({
            where: {
              status: { notIn: ['cancelled', 'checked_out', 'no_show'] },
            },
          }),
          db.roomMoveLog.count(),
        ])

        const totalRevenue = await db.reservation.aggregate({
          where: { status: { not: 'cancelled' } },
          _sum: { totalAmount: true, paidAmount: true },
        })

        return NextResponse.json({
          report: 'summary',
          totalRooms,
          arrivals,
          departures,
          inHouse,
          totalReservations: reservations,
          occupancyPct: totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalPaid: totalRevenue._sum.paidAmount || 0,
          outstanding: (totalRevenue._sum.totalAmount || 0) - (totalRevenue._sum.paidAmount || 0),
          moveLogs: moves,
        })
      }
    }
  } catch (error) {
    console.error('Front Desk Reports API error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
