import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    const account = await db.ledgerAccount.findUnique({
      where: { id },
      include: {
        _count: { select: { journalLines: true } },
        journalLines: {
          take: 50,
          orderBy: { id: 'desc' },
          include: {
            entry: {
              select: {
                id: true,
                date: true,
                description: true,
                reference: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!account) {
      return cachedError('Account not found', 404)
    }

    return cachedJson(account, request, { tier: 'long' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Account GET error:', msg)
    return cachedError('Failed to fetch account', 500, msg.substring(0, 200))
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request) // Any authenticated user can deactivate accounts
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    const account = await db.ledgerAccount.findUnique({ where: { id } })
    if (!account) {
      return cachedError('Account not found', 404)
    }

    if (!account.active) {
      return cachedError('Account is already inactive', 400)
    }

    const updated = await db.ledgerAccount.update({
      where: { id },
      data: { active: false },
      include: {
        _count: { select: { journalLines: true } },
      },
    })

    afterMutation('accounting')
    broadcastEvent('account:deactivated', updated)
    return NextResponse.json(updated, { headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Account DELETE error:', msg)
    return cachedError('Failed to deactivate account', 500, msg.substring(0, 200))
  }
}
