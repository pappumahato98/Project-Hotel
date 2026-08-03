import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

/**
 * GET /api/accounting/statement
 * Query params: accountId, startDate, endDate
 *
 * Returns: opening balance, all posted journal lines for that account in date order
 * with running balance, and closing balance.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = req.nextUrl
    const accountId = searchParams.get('accountId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Verify account exists
    const account = await db.ledgerAccount.findUnique({
      where: { id: accountId },
      select: { id: true, code: true, name: true, type: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // ─── Compute opening balance ──────────────────────────────
    // Sum all posted lines for this account BEFORE the start date
    let openingBalance = 0
    if (startDateStr) {
      const startDate = new Date(startDateStr)
      const priorLines = await db.journalEntryLine.findMany({
        where: {
          accountId,
          entry: {
            date: { lt: startDate },
            status: 'posted',
          },
        },
        select: { debit: true, credit: true },
      })
      for (const line of priorLines) {
        openingBalance += line.debit - line.credit
      }
    }

    // ─── Build entry filter for the date range ─────────────────
    const entryFilter: Prisma.JournalEntryWhereInput = { status: 'posted' }
    if (startDateStr || endDateStr) {
      const dateQuery: Record<string, Date> = {}
      if (startDateStr) dateQuery.gte = new Date(startDateStr)
      if (endDateStr) {
        const endOfDay = new Date(endDateStr)
        endOfDay.setHours(23, 59, 59, 999)
        dateQuery.lte = endOfDay
      }
      entryFilter.date = dateQuery
    }

    // ─── Fetch lines within the date range ─────────────────────
    const lines = await db.journalEntryLine.findMany({
      where: {
        accountId,
        entry: entryFilter,
      },
      include: {
        entry: {
          select: {
            id: true,
            date: true,
            description: true,
            reference: true,
            sourceModule: true,
            status: true,
          },
        },
      },
    })

    // Sort by entry date then line id for consistent ordering
    lines.sort((a, b) => {
      const dateDiff = a.entry.date.getTime() - b.entry.date.getTime()
      if (dateDiff !== 0) return dateDiff
      return a.id.localeCompare(b.id)
    })

    // ─── Compute running balance ───────────────────────────────
    let runningBalance = openingBalance
    const statementLines = lines.map((line) => {
      // For asset/expense accounts: DR increases, CR decreases
      // For liability/equity/revenue accounts: CR increases, DR decreases
      const balanceChange = (account.type === 'asset' || account.type === 'expense')
        ? line.debit - line.credit
        : line.credit - line.debit
      runningBalance += balanceChange

      return {
        id: line.id,
        date: line.entry.date,
        entryId: line.entry.id,
        description: line.entry.description,
        reference: line.entry.reference,
        sourceModule: line.entry.sourceModule,
        debit: line.debit,
        credit: line.credit,
        narration: line.narration,
        balanceChange,
        runningBalance: Math.round(runningBalance * 100) / 100,
      }
    })

    const closingBalance = Math.round(runningBalance * 100) / 100
    const roundedOpening = Math.round(openingBalance * 100) / 100

    return NextResponse.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      period: {
        startDate: startDateStr || null,
        endDate: endDateStr || null,
      },
      openingBalance: roundedOpening,
      closingBalance,
      totalDebits: Math.round(lines.reduce((sum, l) => sum + l.debit, 0) * 100) / 100,
      totalCredits: Math.round(lines.reduce((sum, l) => sum + l.credit, 0) * 100) / 100,
      lineCount: lines.length,
      lines: statementLines,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Account statement error:', msg)
    return NextResponse.json({ error: 'Failed to generate account statement', detail: msg.substring(0, 200) }, { status: 500 })
  }
}
