import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: Cost Centers List ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    const data = await getOrSet(
      `cost-centers:list:${type || ''}:${active || ''}`,
      async () => {
        const where: Prisma.CostCenterWhereInput = {}
        if (type) where.type = type
        if (active !== null && active !== '') where.active = active === 'true'

        const centers = await db.costCenter.findMany({
          where,
          orderBy: [{ code: 'asc' }],
          include: {
            allocations: {
              orderBy: { date: 'desc' },
              take: 50,
            },
          },
          take: 200,
        })

        const totalBudgetAllocated = centers.reduce((s, c) => s + c.budgetAllocated, 0)
        const totalBudgetUsed = centers.reduce((s, c) => s + c.budgetUsed, 0)
        const activeCount = centers.filter(c => c.active).length

        return {
          centers: centers.map(c => {
            const utilizationPct = c.budgetAllocated > 0
              ? Math.round((c.budgetUsed / c.budgetAllocated) * 100 * 100) / 100
              : 0
            return { ...c, utilizationPct }
          }),
          stats: {
            totalCenters: centers.length,
            totalBudgetAllocated: Math.round(totalBudgetAllocated * 100) / 100,
            totalBudgetUsed: Math.round(totalBudgetUsed * 100) / 100,
            activeCount,
          },
        }
      },
      120,
    )

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostCenters API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch cost centers', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create Cost Center ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { code, name, type, parentId, department, budgetAllocated, active } = body

    if (!code || !name) {
      return cachedError('Missing required fields: code, name', 400)
    }

    const validTypes = ['department', 'project', 'property', 'activity']
    if (type && !validTypes.includes(type)) {
      return cachedError('Invalid type. Must be department, project, property, or activity', 400)
    }

    // Check for duplicate code
    const existing = await db.costCenter.findUnique({ where: { code } })
    if (existing) {
      return cachedError('Cost center code already exists', 400)
    }

    const record = await db.costCenter.create({
      data: {
        code,
        name,
        type: type || 'department',
        parentId: parentId || null,
        department: department || null,
        budgetAllocated: parseFloat(budgetAllocated) || 0,
        active: active !== undefined ? active : true,
      },
    })

    afterMutation('accounting')
    broadcastEvent('cost-center:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostCenters API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create cost center', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update Cost Center ─────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...fields } = body

    if (!id) return cachedError('ID is required', 400)

    const existing = await db.costCenter.findUnique({ where: { id } })
    if (!existing) return cachedError('Cost center not found', 404)

    const data: Prisma.CostCenterUpdateInput = {}

    if (fields.code !== undefined) {
      const dupe = await db.costCenter.findFirst({ where: { code: fields.code, id: { not: id } } })
      if (dupe) return cachedError('Cost center code already exists', 400)
      data.code = fields.code
    }
    if (fields.name !== undefined) data.name = fields.name
    if (fields.type !== undefined) data.type = fields.type
    if (fields.parentId !== undefined) data.parentId = fields.parentId || null
    if (fields.department !== undefined) data.department = fields.department || null
    if (fields.budgetAllocated !== undefined) data.budgetAllocated = parseFloat(fields.budgetAllocated) || 0
    if (fields.budgetUsed !== undefined) data.budgetUsed = parseFloat(fields.budgetUsed) || 0
    if (fields.active !== undefined) data.active = fields.active

    const record = await db.costCenter.update({ where: { id }, data })

    afterMutation('accounting')
    broadcastEvent('cost-center:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostCenters API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update cost center', 500, msg.substring(0, 300))
  }
}

// ─── DELETE: Delete Cost Center ────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return cachedError('ID is required', 400)

    const existing = await db.costCenter.findUnique({ where: { id } })
    if (!existing) return cachedError('Cost center not found', 404)

    await db.costCenter.delete({ where: { id } })
    afterMutation('accounting')
    broadcastEvent('cost-center:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('CostCenters API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete cost center', 500, msg.substring(0, 300))
  }
}
