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
    else if (r.type === 'json') { try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value } }
    else map[r.key] = r.value
  }
  return map
}

// POST: Post a new charge or record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { type, ...data } = body // type: 'charge' or 'payment'

    const folio = await db.folio.findUnique({
      where: { id },
      include: {
        transactions: true,
        payments: true,
        reservation: { select: { creditLimit: true } },
      },
    })

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }

    // Read settings for tax rate
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13

    if (type === 'charge') {
      const { transactionType, description, amount, taxAmount, totalAmount, quantity, reference, outlet } = data

      // Auto-calculate tax if not explicitly provided
      const calculatedTax = (taxAmount != null && taxAmount !== undefined) ? taxAmount : amount * (taxRate / 100)
      const calculatedTotal = (totalAmount != null && totalAmount !== undefined) ? totalAmount : amount + calculatedTax

      await db.folioTransaction.create({
        data: {
          folioId: id,
          transactionType: transactionType || 'miscellaneous',
          description,
          amount,
          taxAmount: calculatedTax,
          totalAmount: calculatedTotal,
          quantity: quantity || 1,
          reference: reference || null,
          outlet: outlet || null,
          postedBy: 'System',
        },
      })

      // Recalculate balance
      const charges = await db.folioTransaction.findMany({
        where: { folioId: id },
        select: { totalAmount: true },
      })
      const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)

      const payments = await db.folioPayment.findMany({
        where: { folioId: id },
        select: { amount: true },
      })
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const newBalance = totalCharges - totalPayments
      await db.folio.update({
        where: { id },
        data: { balance: newBalance },
      })

    } else if (type === 'payment') {
      const { paymentMethod, amount, reference, cardType, receivedBy } = data

      await db.folioPayment.create({
        data: {
          folioId: id,
          paymentMethod,
          amount,
          reference: reference || null,
          cardType: cardType || null,
          receivedBy: receivedBy || 'System',
        },
      })

      // Recalculate balance
      const charges = await db.folioTransaction.findMany({
        where: { folioId: id },
        select: { totalAmount: true },
      })
      const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)

      const payments = await db.folioPayment.findMany({
        where: { folioId: id },
        select: { amount: true },
      })
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

      const newBalance = totalCharges - totalPayments
      await db.folio.update({
        where: { id },
        data: { balance: Math.max(0, newBalance) },
      })
    }

    // Return updated folio
    const updatedFolio = await db.folio.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, status: true, creditLimit: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({ folio: updatedFolio })
  } catch (error) {
    console.error('Folio transaction error:', error)
    return NextResponse.json({ error: 'Failed to post transaction' }, { status: 500 })
  }
}

// DELETE: Void a transaction or payment (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { type, transactionId, paymentId, reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required for void operations' }, { status: 400 })
    }

    const folio = await db.folio.findUnique({
      where: { id },
    })

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }

    if (type === 'void_transaction' && transactionId) {
      // Verify the transaction belongs to this folio
      const txn = await db.folioTransaction.findFirst({
        where: { id: transactionId, folioId: id },
      })

      if (!txn) {
        return NextResponse.json({ error: 'Transaction not found in this folio' }, { status: 404 })
      }

      // Soft-delete: set amounts to 0, append reason to description
      await db.folioTransaction.update({
        where: { id: transactionId },
        data: {
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          description: `${txn.description} [VOIDED: ${reason}]`,
        },
      })
    } else if (type === 'void_payment' && paymentId) {
      // Verify the payment belongs to this folio
      const pay = await db.folioPayment.findFirst({
        where: { id: paymentId, folioId: id },
      })

      if (!pay) {
        return NextResponse.json({ error: 'Payment not found in this folio' }, { status: 404 })
      }

      // Soft-delete: set amount to 0, append reason to reference
      await db.folioPayment.update({
        where: { id: paymentId },
        data: {
          amount: 0,
          reference: pay.reference ? `${pay.reference} [VOIDED: ${reason}]` : `[VOIDED: ${reason}]`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid void type. Provide type: void_transaction or void_payment' }, { status: 400 })
    }

    // Recalculate balance
    const charges = await db.folioTransaction.findMany({
      where: { folioId: id },
      select: { totalAmount: true },
    })
    const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)

    const payments = await db.folioPayment.findMany({
      where: { folioId: id },
      select: { amount: true },
    })
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

    const newBalance = totalCharges - totalPayments
    await db.folio.update({
      where: { id },
      data: { balance: newBalance },
    })

    // Return updated folio
    const updatedFolio = await db.folio.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, status: true, creditLimit: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({ folio: updatedFolio })
  } catch (error) {
    console.error('Folio void error:', error)
    return NextResponse.json({ error: 'Failed to void transaction' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    // Whitelist allowed fields to prevent unauthorized column manipulation
    const ALLOWED_FIELDS = ['status', 'notes', 'isComplimentary', 'isLocked']
    const updateData: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    const folio = await db.folio.update({
      where: { id },
      data: updateData,
      include: {
        reservation: true,
        guest: true,
        transactions: true,
        payments: true,
      },
    })

    return NextResponse.json({ folio })
  } catch (error) {
    console.error('Update folio error:', error)
    return NextResponse.json({ error: 'Failed to update folio' }, { status: 500 })
  }
}
