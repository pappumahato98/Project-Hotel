import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettingsMap, getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const data = await getOrSet('accounting:summary', async () => {
      // Fetch accounts, journal entries, type breakdown, and settings in parallel
      // Settings may fail — use defaults as fallback
      const [accounts, journalEntries, accountTypeBreakdown, settingsResult] = await Promise.all([
        db.ledgerAccount.findMany({
          include: {
            journalLines: {
              take: 50,
              orderBy: { date: 'desc' },
            },
          },
          orderBy: { code: 'asc' },
        }),
        db.journalEntry.findMany({
          include: {
            lines: {
              include: {
                account: { select: { id: true, code: true, name: true, type: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 50,
        }),
        db.ledgerAccount.groupBy({
          by: ['type'],
          _count: { type: true },
        }),
        getSettingsMap().catch(() => ({} as Record<string, unknown>)),
      ])

      const s = settingsResult as Record<string, unknown>
      const typeMap: Record<string, number> = {}
      for (const item of accountTypeBreakdown) {
        typeMap[item.type] = item._count.type
      }

      const taxRate = (s.taxRate as number) ?? 13

      return {
        accounts,
        journalEntries,
        accountTypeBreakdown: typeMap,
        settings: { taxRate },
      }
    }, 120000)

    return NextResponse.json(data)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounting API error:', msg)
    return NextResponse.json({ error: 'Failed to fetch accounting data', detail: msg.substring(0, 200) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
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
