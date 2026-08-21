import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

function getDateRange(period: string): { start: Date; end: Date } | null {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'this-month': {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'last-month': {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'this-quarter': {
      const quarterStart = Math.floor(month / 3) * 3
      const start = new Date(year, quarterStart, 1)
      const end = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'this-year': {
      const start = new Date(year, 0, 1)
      const end = new Date(year, 11, 31, 23, 59, 59, 999)
      return { start, end }
    }
    case 'all-time':
      return null
    default:
      return null
  }
}

function classifyAccount(code: string, type: string): 'operating' | 'investing' | 'financing' {
  const numCode = parseInt(code, 10)

  // Operating: revenue (4xxx) + expense (5xxx) + current assets (1xxx < 1500) + current liabilities (2xxx < 2500)
  if (type === 'revenue' || type === 'expense') return 'operating'
  if (type === 'asset' && numCode < 1500) return 'operating'
  if (type === 'liability' && numCode < 2500) return 'operating'

  // Investing: non-current assets (code >= 1500)
  if (type === 'asset' && numCode >= 1500) return 'investing'

  // Financing: non-current liabilities (code >= 2500) + equity
  if ((type === 'liability' && numCode >= 2500) || type === 'equity') return 'financing'

  // Default to operating for anything else
  return 'operating'
}

interface CashFlowItem {
  accountName: string
  amount: number
  type: 'inflow' | 'outflow'
}

interface CashFlowCategory {
  inflows: number
  outflows: number
  net: number
  items: CashFlowItem[]
}

function buildCategory(items: CashFlowItem[]): CashFlowCategory {
  const inflows = items.filter((i) => i.type === 'inflow').reduce((sum, i) => sum + i.amount, 0)
  const outflows = items.filter((i) => i.type === 'outflow').reduce((sum, i) => sum + i.amount, 0)
  return {
    inflows: Math.round(inflows * 100) / 100,
    outflows: Math.round(outflows * 100) / 100,
    net: Math.round((inflows - outflows) * 100) / 100,
    items: items.map((i) => ({ ...i, amount: Math.round(i.amount * 100) / 100 })),
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'this-month'

    const data = await getOrSet(`cash-flow:report:${period}`, async () => {
      const dateRange = getDateRange(period)

      // Fetch posted journal entries with lines and accounts
      const entries = await db.journalEntry.findMany({
        where: {
          status: 'posted',
          ...(dateRange
            ? {
                date: {
                  gte: dateRange.start,
                  lte: dateRange.end,
                },
              }
            : {}),
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      })

      const operatingItems: CashFlowItem[] = []
      const investingItems: CashFlowItem[] = []
      const financingItems: CashFlowItem[] = []

      for (const entry of entries) {
        for (const line of entry.lines) {
          const category = classifyAccount(line.account.code, line.account.type)
          const amount = Math.abs(line.debit - line.credit)
          if (amount === 0) continue

          const item: CashFlowItem = {
            accountName: line.account.name,
            amount,
            type: amount > 0 ? 'inflow' : 'outflow',
          }

          // Determine inflow/outflow:
          const isDebit = line.debit > line.credit
          const accountType = line.account.type.toLowerCase()
          // Asset (debit=increase=cash in) vs others (credit=increase=cash in)
          if (accountType === 'asset') {
            item.type = isDebit ? 'inflow' : 'outflow'
          } else {
            item.type = isDebit ? 'outflow' : 'inflow'
          }

          const targetArray =
            category === 'operating'
              ? operatingItems
              : category === 'investing'
                ? investingItems
                : financingItems

          // Merge into existing item if same account name and type
          const existing = targetArray.find(
            (i) => i.accountName === item.accountName && i.type === item.type,
          )
          if (existing) {
            existing.amount += item.amount
          } else {
            targetArray.push(item)
          }
        }
      }

      const operating = buildCategory(operatingItems)
      const investing = buildCategory(investingItems)
      const financing = buildCategory(financingItems)

      const netCashFlow = operating.net + investing.net + financing.net

      // Calculate beginning cash balance (aggregate ALL cash/bank accounts before period start)
      let beginningCash = 0
      if (dateRange) {
        const cashAccounts = await db.ledgerAccount.findMany({
          where: {
            code: { startsWith: '1' },
            active: true,
            subtype: { in: ['cash', 'bank'] },
          },
          include: {
            journalLines: {
              include: { entry: { select: { status: true, date: true } } },
            },
          },
        })

        // Fallback: if no accounts with cash/bank subtype, use all asset accounts starting with 1
        const accountsToSum = cashAccounts.length > 0
          ? cashAccounts
          : await db.ledgerAccount.findMany({
              where: { code: { startsWith: '1' }, active: true },
              include: {
                journalLines: {
                  include: { entry: { select: { status: true, date: true } } },
                },
              },
            })

        for (const acct of accountsToSum) {
          const priorLines = acct.journalLines.filter(
            (line) => line.entry.status === 'posted' && line.entry.date < dateRange.start,
          )
          const priorDebit = priorLines.reduce((sum, l) => sum + l.debit, 0)
          const priorCredit = priorLines.reduce((sum, l) => sum + l.credit, 0)
          beginningCash += priorDebit - priorCredit
        }
      }

      const endingCash = beginningCash + netCashFlow

      return {
        period,
        generatedAt: new Date().toISOString(),
        operating,
        investing,
        financing,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        beginningCash: Math.round(beginningCash * 100) / 100,
        endingCash: Math.round(endingCash * 100) / 100,
      }
    }, 120000) // Cache for 120s

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Cash Flow API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to generate cash flow report', 500, msg.substring(0, 300))
  }
}
