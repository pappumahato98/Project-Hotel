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
    const employeeId = searchParams.get('employeeId')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')
    const grievanceId = searchParams.get('grievanceId')

    const cacheKey = `disciplinary-actions:${employeeId || ''}:${actionType || ''}:${status || ''}:${grievanceId || ''}`
    const data = await getOrSet(cacheKey, async () => {
      const where: Prisma.DisciplinaryActionWhereInput = {}

      if (employeeId) where.employeeId = employeeId
      if (actionType) where.actionType = actionType
      if (status) where.status = status
      if (grievanceId) where.grievanceId = grievanceId

      const actions = await db.disciplinaryAction.findMany({
        where,
        include: { grievance: { select: { grievanceNumber: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      // Stats
      const allActions = await db.disciplinaryAction.findMany({ take: 500 })
      const issuedCount = allActions.filter(a => a.status === 'issued').length
      const acknowledgedCount = allActions.filter(a => a.status === 'acknowledged').length
      const appealedCount = allActions.filter(a => a.status === 'appealed').length
      const activeCount = allActions.filter(a => a.status === 'issued' || a.status === 'acknowledged').length

      return {
        actions,
        stats: { issuedCount, acknowledgedCount, appealedCount, activeCount },
      }
    }, 60000)

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Disciplinary Actions API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch disciplinary actions', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      grievanceId, employeeId, employeeName, employeeDept,
      actionType, reason, incidentDate, actionDate,
      issuedById, issuedByName,
      effectiveFrom, effectiveTo, notes,
    } = body

    if (!employeeId || !employeeName || !actionType || !reason || !incidentDate || !actionDate) {
      return cachedError('Missing required fields: employeeId, employeeName, actionType, reason, incidentDate, actionDate', 400)
    }

    const record = await db.disciplinaryAction.create({
      data: {
        grievanceId: grievanceId || null,
        employeeId,
        employeeName,
        employeeDept: employeeDept || '',
        actionType,
        reason,
        incidentDate,
        actionDate,
        issuedById: issuedById || auth.userId,
        issuedByName: issuedByName || (auth.firstName + ' ' + auth.lastName),
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        notes: notes || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('disciplinary-action:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Disciplinary Actions API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create disciplinary action', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return cachedError('Disciplinary action ID is required', 400)
    }

    const allowedFields = [
      'actionType', 'reason', 'incidentDate', 'actionDate',
      'effectiveFrom', 'effectiveTo', 'status',
      'appealNotes', 'appealDate', 'appealStatus',
      'notes',
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        data[field] = updates[field] || null
      }
    }

    // Auto-set appeal date
    if (updates.status === 'appealed' && !updates.appealDate) {
      data.appealDate = new Date().toISOString().split('T')[0]
      data.appealStatus = 'pending'
    }

    const record = await db.disciplinaryAction.update({
      where: { id },
      data,
    })

    afterMutation('hr')
    broadcastEvent('disciplinary-action:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Disciplinary Actions API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update disciplinary action', 500, msg.substring(0, 300))
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return cachedError('Disciplinary action ID is required', 400)
    }

    const record = await db.disciplinaryAction.delete({ where: { id } })
    afterMutation('hr')
    broadcastEvent('disciplinary-action:deleted', record)
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Disciplinary Actions API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete disciplinary action', 500, msg.substring(0, 300))
  }
}
