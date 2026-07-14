import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { fromFolioId, toFolioId, amount, description } = body

    if (!fromFolioId || !toFolioId || !amount) {
      return NextResponse.json(
        { error: 'fromFolioId, toFolioId, and amount are required' },
        { status: 400 },
      )
    }

    if (fromFolioId === toFolioId) {
      return NextResponse.json(
        { error: 'Source and target folios must be different' },
        { status: 400 },
      )
    }

    const splitAmount = Number(amount)
    if (isNaN(splitAmount) || splitAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 },
      )
    }

    // Fetch source folio
    const sourceFolio = await db.folio.findUnique({
      where: { id: fromFolioId },
      include: { reservation: true, guest: true },
    })

    if (!sourceFolio) {
      return NextResponse.json({ error: 'Source folio not found' }, { status: 404 })
    }

    // Fetch target folio
    const targetFolio = await db.folio.findUnique({
      where: { id: toFolioId },
      include: { reservation: true, guest: true },
    })

    if (!targetFolio) {
      return NextResponse.json({ error: 'Target folio not found' }, { status: 404 })
    }

    // Create a negative charge on source folio (reducing balance)
    await db.folioTransaction.create({
      data: {
        folioId: fromFolioId,
        transactionType: 'adjustment',
        description: description || `Split transfer to folio ${targetFolio.id.substring(0, 8)}`,
        amount: -splitAmount,
        taxAmount: 0,
        totalAmount: -splitAmount,
        quantity: 1,
        postedBy: 'Front Desk',
      },
    })

    // Create a positive charge on target folio (increasing balance)
    await db.folioTransaction.create({
      data: {
        folioId: toFolioId,
        transactionType: 'transfer',
        description: description || `Split transfer from folio ${sourceFolio.id.substring(0, 8)} (${sourceFolio.guest?.firstName} ${sourceFolio.guest?.lastName})`,
        amount: splitAmount,
        taxAmount: 0,
        totalAmount: splitAmount,
        quantity: 1,
        postedBy: 'Front Desk',
      },
    })

    // Recalculate source folio balance
    const sourceCharges = await db.folioTransaction.findMany({
      where: { folioId: fromFolioId },
      select: { totalAmount: true },
    })
    const sourcePayments = await db.folioPayment.findMany({
      where: { folioId: fromFolioId },
      select: { amount: true },
    })
    const sourceTotalCharges = sourceCharges.reduce((sum, c) => sum + c.totalAmount, 0)
    const sourceTotalPayments = sourcePayments.reduce((sum, p) => sum + p.amount, 0)
    await db.folio.update({
      where: { id: fromFolioId },
      data: { balance: sourceTotalCharges - sourceTotalPayments },
    })

    // Recalculate target folio balance
    const targetCharges = await db.folioTransaction.findMany({
      where: { folioId: toFolioId },
      select: { totalAmount: true },
    })
    const targetPayments = await db.folioPayment.findMany({
      where: { folioId: toFolioId },
      select: { amount: true },
    })
    const targetTotalCharges = targetCharges.reduce((sum, c) => sum + c.totalAmount, 0)
    const targetTotalPayments = targetPayments.reduce((sum, p) => sum + p.amount, 0)
    await db.folio.update({
      where: { id: toFolioId },
      data: { balance: targetTotalCharges - targetTotalPayments },
    })

    return NextResponse.json({
      message: 'Folio split completed',
      fromFolio: { id: fromFolioId, balance: sourceTotalCharges - sourceTotalPayments },
      toFolio: { id: toFolioId, balance: targetTotalCharges - targetTotalPayments },
      amount: splitAmount,
    })
  } catch (error) {
    console.error('Split folio error:', error)
    return NextResponse.json({ error: 'Failed to split folio' }, { status: 500 })
  }
}
