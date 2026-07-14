import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

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
// PATCH /api/room-rate-posting/[id]
// Void a specific rate posting and its folio transactions
// ──────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { voidedBy, voidReason } = body as {
      voidedBy?: string
      voidReason?: string
    }

    if (!voidReason) {
      return NextResponse.json(
        { error: 'voidReason is required to void a rate posting' },
        { status: 400 },
      )
    }

    // Fetch the posting with its folio transactions
    const posting = await db.roomRatePosting.findUnique({
      where: { id },
      include: {
        reservation: { select: { id: true, confirmationNo: true } },
        folio: {
          select: {
            id: true,
            balance: true,
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
    const voider = voidedBy || 'System'

    // Void the rate posting
    const voidedPosting = await db.roomRatePosting.update({
      where: { id },
      data: {
        status: 'voided',
        voidedBy: voider,
        voidReason,
      },
    })

    // Void corresponding folio transactions
    // Zero out amounts and mark in description
    for (const txn of posting.folio.transactions) {
      await db.folioTransaction.update({
        where: { id: txn.id },
        data: {
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          description: `${txn.description} [VOIDED: ${voidReason}]`,
        },
      })
    }

    // Recalculate folio balance
    const newBalance = await recalcFolioBalance(folioId)

    // Recalculate reservation totals
    await recalcReservationTotals(reservationId)

    // Return updated posting and folio
    const updatedFolio = await db.folio.findUnique({
      where: { id: folioId },
      include: {
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            totalAmount: true,
            paidAmount: true,
            paymentStatus: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({
      message: 'Rate posting voided successfully',
      voidedPosting,
      folio: updatedFolio,
      voidedTransactions: posting.folio.transactions.length,
    })
  } catch (error) {
    console.error('Room Rate Posting PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to void rate posting' },
      { status: 500 },
    )
  }
}