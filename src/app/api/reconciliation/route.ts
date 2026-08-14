import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: List reconciliations with filters ─────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const accountId = searchParams.get('accountId')

    const data = await getOrSet(
      `reconciliation:list:${status || ''}:${accountId || ''}`,
      async () => {
        const where: Prisma.ReconciliationWhereInput = {}
        if (status) where.status = status
        if (accountId) where.accountId = accountId

        const reconciliations = await db.reconciliation.findMany({
          where,
          orderBy: [{ statementDate: 'desc' }],
          take: 200,
        })

        // Include account info for each reconciliation
        const enriched = await Promise.all(
          reconciliations.map(async (r) => {
            const account = r.accountId
              ? await db.ledgerAccount.findUnique({
                  where: { id: r.accountId },
                  select: { id: true, code: true, name: true, type: true, subtype: true },
                })
              : null
            return {
              ...r,
              account,
            }
          }),
        )

        // Summary stats
        const total = enriched.length
        const pending = enriched.filter((r) => r.status === 'pending').length
        const reconciled = enriched.filter((r) => r.status === 'reconciled').length
        const discrepancy = enriched.filter((r) => r.status === 'discrepancy').length

        // Total discrepancies amount
        const totalDiscrepancy = enriched
          .filter((r) => r.status === 'discrepancy')
          .reduce((sum, r) => sum + Math.abs(r.difference), 0)

        return {
          reconciliations: enriched,
          stats: {
            total,
            pending,
            reconciled,
            discrepancy,
            totalDiscrepancy: Math.round(totalDiscrepancy * 100) / 100,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Reconciliation API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch reconciliations', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create reconciliation ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { accountId, bankName, statementDate, statementBalance, notes } = body

    if (!accountId || statementBalance === undefined) {
      return cachedError('Missing required fields: accountId, statementBalance', 400)
    }

    // Verify account exists
    const account = await db.ledgerAccount.findUnique({
      where: { id: accountId },
    })
    if (!account) {
      return cachedError('Account not found', 404)
    }

    // Calculate book balance from journal lines for this account
    const bookBalance = await computeBookBalance(accountId)

    const stmtBal = parseFloat(statementBalance)
    const difference = Math.round((stmtBal - bookBalance) * 100) / 100

    // Auto-determine status
    let status: 'pending' | 'reconciled' | 'discrepancy' = 'pending'
    if (Math.abs(difference) < 0.01) {
      status = 'reconciled'
    }
    // If difference is non-zero, keep as pending (user can mark complete or discrepancy later)

    const record = await db.reconciliation.create({
      data: {
        accountId,
        accountName: account.name,
        accountCode: account.code,
        bankName: bankName || account.name,
        statementDate: statementDate ? new Date(statementDate) : new Date(),
        statementBalance: stmtBal,
        bookBalance: Math.round(bookBalance * 100) / 100,
        difference,
        status,
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('reconciliation:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Reconciliation API POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create reconciliation', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update reconciliation (complete / add adjustments) ──────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, action, adjustments, notes, bankName, statementBalance } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    const existing = await db.reconciliation.findUnique({ where: { id } })
    if (!existing) {
      return cachedError('Reconciliation not found', 404)
    }

    if (existing.status === 'reconciled') {
      return cachedError('This reconciliation is already completed. Create a new one.', 400)
    }

    const data: Prisma.ReconciliationUpdateInput = {}
    if (notes !== undefined) data.notes = notes || null
    if (bankName !== undefined) data.bankName = bankName || null

    // Handle action: complete
    if (action === 'complete') {
      // Recalculate book balance
      const bookBalance = await computeBookBalance(existing.accountId)
      data.bookBalance = Math.round(bookBalance * 100) / 100

      const stmtBal = statementBalance !== undefined
        ? parseFloat(statementBalance)
        : existing.statementBalance
      data.statementBalance = stmtBal

      const difference = Math.round((stmtBal - bookBalance) * 100) / 100
      data.difference = difference

      if (Math.abs(difference) < 0.01) {
        data.status = 'reconciled'
      } else {
        data.status = 'discrepancy'
      }

      const reconciledBy = auth && 'name' in auth ? (auth as { name?: string }).name : null
      data.reconciledBy = reconciledBy
      data.reconciledAt = new Date()
    }

    // Handle adjustments array
    if (adjustments && Array.isArray(adjustments)) {
      // Validate adjustment structure
      const validAdjustments = adjustments.filter(
        (adj: Record<string, unknown>) =>
          adj.description && typeof adj.description === 'string' &&
          adj.amount !== undefined,
      )

      if (validAdjustments.length > 0) {
        data.adjustments = JSON.stringify(validAdjustments)

        // Recalculate difference after adjustments
        const adjTotal = validAdjustments.reduce(
          (sum: number, adj: { amount: number | string }) => sum + parseFloat(String(adj.amount)),
          0,
        )

        const currentStmtBal = statementBalance !== undefined
          ? parseFloat(statementBalance)
          : existing.statementBalance
        const bookBal = await computeBookBalance(existing.accountId)

        // Adjusted book balance = book balance + adjustment total
        const adjustedBookBal = bookBal + adjTotal
        const difference = Math.round((currentStmtBal - adjustedBookBal) * 100) / 100

        data.bookBalance = Math.round(bookBal * 100) / 100
        data.difference = difference

        if (Math.abs(difference) < 0.01 && action === 'complete') {
          data.status = 'reconciled'
        } else if (action === 'complete') {
          data.status = 'discrepancy'
        }
      }
    }

    // If no action specified but statementBalance changed, recalculate
    if (statementBalance !== undefined && action !== 'complete') {
      const stmtBal = parseFloat(statementBalance)
      const bookBal = await computeBookBalance(existing.accountId)
      data.statementBalance = stmtBal
      data.bookBalance = Math.round(bookBal * 100) / 100
      data.difference = Math.round((stmtBal - bookBal) * 100) / 100
    }

    const record = await db.reconciliation.update({
      where: { id },
      data,
    })

    afterMutation('accounting')
    broadcastEvent('reconciliation:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Reconciliation API PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update reconciliation', 500, msg.substring(0, 300))
  }
}

// ─── Helper: Compute book balance from journal lines ───────────────────
async function computeBookBalance(accountId: string): Promise<number> {
  try {
    const account = await db.ledgerAccount.findUnique({
      where: { id: accountId },
      select: { code: true, type: true },
    })

    const result = await db.journalEntryLine.aggregate({
      where: {
        accountId,
        entry: { status: 'posted' },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    })

    const totalDebit = result._sum.debit || 0
    const totalCredit = result._sum.credit || 0
    const code = account?.code || ''
    const isDebitNature = code.startsWith('1') || code.startsWith('5')

    if (isDebitNature) {
      return totalDebit - totalCredit
    } else {
      return totalCredit - totalDebit
    }
  } catch (err) {
    console.error('Error computing book balance:', err)
    return 0
  }
}
