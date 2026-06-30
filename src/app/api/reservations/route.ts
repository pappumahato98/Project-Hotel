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
      const statusValues = status.split(',').map(s => s.trim())
      if (statusValues.length === 1) {
        where.status = statusValues[0]
      } else {
        where.status = { in: statusValues }
      }
    }

    if (search) {
      const orConditions: Prisma.ReservationWhereInput[] = [
        { confirmationNo: { contains: search } },
        { guest: { firstName: { contains: search } } },
        { guest: { lastName: { contains: search } } },
        { room: { number: { contains: search } } },
        { source: { contains: search } },
        { company: { contains: search } },
      ]
      // Allow numeric search on totalAmount
      const numSearch = parseFloat(search)
      if (!isNaN(numSearch)) {
        orConditions.push({ totalAmount: { equals: numSearch } })
        orConditions.push({ roomRate: { equals: numSearch } })
      }
      where.OR = orConditions
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

    // dateFrom/dateTo: fetch all reservations overlapping the range [dateFrom, dateTo]
    // Used by calendar view to display all bookings within the visible date window
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      where.AND = [
        { checkIn: { lt: to } },
        { checkOut: { gt: from } },
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
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
        folios: {
          select: { id: true, balance: true, status: true },
        },
        bookingContact: true,
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
      notes, reservationType, status, creditLimit, bookedBy,
      // Booking contact fields
      bookingContact,
    } = body

    // Validate required dates
    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: 'Check-in and check-out dates are required' }, { status: 400 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid check-in or check-out date' }, { status: 400 })
    }
    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
    }

    // Resolve property ID — look up from DB if not provided
    const property = propertyId
      ? await db.property.findUnique({ where: { id: propertyId } })
      : await db.property.findFirst({ where: { active: true } })
    if (!property) {
      return NextResponse.json({ error: 'No active property found in the system' }, { status: 400 })
    }

    // Read settings from DB
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13
    const defaultCheckInTime = (s.defaultCheckIn as string) ?? '14:00'
    const defaultCheckOutTime = (s.defaultCheckOut as string) ?? '11:00'

    // Generate unique confirmation number
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let confirmationNo = ''
    let isUnique = false
    for (let attempt = 0; attempt < 10; attempt++) {
      confirmationNo = ''
      for (let i = 0; i < 8; i++) {
        confirmationNo += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      const existing = await db.reservation.findUnique({ where: { confirmationNo } })
      if (!existing) { isUnique = true; break }
    }
    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique confirmation number' }, { status: 500 })
    }

    // Apply default check-in/out times if only dates are provided (no time portion)
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
        propertyId: property.id,
        status: status || 'confirmed',
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
        bookedBy: bookedBy || 'System',
        creditLimit: creditLimit || 15000,
        bookingContact: bookingContact ? {
          create: {
            contactType: bookingContact.contactType || 'person',
            salutation: bookingContact.salutation || null,
            firstName: bookingContact.firstName || null,
            lastName: bookingContact.lastName || null,
            email: bookingContact.email || null,
            phone: bookingContact.phone || null,
            mobile: bookingContact.mobile || null,
            companyName: bookingContact.companyName || null,
            companyAddress: bookingContact.companyAddress || null,
            city: bookingContact.city || null,
            country: bookingContact.country || null,
            taxId: bookingContact.taxId || null,
            website: bookingContact.website || null,
            notes: bookingContact.notes || null,
          }
        } : undefined,
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
        bookingContact: true,
      },
    })

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error('Create reservation error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create reservation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
