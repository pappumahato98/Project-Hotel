import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return cachedJson({ results: [] }, request, { tier: 'medium' })
    }

    const results: Array<{ type: string; id: string; label: string; sublabel: string }> = []

    // Search guests, rooms, and reservations in parallel
    const [guests, rooms, reservations] = await Promise.all([
      db.guest.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { phone: { contains: query } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, phone: true, vipLevel: true },
        take: 5,
      }),
      db.room.findMany({
        where: {
          OR: [
            { number: { contains: query } },
          ],
        },
        select: { id: true, number: true, status: true, type: { select: { name: true } } },
        take: 5,
      }),
      db.reservation.findMany({
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
      }),
    ])

    for (const g of guests) {
      results.push({
        type: 'guest',
        id: g.id,
        label: `${g.firstName} ${g.lastName}`,
        sublabel: g.phone || g.vipLevel !== 'none' ? `${g.phone || ''} ${g.vipLevel !== 'none' ? `• ${g.vipLevel}` : ''}`.trim() : 'Guest',
      })
    }

    for (const r of rooms) {
      results.push({
        type: 'room',
        id: r.id,
        label: `Room ${r.number}`,
        sublabel: `${r.type.name} • ${r.status.replace('_', ' ')}`,
      })
    }

    for (const r of reservations) {
      results.push({
        type: 'reservation',
        id: r.id,
        label: r.confirmationNo,
        sublabel: `${r.guest?.firstName || ''} ${r.guest?.lastName || ''} • ${r.status.replace('_', ' ')}`.trim(),
      })
    }

    return cachedJson({ results }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Quick search error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to search', 500, msg.substring(0, 300))
  }
}
