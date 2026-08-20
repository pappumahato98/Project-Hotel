import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

const VALID_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const

type AccountType = (typeof VALID_TYPES)[number]

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') as AccountType | null
    const search = searchParams.get('search')?.trim() || ''
    const active = searchParams.get('active') // 'true' | 'false' | null (null = all)

    const where: Record<string, unknown> = {}
    if (type && VALID_TYPES.includes(type)) {
      where.type = type
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (active !== null && active !== undefined && active !== '') {
      where.active = active === 'true'
    }

    const accounts = await db.ledgerAccount.findMany({
      where,
      include: {
        _count: { select: { journalLines: true } },
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    })

    // Compute per-account balance from posted journal lines (single query)
    const accountIds = accounts.map((a) => a.id)
    const balanceMap: Record<string, { totalDebit: number; totalCredit: number; balance: number }> = {}
    if (accountIds.length > 0) {
      const balances = await db.journalEntryLine.groupBy({
        by: ['accountId'],
        where: {
          accountId: { in: accountIds },
          entry: { status: 'posted' },
        },
        _sum: { debit: true, credit: true },
      })
      for (const b of balances) {
        const totalDebit = b._sum.debit ?? 0
        const totalCredit = b._sum.credit ?? 0
        balanceMap[b.accountId] = { totalDebit, totalCredit, balance: 0 }
      }
    }

    // Group by type + compute typeBreakdown
    const grouped: Record<string, typeof accounts> = {}
    const typeBreakdown: Record<string, number> = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 }
    for (const a of accounts) {
      if (!grouped[a.type]) grouped[a.type] = []
      grouped[a.type].push(a)
      if (typeBreakdown[a.type] !== undefined) typeBreakdown[a.type]++
    }

    return cachedJson({
      accounts,
      grouped,
      balanceMap,
      typeBreakdown,
      totalCount: accounts.length,
    }, req, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounts GET error:', msg)
    return cachedError('Failed to fetch accounts', 500, msg.substring(0, 200))
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req) // Any authenticated user can edit accounts
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { id, name, description, active, department, subtype } = body

    if (!id) {
      return cachedError('Account id is required', 400)
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (active !== undefined) data.active = active
    if (department !== undefined) data.department = department
    if (subtype !== undefined) data.subtype = subtype

    const account = await db.ledgerAccount.update({
      where: { id },
      data,
      include: {
        _count: { select: { journalLines: true } },
      },
    })

    afterMutation('accounting')
    broadcastEvent('account:updated', account)
    return NextResponse.json(account, { headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounts PATCH error:', msg)
    return cachedError('Failed to update account', 500, msg.substring(0, 200))
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req) // Any authenticated user can create accounts
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { code, name, type, description, department, subtype } = body

    if (!code || !name || !type) {
      return cachedError('code, name, and type are required', 400)
    }

    if (!VALID_TYPES.includes(type)) {
      return cachedError(`Invalid account type. Must be one of: ${VALID_TYPES.join(', ')}`, 400)
    }

    // Validate code uniqueness
    const existing = await db.ledgerAccount.findUnique({ where: { code } })
    if (existing) {
      return cachedError(`Account with code '${code}' already exists`, 409)
    }

    const account = await db.ledgerAccount.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        type,
        description: description?.trim() || null,
        department: department?.trim() || null,
        subtype: subtype?.trim() || null,
      },
      include: {
        _count: { select: { journalLines: true } },
      },
    })

    afterMutation('accounting')
    broadcastEvent('account:created', account)
    return NextResponse.json(account, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Accounts POST error:', msg)
    return cachedError('Failed to create account', 500, msg.substring(0, 200))
  }
}
