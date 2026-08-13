import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { postPeriodCloseEntries } from '@/lib/accounting/auto-post'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── GET: List accounting periods with journal entry counts ────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const periodType = searchParams.get('periodType')

    const data = await getOrSet(
      `periods:list:${status || ''}:${periodType || ''}`,
      async () => {
        const where: Prisma.AccountingPeriodWhereInput = {}
        if (status) where.status = status
        if (periodType) where.periodType = periodType

        const periods = await db.accountingPeriod.findMany({
          where,
          orderBy: [{ startDate: 'desc' }],
          take: 200,
        })

        // For each period, count posted journal entries
        const enrichedPeriods = await Promise.all(
          periods.map(async (p) => {
            const jeCount = await db.journalEntry.count({
              where: {
                status: 'posted',
                date: { gte: p.startDate, lte: p.endDate },
              },
            })

            // Count draft entries too
            const draftCount = await db.journalEntry.count({
              where: {
                status: 'draft',
                date: { gte: p.startDate, lte: p.endDate },
              },
            })

            return {
              ...p,
              postedEntryCount: jeCount,
              draftEntryCount: draftCount,
            }
          }),
        )

        // Summary stats
        const openPeriods = enrichedPeriods.filter((p) => p.status === 'open')
        const closedPeriods = enrichedPeriods.filter((p) => p.status === 'closed')

        return {
          periods: enrichedPeriods,
          stats: {
            total: enrichedPeriods.length,
            open: openPeriods.length,
            closed: closedPeriods.length,
            latestOpenPeriod: openPeriods[0] || null,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Periods API GET error:', error)
    return cachedError('Failed to fetch periods', 500)
  }
}

// ─── POST: Create/open a new accounting period ──────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { period, periodType, startDate, endDate, notes } = body

    if (!period || !periodType || !startDate || !endDate) {
      return cachedError('Missing required fields: period, periodType, startDate, endDate', 400)
    }

    if (!['month', 'quarter', 'year'].includes(periodType)) {
      return cachedError('periodType must be month, quarter, or year', 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      return cachedError('endDate must be after startDate', 400)
    }

    // Check for overlapping open periods
    const overlapping = await db.accountingPeriod.findFirst({
      where: {
        status: 'open',
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    })

    if (overlapping) {
      return cachedError(`Overlaps with existing open period: ${overlapping.period} (${overlapping.startDate.toISOString().slice(0, 10)} to ${overlapping.endDate.toISOString().slice(0, 10)})`, 409)
    }

    // Check uniqueness of period identifier
    const existingPeriod = await db.accountingPeriod.findUnique({ where: { period } })
    if (existingPeriod) {
      return cachedError(`Period "${period}" already exists`, 409)
    }

    const record = await db.accountingPeriod.create({
      data: {
        period,
        periodType,
        startDate: start,
        endDate: end,
        status: 'open',
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('period:opened', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Periods API POST error:', error)
    return cachedError('Failed to create period', 500)
  }
}

// ─── PATCH: Close a period ──────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, action, notes } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    if (action === 'close') {
      const period = await db.accountingPeriod.findUnique({ where: { id } })
      if (!period) {
        return cachedError('Period not found', 404)
      }

      if (period.status === 'closed') {
        return cachedError('Period is already closed', 400)
      }

      // Verify trial balance is balanced
      const trialBalance = await computeTrialBalance(period.startDate, period.endDate)

      if (!trialBalance.isBalanced) {
        return cachedError(
          'Cannot close period: trial balance is not balanced',
          400,
          `Debit: ${trialBalance.totalDebit}, Credit: ${trialBalance.totalCredit}, Diff: ${trialBalance.difference}`,
        )
      }

      const closedBy = auth && 'name' in auth ? (auth as { name?: string }).name : null

      const record = await db.accountingPeriod.update({
        where: { id },
        data: {
          status: 'closed',
          closedBy,
          closedAt: new Date(),
          openingTrialBalance: JSON.stringify(trialBalance.accounts),
          notes: notes || period.notes,
        },
      })

      // If closing a year, also close all sub-periods (months/quarters)
      if (period.periodType === 'year') {
        const subPeriods = await db.accountingPeriod.findMany({
          where: {
            status: 'open',
            startDate: { gte: period.startDate, lte: period.endDate },
            periodType: { in: ['month', 'quarter'] },
          },
        })

        if (subPeriods.length > 0) {
          await db.accountingPeriod.updateMany({
            where: { id: { in: subPeriods.map((sp) => sp.id) } },
            data: {
              status: 'closed',
              closedBy,
              closedAt: new Date(),
            },
          })
        }
      }

      afterMutation('accounting')
      broadcastEvent('period:closed', record)

      // Auto-post income/expense closing entries to Retained Earnings
      const closedByName = `${auth.user.firstName} ${auth.user.lastName}`
      postPeriodCloseEntries({
        periodId: id,
        period: period.period,
        startDate: period.startDate,
        endDate: period.endDate,
        closedBy: closedByName,
      }).catch(() => {})

      return NextResponse.json({
        period: record,
        trialBalance,
        subPeriodsClosed: period.periodType === 'year' ? 'all open sub-periods' : null,
      }, { headers: clearCacheHeaders() })
    }

    // Regular update
    const data: Prisma.AccountingPeriodUpdateInput = {}
    if (notes !== undefined) data.notes = notes || null

    const record = await db.accountingPeriod.update({
      where: { id },
      data,
    })

    afterMutation('accounting')
    broadcastEvent('period:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Periods API PATCH error:', error)
    return cachedError('Failed to update period', 500)
  }
}

// ─── Helper: Compute trial balance for a date range ────────────────────
async function computeTrialBalance(
  startDate: Date,
  endDate: Date,
): Promise<{
  isBalanced: boolean
  totalDebit: number
  totalCredit: number
  difference: number
  accounts: Array<{
    accountId: string
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    netBalance: number
  }>
}> {
  // Get all posted journal lines in the period, grouped by account
  const lines = await db.journalEntryLine.findMany({
    where: {
      entry: {
        status: 'posted',
        date: { gte: startDate, lte: endDate },
      },
    },
    include: {
      account: {
        select: { id: true, code: true, name: true, type: true },
      },
    },
  })

  // Aggregate by account
  const accountMap: Record<
    string,
    { accountId: string; accountCode: string; accountName: string; accountType: string; debit: number; credit: number }
  > = {}

  for (const line of lines) {
    const key = line.accountId
    if (!accountMap[key]) {
      accountMap[key] = {
        accountId: line.account.id,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        debit: 0,
        credit: 0,
      }
    }
    accountMap[key].debit += line.debit
    accountMap[key].credit += line.credit
  }

  const accounts = Object.values(accountMap).map((a) => {
    const code = a.accountCode || ''
    const isDebitNature = code.startsWith('1') || code.startsWith('5')
    const netBalance = isDebitNature ? a.debit - a.credit : a.credit - a.debit
    return {
      ...a,
      debit: Math.round(a.debit * 100) / 100,
      credit: Math.round(a.credit * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
    }
  })

  const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0)
  const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0)
  const difference = Math.abs(totalDebit - totalCredit)

  return {
    isBalanced: difference < 0.01,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    accounts,
  }
}
