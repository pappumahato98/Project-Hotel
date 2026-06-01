import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Post a new charge or record a payment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (type === 'charge') {
      const { transactionType, description, amount, taxAmount, totalAmount, quantity, reference, outlet } = data

      await db.folioTransaction.create({
        data: {
          folioId: id,
          transactionType: transactionType || 'miscellaneous',
          description,
          amount,
          taxAmount: taxAmount || 0,
          totalAmount: totalAmount || amount,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const folio = await db.folio.update({
      where: { id },
      data: body,
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
