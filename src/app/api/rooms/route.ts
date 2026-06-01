import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Seed helper: only seeds if rooms table is empty ──────────
async function ensureSeedData() {
  const count = await db.room.count()
  if (count > 0) return

  // Create Room Types
  const types = await Promise.all([
    db.roomType.create({ data: { name: 'Deluxe King', code: 'DLXK', description: 'Spacious room with king-size bed and city view', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 350, view: 'City', amenities: '["WiFi","AC","TV","Minibar","Coffee Machine","Safe","Bathrobe"]', sortOrder: 1 } }),
    db.roomType.create({ data: { name: 'Deluxe Twin', code: 'DLXT', description: 'Comfortable room with two twin beds and mountain view', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '2 Twin Beds', areaSqFt: 340, view: 'Mountain', amenities: '["WiFi","AC","TV","Minibar","Coffee Machine","Safe"]', sortOrder: 2 } }),
    db.roomType.create({ data: { name: 'Superior King', code: 'SUPK', description: 'Premium room with king bed and panoramic views', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 420, view: 'Panoramic', amenities: '["WiFi","AC","TV","Minibar","Coffee Machine","Safe","Bathrobe","Slippers"]', sortOrder: 3 } }),
    db.roomType.create({ data: { name: 'Executive Suite', code: 'EXSU', description: 'Luxury suite with separate living area', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King Bed + Sofa Bed', areaSqFt: 600, view: 'Garden', amenities: '["WiFi","AC","TV","Minibar","Coffee Machine","Safe","Bathrobe","Slippers","Jacuzzi","Butler Service"]', sortOrder: 4 } }),
    db.roomType.create({ data: { name: 'Standard Double', code: 'STDD', description: 'Cozy room with double bed', baseOccupancy: 2, maxOccupancy: 2, bedConfig: '1 Double Bed', areaSqFt: 260, view: 'Courtyard', amenities: '["WiFi","AC","TV","Safe"]', sortOrder: 5 } }),
    db.roomType.create({ data: { name: 'Presidential Suite', code: 'PRSU', description: 'The finest suite with exclusive amenities', baseOccupancy: 2, maxOccupancy: 6, bedConfig: '1 King Bed + 2 Sofa Beds', areaSqFt: 1200, view: '360° Panoramic', amenities: '["WiFi","AC","TV","Minibar","Coffee Machine","Safe","Bathrobe","Slippers","Jacuzzi","Butler Service","Private Pool","Dining Room"]', sortOrder: 6 } }),
  ])

  // Get default property
  let property = await db.property.findFirst()
  if (!property) {
    property = await db.property.create({
      data: { name: 'The Grand Kathmandu', code: 'GKT', address: 'Durbar Marg', city: 'Kathmandu', currency: 'NPR', starRating: 5, totalRooms: 128 }
    })
  }

  // Create Guests for occupied rooms
  const guests = await Promise.all([
    db.guest.create({ data: { firstName: 'Rajesh', lastName: 'Sharma', email: 'rajesh@email.com', phone: '+977-9841-234567', nationality: 'Nepal', vipLevel: 'platinum', totalStays: 45, totalRevenue: 1250000 } }),
    db.guest.create({ data: { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', phone: '+1-555-012-3456', nationality: 'USA', vipLevel: 'gold', totalStays: 12, totalRevenue: 350000 } }),
    db.guest.create({ data: { firstName: 'Hiroshi', lastName: 'Tanaka', email: 'h.tanaka@email.com', phone: '+81-90-1234-5678', nationality: 'Japan', vipLevel: 'gold', totalStays: 8, totalRevenue: 420000 } }),
    db.guest.create({ data: { firstName: 'Priya', lastName: 'Gurung', email: 'priya.g@email.com', phone: '+977-9855-345678', nationality: 'Nepal', vipLevel: 'none', totalStays: 3, totalRevenue: 45000 } }),
    db.guest.create({ data: { firstName: 'David', lastName: 'Chen', email: 'david.chen@email.com', phone: '+86-138-0012-3456', nationality: 'China', vipLevel: 'silver', totalStays: 6, totalRevenue: 180000 } }),
    db.guest.create({ data: { firstName: 'Amanda', lastName: 'Williams', email: 'amanda.w@email.com', phone: '+44-7700-900123', nationality: 'UK', vipLevel: 'platinum', totalStays: 22, totalRevenue: 890000 } }),
    db.guest.create({ data: { firstName: 'Ravi', lastName: 'Thapa', email: 'ravi.t@email.com', phone: '+977-9860-456789', nationality: 'Nepal', vipLevel: 'none', totalStays: 1, totalRevenue: 12000 } }),
    db.guest.create({ data: { firstName: 'Elena', lastName: 'Rodriguez', email: 'elena.r@email.com', phone: '+34-612-345-678', nationality: 'Spain', vipLevel: 'gold', totalStays: 10, totalRevenue: 310000 } }),
    db.guest.create({ data: { firstName: 'Michael', lastName: 'Brown', email: 'michael.b@email.com', phone: '+61-412-345-678', nationality: 'Australia', vipLevel: 'none', totalStays: 2, totalRevenue: 55000 } }),
    db.guest.create({ data: { firstName: 'Sunita', lastName: 'Tamang', email: 'sunita.t@email.com', phone: '+977-9843-567890', nationality: 'Nepal', vipLevel: 'silver', totalStays: 7, totalRevenue: 160000 } }),
    db.guest.create({ data: { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '+1-555-098-7654', nationality: 'USA', vipLevel: 'platinum', totalStays: 30, totalRevenue: 950000 } }),
    db.guest.create({ data: { firstName: 'Yuki', lastName: 'Sato', email: 'yuki.s@email.com', phone: '+81-80-5678-9012', nationality: 'Japan', vipLevel: 'gold', totalStays: 5, totalRevenue: 210000 } }),
  ])

  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const in2Days = new Date(today); in2Days.setDate(in2Days.getDate() + 2)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const in3Days = new Date(today); in3Days.setDate(in3Days.getDate() + 3)

  // Create rooms across 6 floors with various statuses
  const roomDefs: Array<{ number: string; floor: number; wing: string; typeId: string; status: string; guestId?: string }> = []

  // Floor 1 - Ground floor: mostly standard rooms
  roomDefs.push(
    { number: '101', floor: 1, wing: 'East', typeId: types[4].id, status: 'vacant_clean' },
    { number: '102', floor: 1, wing: 'East', typeId: types[4].id, status: 'occupied', guestId: guests[6].id },
    { number: '103', floor: 1, wing: 'East', typeId: types[4].id, status: 'vacant_dirty' },
    { number: '104', floor: 1, wing: 'West', typeId: types[4].id, status: 'vacant_clean' },
    { number: '105', floor: 1, wing: 'West', typeId: types[4].id, status: 'out_of_order' },
    { number: '106', floor: 1, wing: 'West', typeId: types[4].id, status: 'cleaning' },
  )

  // Floor 2 - Deluxe rooms
  roomDefs.push(
    { number: '201', floor: 2, wing: 'East', typeId: types[0].id, status: 'occupied', guestId: guests[0].id },
    { number: '202', floor: 2, wing: 'East', typeId: types[0].id, status: 'vacant_clean' },
    { number: '203', floor: 2, wing: 'East', typeId: types[1].id, status: 'occupied', guestId: guests[1].id },
    { number: '204', floor: 2, wing: 'West', typeId: types[0].id, status: 'vacant_clean' },
    { number: '205', floor: 2, wing: 'West', typeId: types[1].id, status: 'vacant_dirty' },
    { number: '206', floor: 2, wing: 'West', typeId: types[0].id, status: 'inspected' },
    { number: '207', floor: 2, wing: 'East', typeId: types[1].id, status: 'vacant_clean' },
    { number: '208', floor: 2, wing: 'West', typeId: types[0].id, status: 'on_change' },
  )

  // Floor 3 - Superior rooms
  roomDefs.push(
    { number: '301', floor: 3, wing: 'East', typeId: types[2].id, status: 'occupied', guestId: guests[2].id },
    { number: '302', floor: 3, wing: 'East', typeId: types[2].id, status: 'vacant_clean' },
    { number: '303', floor: 3, wing: 'East', typeId: types[2].id, status: 'occupied', guestId: guests[3].id },
    { number: '304', floor: 3, wing: 'West', typeId: types[2].id, status: 'vacant_clean' },
    { number: '305', floor: 3, wing: 'West', typeId: types[2].id, status: 'cleaning' },
    { number: '306', floor: 3, wing: 'West', typeId: types[2].id, status: 'vacant_clean' },
    { number: '307', floor: 3, wing: 'East', typeId: types[2].id, status: 'inspected' },
    { number: '308', floor: 3, wing: 'West', typeId: types[2].id, status: 'occupied', guestId: guests[4].id },
  )

  // Floor 4 - Executive Suite + Deluxe
  roomDefs.push(
    { number: '401', floor: 4, wing: 'East', typeId: types[3].id, status: 'occupied', guestId: guests[5].id },
    { number: '402', floor: 4, wing: 'East', typeId: types[0].id, status: 'vacant_clean' },
    { number: '403', floor: 4, wing: 'East', typeId: types[1].id, status: 'occupied', guestId: guests[7].id },
    { number: '404', floor: 4, wing: 'West', typeId: types[0].id, status: 'vacant_clean' },
    { number: '405', floor: 4, wing: 'West', typeId: types[1].id, status: 'vacant_dirty' },
    { number: '406', floor: 4, wing: 'West', typeId: types[0].id, status: 'vacant_clean' },
  )

  // Floor 5 - Executive Suites
  roomDefs.push(
    { number: '501', floor: 5, wing: 'East', typeId: types[3].id, status: 'occupied', guestId: guests[8].id },
    { number: '502', floor: 5, wing: 'East', typeId: types[3].id, status: 'vacant_clean' },
    { number: '503', floor: 5, wing: 'West', typeId: types[3].id, status: 'cleaning' },
    { number: '504', floor: 5, wing: 'West', typeId: types[3].id, status: 'vacant_clean' },
    { number: '505', floor: 5, wing: 'East', typeId: types[3].id, status: 'inspected' },
    { number: '506', floor: 5, wing: 'West', typeId: types[3].id, status: 'occupied', guestId: guests[9].id },
  )

  // Floor 6 - Presidential + Executive
  roomDefs.push(
    { number: '601', floor: 6, wing: 'East', typeId: types[5].id, status: 'occupied', guestId: guests[10].id },
    { number: '602', floor: 6, wing: 'East', typeId: types[3].id, status: 'vacant_clean' },
    { number: '603', floor: 6, wing: 'West', typeId: types[3].id, status: 'occupied', guestId: guests[11].id },
    { number: '604', floor: 6, wing: 'West', typeId: types[3].id, status: 'vacant_clean' },
  )

  // Create rooms and reservations
  for (const r of roomDefs) {
    await db.room.create({
      data: {
        number: r.number,
        floor: r.floor,
        wing: r.wing,
        typeId: r.typeId,
        propertyId: property.id,
        status: r.status,
        view: r.typeId === types[0].id ? 'City' : r.typeId === types[1].id ? 'Mountain' : r.typeId === types[5].id ? '360° Panoramic' : 'Garden',
      }
    })

    // Create active reservations for occupied rooms
    if (r.guestId) {
      await db.reservation.create({
        data: {
          confirmationNo: `CONF${r.number}${Date.now().toString().slice(-4)}`,
          propertyId: property.id,
          guestId: r.guestId,
          roomId: (await db.room.findFirst({ where: { number: r.number, propertyId: property.id } }))!.id,
          roomTypeId: r.typeId,
          status: 'checked_in',
          adults: r.typeId === types[5].id || r.typeId === types[3].id ? 2 : 1,
          children: Math.random() > 0.7 ? 1 : 0,
          checkIn: yesterday,
          checkOut: tomorrow,
          roomRate: r.typeId === types[5].id ? 50000 : r.typeId === types[3].id ? 25000 : r.typeId === types[2].id ? 15000 : r.typeId === types[0].id ? 12000 : 8000,
          totalAmount: 0,
          source: Math.random() > 0.5 ? 'direct' : 'booking_com',
          paymentStatus: 'unpaid',
          guaranteed: Math.random() > 0.3,
        }
      })
    }
  }

  // Create some restrictions
  await db.roomRestriction.createMany({
    data: [
      { roomTypeId: types[0].id, date: in2Days, restrictionType: 'stop_sell', value: 0, reason: 'Group booking block' },
      { roomTypeId: types[2].id, date: in2Days, restrictionType: 'min_los', value: 2, reason: 'Weekend minimum stay' },
      { roomTypeId: types[3].id, date: in3Days, restrictionType: 'cta', value: 3, reason: 'Expected high demand' },
      { roomTypeId: types[5].id, date: tomorrow, restrictionType: 'max_los', value: 5, reason: 'Renovation schedule' },
      { roomTypeId: types[4].id, date: in2Days, restrictionType: 'ctd', value: 1, reason: 'Promotional rate' },
      { roomTypeId: types[1].id, date: in3Days, restrictionType: 'stop_sell', value: 0, reason: 'Maintenance' },
      { roomTypeId: types[0].id, date: in3Days, restrictionType: 'min_los', value: 3, reason: 'Festival period' },
    ]
  })

  // Create rate plans
  await db.ratePlan.createMany({
    data: [
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[0].id, baseRate: 12000, channel: 'direct', active: true },
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[1].id, baseRate: 12000, channel: 'direct', active: true },
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[2].id, baseRate: 15000, channel: 'direct', active: true },
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[3].id, baseRate: 25000, channel: 'direct', active: true },
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[4].id, baseRate: 8000, channel: 'direct', active: true },
      { name: 'BAR - Best Available Rate', code: 'BAR', propertyId: property.id, roomTypeId: types[5].id, baseRate: 50000, channel: 'direct', active: true },
      { name: 'OTA Standard', code: 'OTA_STD', propertyId: property.id, roomTypeId: types[0].id, baseRate: 14000, channel: 'ota', active: true },
      { name: 'OTA Standard', code: 'OTA_STD', propertyId: property.id, roomTypeId: types[2].id, baseRate: 18000, channel: 'ota', active: true },
      { name: 'Corporate Rate', code: 'CORP', propertyId: property.id, roomTypeId: types[0].id, baseRate: 10000, channel: 'corporate', active: true },
      { name: 'Corporate Rate', code: 'CORP', propertyId: property.id, roomTypeId: types[2].id, baseRate: 13000, channel: 'corporate', active: true },
      { name: 'Corporate Rate', code: 'CORP', propertyId: property.id, roomTypeId: types[3].id, baseRate: 20000, channel: 'corporate', active: true },
      { name: 'Weekend Special', code: 'WEEKEND', propertyId: property.id, roomTypeId: types[4].id, baseRate: 6500, channel: 'direct', active: true },
    ]
  })
}

export async function GET() {
  try {
    await ensureSeedData()

    const property = await db.property.findFirst()

    // Fetch rooms with type info
    const rooms = await db.room.findMany({
      where: property ? { propertyId: property.id } : undefined,
      include: {
        type: { select: { id: true, name: true, code: true, baseOccupancy: true, maxOccupancy: true, bedConfig: true, areaSqFt: true, view: true, amenities: true } },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })

    // Fetch active reservations (checked_in) with guest info for occupied rooms
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
      if (res.roomId) {
        reservationMap.set(res.roomId, res)
      }
    }

    // Status breakdown
    const statusBreakdown = await db.room.groupBy({
      by: ['status'],
      where: property ? { propertyId: property.id } : undefined,
      _count: { status: true },
    })
    const statusMap: Record<string, number> = {}
    for (const item of statusBreakdown) {
      statusMap[item.status] = item._count.status
    }

    // Floor list
    const floors = [...new Set(rooms.map(r => r.floor))].sort()

    // Wings list
    const wings = [...new Set(rooms.filter(r => r.wing).map(r => r.wing!))].sort()

    // Room types with counts and rates
    const roomTypes = await db.roomType.findMany({
      where: { active: true },
      include: {
        rooms: { where: property ? { propertyId: property.id } : undefined, select: { id: true } },
        ratePlans: { where: { active: true }, select: { id: true, name: true, code: true, baseRate: true, channel: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Restrictions for the next 14 days
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 13)
    const restrictions = await db.roomRestriction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        roomType: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ date: 'asc' }, { roomTypeId: 'asc' }],
    })

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
      roomTypes: roomTypes.map(rt => ({
        ...rt,
        roomCount: rt.rooms.length,
      })),
      restrictions,
      summary: {
        totalRooms,
        occupied,
        available,
        outOfOrder,
        dirty,
        vacantClean,
        inspected,
        occupancyRate,
      },
    })
  } catch (error) {
    console.error('Rooms API error:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}
