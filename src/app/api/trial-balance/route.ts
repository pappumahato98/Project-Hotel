import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface TrialBalanceAccount {
  accountId: string
  accountCode: string
  accountName: string
  type: string
  subtype: string | null
  department: string | null
  debitTotal: number
  creditTotal: number
  netBalance: number
  balanceNature: 'debit' | 'credit' | 'zero'
}

interface TrialBalanceSection {
  type: string
  label: string
  accounts: TrialBalanceAccount[]
  totalDebit: number
  totalCredit: number
  totalNetBalance: number
}

interface TrialBalanceReport {
  reportType: 'trial-balance'
  generatedAt: string
  dateRange: {
    startDate: string | null
    endDate: string | null
  }
  sections: TrialBalanceSection[]
  accounts: TrialBalanceAccount[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  balanceDifference: number
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const ACCOUNT_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── GET Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Parse dates if provided
    let start: Date | undefined
    let end: Date | undefined

    if (startDate) {
      start = new Date(startDate)
      if (isNaN(start.getTime())) {
        return cachedError('Invalid startDate format. Use YYYY-MM-DD.', 400)
      }
    }
    if (endDate) {
      end = new Date(endDate)
      if (isNaN(end.getTime())) {
        return cachedError('Invalid endDate format. Use YYYY-MM-DD.', 400)
      }
      end.setHours(23, 59, 59, 999)
    }

    const cacheKey = `trial-balance:report:${startDate || 'all'}:${endDate || 'all'}`
    const data = await getOrSet(cacheKey, async (): Promise<TrialBalanceReport> => {
      // Build where clause for journal entries
      const entryWhere: Record<string, unknown> = { status: 'posted' }
      if (start || end) {
        const dateFilter: Record<string, unknown> = {}
        if (start) dateFilter.gte = start
        if (end) dateFilter.lte = end
        entryWhere.date = dateFilter
      }

      // Fetch all active ledger accounts with their journal lines
      const accounts = await db.ledgerAccount.findMany({
        where: { active: true },
        include: {
          journalLines: {
            include: {
              entry: {
                select: { status: true, date: true },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      })

      const trialAccounts: TrialBalanceAccount[] = []
      const sectionMap = new Map<string, TrialBalanceSection>()

      // Initialize sections
      for (const type of ACCOUNT_TYPE_ORDER) {
        sectionMap.set(type, {
          type,
          label: ACCOUNT_TYPE_LABELS[type] || type,
          accounts: [],
          totalDebit: 0,
          totalCredit: 0,
          totalNetBalance: 0,
        })
      }

      for (const account of accounts) {
        // Only include posted journal entries in date range
        const postedLines = account.journalLines.filter((line) => {
          if (line.entry.status !== 'posted') return false
          if (start && line.entry.date < start) return false
          if (end && line.entry.date > end) return false
          return true
        })

        const debitTotal = round2(postedLines.reduce((sum, line) => sum + line.debit, 0))
        const creditTotal = round2(postedLines.reduce((sum, line) => sum + line.credit, 0))

        // Compute net balance based on account type
        let netBalance = 0
        const type = account.type.toLowerCase()
        if (type === 'asset' || type === 'expense') {
          netBalance = round2(debitTotal - creditTotal)
        } else if (type === 'liability' || type === 'equity' || type === 'revenue') {
          netBalance = round2(creditTotal - debitTotal)
        }

        // Determine balance nature
        let balanceNature: 'debit' | 'credit' | 'zero' = 'zero'
        if (Math.abs(netBalance) >= 0.005) {
          balanceNature = netBalance > 0 ? 'debit' : 'credit'
          // Revenue, liability, equity: positive means credit nature
          if (['liability', 'equity', 'revenue'].includes(type)) {
            balanceNature = netBalance > 0 ? 'credit' : 'debit'
          }
        }

        const tbAccount: TrialBalanceAccount = {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          type: account.type,
          subtype: account.subtype,
          department: account.department,
          debitTotal,
          creditTotal,
          netBalance: Math.abs(round2(netBalance)),
          balanceNature,
        }

        // Skip zero-balance accounts
        if (debitTotal === 0 && creditTotal === 0) continue

        trialAccounts.push(tbAccount)

        // Add to section
        const section = sectionMap.get(type)
        if (section) {
          section.accounts.push(tbAccount)
          section.totalDebit = round2(section.totalDebit + debitTotal)
          section.totalCredit = round2(section.totalCredit + creditTotal)
          section.totalNetBalance = round2(section.totalNetBalance + Math.abs(round2(netBalance)))
        }
      }

      const totalDebit = round2(trialAccounts.reduce((sum, a) => sum + a.debitTotal, 0))
      const totalCredit = round2(trialAccounts.reduce((sum, a) => sum + a.creditTotal, 0))
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
      const balanceDifference = round2(totalDebit - totalCredit)

      // Build sections in order, only include those with accounts
      const sections = ACCOUNT_TYPE_ORDER
        .map(t => sectionMap.get(t)!)
        .filter(s => s.accounts.length > 0)

      return {
        reportType: 'trial-balance',
        generatedAt: new Date().toISOString(),
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        sections,
        accounts: trialAccounts,
        totalDebit,
        totalCredit,
        isBalanced,
        balanceDifference,
      }
    }, 120_000) // Cache for 2 minutes

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Trial Balance API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to generate trial balance', 500, msg.substring(0, 300))
  }
}
