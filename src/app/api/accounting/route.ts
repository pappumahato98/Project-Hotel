import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'

// ─── Settings helper ──────────────────────────────────────
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') { try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value } }
    else map[r.key] = r.value
  }
  return map
}

export async function GET() {
  try {
    // Ledger accounts
    const accounts = await db.ledgerAccount.findMany({
      include: { journalLines: true },
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

    // Read settings for tax rate
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13

    return NextResponse.json({
      accounts,
      journalEntries,
      accountTypeBreakdown: typeMap,
      settings: { taxRate },
    })
  } catch (error) {
    console.error('Accounting API error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, description, reference, createdBy, lines } = body

    // Read settings for tax rate
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Journal entry must have at least one line' }, { status: 400 })
    }

    // Create journal entry with lines
    const journalEntry = await db.journalEntry.create({
      data: {
        date: date ? new Date(date) : new Date(),
        description: description || '',
        reference: reference || null,
        createdBy: createdBy || null,
        status: body.status || 'draft',
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

    broadcastEvent('journal_entry:created', journalEntry)
    return NextResponse.json(journalEntry, { status: 201 })
  } catch (error) {
    console.error('Accounting POST error:', error)
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
  }
}
