import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'

// ─── Default tax rate ────────────────────────────────────
const DEFAULT_TAX_RATE = NEPAL_VAT_RATE

// ─── GET: Aggregate guest ledger across all folios ───────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!guestId) {
      return cachedError('guestId is required', 400)
    }

    // Fetch the guest
    const guest = await db.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nationality: true,
        address: true,
        city: true,
        country: true,
      },
    })

    if (!guest) {
      return cachedError('Guest not found', 404)
    }

    // Fetch all folios for this guest with transactions, payments, reservation & room
    const folios = await withRetry(() => db.folio.findMany({
      where: { guestId },
      include: {
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            checkIn: true,
            checkOut: true,
            roomRate: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            room: { select: { number: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }))

    // ─── Build stays array ────────────────────────────────
    const stays = folios.map((folio) => {
      const folioCharges = folio.transactions.reduce((sum, t) => sum + t.totalAmount, 0)
      const folioPayments = folio.payments.reduce((sum, p) => sum + p.amount, 0)

      return {
        reservationId: folio.reservation.id,
        confirmationNo: folio.reservation.confirmationNo,
        roomNumber: folio.reservation.room?.number ?? null,
        checkInDate: folio.reservation.checkIn.toISOString(),
        checkOutDate: folio.reservation.checkOut.toISOString(),
        status: folio.reservation.status,
        folioId: folio.id,
        folioStatus: folio.status,
        folioBalance: folio.balance,
        totalCharges: folioCharges,
        totalPayments: folioPayments,
      }
    })

    // ─── Build transactions array (combined charges + payments) ──
    let allTransactions: Array<{
      id: string
      type: 'charge' | 'payment'
      transactionType?: string
      paymentMethod?: string
      description: string
      amount: number
      taxAmount: number
      totalAmount: number
      reference: string | null
      cardType: string | null
      reservationId: string
      confirmationNo: string
      roomNumber: string | null
      folioId: string
      createdAt: string
    }> = []

    for (const folio of folios) {
      for (const txn of folio.transactions) {
        allTransactions.push({
          id: txn.id,
          type: 'charge',
          transactionType: txn.transactionType,
          paymentMethod: undefined,
          description: txn.description,
          amount: txn.amount,
          taxAmount: txn.taxAmount,
          totalAmount: txn.totalAmount,
          reference: txn.reference,
          cardType: null,
          reservationId: folio.reservation.id,
          confirmationNo: folio.reservation.confirmationNo,
          roomNumber: folio.reservation.room?.number ?? null,
          folioId: folio.id,
          createdAt: txn.createdAt.toISOString(),
        })
      }

      for (const pay of folio.payments) {
        allTransactions.push({
          id: pay.id,
          type: 'payment',
          transactionType: undefined,
          paymentMethod: pay.paymentMethod,
          description: `${pay.paymentMethod.charAt(0).toUpperCase() + pay.paymentMethod.slice(1).replace(/_/g, ' ')} payment`,
          amount: pay.amount,
          taxAmount: 0,
          totalAmount: pay.amount,
          reference: pay.reference,
          cardType: pay.cardType,
          reservationId: folio.reservation.id,
          confirmationNo: folio.reservation.confirmationNo,
          roomNumber: folio.reservation.room?.number ?? null,
          folioId: folio.id,
          createdAt: pay.createdAt.toISOString(),
        })
      }
    }

    // Apply date filtering if provided
    if (from || to) {
      const fromDate = from ? new Date(from) : null
      const toDate = to ? new Date(to) : null

      allTransactions = allTransactions.filter((txn) => {
        const txnDate = new Date(txn.createdAt)
        if (fromDate && txnDate < fromDate) return false
        if (toDate) {
          const endOfDay = new Date(toDate)
          endOfDay.setHours(23, 59, 59, 999)
          if (txnDate > endOfDay) return false
        }
        return true
      })
    }

    // Sort newest first
    allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // ─── Compute summary ──────────────────────────────────
    const totalCharges = folios.reduce(
      (sum, f) => sum + f.transactions.reduce((s, t) => s + t.totalAmount, 0),
      0,
    )
    const totalPayments = folios.reduce(
      (sum, f) => sum + f.payments.reduce((s, p) => s + p.amount, 0),
      0,
    )
    const outstandingBalance = totalCharges - totalPayments
    const openFolios = folios.filter((f) => f.status === 'open').length
    const totalStays = folios.length

    // ─── Compute aging ────────────────────────────────────
    const now = new Date()
    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }

    for (const folio of folios) {
      const folioCloseDate = folio.updatedAt
      const daysDiff = Math.floor((now.getTime() - folioCloseDate.getTime()) / (1000 * 60 * 60 * 24))

      // Only age folios that have a positive balance
      const balance = folio.balance
      if (balance <= 0) continue

      if (folio.status === 'open' || daysDiff <= 30) {
        aging.current += balance
      } else if (daysDiff <= 60) {
        aging.days30 += balance
      } else if (daysDiff <= 90) {
        aging.days60 += balance
      } else if (daysDiff <= 180) {
        aging.days90 += balance
      } else {
        aging.over90 += balance
      }
    }

    // Round all monetary values
    const round = (n: number) => Math.round(n * 100) / 100

    return cachedJson({
      guest,
      summary: {
        totalStays,
        openFolios,
        totalCharges: round(totalCharges),
        totalPayments: round(totalPayments),
        outstandingBalance: round(outstandingBalance),
        aging: {
          current: round(aging.current),
          days30: round(aging.days30),
          days60: round(aging.days60),
          days90: round(aging.days90),
          over90: round(aging.over90),
        },
      },
      stays,
      transactions: allTransactions,
    }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Guest Ledger API error:', error)
    return cachedError('Failed to fetch guest ledger', 500)
  }
}

// ─── POST: Post a charge or payment to a guest's open folio ─
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { folioId, type, transactionType, description, amount, paymentMethod, reference, cardType } = body

    if (!folioId || !type || !amount) {
      return cachedError('folioId, type, and amount are required', 400)
    }

    if (!['charge', 'payment'].includes(type)) {
      return cachedError('type must be "charge" or "payment"', 400)
    }

    if (type === 'charge' && !description) {
      return cachedError('description is required for charges', 400)
    }

    if (type === 'payment' && !paymentMethod) {
      return cachedError('paymentMethod is required for payments', 400)
    }

    // Find the folio and validate it's open
    const folio = await db.folio.findUnique({
      where: { id: folioId },
    })

    if (!folio) {
      return cachedError('Folio not found', 404)
    }

    if (folio.status !== 'open') {
      return cachedError(`Cannot post to a ${folio.status} folio. Folio must be open.`, 400)
    }

    if (type === 'charge') {
      const taxAmount = amount * (DEFAULT_TAX_RATE / 100)
      const totalAmount = amount + taxAmount

      const result = await withRetry(async () => {
        const transaction = await db.folioTransaction.create({
          data: {
            folioId,
            transactionType: transactionType || 'miscellaneous',
            description,
            amount,
            taxAmount,
            totalAmount,
            quantity: 1,
            reference: reference || null,
            outlet: null,
            postedBy: 'System',
          },
        })

        // Recalculate folio balance
        const [charges, payments] = await Promise.all([
          db.folioTransaction.findMany({ where: { folioId }, select: { totalAmount: true } }),
          db.folioPayment.findMany({ where: { folioId }, select: { amount: true } }),
        ])

        const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
        const newBalance = Math.round((totalCharges - totalPayments) * 100) / 100

        await db.folio.update({
          where: { id: folioId },
          data: { balance: newBalance },
        })

        return { transaction, newBalance }
      })

      afterMutation('folio')

      return NextResponse.json({
        transaction: {
          id: result.transaction.id,
          type: 'charge',
          transactionType: result.transaction.transactionType,
          description: result.transaction.description,
          amount: result.transaction.amount,
          taxAmount: result.transaction.taxAmount,
          totalAmount: result.transaction.totalAmount,
          folioId,
          createdAt: result.transaction.createdAt.toISOString(),
        },
        folioBalance: result.newBalance,
      }, { headers: clearCacheHeaders() })
    }

    // type === 'payment'
    const result = await withRetry(async () => {
      const payment = await db.folioPayment.create({
        data: {
          folioId,
          paymentMethod,
          amount,
          reference: reference || null,
          cardType: cardType || null,
          receivedBy: 'System',
        },
      })

      // Recalculate folio balance
      const [charges, payments] = await Promise.all([
        db.folioTransaction.findMany({ where: { folioId }, select: { totalAmount: true } }),
        db.folioPayment.findMany({ where: { folioId }, select: { amount: true } }),
      ])

      const totalCharges = charges.reduce((sum, c) => sum + c.totalAmount, 0)
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
      const newBalance = Math.round(Math.max(0, totalCharges - totalPayments) * 100) / 100

      await db.folio.update({
        where: { id: folioId },
        data: { balance: newBalance },
      })

      return { payment, newBalance }
    })

    afterMutation('folio')

    return NextResponse.json({
      payment: {
        id: result.payment.id,
        type: 'payment',
        paymentMethod: result.payment.paymentMethod,
        description: `${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace(/_/g, ' ')} payment`,
        amount: result.payment.amount,
        reference: result.payment.reference,
        cardType: result.payment.cardType,
        folioId,
        createdAt: result.payment.createdAt.toISOString(),
      },
      folioBalance: result.newBalance,
    }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Guest Ledger POST error:', error)
    return cachedError('Failed to post transaction', 500)
  }
}