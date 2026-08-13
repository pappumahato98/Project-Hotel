import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    const entry = await db.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    })

    if (!entry) {
      return cachedError('Journal entry not found', 404)
    }

    let totalDebit = 0
    let totalCredit = 0
    for (const line of entry.lines) {
      totalDebit += line.debit
      totalCredit += line.credit
    }

    return cachedJson({
      ...entry,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      balanced: Math.abs(totalDebit - totalCredit) <= BALANCE_TOLERANCE,
    }, request, { tier: 'long' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Journal Entry GET error:', msg)
    return cachedError('Failed to fetch journal entry', 500, msg.substring(0, 200))
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!existing) {
      return cachedError('Journal entry not found', 404)
    }

    if (existing.status === 'posted') {
      return cachedError('Cannot modify a posted entry. Void it and create a new one.', 400)
    }

    if (existing.status === 'voided') {
      return cachedError('Cannot modify a voided entry', 400)
    }

    // Update entry-level fields
    const data: Record<string, unknown> = {}
    if (body.date) data.date = new Date(body.date)
    if (body.description !== undefined) data.description = body.description
    if (body.reference !== undefined) data.reference = body.reference
    if (body.sourceModule !== undefined) data.sourceModule = body.sourceModule
    if (body.sourceId !== undefined) data.sourceId = body.sourceId

    // Handle line replacements/additions/removals
    if (body.lines !== undefined) {
      const lines = body.lines as Array<{
        id?: string
        accountId: string
        debit: number
        credit: number
        narration?: string
      }>

      if (!Array.isArray(lines) || lines.length === 0) {
        return cachedError('Journal entry must have at least one line', 400)
      }

      // Validate balance
      const balance = validateBalance(lines)
      if (!balance.valid) {
        return cachedError(`Debits and credits must balance. Total DR: ${balance.totalDebit}, Total CR: ${balance.totalCredit}, Difference: ${balance.difference}`, 400)
      }

      // Validate account ids
      const accountIds = [...new Set(lines.filter((l) => l.accountId).map((l) => l.accountId))]
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

      // Determine lines to keep, add, remove
      const existingLineIds = new Set(existing.lines.map((l) => l.id))
      const incomingLineIds = new Set(lines.filter((l) => l.id).map((l) => l.id!))

      // Delete lines that were removed
      const toRemove = existing.lines.filter((l) => !incomingLineIds.has(l.id))
      if (toRemove.length > 0) {
        await db.journalEntryLine.deleteMany({
          where: { id: { in: toRemove.map((l) => l.id) } },
        })
      }

      // Upsert lines that have an id (update), or create new ones
      for (const line of lines) {
        if (line.id && existingLineIds.has(line.id)) {
          await db.journalEntryLine.update({
            where: { id: line.id },
            data: {
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              narration: line.narration || null,
            },
          })
        } else {
          await db.journalEntryLine.create({
            data: {
              entryId: id,
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              narration: line.narration || null,
            },
          })
        }
      }
    }

    const entry = await db.journalEntry.update({
      where: { id },
      data,
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    })

    afterMutation('accounting')
    broadcastEvent('journal_entry:updated', entry)
    return NextResponse.json(entry, { headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Journal Entry PATCH error:', msg)
    return cachedError('Failed to update journal entry', 500, msg.substring(0, 200))
  }
}

/**
 * POST /api/accounting/[id] — Post the journal entry (draft → posted)
 * Only admin, gm, or manager can post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    const entry = await db.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!entry) {
      return cachedError('Journal entry not found', 404)
    }

    if (entry.status !== 'draft') {
      return cachedError(`Cannot post entry with status '${entry.status}'. Only draft entries can be posted.`, 400)
    }

    // Validate balance before posting
    const balance = validateBalance(entry.lines)
    if (!balance.valid) {
      return cachedError(`Cannot post unbalanced entry. Total DR: ${balance.totalDebit}, Total CR: ${balance.totalCredit}, Difference: ${balance.difference}`, 400)
    }

    if (entry.lines.length === 0) {
      return cachedError('Cannot post an entry with no lines', 400)
    }

    const postedBy = `${auth.user.firstName} ${auth.user.lastName}`

    const updated = await db.journalEntry.update({
      where: { id },
      data: {
        status: 'posted',
        postedBy,
        postedAt: new Date(),
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
    broadcastEvent('journal_entry:posted', updated)
    return NextResponse.json(updated, { headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Journal Entry POST (post) error:', msg)
    return cachedError('Failed to post journal entry', 500, msg.substring(0, 200))
  }
}

/**
 * DELETE /api/accounting/[id] — Void the journal entry (soft delete)
 * Sets status to 'voided' instead of hard-deleting.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    const entry = await db.journalEntry.findUnique({ where: { id } })
    if (!entry) {
      return cachedError('Journal entry not found', 404)
    }

    if (entry.status === 'voided') {
      return cachedError('Entry is already voided', 400)
    }

    const voidedBy = `${auth.user.firstName} ${auth.user.lastName}`

    const updated = await db.journalEntry.update({
      where: { id },
      data: {
        status: 'voided',
        description: `${entry.description} [VOIDED by ${voidedBy}]`,
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
    broadcastEvent('journal_entry:voided', { id, voidedBy })
    return NextResponse.json(updated, { headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Journal Entry DELETE error:', msg)
    return cachedError('Failed to void journal entry', 500, msg.substring(0, 200))
  }
}
