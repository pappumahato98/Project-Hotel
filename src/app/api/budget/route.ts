import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: Enhanced Budget List with Variance Analysis ──────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const fiscalYear = searchParams.get('fiscalYear')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const data = await getOrSet(
      `budget:list:${fiscalYear || ''}:${department || ''}:${status || ''}`,
      async () => {
        const where: Prisma.BudgetWhereInput = {}
        if (fiscalYear) where.fiscalYear = fiscalYear
        if (department) where.department = department
        if (status) where.status = status

        const budgets = await db.budget.findMany({
          where,
          orderBy: [
            { fiscalYear: 'desc' },
            { period: 'asc' },
            { createdAt: 'desc' },
          ],
          take: 500,
        })

        // Enrich each budget with variance analysis
        const enrichedBudgets = await Promise.all(
          budgets.map(async (b) => {
            // Compute actual from journal entry lines if account is linked
            let actualFromJournal = b.actualAmount
            if (b.accountId) {
              actualFromJournal = await computeActualFromJournal(b.accountId, b.period, b.fiscalYear)
            }

            const budgeted = b.budgetedAmount
            const actual = actualFromJournal
            const variance = actual - budgeted
            const variancePct = budgeted !== 0 ? (variance / Math.abs(budgeted)) * 100 : 0

            return {
              ...b,
              actualAmount: Math.round(actual * 100) / 100,
              variance: Math.round(variance * 100) / 100,
              variancePct: Math.round(variancePct * 100) / 100,
              isOverBudget: variance > 0 && (b.accountCode?.startsWith('4') || b.accountCode?.startsWith('5')),
              isUnderRevenue: variance < 0 && b.accountCode?.startsWith('4'),
            }
          }),
        )

        // Summary stats
        const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetedAmount, 0)
        const totalActual = enrichedBudgets.reduce((sum, b) => sum + b.actualAmount, 0)
        const totalVariance = enrichedBudgets.reduce((sum, b) => sum + b.variance, 0)

        // Group by department
        const byDepartment: Record<
          string,
          { budgeted: number; actual: number; variance: number; variancePct: number; count: number }
        > = {}
        for (const b of enrichedBudgets) {
          const dept = b.department || 'Unassigned'
          if (!byDepartment[dept]) {
            byDepartment[dept] = { budgeted: 0, actual: 0, variance: 0, variancePct: 0, count: 0 }
          }
          byDepartment[dept].budgeted += b.budgetedAmount
          byDepartment[dept].actual += b.actualAmount
          byDepartment[dept].variance += b.variance
          byDepartment[dept].count++
        }
        // Compute dept-level variance %
        for (const dept of Object.values(byDepartment)) {
          dept.variancePct =
            dept.budgeted !== 0 ? Math.round((dept.variance / Math.abs(dept.budgeted)) * 100 * 100) / 100 : 0
        }

        // Group by fiscal year
        const byFiscalYear: Record<
          string,
          { budgeted: number; actual: number; variance: number; count: number }
        > = {}
        for (const b of enrichedBudgets) {
          const fy = b.fiscalYear
          if (!byFiscalYear[fy]) {
            byFiscalYear[fy] = { budgeted: 0, actual: 0, variance: 0, count: 0 }
          }
          byFiscalYear[fy].budgeted += b.budgetedAmount
          byFiscalYear[fy].actual += b.actualAmount
          byFiscalYear[fy].variance += b.variance
          byFiscalYear[fy].count++
        }

        return {
          budgets: enrichedBudgets,
          stats: {
            totalBudgeted: Math.round(totalBudgeted * 100) / 100,
            totalActual: Math.round(totalActual * 100) / 100,
            totalVariance: Math.round(totalVariance * 100) / 100,
            totalVariancePct:
              totalBudgeted !== 0
                ? Math.round((totalVariance / Math.abs(totalBudgeted)) * 100 * 100) / 100
                : 0,
            byDepartment,
            byFiscalYear,
            totalBudgets: budgets.length,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Budget API GET error:', error)
    return cachedError('Failed to fetch budgets', 500)
  }
}

// ─── POST: Create Budget ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      name,
      fiscalYear,
      period,
      budgetedAmount,
      accountId,
      accountName,
      accountCode,
      department,
      notes,
    } = body

    if (!name || !fiscalYear || !period || budgetedAmount === undefined) {
      return cachedError('Missing required fields: name, fiscalYear, period, budgetedAmount', 400)
    }

    // Validate fiscalYear format (YYYY)
    if (!/^\d{4}$/.test(String(fiscalYear))) {
      return cachedError('fiscalYear must be a 4-digit year (e.g. 2025)', 400)
    }

    // Validate period format (YYYY-MM, YYYY-QN, YYYY-HN, or YYYY)
    const periodStr = String(period)
    const validPeriod =
      /^\d{4}$/.test(periodStr) || // full year
      /^\d{4}-\d{2}$/.test(periodStr) || // month
      /^\d{4}-Q[1-4]$/.test(periodStr) || // quarter
      /^\d{4}-H[1-2]$/.test(periodStr) // half-year
    if (!validPeriod) {
      return cachedError('period must be YYYY, YYYY-MM, YYYY-QN, or YYYY-HN format', 400)
    }

    // Validate amount
    const amt = parseFloat(budgetedAmount)
    if (isNaN(amt) || amt < 0) {
      return cachedError('budgetedAmount must be a non-negative number', 400)
    }

    const record = await db.budget.create({
      data: {
        name,
        fiscalYear: String(fiscalYear),
        period: periodStr,
        budgetedAmount: amt,
        accountId: accountId || null,
        accountName: accountName || null,
        accountCode: accountCode || null,
        department: department || null,
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('budget:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Budget API POST error:', error)
    return cachedError('Failed to create budget', 500)
  }
}

// ─── PATCH: Update Budget (including update_actuals action) ─────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      id,
      action,
      name,
      fiscalYear,
      period,
      budgetedAmount,
      actualAmount,
      accountId,
      accountName,
      accountCode,
      department,
      status,
      notes,
    } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    if (status && !['Active', 'Closed', 'Archived'].includes(status)) {
      return cachedError('Invalid status. Must be Active, Closed, or Archived', 400)
    }

    const existing = await db.budget.findUnique({ where: { id } })
    if (!existing) {
      return cachedError('Budget not found', 404)
    }

    // Handle update_actuals action
    if (action === 'update_actuals') {
      if (!existing.accountId) {
        return cachedError('Cannot update actuals: budget is not linked to an account', 400)
      }

      const actualFromJournal = await computeActualFromJournal(
        existing.accountId,
        existing.period,
        existing.fiscalYear,
      )

      const record = await db.budget.update({
        where: { id },
        data: { actualAmount: Math.round(actualFromJournal * 100) / 100 },
      })

      afterMutation('accounting')
      broadcastEvent('budget:updated', record)
      return NextResponse.json(record, { headers: clearCacheHeaders() })
    }

    // Regular update
    const data: Prisma.BudgetUpdateInput = {}
    if (name !== undefined) data.name = name
    if (fiscalYear !== undefined) {
      if (!/^\d{4}$/.test(String(fiscalYear))) {
        return cachedError('fiscalYear must be a 4-digit year', 400)
      }
      data.fiscalYear = String(fiscalYear)
    }
    if (period !== undefined) {
      const p = String(period)
      const validPeriod =
        /^\d{4}$/.test(p) || /^\d{4}-\d{2}$/.test(p) || /^\d{4}-Q[1-4]$/.test(p) || /^\d{4}-H[1-2]$/.test(p)
      if (!validPeriod) {
        return cachedError('period must be YYYY, YYYY-MM, YYYY-QN, or YYYY-HN', 400)
      }
      data.period = p
    }
    if (budgetedAmount !== undefined) {
      const amt = parseFloat(budgetedAmount)
      if (isNaN(amt) || amt < 0) {
        return cachedError('budgetedAmount must be non-negative', 400)
      }
      data.budgetedAmount = amt
    }
    if (actualAmount !== undefined) data.actualAmount = parseFloat(actualAmount)
    if (accountId !== undefined) data.accountId = accountId || null
    if (accountName !== undefined) data.accountName = accountName || null
    if (accountCode !== undefined) data.accountCode = accountCode || null
    if (department !== undefined) data.department = department || null
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes || null

    const record = await db.budget.update({
      where: { id },
      data,
    })

    afterMutation('accounting')
    broadcastEvent('budget:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Budget API PATCH error:', error)
    return cachedError('Failed to update budget', 500)
  }
}

// ─── Helper: Compute actual amount from journal entry lines ────────────
async function computeActualFromJournal(
  accountId: string,
  period: string,
  _fiscalYear: string,
): Promise<number> {
  try {
    // Parse period to get date range
    let startDate: Date
    let endDate: Date

    if (/^\d{4}-\d{2}$/.test(period)) {
      // Monthly: 2025-07
      const [year, month] = period.split('-').map(Number)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59, 999)
    } else if (/^\d{4}-Q([1-4])$/.test(period)) {
      // Quarterly: 2025-Q1
      const match = period.match(/^(\d{4})-Q([1-4])$/)
      if (match) {
        const year = parseInt(match[1])
        const quarter = parseInt(match[2])
        const startMonth = (quarter - 1) * 3
        startDate = new Date(year, startMonth, 1)
        endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
      } else {
        return 0
      }
    } else if (/^\d{4}$/.test(period)) {
      // Full year
      const year = parseInt(period)
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59, 999)
    } else if (/^\d{4}-H([1-2])$/.test(period)) {
      // Half-year: 2025-H1
      const match = period.match(/^(\d{4})-H([1-2])$/)
      if (match) {
        const year = parseInt(match[1])
        const half = parseInt(match[2])
        const startMonth = (half - 1) * 6
        startDate = new Date(year, startMonth, 1)
        endDate = new Date(year, startMonth + 6, 0, 23, 59, 59, 999)
      } else {
        return 0
      }
    } else {
      return 0
    }

    // Get the account to determine its type for balance calculation
    const account = await db.ledgerAccount.findUnique({ where: { id: accountId } })
    if (!account) return 0

    // Get account code for type determination
    const code = account.code || ''
    const isDebitNature = code.startsWith('1') || code.startsWith('5') // asset, expense

    // Sum posted journal lines for this account in the period
    const result = await db.journalEntryLine.aggregate({
      where: {
        accountId,
        entry: {
          status: 'posted',
          date: { gte: startDate, lte: endDate },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    })

    const totalDebit = result._sum.debit || 0
    const totalCredit = result._sum.credit || 0

    // For revenue/expense accounts, actual = activity (debit - credit for expense, credit - debit for revenue)
    if (isDebitNature) {
      return totalDebit - totalCredit
    } else {
      return totalCredit - totalDebit
    }
  } catch (err) {
    console.error('Error computing actual from journal:', err)
    return 0
  }
}
