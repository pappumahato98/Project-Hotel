import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: TDS Deductions List ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const deposited = searchParams.get('deposited')
    const period = searchParams.get('period')

    const data = await getOrSet(
      `tds-deductions:list:${section || ''}:${deposited || ''}:${period || ''}`,
      async () => {
        const where: Prisma.TdsDeductionWhereInput = {}
        if (section) where.section = section
        if (deposited !== null && deposited !== '') where.deposited = deposited === 'true'
        if (period) where.period = { contains: period }

        const deductions = await db.tdsDeduction.findMany({
          where,
          orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
          take: 200,
        })

        const totalTdsAmount = deductions.reduce((s, d) => s + d.tdsAmount, 0)
        const pendingDeposit = deductions.filter(d => !d.deposited).reduce((s, d) => s + d.tdsAmount, 0)
        const depositedAmount = deductions.filter(d => d.deposited).reduce((s, d) => s + d.tdsAmount, 0)

        return {
          deductions,
          stats: {
            totalTdsAmount: Math.round(totalTdsAmount * 100) / 100,
            pendingDeposit: Math.round(pendingDeposit * 100) / 100,
            depositedAmount: Math.round(depositedAmount * 100) / 100,
            pendingCount: deductions.filter(d => !d.deposited).length,
            totalDeductions: deductions.length,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TdsDeductions API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch TDS deductions', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create TDS Deduction ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      deducteeName, panNumber, section, amount,
      tdsRate, tdsAmount, deposited, depositDate,
      period, notes,
    } = body

    if (!deducteeName || !section || !period) {
      return cachedError('Missing required fields: deducteeName, section, period', 400)
    }

    const validSections = ['194C', '194H', '194I', '194J', '194A', '194B', '194BB', '194D', '194E', '194F', '194G', '194K', '194L', '194LA', '194M', '194N', '194O', '194P', '194Q', '194R', '194S', '194T']
    if (!validSections.includes(section)) {
      return cachedError('Invalid TDS section', 400)
    }

    const record = await db.tdsDeduction.create({
      data: {
        deducteeName,
        panNumber: panNumber || null,
        section,
        amount: parseFloat(amount) || 0,
        tdsRate: parseFloat(tdsRate) || 0,
        tdsAmount: parseFloat(tdsAmount) || 0,
        deposited: deposited || false,
        depositDate: depositDate || null,
        period,
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('tds-deduction:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TdsDeductions API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create TDS deduction', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update TDS Deduction ───────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...fields } = body

    if (!id) return cachedError('ID is required', 400)

    const existing = await db.tdsDeduction.findUnique({ where: { id } })
    if (!existing) return cachedError('TDS deduction not found', 404)

    const data: Prisma.TdsDeductionUpdateInput = {}

    if (fields.deducteeName !== undefined) data.deducteeName = fields.deducteeName
    if (fields.panNumber !== undefined) data.panNumber = fields.panNumber || null
    if (fields.section !== undefined) data.section = fields.section
    if (fields.amount !== undefined) data.amount = parseFloat(fields.amount) || 0
    if (fields.tdsRate !== undefined) data.tdsRate = parseFloat(fields.tdsRate) || 0
    if (fields.tdsAmount !== undefined) data.tdsAmount = parseFloat(fields.tdsAmount) || 0
    if (fields.deposited !== undefined) {
      data.deposited = fields.deposited
      if (fields.deposited && !existing.deposited) {
        data.depositDate = new Date().toISOString().split('T')[0]
      }
    }
    if (fields.depositDate !== undefined) data.depositDate = fields.depositDate || null
    if (fields.period !== undefined) data.period = fields.period
    if (fields.notes !== undefined) data.notes = fields.notes || null

    const record = await db.tdsDeduction.update({ where: { id }, data })

    afterMutation('accounting')
    broadcastEvent('tds-deduction:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TdsDeductions API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update TDS deduction', 500, msg.substring(0, 300))
  }
}

// ─── DELETE: Delete TDS Deduction ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return cachedError('ID is required', 400)

    const existing = await db.tdsDeduction.findUnique({ where: { id } })
    if (!existing) return cachedError('TDS deduction not found', 404)
    if (existing.deposited) return cachedError('Cannot delete a deposited deduction', 400)

    await db.tdsDeduction.delete({ where: { id } })
    afterMutation('accounting')
    broadcastEvent('tds-deduction:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TdsDeductions API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete TDS deduction', 500, msg.substring(0, 300))
  }
}
