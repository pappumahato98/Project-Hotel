import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: Retrieve a single transaction or payment by ID ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    // Try finding as a transaction first
    const transaction = await db.folioTransaction.findUnique({
      where: { id },
      include: {
        folio: {
          include: {
            reservation: {
              select: {
                id: true,
                confirmationNo: true,
                room: { select: { number: true } },
              },
            },
          },
        },
      },
    })

    if (transaction) {
      return NextResponse.json({
        id: transaction.id,
        type: 'charge',
        transactionType: transaction.transactionType,
        description: transaction.description,
        amount: transaction.amount,
        taxAmount: transaction.taxAmount,
        totalAmount: transaction.totalAmount,
        quantity: transaction.quantity,
        reference: transaction.reference,
        outlet: transaction.outlet,
        postedBy: transaction.postedBy,
        reservationId: transaction.folio.reservation.id,
        confirmationNo: transaction.folio.reservation.confirmationNo,
        roomNumber: transaction.folio.reservation.room?.number ?? null,
        folioId: transaction.folioId,
        createdAt: transaction.createdAt.toISOString(),
      })
    }

    // Try finding as a payment
    const payment = await db.folioPayment.findUnique({
      where: { id },
      include: {
        folio: {
          include: {
            reservation: {
              select: {
                id: true,
                confirmationNo: true,
                room: { select: { number: true } },
              },
            },
          },
        },
      },
    })

    if (payment) {
      return NextResponse.json({
        id: payment.id,
        type: 'payment',
        paymentMethod: payment.paymentMethod,
        description: `${payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1).replace(/_/g, ' ')} payment`,
        amount: payment.amount,
        reference: payment.reference,
        cardType: payment.cardType,
        exchangeRate: payment.exchangeRate,
        foreignAmount: payment.foreignAmount,
        receivedBy: payment.receivedBy,
        status: payment.status,
        reservationId: payment.folio.reservation.id,
        confirmationNo: payment.folio.reservation.confirmationNo,
        roomNumber: payment.folio.reservation.room?.number ?? null,
        folioId: payment.folioId,
        createdAt: payment.createdAt.toISOString(),
      })
    }

    return NextResponse.json({ error: 'Transaction or payment not found' }, { status: 404 })
  } catch (error) {
    console.error('Guest Ledger GET by ID error:', error)
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 })
  }
}

// ─── DELETE: Void a transaction or payment (soft void) ────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    // Try finding as a transaction first
    const transaction = await db.folioTransaction.findUnique({
      where: { id },
    })

    if (transaction) {
      // Soft void: set amounts to 0, append [VOIDED] to description
      const updated = await db.folioTransaction.update({
        where: { id },
        data: {
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          description: `${transaction.description} [VOIDED]`,
        },
      })

      // Recalculate the folio balance
      const charges = await db.folioTransaction.findMany({
        where: { folioId: transaction.folioId },
        select: { totalAmount: true },
      })
      const payments = await db.folioPayment.findMany({
        where: { folioId: transaction.folioId },
        select: { amount: true },
      })

      const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
      const newBalance = Math.round((totalCharges - totalPayments) * 100) / 100

      await db.folio.update({
        where: { id: transaction.folioId },
        data: { balance: newBalance },
      })

      return NextResponse.json({
        voided: {
          id: updated.id,
          type: 'charge',
          description: updated.description,
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          folioId: transaction.folioId,
        },
        folioBalance: newBalance,
      })
    }

    // Try finding as a payment
    const payment = await db.folioPayment.findUnique({
      where: { id },
    })

    if (payment) {
      // Soft void: set amount to 0, append [VOIDED] to reference
      const updated = await db.folioPayment.update({
        where: { id },
        data: {
          amount: 0,
          reference: payment.reference
            ? `${payment.reference} [VOIDED]`
            : '[VOIDED]',
        },
      })

      // Recalculate the folio balance
      const charges = await db.folioTransaction.findMany({
        where: { folioId: payment.folioId },
        select: { totalAmount: true },
      })
      const payments = await db.folioPayment.findMany({
        where: { folioId: payment.folioId },
        select: { amount: true },
      })

      const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
      const newBalance = Math.round(Math.max(0, totalCharges - totalPayments) * 100) / 100

      await db.folio.update({
        where: { id: payment.folioId },
        data: { balance: newBalance },
      })

      return NextResponse.json({
        voided: {
          id: updated.id,
          type: 'payment',
          amount: 0,
          reference: updated.reference,
          folioId: payment.folioId,
        },
        folioBalance: newBalance,
      })
    }

    return NextResponse.json({ error: 'Transaction or payment not found' }, { status: 404 })
  } catch (error) {
    console.error('Guest Ledger DELETE (void) error:', error)
    return NextResponse.json({ error: 'Failed to void transaction' }, { status: 500 })
  }
}