import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')

    const where: Prisma.ReservationWhereInput = {
      source: { not: null },
    }

    // Only OTA and channel-based sources
    const channelSources = ['booking_com', 'expedia', 'agoda', 'direct', 'walk_in', 'phone', 'email', 'corporate']

    if (channel) {
      const channelMap: Record<string, string[]> = {
        'Booking.com': ['booking_com'],
        'Expedia': ['expedia'],
        'Agoda': ['agoda'],
        'Direct Website': ['direct'],
        'Walk-in': ['walk_in'],
        'Phone / Email': ['phone', 'email'],
        'Corporate Portal': ['corporate'],
      }
      const sources = channelMap[channel]
      if (sources) {
        where.source = { in: sources }
      }
    }

    if (status) {
      where.status = status
    }

    // Only fetch reservations that have a channel source
    const allChannelReservations = await db.reservation.findMany({
      where: {
        source: { in: channelSources },
      },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { number: true, type: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Apply additional filters on top
    let filtered = allChannelReservations
    if (channel) {
      const channelMap: Record<string, string[]> = {
        'Booking.com': ['booking_com'],
        'Expedia': ['expedia'],
        'Agoda': ['agoda'],
        'Direct Website': ['direct'],
        'Walk-in': ['walk_in'],
        'Phone / Email': ['phone', 'email'],
        'Corporate Portal': ['corporate'],
      }
      const sources = channelMap[channel]
      if (sources) {
        filtered = filtered.filter((r) => r.source && sources.includes(r.source))
      }
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status)
    }

    const channelNameMap: Record<string, string> = {
      booking_com: 'Booking.com',
      expedia: 'Expedia',
      agoda: 'Agoda',
      direct: 'Direct Website',
      walk_in: 'Walk-in',
      phone: 'Phone / Email',
      email: 'Phone / Email',
      corporate: 'Corporate Portal',
    }

    const commissionRates: Record<string, number> = {
      booking_com: 0.15,
      expedia: 0.15,
      agoda: 0.15,
      direct: 0,
      walk_in: 0,
      phone: 0,
      email: 0,
      corporate: 0,
    }

    const bookings = filtered.map((r) => {
      const channelName = channelNameMap[r.source || ''] || r.source || 'Other'
      const commRate = commissionRates[r.source || ''] || 0
      const commission = Math.round(r.totalAmount * commRate)
      return {
        id: r.id,
        confirmationNo: r.confirmationNo,
        guestName: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Walk-in',
        channel: channelName,
        roomType: r.room?.type?.name || 'Standard',
        checkIn: r.checkIn.toISOString().split('T')[0],
        checkOut: r.checkOut.toISOString().split('T')[0],
        nights: Math.max(1, Math.ceil((r.checkOut.getTime() - r.checkIn.getTime()) / 86400000)),
        totalAmount: r.totalAmount,
        commission,
        netAmount: r.totalAmount - commission,
        status: r.status,
      }
    })

    const total = bookings.length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const checkedIn = bookings.filter((b) => b.status === 'checked_in').length
    const checkedOut = bookings.filter((b) => b.status === 'checked_out').length
    const totalRevenue = bookings.reduce((s, b) => s + b.netAmount, 0)
    const totalCommission = bookings.reduce((s, b) => s + b.commission, 0)

    const channelBreakdown: Record<string, { count: number; revenue: number }> = {}
    for (const b of bookings) {
      if (!channelBreakdown[b.channel]) {
        channelBreakdown[b.channel] = { count: 0, revenue: 0 }
      }
      channelBreakdown[b.channel].count++
      channelBreakdown[b.channel].revenue += b.netAmount
    }

    return NextResponse.json({
      bookings,
      total,
      confirmed,
      checkedIn,
      checkedOut,
      totalRevenue,
      totalCommission,
      channelBreakdown,
    })
  } catch (error) {
    console.error('Channel Bookings API error:', error)
    return NextResponse.json({ error: 'Failed to fetch channel bookings' }, { status: 500 })
  }
}
