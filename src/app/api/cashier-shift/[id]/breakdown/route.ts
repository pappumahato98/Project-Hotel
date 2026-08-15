import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError } from '@/lib/api-response'
import { db } from '@/lib/db'

// Payment method labels for display
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card Pay',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  city_ledger: 'City Ledger',
  voucher: 'Voucher',
  gift_card: 'Gift Card',
  foreign_currency: 'Foreign Currency',
}

// Card type labels
const CARD_TYPE_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'MasterCard',
  amex: 'American Express',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    // Get the shift to know the time window
    const shift = await db.cashierShift.findUnique({ where: { id } })
    if (!shift) return cachedError('Shift not found', 404)

    const startDate = shift.startDate
    const endDate = shift.endDate ?? new Date()

    // Fetch all payments in this shift's time window
    const payments = await db.folioPayment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        paymentMethod: true,
        amount: true,
        cardType: true,
        reference: true,
      },
    })

    // Fetch all transactions in this shift's time window
    const transactions = await db.folioTransaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        transactionType: true,
        amount: true,
        totalAmount: true,
        description: true,
        outlet: true,
      },
    })

    // ── Build payment breakdown ──────────────────────────────

    // Cash
    const cashPayments = payments.filter((p) => p.paymentMethod === 'cash')
    const cashTotal = cashPayments.reduce((s, p) => s + p.amount, 0)

    // Cheque
    const chequePayments = payments.filter((p) => p.paymentMethod === 'cheque')
    const chequeTotal = chequePayments.reduce((s, p) => s + p.amount, 0)

    // Bank Transfer - group by reference (bank name)
    const bankPayments = payments.filter((p) => p.paymentMethod === 'bank_transfer')
    const bankMap = new Map<string, { count: number; amount: number }>()
    for (const p of bankPayments) {
      const bankName = p.reference || 'Other Bank'
      const existing = bankMap.get(bankName) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += p.amount
      bankMap.set(bankName, existing)
    }
    const bankTotal = bankPayments.reduce((s, p) => s + p.amount, 0)

    // Wallet - group by reference (wallet name)
    const walletPayments = payments.filter((p) =>
      ['voucher', 'gift_card'].includes(p.paymentMethod)
    )
    const walletMap = new Map<string, { count: number; amount: number }>()
    for (const p of walletPayments) {
      const walletName = p.reference || METHOD_LABELS[p.paymentMethod] || p.paymentMethod
      const existing = walletMap.get(walletName) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += p.amount
      walletMap.set(walletName, existing)
    }
    const walletTotal = walletPayments.reduce((s, p) => s + p.amount, 0)

    // Card Pay - group by cardType (bank/network)
    const cardPayments = payments.filter((p) => p.paymentMethod === 'card')
    const cardMap = new Map<string, { count: number; amount: number }>()
    for (const p of cardPayments) {
      const cardName = CARD_TYPE_LABELS[p.cardType || ''] || p.cardType || 'Other Card'
      const existing = cardMap.get(cardName) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += p.amount
      cardMap.set(cardName, existing)
    }
    const cardTotal = cardPayments.reduce((s, p) => s + p.amount, 0)

    // Others (city_ledger, foreign_currency)
    const otherMethods = new Set(['cash', 'card', 'bank_transfer', 'cheque', 'voucher', 'gift_card'])
    const otherPayments = payments.filter((p) => !otherMethods.has(p.paymentMethod))
    const otherMap = new Map<string, { count: number; amount: number }>()
    for (const p of otherPayments) {
      const label = METHOD_LABELS[p.paymentMethod] || p.paymentMethod
      const existing = otherMap.get(label) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += p.amount
      otherMap.set(label, existing)
    }
    const otherTotal = otherPayments.reduce((s, p) => s + p.amount, 0)

    // Transaction breakdown by type
    const txnTypeMap = new Map<string, { count: number; amount: number; total: number }>()
    for (const t of transactions) {
      const existing = txnTypeMap.get(t.transactionType) ?? { count: 0, amount: 0, total: 0 }
      existing.count += 1
      existing.amount += t.amount
      existing.total += t.totalAmount
      txnTypeMap.set(t.transactionType, existing)
    }

    const breakdown = {
      cash: { count: cashPayments.length, amount: cashTotal },
      cheque: { count: chequePayments.length, amount: chequeTotal },
      bank: {
        total: bankTotal,
        count: bankPayments.length,
        details: Array.from(bankMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
        })),
      },
      wallet: {
        total: walletTotal,
        count: walletPayments.length,
        details: Array.from(walletMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
        })),
      },
      card: {
        total: cardTotal,
        count: cardPayments.length,
        details: Array.from(cardMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
        })),
      },
      others: {
        total: otherTotal,
        count: otherPayments.length,
        details: Array.from(otherMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
        })),
      },
      transactions: Array.from(txnTypeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        amount: data.amount,
        total: data.total,
      })),
      grandTotal: payments.reduce((s, p) => s + p.amount, 0),
      totalTxnCount: transactions.length,
      totalPayCount: payments.length,
    }

    return cachedJson({ breakdown }, request, { tier: 'short' })
  } catch (error) {
    console.error('Cashier breakdown error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch breakdown', 500, msg.substring(0, 300))
  }
}
