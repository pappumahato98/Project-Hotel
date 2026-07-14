import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const results: Array<{ type: string; id: string; label: string; sublabel: string }> = []

    // Search guests
    const guests = await db.guest.findMany({
      where: {
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, phone: true, vipLevel: true },
      take: 5,
    })

    for (const g of guests) {
      results.push({
        type: 'guest',
        id: g.id,
        label: `${g.firstName} ${g.lastName}`,
        sublabel: g.phone || g.vipLevel !== 'none' ? `${g.phone || ''} ${g.vipLevel !== 'none' ? `• ${g.vipLevel}` : ''}`.trim() : 'Guest',
      })
    }

    // Search rooms
    const rooms = await db.room.findMany({
      where: {
        OR: [
          { number: { contains: query } },
        ],
      },
      select: { id: true, number: true, status: true, type: { select: { name: true } } },
      take: 5,
    })

    for (const r of rooms) {
      results.push({
        type: 'room',
        id: r.id,
        label: `Room ${r.number}`,
        sublabel: `${r.type.name} • ${r.status.replace('_', ' ')}`,
      })
    }

    // Search reservations
    const reservations = await db.reservation.findMany({
      where: {
        OR: [
          { confirmationNo: { contains: query } },
        ],
      },
      select: {
        id: true, confirmationNo: true, status: true,
        guest: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    })

    for (const r of reservations) {
      results.push({
        type: 'reservation',
        id: r.id,
        label: r.confirmationNo,
        sublabel: `${r.guest?.firstName || ''} ${r.guest?.lastName || ''} • ${r.status.replace('_', ' ')}`.trim(),
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Quick search error:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
