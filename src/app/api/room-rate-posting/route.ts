import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Settings helper ──────────────────────────────────────
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') {
      try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value }
    } else map[r.key] = r.value
  }
  return map
}

// ─── Date helpers ─────────────────────────────────────────
function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Recalculate folio balance ────────────────────────────
async function recalcFolioBalance(folioId: string) {
  const charges = await db.folioTransaction.findMany({
    where: { folioId },
    select: { totalAmount: true },
  })
  const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)

  const payments = await db.folioPayment.findMany({
    where: { folioId },
    select: { amount: true },
  })
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

  const newBalance = totalCharges - totalPayments
  await db.folio.update({
    where: { id: folioId },
    data: { balance: newBalance },
  })
  return newBalance
}

// ─── Recalculate reservation totals ───────────────────────
async function recalcReservationTotals(reservationId: string) {
  const folios = await db.folio.findMany({
    where: { reservationId },
    include: {
      transactions: { select: { totalAmount: true } },
      payments: { select: { amount: true } },
    },
  })

  const totalAmount = folios.reduce(
    (sum, f) => sum + f.transactions.reduce((s, t) => s + t.totalAmount, 0),
    0,
  )
  const paidAmount = folios.reduce(
    (sum, f) => sum + f.payments.reduce((s, p) => s + p.amount, 0),
    0,
  )

  await db.reservation.update({
    where: { id: reservationId },
    data: {
      totalAmount,
      paidAmount,
      paymentStatus: paidAmount >= totalAmount ? 'paid' : 'unpaid',
    },
  })
}

// ──────────────────────────────────────────────────────────
// GET /api/room-rate-posting?reservationId=xxx
// ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId query parameter is required' },
        { status: 400 },
      )
    }

    const postings = await db.roomRatePosting.findMany({
      where: { reservationId, status: 'posted' },
      include: {
        folio: {
          select: {
            id: true,
            balance: true,
            status: true,
            transactions: {
              where: { transactionType: 'room' },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            roomRate: true,
            status: true,
            room: { select: { id: true, number: true } },
          },
        },
      },
      orderBy: { postingDate: 'asc' },
    })

    return NextResponse.json({ postings, count: postings.length })
  } catch (error) {
    console.error('Room Rate Posting GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate postings' },
      { status: 500 },
    )
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/room-rate-posting
// ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { reservationId, dates, postedBy } = body as {
      reservationId: string
      dates?: string[]
      postedBy?: string
    }

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 },
      )
    }

    // 1. Fetch the reservation with room, folios, and property
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        room: { select: { id: true, number: true } },
        folios: { select: { id: true, guestId: true } },
        property: { select: { id: true, name: true, currency: true, taxRate: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 },
      )
    }

    if (!reservation.room) {
      return NextResponse.json( 
        { error: 'Reservation has no room assigned' },
        { status: 400 },
      )
    }

    if (reservation.folios.length === 0) {
      return NextResponse.json( 
        { error: 'No folio found for this reservation. Create a folio first.' },
        { status: 400 },
      )
    }

    const folioId = reservation.folios[0].id
    const roomNumber = reservation.room.number
    const roomId = reservation.room.id
    const roomRate = reservation.roomRate

    // 2. Read tax and service charge from system settings
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13
    const serviceChargeRate = (s.serviceCharge as number) ?? 0

    // 3. Calculate posting dates
    let postingDates: Date[]

    if (dates && dates.length > 0) {
      postingDates = dates.map((d) => {
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        return dt
      })
    } else {
      // From checkIn date to checkOut date - 1 day
      postingDates = []
      const checkIn = new Date(reservation.checkIn)
      checkIn.setHours(0, 0, 0, 0)
      const checkOut = new Date(reservation.checkOut)
      checkOut.setHours(0, 0, 0, 0)

      let current = new Date(checkIn)
      while (current < checkOut) {
        postingDates.push(new Date(current))
        current = addDays(current, 1)
      }
    }

    if (postingDates.length === 0) {
      return NextResponse.json(
        { error: 'No posting dates calculated for this reservation' },
        { status: 400 },
      )
    }

    // 4. For each date, check if already posted to avoid duplicates
    const existingPostings = await db.roomRatePosting.findMany({
      where: {
        reservationId,
        status: 'posted',
      },
      select: { postingDate: true },
    })

    const existingDateSet = new Set(
      existingPostings.map((p) => toDateOnly(new Date(p.postingDate))),
    )

    const newDates = postingDates.filter(
      (d) => !existingDateSet.has(toDateOnly(d)),
    )

    if (newDates.length === 0) {
      // Nothing new to post, return existing
      const allPostings = await db.roomRatePosting.findMany({
        where: { reservationId },
        include: {
          folio: { select: { id: true, balance: true, status: true } },
        },
        orderBy: { postingDate: 'asc' },
      })

      return NextResponse.json({
        message: 'All nights already posted. No new postings created.',
        postings: allPostings,
        newCount: 0,
        skippedCount: postingDates.length,
      })
    }

    // 5. Create postings and folio transactions for each new date
    const createdPostings = []
    const poster = postedBy || 'System'

    for (const postingDate of newDates) {
      const taxAmount = roomRate * (taxRate / 100)
      const serviceCharge = roomRate * (serviceChargeRate / 100)
      const totalAmount = roomRate + taxAmount + serviceCharge

      const dateStr = formatDateShort(postingDate)

      // Create the RoomRatePosting record
      const posting = await db.roomRatePosting.create({
        data: {
          reservationId,
          folioId,
          roomId,
          postingDate,
          roomRate,
          taxAmount: Math.round(taxAmount * 100) / 100,
          serviceCharge: Math.round(serviceCharge * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          status: 'posted',
          postedBy: poster,
        },
      })

      // Create FolioTransaction for room charge
      const roomTxnTotal = roomRate + taxAmount
      await db.folioTransaction.create({
        data: {
          folioId,
          transactionType: 'room',
          description: `Room Charge - ${roomNumber} - ${dateStr}`,
          amount: roomRate,
          taxAmount: Math.round(taxAmount * 100) / 100,
          totalAmount: Math.round(roomTxnTotal * 100) / 100,
          quantity: 1,
          reference: posting.id,
          postedBy: poster,
        },
      })

      // If service charge > 0, create separate FolioTransaction
      if (serviceCharge > 0) {
        await db.folioTransaction.create({
          data: {
            folioId,
            transactionType: 'room',
            description: `Service Charge - ${roomNumber} - ${dateStr}`,
            amount: Math.round(serviceCharge * 100) / 100,
            taxAmount: 0,
            totalAmount: Math.round(serviceCharge * 100) / 100,
            quantity: 1,
            reference: `${posting.id}-sc`,
            postedBy: poster,
          },
        })
      }

      createdPostings.push(posting)
    }

    // 6. Update folio balance
    await recalcFolioBalance(folioId)

    // 7. Update reservation totals
    await recalcReservationTotals(reservationId)

    // 8. Return all postings for the reservation (including previously existing)
    const allPostings = await db.roomRatePosting.findMany({
      where: { reservationId, status: 'posted' },
      include: {
        folio: {
          select: { id: true, balance: true, status: true },
        },
      },
      orderBy: { postingDate: 'asc' },
    })

    const updatedFolio = await db.folio.findUnique({
      where: { id: folioId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({
      message: `Successfully posted room charges for ${createdPostings.length} night(s)`,
      newPostings: createdPostings,
      postings: allPostings,
      folio: updatedFolio,
      newCount: createdPostings.length,
      skippedCount: postingDates.length - newDates.length,
    })
  } catch (error) {
    console.error('Room Rate Posting POST error:', error)
    return NextResponse.json(
      { error: 'Failed to post room charges' },
      { status: 500 },
    )
  }
}

// ──────────────────────────────────────────────────────────
// DELETE /api/room-rate-posting?id=xxx
// ──────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 },
      )
    }

    const posting = await db.roomRatePosting.findUnique({
      where: { id },
      include: {
        reservation: { select: { id: true } },
        folio: {
          select: {
            id: true,
            transactions: {
              where: {
                transactionType: 'room',
                OR: [
                  { reference: id },
                  { reference: `${id}-sc` },
                ],
              },
            },
          },
        },
      },
    })

    if (!posting) {
      return NextResponse.json(
        { error: 'Rate posting not found' },
        { status: 404 },
      )
    }

    if (posting.status === 'voided') {
      return NextResponse.json(
        { error: 'Rate posting is already voided' },
        { status: 400 },
      )
    }

    const folioId = posting.folioId
    const reservationId = posting.reservationId

    // Void the posting
    await db.roomRatePosting.update({
      where: { id },
      data: {
        status: 'voided',
        voidedBy: 'System',
        voidReason: 'Deleted via API',
      },
    })

    // Void corresponding folio transactions (zero out amounts, mark in description)
    for (const txn of posting.folio.transactions) {
      await db.folioTransaction.update({
        where: { id: txn.id },
        data: {
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          description: `${txn.description} [VOIDED: Rate posting deleted]`,
        },
      })
    }

    // Recalculate folio balance
    await recalcFolioBalance(folioId)

    // Recalculate reservation totals
    await recalcReservationTotals(reservationId)

    const updatedFolio = await db.folio.findUnique({
      where: { id: folioId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({
      message: 'Rate posting voided successfully',
      voidedPosting: posting,
      folio: updatedFolio,
    })
  } catch (error) {
    console.error('Room Rate Posting DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to void rate posting' },
      { status: 500 },
    )
  }
}