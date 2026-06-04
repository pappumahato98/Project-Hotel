import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ─── Settings helper ──────────────────────────────────────
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') { try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value } }
    else map[r.key] = r.value
  }
  return map
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const date = searchParams.get('date')
    const checkInDate = searchParams.get('checkInDate')
    const checkOutDate = searchParams.get('checkOutDate')

    const where: Prisma.ReservationWhereInput = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { confirmationNo: { contains: search, mode: 'insensitive' } },
        { guest: { firstName: { contains: search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: search, mode: 'insensitive' } } },
        { room: { number: { contains: search } } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      where.AND = [
        { checkIn: { lt: nextDay } },
        { checkOut: { gte: targetDate } },
      ]
    }

    if (checkInDate) {
      const d = new Date(checkInDate)
      d.setHours(0, 0, 0, 0)
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      where.checkIn = { gte: d, lt: nextDay }
    }

    if (checkOutDate) {
      const d = new Date(checkOutDate)
      d.setHours(0, 0, 0, 0)
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      where.checkOut = { gte: d, lt: nextDay }
    }

    const reservations = await db.reservation.findMany({
      where,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
        folios: {
          select: { id: true, balance: true, status: true },
        },
      },
      orderBy: { checkIn: 'asc' },
    })

    const total = await db.reservation.count({ where })

    // Read relevant settings from DB
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13
    const serviceCharge = (s.serviceCharge as number) ?? 0
    const cancellationPolicy = (s.cancellationPolicy as string) ?? ''
    const defaultCheckIn = (s.defaultCheckIn as string) ?? '14:00'
    const defaultCheckOut = (s.defaultCheckOut as string) ?? '11:00'
    const earlyCheckInCharge = (s.earlyCheckInCharge as number) ?? 0
    const lateCheckoutCharge = (s.lateCheckoutCharge as number) ?? 0

    return NextResponse.json({
      reservations,
      total,
      settings: {
        taxRate,
        serviceCharge,
        cancellationPolicy,
        defaultCheckIn,
        defaultCheckOut,
        earlyCheckInCharge,
        lateCheckoutCharge,
      },
    })
  } catch (error) {
    console.error('Reservations API error:', error)
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      guestId, roomId, roomTypeId, ratePlanId, propertyId,
      adults, children, checkIn, checkOut, roomRate,
      specialRequests, source, guaranteed, company, poNumber,
      notes, reservationType,
    } = body

    // Read settings from DB
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13
    const defaultCheckInTime = (s.defaultCheckIn as string) ?? '14:00'
    const defaultCheckOutTime = (s.defaultCheckOut as string) ?? '11:00'

    // Generate confirmation number
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let confirmationNo = ''
    for (let i = 0; i < 8; i++) {
      confirmationNo += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Apply default check-in/out times if only dates are provided (no time portion)
    let checkInDate = new Date(checkIn)
    let checkOutDate = new Date(checkOut)
    if (checkInDate.getHours() === 0 && checkInDate.getMinutes() === 0) {
      const [h, m] = defaultCheckInTime.split(':').map(Number)
      checkInDate.setHours(h, m, 0, 0)
    }
    if (checkOutDate.getHours() === 0 && checkOutDate.getMinutes() === 0) {
      const [h, m] = defaultCheckOutTime.split(':').map(Number)
      checkOutDate.setHours(h, m, 0, 0)
    }

    // Calculate total amount based on nights and rate, with tax
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = (roomRate || 0) * nights
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount

    const reservation = await db.reservation.create({
      data: {
        confirmationNo,
        guestId: guestId || null,
        roomId: roomId || null,
        roomTypeId: roomTypeId || null,
        ratePlanId: ratePlanId || null,
        propertyId: propertyId || 'prop_01',
        adults: adults || 1,
        children: children || 0,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomRate: roomRate || 0,
        totalAmount,
        specialRequests: specialRequests || null,
        source: source || 'direct',
        guaranteed: guaranteed || false,
        company: company || null,
        poNumber: poNumber || null,
        notes: notes || null,
        reservationType: reservationType || 'individual',
        bookedBy: 'System',
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
      },
    })

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error('Create reservation error:', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}
