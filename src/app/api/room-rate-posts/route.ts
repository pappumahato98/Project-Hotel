import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

// Helper: read tax/service charge settings from DB
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') {
      try {
        map[r.key] = JSON.parse(r.value)
      } catch {
        map[r.key] = r.value
      }
    } else map[r.key] = r.value
  }
  return map
}

// POST /api/room-rate-posts — Create room rate post(s)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      reservationId,
      roomId,
      postDate,
      roomRate,
      taxRate: bodyTaxRate,
      serviceCharge: bodyServiceCharge,
      chargeType,
      description,
      postedBy,
    } = body

    if (!reservationId || !postDate || roomRate === undefined || roomRate === null) {
      return NextResponse.json(
        { error: 'reservationId, postDate, and roomRate are required' },
        { status: 400 }
      )
    }

    // 1. Find the reservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, number: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!reservation.guestId) {
      return NextResponse.json(
        { error: 'Reservation has no guest associated' },
        { status: 400 }
      )
    }

    // 2. Find or create the guest folio for this reservation
    let folio = await db.folio.findFirst({
      where: {
        reservationId,
        guestId: reservation.guestId,
        folioType: 'guest',
      },
    })

    if (!folio) {
      folio = await db.folio.create({
        data: {
          reservationId,
          guestId: reservation.guestId,
          folioType: 'guest',
          status: 'open',
          balance: 0,
        },
      })
    }

    // 3. Calculate amounts
    const settings = await getSettingsMap()
    const taxRate = bodyTaxRate ?? ((settings.taxRate as number) ?? 13)
    const serviceCharge = bodyServiceCharge ?? ((settings.serviceCharge as number) ?? 0)
    const effectiveRoomId = roomId || reservation.roomId || ''
    const effectiveRoomNumber = reservation.room?.number || null
    const guestName = reservation.guest
      ? `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim()
      : null

    const taxAmount = roomRate * (taxRate / 100)
    const totalAmount = roomRate + taxAmount + serviceCharge

    const parsedPostDate = new Date(postDate)

    // 4. Create the RoomRatePost record
    const ratePost = await db.roomRatePost.create({
      data: {
        reservationId,
        folioId: folio.id,
        roomId: effectiveRoomId,
        roomNumber: effectiveRoomNumber,
        guestId: reservation.guestId,
        guestName,
        postDate: parsedPostDate,
        roomRate,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        serviceCharge: Math.round(serviceCharge * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        chargeType: chargeType || 'room',
        description:
          description ||
          `Room charge - ${effectiveRoomNumber || 'N/A'} - ${parsedPostDate.toLocaleDateString()}`,
        postedBy: postedBy || null,
      },
    })

    // 5. Create a FolioTransaction (type: "room")
    await db.folioTransaction.create({
      data: {
        folioId: folio.id,
        transactionType: 'room',
        description:
          description ||
          `Room charge - ${effectiveRoomNumber || 'N/A'} - ${parsedPostDate.toLocaleDateString()}`,
        amount: roomRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        quantity: 1,
        postedBy: postedBy || null,
      },
    })

    // 6. Update folio balance (add totalAmount)
    const updatedFolio = await db.folio.update({
      where: { id: folio.id },
      data: {
        balance: {
          increment: Math.round(totalAmount * 100) / 100,
        },
      },
    })

    // 7. Update reservation paidAmount if advanceAmount is set
    if (reservation.advanceAmount && reservation.advanceAmount > 0) {
      // Only update if paidAmount hasn't already been adjusted for this advance
      // We don't re-add; advance is recorded once at check-in
      // This step is a no-op here — advance is applied during check-in
    }

    return NextResponse.json({
      ratePost,
      folioBalance: updatedFolio.balance,
      folioId: updatedFolio.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Create room rate post error:', error)
    return NextResponse.json({ error: 'Failed to create room rate post' }, { status: 500 })
  }
}

// GET /api/room-rate-posts — List rate posts
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')
    const folioId = searchParams.get('folioId')

    if (!reservationId && !folioId) {
      return NextResponse.json(
        { error: 'Either reservationId or folioId query parameter is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (reservationId) where.reservationId = reservationId
    if (folioId) where.folioId = folioId

    const ratePosts = await db.roomRatePost.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            status: true,
            guest: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        folio: {
          select: {
            id: true,
            folioType: true,
            status: true,
            balance: true,
          },
        },
      },
      orderBy: { postDate: 'desc' },
    })

    return NextResponse.json({ ratePosts })
  } catch (error) {
    console.error('List room rate posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room rate posts' },
      { status: 500 }
    )
  }
}