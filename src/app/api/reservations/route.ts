import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { adToBS } from '@/lib/nepali-calendar'
import { getOrSet, getSettingsMap, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── Nepali Fiscal Year Helpers ─────────────────────────────
// FY starts Shrawan (BS month 4). Short form: "82/83" = FY 2082/2083
function getFiscalYearShort(date: Date): string {
  const bs = adToBS(date)
  // BS month is 1-indexed; Shrawan = month 4
  if (bs.month >= 4) {
    const y1 = String(bs.year % 100).padStart(2, '0')
    const y2 = String((bs.year + 1) % 100).padStart(2, '0')
    return `${y1}/${y2}`
  }
  const y1 = String((bs.year - 1) % 100).padStart(2, '0')
  const y2 = String(bs.year % 100).padStart(2, '0')
  return `${y1}/${y2}`
}

async function generateReservationNumber(date: Date): Promise<string> {
  const fy = getFiscalYearShort(date)
  const prefix = `Res-${fy}-`
  // Find the highest existing number for this fiscal year prefix
  const reservations = await db.reservation.findMany({
    where: { reservationNumber: { startsWith: prefix } },
    select: { reservationNumber: true },
    orderBy: { reservationNumber: 'desc' },
    take: 1,
  })
  let nextSeq = 1
  if (reservations.length > 0 && reservations[0].reservationNumber) {
    const parts = reservations[0].reservationNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1
  }
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    // Extract params for cache key before wrapping in getOrSet
    const { searchParams } = new URL(request.url)
    const cacheStatus = searchParams.get('status') || 'all'
    const cacheSearch = searchParams.get('search') || ''
    const cachePage = searchParams.get('page') || '1'

    const data = await getOrSet(`reservations:list:${cacheStatus}:${cacheSearch}:${cachePage}`, async () => {
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

    const checkOutBefore = searchParams.get('checkOutBefore')
    if (checkOutBefore) {
      const d = new Date(checkOutBefore)
      d.setHours(0, 0, 0, 0)
      // Only add if no checkOutDate was set (to avoid conflict)
      if (!checkOutDate) {
        where.checkOut = { lt: d }
      }
    }

    const reservations = await db.reservation.findMany({
      where,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true, bedConfig: true } } } },
        folios: {
          select: { id: true, balance: true, status: true },
        },
        bookingContact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyName: true } },
      },
      orderBy: { checkIn: 'asc' },
    })

    const total = reservations.length

    // Read relevant settings from DB
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? NEPAL_VAT_RATE
    const serviceCharge = (s.serviceCharge as number) ?? 0
    const cancellationPolicy = (s.cancellationPolicy as string) ?? ''
    const defaultCheckIn = (s.defaultCheckIn as string) ?? '14:00'
    const defaultCheckOut = (s.defaultCheckOut as string) ?? '11:00'
    const earlyCheckInCharge = (s.earlyCheckInCharge as number) ?? 0
    const lateCheckoutCharge = (s.lateCheckoutCharge as number) ?? 0

    return {
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
    }
    }, 120000)
    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    console.error('Reservations API error:', error)
    return cachedError('Failed to fetch reservations', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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
    const taxRate = (s.taxRate as number) ?? NEPAL_VAT_RATE
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

    // ── Conflict check: room + date overlap ──
    if (roomId) {
      const conflicting = await db.reservation.findFirst({
        where: {
          roomId,
          status: { notIn: ['cancelled', 'no_show'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        include: {
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { number: true } },
        },
      })
      if (conflicting) {
        return NextResponse.json({
          error: 'CONFLICT',
          conflict: {
            confirmationNo: conflicting.confirmationNo,
            reservationNumber: conflicting.reservationNumber,
            guestName: conflicting.guest ? `${conflicting.guest.firstName} ${conflicting.guest.lastName}` : 'Unknown',
            roomNumber: conflicting.room?.number || 'N/A',
            checkIn: conflicting.checkIn.toISOString(),
            checkOut: conflicting.checkOut.toISOString(),
            status: conflicting.status,
          },
        }, { status: 409 })
      }
    }

    // Generate fiscal-year sequential reservation number
    const reservationNumber = await generateReservationNumber(checkInDate)

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

    const reservation = await withRetry(() =>
      db.reservation.create({
      data: {
        confirmationNo,
        reservationNumber,
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
      }),
    )


    afterMutation('reservations')
    return NextResponse.json({ reservation }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Create reservation error:', error)
    return cachedError('Failed to create reservation', 500)
  }
}
