import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

const BALANCE_TOLERANCE = 0.01

function validateBalance(lines: Array<{ debit: number; credit: number }>): { valid: boolean; totalDebit: number; totalCredit: number; difference: number } {
  let totalDebit = 0
  let totalCredit = 0
  for (const line of lines) {
    totalDebit += line.debit || 0
    totalCredit += line.credit || 0
  }
  const difference = Math.abs(totalDebit - totalCredit)
  return {
    valid: difference <= BALANCE_TOLERANCE,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    difference: Math.round(difference * 100) / 100,
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sourceModule = searchParams.get('sourceModule')
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (sourceModule) where.sourceModule = sourceModule
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { reference: { contains: search } },
        { createdBy: { contains: search } },
      ]
    }

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.journalEntry.count({ where }),
    ])

    // Compute running balance per entry line
    // Fetch all posted lines ordered by date for running balance computation
    // We'll compute a running balance across the page
    // First compute opening balance: sum of all posted entries before this page's date range
    let openingBalance = 0
    if (startDate) {
      const priorLines = await db.journalEntryLine.findMany({
        where: {
          entry: {
            date: { lt: new Date(startDate) },
            status: 'posted',
          },
        },
        include: { account: { select: { type: true } } },
      })
      for (const line of priorLines) {
        // For running balance: DR increases asset/expense, CR increases liability/equity/revenue
        // Simple approach: DR - CR for balance computation
        if (line.account.type === 'asset' || line.account.type === 'expense') {
          openingBalance += line.debit - line.credit
        } else {
          openingBalance += line.credit - line.debit
        }
      }
    }

    // Enrich entries with per-line running balance and totals
    let runningBalance = openingBalance
    const enrichedEntries = entries.map((entry) => {
      let entryDebit = 0
      let entryCredit = 0
      for (const line of entry.lines) {
        entryDebit += line.debit
        entryCredit += line.credit
      }
      return {
        ...entry,
        totalDebit: Math.round(entryDebit * 100) / 100,
        totalCredit: Math.round(entryCredit * 100) / 100,
      }
    })

    return cachedJson({
      entries: enrichedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, req, { tier: 'long' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounting GET error:', msg)
    return cachedError('Failed to fetch journal entries', 500, msg.substring(0, 200))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request) // Any authenticated user can create journal entries
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { date, description, reference, lines, sourceModule, sourceId } = body

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return cachedError('Journal entry must have at least one line', 400)
    }

    // Validate every line has an accountId
    for (const line of lines) {
      if (!line.accountId) {
        return cachedError('Each line must have an accountId', 400)
      }
    }

    // Validate double-entry balance
    const balance = validateBalance(lines)
    if (!balance.valid) {
      return cachedError(`Debits and credits must balance. Total DR: ${balance.totalDebit}, Total CR: ${balance.totalCredit}, Difference: ${balance.difference}`, 400)
    }

    // Validate accounts exist
    const accountIds = [...new Set(lines.map((l: { accountId: string }) => l.accountId))]
    const accounts = await db.ledgerAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, active: true },
    })
    const accountMap = new Map(accounts.map((a) => [a.id, a]))
    for (const aid of accountIds) {
      const acc = accountMap.get(aid)
      if (!acc) {
        return cachedError(`Account ${aid} not found`, 400)
      }
      if (!acc.active) {
        return cachedError(`Account ${aid} is inactive`, 400)
      }
    }

    const journalEntry = await db.journalEntry.create({
      data: {
        date: date ? new Date(date) : new Date(),
        description: description || '',
        reference: reference || null,
        createdBy: `${auth.user.firstName} ${auth.user.lastName}`,
        status: 'draft',
        sourceModule: sourceModule || null,
        sourceId: sourceId || null,
        lines: {
          create: lines.map((line: { accountId: string; debit: number; credit: number; narration?: string }) => ({
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            narration: line.narration || null,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    })

    afterMutation('accounting')
    broadcastEvent('journal_entry:created', journalEntry)
    return NextResponse.json(journalEntry, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounting POST error:', msg)
    return cachedError('Failed to create journal entry', 500, msg.substring(0, 200))
  }
}
