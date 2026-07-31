import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getSettingsMap, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Generate unique 8-char alphanumeric confirmation number ───
async function generateConfirmationNo(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const existing = await db.reservation.findUnique({ where: { confirmationNo: code } })
    if (!existing) return code
  }
  throw new Error('Failed to generate unique confirmation number after 10 attempts')
}

// ─── Calculate number of nights between two dates ──────────────
function calcNights(checkIn: Date, checkOut: Date): number {
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Apply default check-in / check-out times ──────────────────
function applyDefaultTime(date: Date, timeStr: string): void {
  const [h, m] = timeStr.split(':').map(Number)
  date.setHours(h, m, 0, 0)
}

// ─── Request body type ─────────────────────────────────────────
interface CheckInRequestBody {
  source: 'reservation' | 'direct'

  // Reservation source
  reservationId?: string

  // Direct source — guest
  guestId?: string
  guest?: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    nationality?: string
    idType?: string
    idNumber?: string
    dateOfBirth?: string
    gender?: string
    address?: string
    city?: string
    country?: string
  }

  // Room (always required)
  roomId: string
  roomTypeId: string
  ratePlanId?: string

  // Dates (only for direct)
  checkIn?: string
  checkOut?: string

  // Occupancy
  adults: number
  children: number

  // Pricing
  roomRate: number

  // Advance payment
  advanceAmount?: number
  advancePaymentMethod?: string
  advanceReference?: string

  // Guest documents
  documents?: Array<{
    docType: string
    docNumber?: string
    docExpiry?: string
    issueCountry?: string
    issueDate?: string
    placeOfIssue?: string
    notes?: string
  }>

  // Audit
  checkedInBy?: string
  propertyId?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body: CheckInRequestBody = await request.json()
    const {
      source,
      reservationId,
      guestId,
      guest: guestData,
      roomId,
      roomTypeId,
      ratePlanId,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      adults,
      children,
      roomRate,
      advanceAmount,
      advancePaymentMethod,
      advanceReference,
      documents,
      checkedInBy,
      propertyId: bodyPropertyId,
    } = body

    // ── Validate required fields ─────────────────────────────
    if (!source || !['reservation', 'direct'].includes(source)) {
      return NextResponse.json(
        { error: 'source must be "reservation" or "direct"' },
        { status: 400 },
      )
    }
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }
    if (!roomTypeId) {
      return NextResponse.json({ error: 'roomTypeId is required' }, { status: 400 })
    }
    if (typeof roomRate !== 'number' || roomRate < 0) {
      return NextResponse.json(
        { error: 'roomRate must be a non-negative number' },
        { status: 400 },
      )
    }

    // ── Resolve property ────────────────────────────────────
    const property = bodyPropertyId
      ? await db.property.findUnique({ where: { id: bodyPropertyId } })
      : await db.property.findFirst({ where: { active: true } })

    if (!property) {
      return NextResponse.json(
        { error: 'No active property found' },
        { status: 400 },
      )
    }

    // ── Validate room exists and is available ───────────────
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { type: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (!['vacant_clean', 'vacant_dirty', 'inspected'].includes(room.status)) {
      return NextResponse.json(
        { error: `Room ${room.number} is not available for check-in (current status: ${room.status}). Please select a vacant or inspected room.` },
        { status: 409 },
      )
    }

    // ── Read system settings ────────────────────────────────
    const settings = await getSettingsMap()
    const taxRate = (settings.taxRate as number) ?? 13
    const defaultCheckInTime = (settings.defaultCheckIn as string) ?? '14:00'
    const defaultCheckOutTime = (settings.defaultCheckOut as string) ?? '11:00'

    // ── Branch: reservation vs direct ───────────────────────
    let reservationIdToUse: string
    let guestIdToUse: string | null = null
    let checkInDate: Date
    let checkOutDate: Date
    let oldRoomId: string | null = null

    if (source === 'reservation') {
      // ── RESERVATION CHECK-IN ──────────────────────────────
      if (!reservationId) {
        return NextResponse.json(
          { error: 'reservationId is required when source is "reservation"' },
          { status: 400 },
        )
      }

      const existing = await db.reservation.findUnique({
        where: { id: reservationId },
        include: { guest: true, room: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }
      if (!['tentative', 'confirmed'].includes(existing.status)) {
        return NextResponse.json(
          {
            error: `This reservation is already "${existing.status}" and cannot be checked in again. Only tentative or confirmed reservations can be checked in.`,
          },
          { status: 409 },
        )
      }

      reservationIdToUse = existing.id
      guestIdToUse = existing.guestId
      checkInDate = new Date(existing.checkIn)
      checkOutDate = new Date(existing.checkOut)
      oldRoomId = existing.roomId // track old room to free later
    } else {
      // ── DIRECT (WALK-IN) CHECK-IN ─────────────────────────
      if (!checkInStr || !checkOutStr) {
        return NextResponse.json(
          { error: 'checkIn and checkOut dates are required when source is "direct"' },
          { status: 400 },
        )
      }

      checkInDate = new Date(checkInStr)
      checkOutDate = new Date(checkOutStr)
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid check-in or check-out date' },
          { status: 400 },
        )
      }
      if (checkOutDate <= checkInDate) {
        return NextResponse.json(
          { error: 'Check-out must be after check-in' },
          { status: 400 },
        )
      }

      // Apply default times if only dates were provided (midnight)
      if (checkInDate.getHours() === 0 && checkInDate.getMinutes() === 0) {
        applyDefaultTime(checkInDate, defaultCheckInTime)
      }
      if (checkOutDate.getHours() === 0 && checkOutDate.getMinutes() === 0) {
        applyDefaultTime(checkOutDate, defaultCheckOutTime)
      }

      // Resolve or create guest
      if (guestId) {
        const existingGuest = await db.guest.findUnique({ where: { id: guestId } })
        if (!existingGuest) {
          return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }
        guestIdToUse = guestId
      } else if (guestData) {
        if (!guestData.firstName || !guestData.lastName) {
          return NextResponse.json(
            { error: 'Guest firstName and lastName are required' },
            { status: 400 },
          )
        }
        const newGuest = await db.guest.create({
          data: {
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email || null,
            phone: guestData.phone || null,
            nationality: guestData.nationality || null,
            idType: guestData.idType || null,
            idNumber: guestData.idNumber || null,
            dateOfBirth: guestData.dateOfBirth ? new Date(guestData.dateOfBirth) : null,
            gender: guestData.gender || null,
            address: guestData.address || null,
            city: guestData.city || null,
            country: guestData.country || null,
          },
        })
        guestIdToUse = newGuest.id
      } else {
        return NextResponse.json(
          { error: 'Either guestId or guest object is required for direct check-in' },
          { status: 400 },
        )
      }

      // Generate confirmation number
      const confirmationNo = await generateConfirmationNo()

      // Calculate totals
      const nights = calcNights(checkInDate, checkOutDate)
      const subtotal = roomRate * nights
      const totalAmount = subtotal * (1 + taxRate / 100)

      // Create reservation directly in checked_in status
      const newReservation = await db.reservation.create({
        data: {
          confirmationNo,
          propertyId: property.id,
          guestId: guestIdToUse,
          roomId,
          roomTypeId,
          ratePlanId: ratePlanId || null,
          status: 'checked_in',
          reservationType: 'walk_in',
          adults: adults || 1,
          children: children || 0,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          roomRate,
          totalAmount,
          paidAmount: 0,
          source: 'walk_in',
          paymentStatus: advanceAmount && advanceAmount > 0 ? 'partial' : 'unpaid',
          guaranteed: false,
          bookedBy: checkedInBy || 'Walk-in',
          notes: `Direct walk-in check-in${checkedInBy ? ` by ${checkedInBy}` : ''}`,
        },
      })
      reservationIdToUse = newReservation.id
    }

    // ── Guard: ensure guestId is available ──────────────────
    if (!guestIdToUse) {
      return NextResponse.json(
        { error: 'No guest associated with this check-in' },
        { status: 400 },
      )
    }

    // Wrap sequential DB writes in withRetry for transient error resilience
    const reservation = await withRetry(async () => {
      // ── Update reservation (for reservation source) ─────────
      if (source === 'reservation') {
        const existingRes = await db.reservation.findUnique({
          where: { id: reservationIdToUse },
          select: { totalAmount: true, checkIn: true, checkOut: true, paidAmount: true },
        })

        if (existingRes) {
          const nights = calcNights(new Date(existingRes.checkIn), new Date(existingRes.checkOut))
          const subtotal = roomRate * nights
          const totalAmount = subtotal * (1 + taxRate / 100)

          // Determine payment status
          let paymentStatus: string = 'unpaid'
          if (advanceAmount && advanceAmount > 0) {
            paymentStatus = advanceAmount >= totalAmount ? 'paid' : 'partial'
          } else if (existingRes.totalAmount > 0 && existingRes.paidAmount >= existingRes.totalAmount) {
            paymentStatus = 'paid'
          }

          await db.reservation.update({
            where: { id: reservationIdToUse },
            data: {
              status: 'checked_in',
              roomId,
              roomTypeId,
              ratePlanId: ratePlanId || undefined,
              roomRate,
              totalAmount,
              adults: adults || undefined,
              children: children || undefined,
              paymentStatus,
            },
          })
        }

        // Free the old room if room changed
        if (oldRoomId && oldRoomId !== roomId) {
          await db.room.update({
            where: { id: oldRoomId },
            data: { status: 'vacant_dirty' },
          })
        }
      }

      // ── Update room status to occupied ──────────────────────
      await db.room.update({
        where: { id: roomId },
        data: { status: 'occupied' },
      })

      // ── Create Folio if not already exists ──────────────────
      const existingFolio = await db.folio.findFirst({
        where: { reservationId: reservationIdToUse, folioType: 'guest' },
      })

      if (!existingFolio) {
        await db.folio.create({
          data: {
            reservationId: reservationIdToUse,
            guestId: guestIdToUse,
            folioType: 'guest',
            status: 'open',
            balance: 0,
          },
        })
      }

      // ── Handle advance payment ──────────────────────────────
      if (advanceAmount && advanceAmount > 0) {
        // Re-fetch folio (may have just been created)
        const folio =
          existingFolio ??
          (await db.folio.findFirst({
            where: { reservationId: reservationIdToUse, folioType: 'guest' },
          }))

        if (folio) {
          await db.folioPayment.create({
            data: {
              folioId: folio.id,
              paymentMethod: advancePaymentMethod || 'cash',
              amount: advanceAmount,
              reference: advanceReference || null,
              receivedBy: checkedInBy || null,
              status: 'completed',
            },
          })

          // Update reservation paid amount
          await db.reservation.update({
            where: { id: reservationIdToUse },
            data: { paidAmount: { increment: advanceAmount } },
          })

          // Decrement folio balance (payment reduces debit balance)
          await db.folio.update({
            where: { id: folio.id },
            data: { balance: { decrement: advanceAmount } },
          })
        }
      }

      // ── Handle guest documents ──────────────────────────────
      if (documents && documents.length > 0) {
        await db.guestDocument.createMany({
          data: documents.map((doc) => ({
            reservationId: reservationIdToUse,
            guestId: guestIdToUse,
            docType: doc.docType,
            docNumber: doc.docNumber || null,
            docExpiry: doc.docExpiry ? new Date(doc.docExpiry) : null,
            issueCountry: doc.issueCountry || null,
            issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
            placeOfIssue: doc.placeOfIssue || null,
            notes: doc.notes || null,
          })),
        })
      }

      // ── Update guest stats (totalStays, lastStayAt) ────────
      await db.guest.update({
        where: { id: guestIdToUse },
        data: {
          totalStays: { increment: 1 },
          lastStayAt: new Date(),
        },
      })

      // ── Fetch and return the full updated reservation ───────
      return db.reservation.findUnique({
        where: { id: reservationIdToUse },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              nationality: true,
              vipLevel: true,
            },
          },
          room: {
            include: {
              type: { select: { id: true, name: true, code: true, bedConfig: true } },
            },
          },
          folios: {
            include: {
              transactions: { orderBy: { createdAt: 'desc' } },
              payments: { orderBy: { createdAt: 'desc' } },
              ratePostings: { orderBy: { postingDate: 'asc' } },
            },
          },
          guestDocuments: { orderBy: { createdAt: 'desc' } },
          property: {
            select: { id: true, name: true, code: true, currency: true, taxRate: true },
          },
        },
      })
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated reservation' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        reservation,
        message:
          source === 'reservation'
            ? 'Guest checked in successfully'
            : 'Walk-in check-in completed',
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Check-in API error:', error)
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 })
  }
}