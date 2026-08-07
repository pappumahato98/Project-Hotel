import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Account GET error:', msg)
    return NextResponse.json({ error: 'Failed to fetch account', detail: msg.substring(0, 200) }, { status: 500 })
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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!account.active) {
      return NextResponse.json({ error: 'Account is already inactive' }, { status: 400 })
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
    return NextResponse.json(updated)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Account DELETE error:', msg)
    return NextResponse.json({ error: 'Failed to deactivate account', detail: msg.substring(0, 200) }, { status: 500 })
  }
}
