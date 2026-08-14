import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface PaymentMethodSummary {
  method: string
  count: number
  total: number
}

interface OutstandingFolio {
  folioId: string
  guestName: string
  roomNumber?: string
  balance: number
  status: string
  reservationId: string
}

interface RoomStatusSummary {
  total: number
  occupied: number
  vacant: number
  outOfOrder: number
  occupancyRate: number
}

interface NightAuditSummary {
  reportType: 'night-audit'
  date: string
  generatedAt: string
  revenue: {
    roomRevenue: number
    roomTransactions: number
    fAndBRevenue: number
    fAndBOrders: number
    totalRevenue: number
  }
  payments: {
    totalPayments: number
    totalPaymentCount: number
    byMethod: PaymentMethodSummary[]
  }
  folios: {
    openFolioCount: number
    outstandingBalance: number
    outstandingFolios: OutstandingFolio[]
  }
  accountsReceivable: {
    totalAR: number
  }
  cashOnHand: {
    cashAccountBalance: number
  }
  roomStatus: RoomStatusSummary
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── GET Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return cachedError('date query param is required (YYYY-MM-DD)', 400)
    }

    const dayStart = new Date(dateStr)
    if (isNaN(dayStart.getTime())) {
      return cachedError('Invalid date format. Use YYYY-MM-DD.', 400)
    }
    const dayEnd = new Date(dateStr)
    dayEnd.setHours(23, 59, 59, 999)

    const cacheKey = `reports:night-audit:${dateStr}`
    const data = await getOrSet(cacheKey, async (): Promise<NightAuditSummary> => {
      // Run independent queries in parallel
      const [
        roomTxnResult,
        fbOrders,
        payments,
        openFolios,
        arAccounts,
        cashAccounts,
        allRooms,
      ] = await Promise.all([
        // 1. Room revenue from FolioTransactions (type=room) for the date
        db.folioTransaction.aggregate({
          where: {
            transactionType: 'room',
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          _count: true,
          _sum: { totalAmount: true },
        }),
        // 2. F&B revenue from PosOrders for the date (closed/served orders)
        db.posOrder.aggregate({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            status: { in: ['closed', 'served'] },
          },
          _count: true,
          _sum: { totalAmount: true },
        }),
        // 3. Payments from FolioPayments for the date
        db.folioPayment.findMany({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            status: 'completed',
          },
          select: { paymentMethod: true, amount: true },
        }),
        // 4. Outstanding folios (open, with balance > 0)
        db.folio.findMany({
          where: { status: 'open' },
          include: {
            guest: { select: { firstName: true, lastName: true } },
            reservation: {
              select: {
                id: true,
                room: { select: { number: true } },
              },
            },
          },
        }),
        // 5. AR accounts
        db.ledgerAccount.findMany({
          where: { code: { startsWith: '12' }, active: true },
          select: { id: true },
        }),
        // 6. Cash accounts
        db.ledgerAccount.findMany({
          where: { code: { startsWith: '100' }, active: true },
          select: { id: true },
        }),
        // 7. All rooms for occupancy
        db.room.findMany({
          select: { status: true },
        }),
      ])

      // ── Revenue ──
      const roomRevenue = round2(roomTxnResult._sum.totalAmount ?? 0)
      const roomTransactions = roomTxnResult._count
      const fAndBRevenue = round2(fbOrders._sum.totalAmount ?? 0)
      const fAndBOrders = fbOrders._count

      // ── Payments ──
      const paymentMethodMap = new Map<string, { count: number; total: number }>()
      let totalPayments = 0
      for (const p of payments) {
        totalPayments = round2(totalPayments + p.amount)
        const existing = paymentMethodMap.get(p.paymentMethod)
        if (existing) {
          existing.count++
          existing.total = round2(existing.total + p.amount)
        } else {
          paymentMethodMap.set(p.paymentMethod, { count: 1, total: p.amount })
        }
      }
      const byMethod: PaymentMethodSummary[] = [...paymentMethodMap.entries()].map(([method, v]) => ({
        method,
        count: v.count,
        total: v.total,
      }))

      // ── Outstanding folios ──
      // Batch-fetch all transactions and payments for open folios
      const openFolioIds = openFolios.map(f => f.id)
      let outstandingBalance = 0
      const outstandingFolios: OutstandingFolio[] = []

      if (openFolioIds.length > 0) {
        const [folioTxns, folioPays] = await Promise.all([
          db.folioTransaction.groupBy({
            by: ['folioId'],
            where: { folioId: { in: openFolioIds } },
            _sum: { totalAmount: true },
          }),
          db.folioPayment.groupBy({
            by: ['folioId'],
            where: { folioId: { in: openFolioIds } },
            _sum: { amount: true },
          }),
        ])

        const txnMap = new Map(folioTxns.map(t => [t.folioId, t._sum.totalAmount ?? 0]))
        const payMap = new Map(folioPays.map(p => [p.folioId, p._sum.amount ?? 0]))

        for (const f of openFolios) {
          const charges = txnMap.get(f.id) ?? 0
          const paid = payMap.get(f.id) ?? 0
          const balance = round2(charges - paid)
          if (balance > 0) {
            outstandingBalance = round2(outstandingBalance + balance)
            outstandingFolios.push({
              folioId: f.id,
              guestName: `${f.guest.firstName} ${f.guest.lastName}`,
              roomNumber: f.reservation?.room?.number || undefined,
              balance,
              status: f.status,
              reservationId: f.reservationId,
            })
          }
        }
      }

      // ── Total AR (accounts with code starting '12') ──
      let totalAR = 0
      const arAccountIds = arAccounts.map(a => a.id)
      if (arAccountIds.length > 0) {
        const arLines = await db.journalEntryLine.findMany({
          where: {
            accountId: { in: arAccountIds },
            entry: { status: 'posted' },
          },
          select: { debit: true, credit: true },
        })
        totalAR = round2(
          arLines.reduce((s, l) => s + l.debit, 0) -
          arLines.reduce((s, l) => s + l.credit, 0),
        )
      }

      // ── Cash on hand ──
      let cashAccountBalance = 0
      const cashAccountIds = cashAccounts.map(a => a.id)
      if (cashAccountIds.length > 0) {
        const cashLines = await db.journalEntryLine.findMany({
          where: {
            accountId: { in: cashAccountIds },
            entry: { status: 'posted' },
          },
          select: { debit: true, credit: true },
        })
        cashAccountBalance = round2(
          cashLines.reduce((s, l) => s + l.debit, 0) -
          cashLines.reduce((s, l) => s + l.credit, 0),
        )
      }

      // ── Room status summary ──
      const totalRooms = allRooms.length
      const occupied = allRooms.filter(r => r.status === 'occupied').length
      const vacant = allRooms.filter(r => ['vacant_clean', 'vacant_dirty'].includes(r.status)).length
      const outOfOrder = allRooms.filter(r => r.status === 'out_of_order' || r.status === 'out_of_inventory').length
      const occupancyRate = totalRooms > 0 ? round2((occupied / totalRooms) * 100) : 0

      return {
        reportType: 'night-audit',
        date: dateStr,
        generatedAt: new Date().toISOString(),
        revenue: {
          roomRevenue,
          roomTransactions,
          fAndBRevenue,
          fAndBOrders,
          totalRevenue: round2(roomRevenue + fAndBRevenue),
        },
        payments: {
          totalPayments,
          totalPaymentCount: payments.length,
          byMethod,
        },
        folios: {
          openFolioCount: openFolios.length,
          outstandingBalance,
          outstandingFolios,
        },
        accountsReceivable: { totalAR },
        cashOnHand: { cashAccountBalance },
        roomStatus: {
          total: totalRooms,
          occupied,
          vacant,
          outOfOrder,
          occupancyRate,
        },
      }
    }, 60_000)

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    console.error('Night Audit Report API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to generate night audit summary', 500, msg.substring(0, 300))
  }
}
