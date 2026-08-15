import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getSettingsMap, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { postRoomRevenue, postFolioCharge, postFolioSettlement } from '@/lib/accounting/auto-post'
import { cachedError, cachedJson, clearCacheHeaders } from '@/lib/api-response'

// GET: Fetch a single folio with full transaction & payment history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const folio = await db.folio.findUnique({
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

    if (!folio) {
      return cachedError('Folio not found', 404)
    }

    return cachedJson({ folio }, request, { tier: 'short' })
  } catch (error) {
    console.error('Folio detail error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch folio', 500, msg.substring(0, 300))
  }
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
        reservation: { select: { creditLimit: true, id: true } },
        guest: { select: { firstName: true, lastName: true } },
      },
    })

    if (!folio) {
      return cachedError('Folio not found', 404)
    }

    // Read settings for tax rate
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13

    // Wrap sequential DB writes in withRetry for transient error resilience
    const updatedFolio = await withRetry(async () => {
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
        const [charges, payments] = await Promise.all([
          db.folioTransaction.findMany({ where: { folioId: id }, select: { totalAmount: true } }),
          db.folioPayment.findMany({ where: { folioId: id }, select: { amount: true } }),
        ])
        const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

        const newBalance = totalCharges - totalPayments
        await db.folio.update({
          where: { id },
          data: { balance: newBalance },
        })

        afterMutation('folio')

        // Auto-post journal entry (fire-and-forget)
        const guestName = `${folio.guest?.firstName || ''} ${folio.guest?.lastName || ''}`.trim() || 'Guest'
        const postedBy = `${auth.user.firstName} ${auth.user.lastName}`
        if (transactionType === 'room') {
          postRoomRevenue({ folioId: id, reservationId: folio.reservationId, guestName, amount, taxAmount: calculatedTax, description, postedBy }).catch(() => {})
        } else {
          postFolioCharge({ folioId: id, guestName, transactionType, amount, taxAmount: calculatedTax, description, outlet, postedBy }).catch(() => {})
        }

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
        const [charges, payments] = await Promise.all([
          db.folioTransaction.findMany({ where: { folioId: id }, select: { totalAmount: true } }),
          db.folioPayment.findMany({ where: { folioId: id }, select: { amount: true } }),
        ])
        const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

        const newBalance = totalCharges - totalPayments
        await db.folio.update({
          where: { id },
          data: { balance: Math.max(0, newBalance) },
        })

        afterMutation('folio')

        // Auto-post folio settlement (fire-and-forget)
        const guestName = `${folio.guest?.firstName || ''} ${folio.guest?.lastName || ''}`.trim() || 'Guest'
        const postedBy = `${auth.user.firstName} ${auth.user.lastName}`
        postFolioSettlement({ folioId: id, guestName, paymentMethod, amount, postedBy }).catch(() => {})
      }

      // Return updated folio
      return db.folio.findUnique({
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
    })

    return NextResponse.json({ folio: updatedFolio }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Folio transaction error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to post transaction', 500, msg.substring(0, 300))
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
      return cachedError('Reason is required for void operations', 400)
    }

    const folio = await db.folio.findUnique({
      where: { id },
    })

    if (!folio) {
      return cachedError('Folio not found', 404)
    }

    if (type === 'void_transaction' && transactionId) {
      // Verify the transaction belongs to this folio
      const txn = await db.folioTransaction.findFirst({
        where: { id: transactionId, folioId: id },
      })

      if (!txn) {
        return cachedError('Transaction not found in this folio', 404)
      }

      // Wrap writes in withRetry for transient error resilience
      const updatedFolio = await withRetry(async () => {
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

        // Recalculate balance
        const [charges, payments] = await Promise.all([
          db.folioTransaction.findMany({ where: { folioId: id }, select: { totalAmount: true } }),
          db.folioPayment.findMany({ where: { folioId: id }, select: { amount: true } }),
        ])
        const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

        const newBalance = totalCharges - totalPayments
        await db.folio.update({
          where: { id },
          data: { balance: newBalance },
        })

        return db.folio.findUnique({
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
      })

      return NextResponse.json({ folio: updatedFolio }, { headers: clearCacheHeaders() })
    } else if (type === 'void_payment' && paymentId) {
      // Verify the payment belongs to this folio
      const pay = await db.folioPayment.findFirst({
        where: { id: paymentId, folioId: id },
      })

      if (!pay) {
        return cachedError('Payment not found in this folio', 404)
      }

      // Wrap writes in withRetry for transient error resilience
      const updatedFolio = await withRetry(async () => {
        // Soft-delete: set amount to 0, append reason to reference
        await db.folioPayment.update({
          where: { id: paymentId },
          data: {
            amount: 0,
            reference: pay.reference ? `${pay.reference} [VOIDED: ${reason}]` : `[VOIDED: ${reason}]`,
          },
        })

        // Recalculate balance
        const [charges, payments] = await Promise.all([
          db.folioTransaction.findMany({ where: { folioId: id }, select: { totalAmount: true } }),
          db.folioPayment.findMany({ where: { folioId: id }, select: { amount: true } }),
        ])
        const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

        const newBalance = totalCharges - totalPayments
        await db.folio.update({
          where: { id },
          data: { balance: newBalance },
        })

        return db.folio.findUnique({
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
      })

      return NextResponse.json({ folio: updatedFolio }, { headers: clearCacheHeaders() })
    } else {
      return cachedError('Invalid void type. Provide type: void_transaction or void_payment', 400)
    }
  } catch (error) {
    console.error('Folio void error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to void transaction', 500, msg.substring(0, 300))
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
    const ALLOWED_FIELDS = ['status', 'folioType']
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

    afterMutation('folio')

    return NextResponse.json({ folio }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Update folio error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update folio', 500, msg.substring(0, 300))
  }
}
