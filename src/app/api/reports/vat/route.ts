import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface VATLine {
  id: string
  entryDate: string
  description: string
  reference: string | null
  accountCode: string
  accountName: string
  direction: 'output' | 'input'
  amount: number
}

interface VATVerification {
  source: string
  totalTax: number
  journalTax: number
  variance: number
  match: boolean
}

interface VATReport {
  reportType: 'vat'
  startDate: string
  endDate: string
  generatedAt: string
  outputVAT: {
    total: number
    lines: VATLine[]
  }
  inputVAT: {
    total: number
    lines: VATLine[]
  }
  netVAT: number
  netDirection: 'payable' | 'receivable' | 'zero'
  verification: VATVerification[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Identify VAT-related accounts by code containing '21' or name containing VAT/Tax
// Output VAT (collected on sales): typically credit balance → code 2100-2199 or name has 'output vat'/'vat payable'/'sales tax'
// Input VAT (paid on purchases): typically debit balance → code 21xx input vat or name has 'input vat'/'vat receivable'/'purchase tax'
function isVATAccount(code: string, name: string): boolean {
  const c = code.toLowerCase()
  const n = name.toLowerCase()
  return c.startsWith('21') || n.includes('vat') || n.includes('tax') || n.includes('gst') || n.includes('sales tax')
}

function classifyVATDirection(code: string, name: string): 'output' | 'input' | null {
  const n = name.toLowerCase()
  const c = code.toLowerCase()

  // Output VAT indicators
  if (n.includes('output') || n.includes('collected') || n.includes('payable') || n.includes('sales tax')
    || c.startsWith('210') || c.startsWith('211')) {
    return 'output'
  }
  // Input VAT indicators
  if (n.includes('input') || n.includes('paid') || n.includes('receivable') || n.includes('purchase tax')
    || c.startsWith('212') || c.startsWith('213')) {
    return 'input'
  }

  // Fallback: code 21xx → assume output if credit net, input if debit net
  return null // will classify by net direction below
}

// ─── GET Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    const cacheKey = `reports:vat:${startDate}:${endDate}`
    const data = await getOrSet(cacheKey, async (): Promise<VATReport> => {
      const dayEnd = new Date(endDate)
      dayEnd.setHours(23, 59, 59, 999)

      // ── 1. Fetch VAT-related journal lines in date range ──
      const vatAccounts = await db.ledgerAccount.findMany({
        where: { active: true },
        select: { id: true, code: true, name: true },
      })

      const vatAccountIds = vatAccounts
        .filter(a => isVATAccount(a.code, a.name))
        .map(a => a.id)

      let outputLines: VATLine[] = []
      let inputLines: VATLine[] = []
      let totalOutputVAT = 0
      let totalInputVAT = 0

      if (vatAccountIds.length > 0) {
        const journalLines = await db.journalEntryLine.findMany({
          where: {
            accountId: { in: vatAccountIds },
            entry: {
              status: 'posted',
              date: { gte: start, lte: dayEnd },
            },
          },
          include: {
            account: { select: { code: true, name: true } },
            entry: { select: { date: true, description: true, reference: true } },
          },
        })

        // Account-level net to classify ambiguous accounts
        const accountNetMap = new Map<string, { netDebit: number; netCredit: number }>()
        for (const jl of journalLines) {
          const existing = accountNetMap.get(jl.accountId)
          if (existing) {
            existing.netDebit += jl.debit
            existing.netCredit += jl.credit
          } else {
            accountNetMap.set(jl.accountId, { netDebit: jl.debit, netCredit: jl.credit })
          }
        }

        for (const jl of journalLines) {
          if (Math.abs(jl.debit + jl.credit) < 0.005) continue

          const acct = vatAccounts.find(a => a.id === jl.accountId)
          if (!acct) continue

          let direction = classifyVATDirection(acct.code, acct.name)
          if (!direction) {
            // Fallback: classify by account-level net direction
            const net = accountNetMap.get(jl.accountId)
            if (net) {
              direction = net.netCredit > net.netDebit ? 'output' : 'input'
            } else {
              direction = 'output' // default
            }
          }

          const line: VATLine = {
            id: jl.id,
            entryDate: jl.entry.date.toISOString().split('T')[0],
            description: jl.entry.description,
            reference: jl.entry.reference,
            accountCode: acct.code,
            accountName: acct.name,
            direction,
            amount: round2(direction === 'output' ? jl.credit : jl.debit),
          }

          if (direction === 'output') {
            outputLines.push(line)
            totalOutputVAT = round2(totalOutputVAT + line.amount)
          } else {
            inputLines.push(line)
            totalInputVAT = round2(totalInputVAT + line.amount)
          }
        }
      }

      // ── 2. Cross-verification with FolioTransactions and PosOrders ──
      const [folioTaxResult, posTaxResult] = await Promise.all([
        db.folioTransaction.aggregate({
          where: { createdAt: { gte: start, lte: dayEnd } },
          _sum: { taxAmount: true },
        }),
        db.posOrder.aggregate({
          where: { createdAt: { gte: start, lte: dayEnd }, status: { in: ['closed', 'served'] } },
          _sum: { taxAmount: true },
        }),
      ])

      const folioTotalTax = round2(folioTaxResult._sum.taxAmount ?? 0)
      const posTotalTax = round2(posTaxResult._sum.taxAmount ?? 0)
      const sourceTotalTax = round2(folioTotalTax + posTotalTax)

      const verification: VATVerification[] = [
        {
          source: 'Folio Transactions (taxAmount)',
          totalTax: folioTotalTax,
          journalTax: 0, // No direct 1:1 mapping, compare to total output
          variance: 0,
          match: true,
        },
        {
          source: 'POS Orders (taxAmount)',
          totalTax: posTotalTax,
          journalTax: 0,
          variance: 0,
          match: true,
        },
        {
          source: 'Total Source Tax (Folio + POS)',
          totalTax: sourceTotalTax,
          journalTax: totalOutputVAT,
          variance: round2(Math.abs(sourceTotalTax - totalOutputVAT)),
          match: Math.abs(sourceTotalTax - totalOutputVAT) < 0.01,
        },
      ]

      const netVAT = round2(totalOutputVAT - totalInputVAT)
      const netDirection: 'payable' | 'receivable' | 'zero' =
        Math.abs(netVAT) < 0.01 ? 'zero' : netVAT > 0 ? 'payable' : 'receivable'

      return {
        reportType: 'vat',
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        outputVAT: {
          total: totalOutputVAT,
          lines: outputLines,
        },
        inputVAT: {
          total: totalInputVAT,
          lines: inputLines,
        },
        netVAT,
        netDirection,
        verification,
      }
    }, 120_000)

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('VAT Report API error:', error)
    return cachedError('Failed to generate VAT report', 500)
  }
}
