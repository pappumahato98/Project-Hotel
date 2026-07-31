import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// Allow up to 60s on Vercel (Hobby plan default is 10s — this prevents timeouts)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    return await getOrSet('rooms:list', async () => {
    // Get property first (needed for filtering)
    const property = await db.property.findFirst()

    // ─── Batch all independent queries in parallel ───────────
    // Previously these ran sequentially (5 round-trips × ~600ms = 3s).
    const [rooms, statusBreakdown, roomTypes, restrictions] = await Promise.all([
      // Rooms with type info
      db.room.findMany({
        where: property ? { propertyId: property.id } : undefined,
        include: {
          type: { select: { id: true, name: true, code: true, baseOccupancy: true, maxOccupancy: true, bedConfig: true, areaSqFt: true, view: true, amenities: true } },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),
      // Status breakdown
      db.room.groupBy({
        by: ['status'],
        where: property ? { propertyId: property.id } : undefined,
        _count: { status: true },
      }),
      // Room types with counts and rates
      db.roomType.findMany({
        where: { active: true },
        include: {
          rooms: { where: property ? { propertyId: property.id } : undefined, select: { id: true } },
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
    ])

    // Fetch active reservations for occupied rooms (depends on rooms query above)
    const activeReservations = await db.reservation.findMany({
      where: {
        status: 'checked_in',
        roomId: { in: rooms.map(r => r.id) },
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
      },
    })

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

    return NextResponse.json({
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
    })
    }, 120000)
  } catch (error) {
    console.error('Rooms API error:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
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
    return NextResponse.json({ room: createdRoom }, { status: 201 })
  } catch (error) {
    console.error('Create room error:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
