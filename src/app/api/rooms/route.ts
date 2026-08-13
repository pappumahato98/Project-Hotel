import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// Allow up to 60s on Vercel (Hobby plan default is 10s — this prevents timeouts)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const data = await getOrSet('rooms:list', async () => {
    // ─── Batch ALL independent queries in parallel ───────────
    const [property, rooms, statusBreakdown, roomTypes, restrictions, activeReservations] = await Promise.all([
      // Property (for optional filtering)
      db.property.findFirst(),
      // Rooms with type info
      db.room.findMany({
        include: {
          type: { select: { id: true, name: true, code: true, baseOccupancy: true, maxOccupancy: true, bedConfig: true, areaSqFt: true, view: true, amenities: true } },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),
      // Status breakdown
      db.room.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // Room types with counts and rates
      db.roomType.findMany({
        where: { active: true },
        include: {
          rooms: { select: { id: true } },
          ratePlans: { where: { active: true }, select: { id: true, name: true, code: true, baseRate: true, channel: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      // Restrictions for next 14 days
      db.roomRestriction.findMany({
        where: {
          date: { gte: new Date(), lte: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000) },
        },
        include: { roomType: { select: { id: true, name: true, code: true } } },
        orderBy: [{ date: 'asc' }, { roomTypeId: 'asc' }],
      }),
      // Active reservations — fetch all checked_in (small dataset, avoids sequential round-trip)
      db.reservation.findMany({
        where: { status: 'checked_in' },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
        },
      }),
    ])

    // Build a map of roomId -> reservation+guest
    const reservationMap = new Map<string, typeof activeReservations[0]>()
    for (const res of activeReservations) {
      if (res.roomId) reservationMap.set(res.roomId, res)
    }

    // Status map
    const statusMap: Record<string, number> = {}
    for (const item of statusBreakdown) statusMap[item.status] = item._count.status

    // Floor + wing lists
    const floors = [...new Set(rooms.map(r => r.floor))].sort()
    const wings = [...new Set(rooms.filter(r => r.wing).map(r => r.wing!))].sort()

    // Enrich rooms with guest data
    const enrichedRooms = rooms.map(room => {
      const res = reservationMap.get(room.id)
      return {
        ...room,
        guest: res?.guest || null,
        reservation: res
          ? {
              id: res.id,
              confirmationNo: res.confirmationNo,
              checkIn: res.checkIn,
              checkOut: res.checkOut,
              roomRate: res.roomRate,
              adults: res.adults,
              children: res.children,
              source: res.source,
            }
          : null,
      }
    })

    // Summary stats
    const totalRooms = rooms.length
    const occupied = statusMap['occupied'] || 0
    const vacantClean = statusMap['vacant_clean'] || 0
    const inspected = statusMap['inspected'] || 0
    const available = vacantClean + inspected
    const outOfOrder = statusMap['out_of_order'] || 0
    const dirty = (statusMap['vacant_dirty'] || 0) + (statusMap['cleaning'] || 0) + (statusMap['on_change'] || 0)
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

    return {
      rooms: enrichedRooms,
      statusBreakdown: statusMap,
      floors,
      wings,
      roomTypes: roomTypes.map(rt => ({ ...rt, roomCount: rt.rooms.length })),
      restrictions,
      summary: {
        totalRooms, occupied, available, outOfOrder, dirty,
        vacantClean, inspected, occupancyRate,
      },
    }
    }, 120000)
    return cachedJson(data, req, { tier: 'medium' })
  } catch (error) {
    console.error('Rooms API error:', error)
    return cachedError('Failed to fetch rooms', 500)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const { number, typeId, status, floor, wing, notes, propertyId } = body

    // Validate required fields
    if (!number || !typeId || !status || floor === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: number, typeId, status, floor' },
        { status: 400 },
      )
    }

    const createdRoom = await withRetry(() =>
      db.room.create({
        data: {
          number,
          typeId,
          status,
          floor,
          wing: wing || null,
          notes: notes || null,
          propertyId: propertyId || null,
        },
        include: {
          type: true,
          property: true,
        },
      }),
    )

    afterMutation('rooms')
    return NextResponse.json({ room: createdRoom }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Create room error:', error)
    return cachedError('Failed to create room', 500)
  }
}
