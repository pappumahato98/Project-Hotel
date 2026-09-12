import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: Tax Returns List ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const periodType = searchParams.get('periodType')
    const period = searchParams.get('period')

    const data = await getOrSet(
      `tax-returns:list:${status || ''}:${periodType || ''}:${period || ''}`,
      async () => {
        const where: Prisma.TaxReturnWhereInput = {}
        if (status) where.status = status
        if (periodType) where.periodType = periodType
        if (period) where.period = { contains: period }

        const returns = await db.taxReturn.findMany({
          where,
          orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
          take: 200,
        })

        const totalVatPayable = returns.reduce((s, r) => s + r.vatPayable, 0)
        const totalTdsPending = returns.reduce((s, r) => s + (r.tdsWithheld - r.tdsDeposited), 0)
        const overdueCount = returns.filter(r => r.status === 'overdue').length
        const filedCount = returns.filter(r => r.status === 'filed' || r.status === 'paid').length

        return {
          returns,
          stats: {
            totalVatPayable: Math.round(totalVatPayable * 100) / 100,
            totalTdsPending: Math.round(totalTdsPending * 100) / 100,
            overdueCount,
            filedCount,
            totalReturns: returns.length,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TaxReturns API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch tax returns', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create Tax Return ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      period, periodType, totalSales, totalPurchases,
      vatOutput, vatInput, vatPayable, tdsWithheld, tdsDeposited,
      status, notes,
    } = body

    if (!period) {
      return cachedError('Missing required field: period', 400)
    }

    const validStatuses = ['draft', 'filed', 'paid', 'overdue']
    if (status && !validStatuses.includes(status)) {
      return cachedError('Invalid status. Must be draft, filed, paid, or overdue', 400)
    }

    const validPeriodTypes = ['monthly', 'quarterly']
    if (periodType && !validPeriodTypes.includes(periodType)) {
      return cachedError('Invalid periodType. Must be monthly or quarterly', 400)
    }

    const record = await db.taxReturn.create({
      data: {
        period,
        periodType: periodType || 'monthly',
        totalSales: parseFloat(totalSales) || 0,
        totalPurchases: parseFloat(totalPurchases) || 0,
        vatOutput: parseFloat(vatOutput) || 0,
        vatInput: parseFloat(vatInput) || 0,
        vatPayable: parseFloat(vatPayable) || 0,
        tdsWithheld: parseFloat(tdsWithheld) || 0,
        tdsDeposited: parseFloat(tdsDeposited) || 0,
        status: status || 'draft',
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('tax-return:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TaxReturns API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create tax return', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update Tax Return ──────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, action, ...fields } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    const existing = await db.taxReturn.findUnique({ where: { id } })
    if (!existing) {
      return cachedError('Tax return not found', 404)
    }

    const data: Prisma.TaxReturnUpdateInput = {}

    if (action === 'file') {
      data.status = 'filed'
      data.filedDate = new Date().toISOString().split('T')[0]
    } else if (action === 'mark_paid') {
      data.status = 'paid'
      data.paidDate = new Date().toISOString().split('T')[0]
    } else {
      // Regular update
      const validStatuses = ['draft', 'filed', 'paid', 'overdue']
      if (fields.status !== undefined) {
        if (!validStatuses.includes(fields.status)) {
          return cachedError('Invalid status', 400)
        }
        data.status = fields.status
      }
      if (fields.period !== undefined) data.period = fields.period
      if (fields.periodType !== undefined) data.periodType = fields.periodType
      if (fields.totalSales !== undefined) data.totalSales = parseFloat(fields.totalSales) || 0
      if (fields.totalPurchases !== undefined) data.totalPurchases = parseFloat(fields.totalPurchases) || 0
      if (fields.vatOutput !== undefined) data.vatOutput = parseFloat(fields.vatOutput) || 0
      if (fields.vatInput !== undefined) data.vatInput = parseFloat(fields.vatInput) || 0
      if (fields.vatPayable !== undefined) data.vatPayable = parseFloat(fields.vatPayable) || 0
      if (fields.tdsWithheld !== undefined) data.tdsWithheld = parseFloat(fields.tdsWithheld) || 0
      if (fields.tdsDeposited !== undefined) data.tdsDeposited = parseFloat(fields.tdsDeposited) || 0
      if (fields.notes !== undefined) data.notes = fields.notes || null
    }

    const record = await db.taxReturn.update({ where: { id }, data })

    afterMutation('accounting')
    broadcastEvent('tax-return:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TaxReturns API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update tax return', 500, msg.substring(0, 300))
  }
}

// ─── DELETE: Delete Tax Return ─────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return cachedError('ID is required', 400)

    const existing = await db.taxReturn.findUnique({ where: { id } })
    if (!existing) return cachedError('Tax return not found', 404)
    if (existing.status !== 'draft') return cachedError('Only draft returns can be deleted', 400)

    await db.taxReturn.delete({ where: { id } })
    afterMutation('accounting')
    broadcastEvent('tax-return:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('TaxReturns API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete tax return', 500, msg.substring(0, 300))
  }
}
