import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface BalanceSheetLine {
  accountCode: string
  accountName: string
  amount: number
}

interface BalanceSheetGroup {
  label: string
  lineItems: BalanceSheetLine[]
  total: number
}

interface BalanceSheetReport {
  reportType: 'balance-sheet'
  asOfDate: string
  generatedAt: string
  assets: {
    current: {
      label: string
      groups: BalanceSheetGroup[]
      total: number
    }
    nonCurrent: {
      label: string
      groups: BalanceSheetGroup[]
      total: number
    }
    total: number
  }
  liabilities: {
    current: {
      label: string
      groups: BalanceSheetGroup[]
      total: number
    }
    nonCurrent: {
      label: string
      groups: BalanceSheetGroup[]
      total: number
    }
    total: number
  }
  equity: {
    label: string
    lineItems: BalanceSheetLine[]
    total: number
  }
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
  balanceDifference: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Asset classification ──────────────────────────────────────
type AssetSubGroup = 'cash' | 'bank' | 'receivables' | 'inventory' | 'prepayments' | 'fixedAssets' | 'equipment' | 'furniture' | 'depreciation' | 'other'

type AssetGroupDef = { key: AssetSubGroup; label: string; codePrefixes: string[]; keywords: string[] }

const ASSET_CURRENT_DEFS: AssetGroupDef[] = [
  { key: 'cash', label: 'Cash on Hand', codePrefixes: ['100'], keywords: ['cash', 'petty cash', 'cash box', 'cashier'] },
  { key: 'bank', label: 'Bank Accounts', codePrefixes: ['110'], keywords: ['bank', 'saving', 'current account', 'chequing'] },
  { key: 'receivables', label: 'Accounts Receivable', codePrefixes: ['120', '121', '122', '123', '130', '131'], keywords: ['receivable', 'city ledger', 'credit card', 'ota receivable', 'travel agent'] },
  { key: 'inventory', label: 'Inventory', codePrefixes: ['140', '141', '142', '143', '144'], keywords: ['inventory', 'stock', 'food inventory', 'beverage inventory', 'supply'] },
  { key: 'prepayments', label: 'Prepayments & Other Current', codePrefixes: ['150', '151', '152', '153'], keywords: ['prepay', 'prepaid', 'advance', 'deposit', 'accrued revenue'] },
]

const ASSET_NONCURRENT_DEFS: AssetGroupDef[] = [
  { key: 'fixedAssets', label: 'Fixed Assets', codePrefixes: ['160', '161', '162', '163'], keywords: ['land', 'building', 'property', 'leasehold', 'improvement'] },
  { key: 'equipment', label: 'Equipment', codePrefixes: ['170', '171', '172', '173'], keywords: ['equipment', 'machinery', 'vehicle', 'kitchen equipment', 'laundry equipment'] },
  { key: 'furniture', label: 'Furniture & Fixtures', codePrefixes: ['180', '181', '182'], keywords: ['furniture', 'fixture', 'furnishing', 'ff&e', 'interior'] },
  { key: 'depreciation', label: 'Accumulated Depreciation', codePrefixes: ['190', '191', '192', '193'], keywords: ['depreciation', 'accumulated dep'] },
]

function classifyAsset(code: string, name: string): { group: AssetSubGroup; isCurrent: boolean } {
  const c = code.toLowerCase()
  const n = name.toLowerCase()

  for (const g of ASSET_CURRENT_DEFS) {
    if (g.codePrefixes.some(p => c.startsWith(p)) || g.keywords.some(kw => n.includes(kw))) {
      return { group: g.key, isCurrent: true }
    }
  }
  for (const g of ASSET_NONCURRENT_DEFS) {
    if (g.codePrefixes.some(p => c.startsWith(p)) || g.keywords.some(kw => n.includes(kw))) {
      return { group: g.key, isCurrent: false }
    }
  }
  const numCode = parseInt(code, 10)
  if (!isNaN(numCode) && numCode >= 1600) return { group: 'other', isCurrent: false }
  return { group: 'other', isCurrent: true }
}

// ─── Liability classification ──────────────────────────────────
type LiabilitySubGroup = 'payables' | 'taxPayable' | 'advances' | 'accrued' | 'longTermLoans' | 'other'

type LiabilityGroupDef = { key: LiabilitySubGroup; label: string; codePrefixes: string[]; keywords: string[] }

const LIABILITY_CURRENT_DEFS: LiabilityGroupDef[] = [
  { key: 'payables', label: 'Accounts Payable', codePrefixes: ['200', '201', '202', '203'], keywords: ['payable', 'vendor', 'supplier', 'creditor'] },
  { key: 'taxPayable', label: 'Tax Payable', codePrefixes: ['210', '211', '212', '213'], keywords: ['tax payable', 'vat payable', 'gst payable', 'income tax', 'tds', 'withholding'] },
  { key: 'advances', label: 'Guest Deposits & Advances', codePrefixes: ['220', '221', '222'], keywords: ['advance', 'deposit', 'unearned', 'deferred revenue', 'guest deposit'] },
  { key: 'accrued', label: 'Accrued Expenses', codePrefixes: ['230', '231', '232', '233'], keywords: ['accrued', 'salary payable', 'wage payable', 'leave payable', 'gratuity'] },
]

const LIABILITY_NONCURRENT_DEFS: LiabilityGroupDef[] = [
  { key: 'longTermLoans', label: 'Long-term Loans', codePrefixes: ['250', '251', '252'], keywords: ['loan', 'mortgage', 'long-term', 'term loan', 'borrowing'] },
]

function classifyLiability(code: string, name: string): { group: LiabilitySubGroup; isCurrent: boolean } {
  const c = code.toLowerCase()
  const n = name.toLowerCase()

  for (const g of LIABILITY_CURRENT_DEFS) {
    if (g.codePrefixes.some(p => c.startsWith(p)) || g.keywords.some(kw => n.includes(kw))) {
      return { group: g.key, isCurrent: true }
    }
  }
  for (const g of LIABILITY_NONCURRENT_DEFS) {
    if (g.codePrefixes.some(p => c.startsWith(p)) || g.keywords.some(kw => n.includes(kw))) {
      return { group: g.key, isCurrent: false }
    }
  }
  const numCode = parseInt(code, 10)
  if (!isNaN(numCode) && numCode >= 2500) return { group: 'other', isCurrent: false }
  return { group: 'other', isCurrent: true }
}

// ─── Helper: build groups from a definition list ──────────────
function buildGroupsMap<T extends string>(defs: { key: T; label: string }[]): Record<T, BalanceSheetGroup> {
  const map = {} as Record<string, BalanceSheetGroup>
  for (const d of defs) {
    map[d.key] = { label: d.label, lineItems: [], total: 0 }
  }
  map['other' as T] = { label: 'Other', lineItems: [], total: 0 }
  return map as Record<T, BalanceSheetGroup>
}

// ─── GET Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate')

    if (!asOfDate) {
      return cachedError('asOfDate query param is required (YYYY-MM-DD)', 400)
    }

    const asOf = new Date(asOfDate)
    if (isNaN(asOf.getTime())) {
      return cachedError('Invalid date format. Use YYYY-MM-DD.', 400)
    }
    asOf.setHours(23, 59, 59, 999)

    const cacheKey = `reports:balance-sheet:${asOfDate}`
    const data = await getOrSet(cacheKey, async (): Promise<BalanceSheetReport> => {
      const entries = await db.journalEntry.findMany({
        where: { status: 'posted', date: { lte: asOf } },
        include: { lines: { include: { account: true } } },
      })

      // Aggregate per account
      const accountMap = new Map<string, {
        code: string; name: string; type: string; totalDebit: number; totalCredit: number
      }>()

      for (const entry of entries) {
        for (const line of entry.lines) {
          const acct = line.account
          if (!acct || !acct.active) continue
          const existing = accountMap.get(acct.id)
          if (existing) {
            existing.totalDebit += line.debit
            existing.totalCredit += line.credit
          } else {
            accountMap.set(acct.id, {
              code: acct.code, name: acct.name, type: acct.type,
              totalDebit: line.debit, totalCredit: line.credit,
            })
          }
        }
      }

      // Build group maps
      const currentAssetGroups = buildGroupsMap(ASSET_CURRENT_DEFS)
      const nonCurrentAssetGroups = buildGroupsMap(ASSET_NONCURRENT_DEFS)
      const currentLiabilityGroups = buildGroupsMap(LIABILITY_CURRENT_DEFS)
      const nonCurrentLiabilityGroups = buildGroupsMap(LIABILITY_NONCURRENT_DEFS)
      const equityItems: BalanceSheetLine[] = []
      let totalEquity = 0

      // Order keys for output
      const assetCurrentOrder = ASSET_CURRENT_DEFS.map(d => d.key).concat('other' as AssetSubGroup)
      const assetNonCurrentOrder = ASSET_NONCURRENT_DEFS.map(d => d.key).concat('other' as AssetSubGroup)
      const liabilityCurrentOrder = LIABILITY_CURRENT_DEFS.map(d => d.key).concat('other' as LiabilitySubGroup)
      const liabilityNonCurrentOrder = LIABILITY_NONCURRENT_DEFS.map(d => d.key).concat('other' as LiabilitySubGroup)

      for (const [, acct] of accountMap) {
        const type = acct.type.toLowerCase()
        let balance = 0

        if (type === 'asset') {
          balance = round2(acct.totalDebit - acct.totalCredit)
          if (Math.abs(balance) < 0.005) continue
          const { group, isCurrent } = classifyAsset(acct.code, acct.name)
          const target = isCurrent ? currentAssetGroups : nonCurrentAssetGroups
          const groupObj = target[group as keyof typeof target]
          if (groupObj) {
            groupObj.lineItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance })
            groupObj.total = round2(groupObj.total + balance)
          }
        } else if (type === 'liability') {
          balance = round2(acct.totalCredit - acct.totalDebit)
          if (Math.abs(balance) < 0.005) continue
          const { group, isCurrent } = classifyLiability(acct.code, acct.name)
          const target = isCurrent ? currentLiabilityGroups : nonCurrentLiabilityGroups
          const groupObj = target[group as keyof typeof target]
          if (groupObj) {
            groupObj.lineItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance })
            groupObj.total = round2(groupObj.total + balance)
          }
        } else if (type === 'equity') {
          balance = round2(acct.totalCredit - acct.totalDebit)
          if (Math.abs(balance) < 0.005) continue
          equityItems.push({ accountCode: acct.code, accountName: acct.name, amount: balance })
          totalEquity = round2(totalEquity + balance)
        }
      }

      // Assemble ordered groups (filter out empty)
      function assembleGroups<T extends string>(
        map: Record<T, BalanceSheetGroup>,
        order: T[],
      ): BalanceSheetGroup[] {
        return order
          .map(k => map[k])
          .filter(g => g.lineItems.length > 0)
      }

      const currentAssetsGroups = assembleGroups(currentAssetGroups, assetCurrentOrder)
      const nonCurrentAssetsGroups = assembleGroups(nonCurrentAssetGroups, assetNonCurrentOrder)
      const currentLiabilitiesGroups = assembleGroups(currentLiabilityGroups, liabilityCurrentOrder)
      const nonCurrentLiabilitiesGroups = assembleGroups(nonCurrentLiabilityGroups, liabilityNonCurrentOrder)

      const totalCurrentAssets = round2(currentAssetsGroups.reduce((s, g) => s + g.total, 0))
      const totalNonCurrentAssets = round2(nonCurrentAssetsGroups.reduce((s, g) => s + g.total, 0))
      const totalCurrentLiabilities = round2(currentLiabilitiesGroups.reduce((s, g) => s + g.total, 0))
      const totalNonCurrentLiabilities = round2(nonCurrentLiabilitiesGroups.reduce((s, g) => s + g.total, 0))

      const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets)
      const totalLiabilities = round2(totalCurrentLiabilities + totalNonCurrentLiabilities)
      const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity)
      const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
      const balanceDifference = round2(totalAssets - totalLiabilitiesAndEquity)

      return {
        reportType: 'balance-sheet',
        asOfDate: asOfDate,
        generatedAt: new Date().toISOString(),
        assets: {
          current: { label: 'Current Assets', groups: currentAssetsGroups, total: totalCurrentAssets },
          nonCurrent: { label: 'Non-Current Assets', groups: nonCurrentAssetsGroups, total: totalNonCurrentAssets },
          total: totalAssets,
        },
        liabilities: {
          current: { label: 'Current Liabilities', groups: currentLiabilitiesGroups, total: totalCurrentLiabilities },
          nonCurrent: { label: 'Non-Current Liabilities', groups: nonCurrentLiabilitiesGroups, total: totalNonCurrentLiabilities },
          total: totalLiabilities,
        },
        equity: { label: 'Equity', lineItems: equityItems, total: totalEquity },
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity,
        isBalanced,
        balanceDifference,
      }
    }, 120_000)

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Balance Sheet API error:', error)
    return cachedError('Failed to generate balance sheet', 500)
  }
}
