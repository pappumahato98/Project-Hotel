import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface PnlLineItem {
  accountCode: string
  accountName: string
  amount: number
  department?: string | null
}

interface PnlSection {
  label: string
  lineItems: PnlLineItem[]
  total: number
}

interface ProfitLossReport {
  reportType: 'profit-loss'
  startDate: string
  endDate: string
  department?: string
  generatedAt: string
  revenue: {
    room: PnlSection
    fAndB: PnlSection
    events: PnlSection
    other: PnlSection
    totalRevenue: number
  }
  expenses: {
    salaries: PnlSection
    utilities: PnlSection
    fAndBCost: PnlSection
    marketing: PnlSection
    maintenance: PnlSection
    admin: PnlSection
    depreciation: PnlSection
    other: PnlSection
    totalExpenses: number
  }
  grossOperatingProfit: number
  netOperatingIncome: number
}

// ─── Revenue classification helpers ────────────────────────────
// Revenue accounts: balance = totalCredit - totalDebit (natural credit)
function classifyRevenue(
  code: string,
  name: string,
  balance: number,
  department: string | null,
): 'room' | 'fAndB' | 'events' | 'other' {
  const c = code.toLowerCase()
  const n = name.toLowerCase()

  // Room revenue: codes 4xxx starting with 40/41, or name contains room/lodging/accommodation
  if (c.startsWith('40') || c.startsWith('41') || n.includes('room') || n.includes('lodging') || n.includes('accommodation')) {
    return 'room'
  }
  // F&B revenue: codes 41xx-42xx, or name contains food/beverage/restaurant/bar/cafe
  if (c.startsWith('410') || c.startsWith('42') || n.includes('food') || n.includes('beverage') || n.includes('restaurant') || n.includes('bar ') || n.includes('cafe') || n.includes('f&b') || n.includes('fnb')) {
    return 'fAndB'
  }
  // Events/banquet: code 44xx, or name contains event/banquet/conference/meeting
  if (c.startsWith('44') || n.includes('event') || n.includes('banquet') || n.includes('conference') || n.includes('meeting')) {
    return 'events'
  }
  return 'other'
}

// ─── Expense classification helpers ────────────────────────────
// Expense accounts: balance = totalDebit - totalCredit (natural debit)
function classifyExpense(
  code: string,
  name: string,
  balance: number,
  department: string | null,
): 'salaries' | 'utilities' | 'fAndBCost' | 'marketing' | 'maintenance' | 'admin' | 'depreciation' | 'other' {
  const c = code.toLowerCase()
  const n = name.toLowerCase()

  // Salaries/payroll: code 50xx or 51xx, or name contains salary/wages/payroll/staff/labor
  if (c.startsWith('50') || c.startsWith('51') || n.includes('salary') || n.includes('wage') || n.includes('payroll') || n.includes('staff cost') || n.includes('labor') || n.includes('employee benefit') || n.includes('provident') || n.includes('insurance (staff)')) {
    return 'salaries'
  }
  // Utilities: code 52xx, or name contains electricity/water/gas/internet/phone/utility
  if (c.startsWith('52') || n.includes('electricity') || n.includes('water') || n.includes('gas') || n.includes('internet') || n.includes('telephone') || n.includes('utility') || n.includes('power')) {
    return 'utilities'
  }
  // F&B Cost of goods: code 53xx, or name contains cost of goods/cogs/kitchen/food cost/beverage cost
  if (c.startsWith('53') || n.includes('cost of goods') || n.includes('cogs') || n.includes('kitchen supply') || n.includes('food cost') || n.includes('beverage cost') || n.includes('f&b cost') || n.includes('fnb cost')) {
    return 'fAndBCost'
  }
  // Marketing: code 54xx, or name contains marketing/advertising/promotion/commission
  if (c.startsWith('54') || n.includes('marketing') || n.includes('advertis') || n.includes('promotion') || n.includes('commission') || n.includes('ota commission') || n.includes('travel agent')) {
    return 'marketing'
  }
  // Maintenance: code 55xx, or name contains maintenance/repair/supplies/housekeeping supply
  if (c.startsWith('55') || n.includes('maintenance') || n.includes('repair') || n.includes('housekeeping supply') || n.includes('laundry supply')) {
    return 'maintenance'
  }
  // Admin/general: code 56xx, or name contains admin/office/legal/professional/audit/accounting software
  if (c.startsWith('56') || n.includes('admin') || n.includes('office') || n.includes('legal') || n.includes('professional') || n.includes('audit') || n.includes('accounting') || n.includes('printing') || n.includes('stationery') || n.includes('bank charge') || n.includes('subscription')) {
    return 'admin'
  }
  // Depreciation: code 57xx, or name contains depreciation/amortization
  if (c.startsWith('57') || n.includes('depreciation') || n.includes('amortiz')) {
    return 'depreciation'
  }
  return 'other'
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department') || undefined

    if (!startDate || !endDate) {
      return cachedError('startDate and endDate query params are required', 400)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return cachedError('Invalid date format. Use YYYY-MM-DD.', 400)
    }
    if (start > end) {
      return cachedError('startDate must be before or equal to endDate', 400)
    }

    const cacheKey = `reports:profit-loss:${startDate}:${endDate}${department ? `:${department}` : ''}`
    const data = await getOrSet(cacheKey, async (): Promise<ProfitLossReport> => {
      // Fetch all posted journal entries in date range with lines and accounts
      const entries = await db.journalEntry.findMany({
        where: {
          status: 'posted',
          date: { gte: start, lte: end },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      })

      // Aggregate per account: debit/credit totals
      const accountMap = new Map<string, {
        code: string; name: string; type: string; department: string | null
        totalDebit: number; totalCredit: number
      }>()

      for (const entry of entries) {
        for (const line of entry.lines) {
          const acct = line.account
          if (!acct || !acct.active) continue
          // Skip if department filter and account department doesn't match
          if (department && acct.department && acct.department !== department) continue

          const existing = accountMap.get(acct.id)
          if (existing) {
            existing.totalDebit += line.debit
            existing.totalCredit += line.credit
          } else {
            accountMap.set(acct.id, {
              code: acct.code,
              name: acct.name,
              type: acct.type,
              department: acct.department,
              totalDebit: line.debit,
              totalCredit: line.credit,
            })
          }
        }
      }

      // Initialize P&L sections
      const revenueSections: Record<string, PnlSection> = {
        room: { label: 'Room Revenue', lineItems: [], total: 0 },
        fAndB: { label: 'Food & Beverage Revenue', lineItems: [], total: 0 },
        events: { label: 'Events & Banquet Revenue', lineItems: [], total: 0 },
        other: { label: 'Other Revenue', lineItems: [], total: 0 },
      }

      const expenseSections: Record<string, PnlSection> = {
        salaries: { label: 'Salaries & Wages', lineItems: [], total: 0 },
        utilities: { label: 'Utilities', lineItems: [], total: 0 },
        fAndBCost: { label: 'F&B Cost of Goods', lineItems: [], total: 0 },
        marketing: { label: 'Marketing & Commissions', lineItems: [], total: 0 },
        maintenance: { label: 'Maintenance & Repairs', lineItems: [], total: 0 },
        admin: { label: 'Administrative & General', lineItems: [], total: 0 },
        depreciation: { label: 'Depreciation & Amortization', lineItems: [], total: 0 },
        other: { label: 'Other Expenses', lineItems: [], total: 0 },
      }

      let totalRevenue = 0
      let totalExpenses = 0

      for (const [, acct] of accountMap) {
        const type = acct.type.toLowerCase()
        let balance = 0

        if (type === 'revenue') {
          // Revenue: balance = totalCredit - totalDebit
          balance = round2(acct.totalCredit - acct.totalDebit)
          if (Math.abs(balance) < 0.005) continue // Skip zero-balance accounts

          const section = classifyRevenue(acct.code, acct.name, balance, acct.department)
          revenueSections[section].lineItems.push({
            accountCode: acct.code,
            accountName: acct.name,
            amount: balance,
            department: acct.department,
          })
          revenueSections[section].total = round2(revenueSections[section].total + balance)
          totalRevenue = round2(totalRevenue + balance)
        } else if (type === 'expense') {
          // Expense: balance = totalDebit - totalCredit
          balance = round2(acct.totalDebit - acct.totalCredit)
          if (Math.abs(balance) < 0.005) continue

          const section = classifyExpense(acct.code, acct.name, balance, acct.department)
          expenseSections[section].lineItems.push({
            accountCode: acct.code,
            accountName: acct.name,
            amount: balance,
            department: acct.department,
          })
          expenseSections[section].total = round2(expenseSections[section].total + balance)
          totalExpenses = round2(totalExpenses + balance)
        }
      }

      const grossOperatingProfit = round2(totalRevenue - totalExpenses)
      // NOI = GOP - management fees (if any). For simplicity, NOI = GOP here.
      const netOperatingIncome = grossOperatingProfit

      return {
        reportType: 'profit-loss',
        startDate,
        endDate,
        department,
        generatedAt: new Date().toISOString(),
        revenue: {
          room: revenueSections.room,
          fAndB: revenueSections.fAndB,
          events: revenueSections.events,
          other: revenueSections.other,
          totalRevenue,
        },
        expenses: {
          salaries: expenseSections.salaries,
          utilities: expenseSections.utilities,
          fAndBCost: expenseSections.fAndBCost,
          marketing: expenseSections.marketing,
          maintenance: expenseSections.maintenance,
          admin: expenseSections.admin,
          depreciation: expenseSections.depreciation,
          other: expenseSections.other,
          totalExpenses,
        },
        grossOperatingProfit,
        netOperatingIncome,
      }
    }, 120_000) // Cache 2 minutes

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Profit & Loss API error:', error)
    return cachedError('Failed to generate P&L report', 500)
  }
}
