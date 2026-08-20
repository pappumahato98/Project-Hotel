import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getSettingsMap, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { NEPAL_VAT_RATE, formatDateShort } from '@/lib/nepal-standards'

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
// POST /api/room-rate-posting/bulk-post
// Posts pending charges for one or more reservations
// Body: { reservationIds: string[] } or { postAll: true }
// ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { reservationIds, postAll, postedBy } = body as {
      reservationIds?: string[]
      postAll?: boolean
      postedBy?: string
    }

    // Determine which reservations to process
    let targetIds: string[] = []

    if (postAll) {
      const inHouse = await db.reservation.findMany({
        where: { status: 'checked_in' },
        select: { id: true },
      })
      targetIds = inHouse.map((r) => r.id)
    } else if (reservationIds && reservationIds.length > 0) {
      targetIds = reservationIds
    } else {
      return NextResponse.json(
        { error: 'Provide reservationIds or postAll: true' },
        { status: 400 },
      )
    }

    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? NEPAL_VAT_RATE
    const serviceChargeRate = (s.serviceCharge as number) ?? 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = toDateOnly(today)
    const poster = postedBy || 'System'

    const results = []

    for (const reservationId of targetIds) {
      try {
        const reservation = await db.reservation.findUnique({
          where: { id: reservationId },
          include: {
            room: { select: { id: true, number: true } },
            folios: { select: { id: true, guestId: true } },
          },
        })

        if (!reservation || !reservation.room || reservation.folios.length === 0) {
          results.push({ reservationId, status: 'skipped', reason: 'No room or folio' })
          continue
        }

        const folioId = reservation.folios[0].id
        const roomId = reservation.room.id
        const roomNumber = reservation.room.number
        const roomRate = reservation.roomRate

        // Calculate all expected nights
        const checkIn = new Date(reservation.checkIn)
        checkIn.setHours(0, 0, 0, 0)
        const checkOut = new Date(reservation.checkOut)
        checkOut.setHours(0, 0, 0, 0)

        // Get existing posted dates
        const existingPostings = await db.roomRatePosting.findMany({
          where: { reservationId, status: 'posted' },
          select: { postingDate: true },
        })
        const existingDateSet = new Set(
          existingPostings.map((p) => toDateOnly(new Date(p.postingDate))),
        )

        // Find pending dates (not posted and not future)
        const pendingDates: Date[] = []
        let current = new Date(checkIn)
        while (current < checkOut) {
          const dateStr = toDateOnly(current)
          if (!existingDateSet.has(dateStr) && dateStr <= todayStr) {
            pendingDates.push(new Date(current))
          }
          current = addDays(current, 1)
        }

        if (pendingDates.length === 0) {
          results.push({ reservationId, status: 'skipped', reason: 'No pending nights', posted: 0 })
          continue
        }

        // Create postings
        let posted = 0
        for (const postingDate of pendingDates) {
          const taxAmount = roomRate * (taxRate / 100)
          const serviceCharge = roomRate * (serviceChargeRate / 100)
          const totalAmount = roomRate + taxAmount + serviceCharge
          const dateStr = formatDateShort(postingDate)

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

          posted++
        }

        await recalcFolioBalance(folioId)
        await recalcReservationTotals(reservationId)

        results.push({
          reservationId,
          confirmationNo: reservation.confirmationNo,
          room: roomNumber,
          status: 'success',
          posted,
          amount: posted * roomRate,
        })
      } catch (err) {
        results.push({
          reservationId,
          status: 'error',
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length
    const totalPosted = results.reduce((sum, r) => r.status === 'success' ? sum + (r as { posted: number }).posted : sum, 0)

    return NextResponse.json({
      message: `Bulk post complete: ${successCount} reservations, ${totalPosted} nights`,
      results,
      summary: {
        totalRequested: targetIds.length,
        successCount,
        skippedCount: results.filter((r) => r.status === 'skipped').length,
        errorCount: results.filter((r) => r.status === 'error').length,
        totalPostedNights: totalPosted,
      },
    })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Room Rate Posting bulk POST error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk post room charges' },
      { status: 500 },
    )
  }
}