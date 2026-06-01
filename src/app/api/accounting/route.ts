import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Ledger accounts
    const accounts = await db.ledgerAccount.findMany({
      include: {
        journalLines: true,
      },
      orderBy: { code: 'asc' },
    })

    // Journal entries (most recent first)
    const journalEntries = await db.journalEntry.findMany({
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 50,
    })

    // Summary by account type
    const accountTypeBreakdown = await db.ledgerAccount.groupBy({
      by: ['type'],
      _count: { type: true },
    })

    const typeMap: Record<string, number> = {}
    for (const item of accountTypeBreakdown) {
      typeMap[item.type] = item._count.type
    }

    return NextResponse.json({
      accounts,
      journalEntries,
      accountTypeBreakdown: typeMap,
    })
  } catch (error) {
    console.error('Accounting API error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 })
  }
}
