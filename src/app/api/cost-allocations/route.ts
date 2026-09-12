import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: Cost Allocations List ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const costCenterId = searchParams.get('costCenterId')
    const sourceType = searchParams.get('sourceType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const data = await getOrSet(
      `cost-allocations:list:${costCenterId || ''}:${sourceType || ''}:${dateFrom || ''}:${dateTo || ''}`,
      async () => {
        const where: Prisma.CostAllocationWhereInput = {}
        if (costCenterId) where.costCenterId = costCenterId
        if (sourceType) where.sourceType = sourceType
        if (dateFrom || dateTo) {
          where.date = {}
          if (dateFrom) (where.date as Prisma.StringFilter).gte = dateFrom
          if (dateTo) (where.date as Prisma.StringFilter).lte = dateTo
        }

        const allocations = await db.costAllocation.findMany({
          where,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          include: {
            costCenter: {
              select: { id: true, code: true, name: true },
            },
          },
          take: 300,
        })

        const totalAmount = allocations.reduce((s, a) => s + a.amount, 0)

        return {
          allocations,
          stats: {
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalAllocations: allocations.length,
            bySourceType: allocations.reduce<Record<string, number>>((acc, a) => {
              const key = a.sourceType || 'unspecified'
              acc[key] = (acc[key] || 0) + a.amount
              return acc
            }, {}),
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostAllocations API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch cost allocations', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create Cost Allocation ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { costCenterId, account, amount, date, sourceType, description } = body

    if (!costCenterId || !date) {
      return cachedError('Missing required fields: costCenterId, date', 400)
    }

    // Verify cost center exists
    const cc = await db.costCenter.findUnique({ where: { id: costCenterId } })
    if (!cc) return cachedError('Cost center not found', 404)

    const validSourceTypes = ['journal', 'invoice', 'payroll', 'manual']
    if (sourceType && !validSourceTypes.includes(sourceType)) {
      return cachedError('Invalid sourceType. Must be journal, invoice, payroll, or manual', 400)
    }

    const amt = parseFloat(amount) || 0

    const record = await db.costAllocation.create({
      data: {
        costCenterId,
        account: account || null,
        amount: amt,
        date,
        sourceType: sourceType || null,
        description: description || null,
      },
    })

    // Update cost center budgetUsed
    await db.costCenter.update({
      where: { id: costCenterId },
      data: { budgetUsed: { increment: amt } },
    })

    afterMutation('accounting')
    broadcastEvent('cost-allocation:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostAllocations API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create cost allocation', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update Cost Allocation ─────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...fields } = body

    if (!id) return cachedError('ID is required', 400)

    const existing = await db.costAllocation.findUnique({ where: { id } })
    if (!existing) return cachedError('Cost allocation not found', 404)

    const data: Prisma.CostAllocationUpdateInput = {}
    let amountDelta = 0

    if (fields.costCenterId !== undefined) data.costCenterId = fields.costCenterId
    if (fields.account !== undefined) data.account = fields.account || null
    if (fields.amount !== undefined) {
      const newAmt = parseFloat(fields.amount) || 0
      amountDelta = newAmt - existing.amount
      data.amount = newAmt
    }
    if (fields.date !== undefined) data.date = fields.date
    if (fields.sourceType !== undefined) data.sourceType = fields.sourceType || null
    if (fields.description !== undefined) data.description = fields.description || null

    const record = await db.costAllocation.update({ where: { id }, data })

    // Update cost center budgetUsed if amount changed
    if (amountDelta !== 0) {
      await db.costCenter.update({
        where: { id: existing.costCenterId },
        data: { budgetUsed: { increment: amountDelta } },
      })
    }

    afterMutation('accounting')
    broadcastEvent('cost-allocation:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostAllocations API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update cost allocation', 500, msg.substring(0, 300))
  }
}

// ─── DELETE: Delete Cost Allocation ─────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return cachedError('ID is required', 400)

    const existing = await db.costAllocation.findUnique({ where: { id } })
    if (!existing) return cachedError('Cost allocation not found', 404)

    await db.costAllocation.delete({ where: { id } })

    // Decrease budgetUsed on the cost center
    await db.costCenter.update({
      where: { id: existing.costCenterId },
      data: { budgetUsed: { decrement: existing.amount } },
    })

    afterMutation('accounting')
    broadcastEvent('cost-allocation:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostAllocations API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete cost allocation', 500, msg.substring(0, 300))
  }
}
