import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')

    const cacheKey = `grievances:${status || ''}:${type || ''}:${priority || ''}`
    const data = await getOrSet(cacheKey, async () => {
      const where: Prisma.GrievanceWhereInput = {}

      if (status) where.status = status
      if (type) where.type = type
      if (priority) where.priority = priority

      const grievances = await db.grievance.findMany({
        where,
        include: { actions: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      // Compute stats
      const allGrievances = await db.grievance.findMany({ take: 1000 })
      const openCount = allGrievances.filter(g => g.status === 'open' || g.status === 'investigating').length
      const criticalCount = allGrievances.filter(g => g.priority === 'critical' && g.status !== 'closed' && g.status !== 'withdrawn').length
      const pendingInvestigation = allGrievances.filter(g => g.status === 'investigating').length

      // Disciplinary action stats
      const allActions = await db.disciplinaryAction.findMany({ take: 500 })
      const activeActions = allActions.filter(a => a.status === 'issued' || a.status === 'acknowledged').length

      return {
        grievances,
        stats: { openCount, criticalCount, pendingInvestigation, activeActions },
      }
    }, 60000)

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Grievances API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch grievances', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager', 'supervisor', 'staff'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      type, priority, category, title, description,
      raisedById, raisedByName, raisedByDept, raisedDate,
      assignedToId, assignedToName, isAnonymous, notes,
    } = body

    if (!title || !description || !raisedById || !raisedByName) {
      return cachedError('Missing required fields: title, description, raisedById, raisedByName', 400)
    }

    // Generate grievance number
    const count = await db.grievance.count()
    const grievanceNumber = `GRV-${String(count + 1).padStart(4, '0')}`

    const record = await db.grievance.create({
      data: {
        grievanceNumber,
        type: type || 'complaint',
        priority: priority || 'medium',
        category: category || null,
        title,
        description,
        raisedById,
        raisedByName: isAnonymous ? 'Anonymous' : raisedByName,
        raisedByDept: isAnonymous ? '' : (raisedByDept || ''),
        raisedDate: raisedDate || new Date().toISOString().split('T')[0],
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        isAnonymous: isAnonymous ?? false,
        notes: notes || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('grievance:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Grievances API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create grievance', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return cachedError('Grievance ID is required', 400)
    }

    const allowedFields = [
      'type', 'priority', 'category', 'title', 'description',
      'assignedToId', 'assignedToName', 'status',
      'resolution', 'resolvedDate', 'resolvedById', 'resolvedByName',
      'notes',
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        data[field] = updates[field] || null
      }
    }

    // Auto-set resolved date and resolver
    if (updates.status === 'resolved') {
      data.resolvedDate = new Date().toISOString().split('T')[0]
      data.resolvedById = updates.resolvedById || auth.userId
      data.resolvedByName = updates.resolvedByName || (auth.firstName + ' ' + auth.lastName)
    }

    const record = await db.grievance.update({
      where: { id },
      data,
    })

    afterMutation('hr')
    broadcastEvent('grievance:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Grievances API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update grievance', 500, msg.substring(0, 300))
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return cachedError('Grievance ID is required', 400)
    }

    const record = await db.grievance.delete({ where: { id } })
    afterMutation('hr')
    broadcastEvent('grievance:deleted', record)
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Grievances API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete grievance', 500, msg.substring(0, 300))
  }
}
