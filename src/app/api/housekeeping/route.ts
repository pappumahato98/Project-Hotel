import { NextRequest, NextResponse } from 'next/server'
import { db, requireDb, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, getSettingsMap, afterMutation } from '@/lib/cache'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const dbErr = await requireDb(request)
  if (dbErr) return dbErr
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const section = searchParams.get('section')

    // Lost & Found section
    if (section === 'lost-found') {
      const lfStatus = searchParams.get('lfStatus')
      const lfCategory = searchParams.get('lfCategory')

      const lfWhere: Prisma.LostFoundWhereInput = {}
      if (lfStatus) lfWhere.status = lfStatus
      if (lfCategory) lfWhere.category = lfCategory

      const cacheKey = `housekeeping:lost-found:${lfStatus || ''}:${lfCategory || ''}`
      const items = await getOrSet(cacheKey, async () => {
        return db.lostFound.findMany({
          where: lfWhere,
          orderBy: { foundDate: 'desc' },
        })
      }, 60000)

      return cachedJson(items, request, { tier: 'medium' })
    }

    // Inspection audit history
    if (section === 'inspection-audit') {
      const taskId = searchParams.get('taskId')
      const roomId = searchParams.get('roomId')
      const where: Prisma.HkInspectionAuditWhereInput = {}
      if (taskId) where.hkTaskId = taskId
      if (roomId) where.roomId = roomId

      const cacheKey = `housekeeping:inspection-audit:${taskId || ''}:${roomId || ''}`
      const audits = await getOrSet(cacheKey, async () => {
        return db.hkInspectionAudit.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      }, 60000)
      return cachedJson(audits, request, { tier: 'medium' })
    }

    // Tasks section (default)
    const where: Prisma.HkTaskWhereInput = {}
    if (status) where.status = status
    if (priority) where.priority = priority

    const cacheKey = `housekeeping:tasks:${status || ''}:${priority || ''}`
    const result = await getOrSet(cacheKey, async () => {
      const tasks = await db.hkTask.findMany({
        where,
        include: {
          room: {
            select: {
              id: true, number: true, floor: true, wing: true, status: true,
              type: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledTime: 'asc' },
        ],
      })

      // Summary counts
      const summary = {
        total: tasks.length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        assigned: tasks.filter((t) => t.status === 'assigned').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        cleaned: tasks.filter((t) => t.status === 'cleaned').length,
        inspected: tasks.filter((t) => t.status === 'inspected').length,
        failed: tasks.filter((t) => t.status === 'failed').length,
      }

      // Read settings for hotel name
      const s = await getSettingsMap()
      const hotelName = (s.hotelName as string) ?? 'Hotel'

      return {
        tasks,
        summary,
        settings: { hotelName },
      }
    }, 60000)

    return cachedJson(result, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Housekeeping API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch housekeeping data', 500, msg.substring(0, 300))
  }
}

// POST: Various housekeeping actions
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { action } = body

    // ─── Create Lost & Found ─────────────────────────────
    if (action === 'create-lost-found') {
      const { itemName, category, roomId, storageLocation, foundBy, description } = body

      const item = await db.lostFound.create({
        data: {
          itemName,
          category,
          roomId: roomId || null,
          storageLocation: storageLocation || null,
          foundBy,
          description: description || null,
        },
      })

      return NextResponse.json(item, { status: 201, headers: clearCacheHeaders() })
    }

    // ─── Claim Lost & Found ──────────────────────────────
    if (action === 'claim-lost-found') {
      const { id, claimedBy, identityVerified, claimAttachment } = body

      const item = await db.lostFound.update({
        where: { id },
        data: {
          status: 'claimed',
          claimedBy,
          claimDate: new Date(),
          identityVerified: identityVerified === true,
          claimAttachment: claimAttachment || null,
        },
      })

      return NextResponse.json(item, { headers: clearCacheHeaders() })
    }

    // ─── Reject & Reassign (with audit trail) ────────────
    if (action === 'reject-inspection') {
      const { id, performedBy, reason, checklist, photos } = body
      if (!id) return cachedError('Task ID is required', 400)
      if (!performedBy) return cachedError('Performer info is required', 400)

      // Get the task for room info
      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return cachedError('Task not found', 404)

      // Update task back to in_progress
      const task = await db.hkTask.update({
        where: { id },
        data: { status: 'in_progress' },
      })

      // Create audit record
      await db.hkInspectionAudit.create({
        data: {
          hkTaskId: id,
          roomId: existingTask.room.id,
          roomNumber: existingTask.room.number,
          action: 'reject_reassign',
          performedBy,
          reason: reason || null,
          checklistJson: checklist ? JSON.stringify(checklist) : null,
          photosJson: photos ? JSON.stringify(photos) : null,
        },
      })

      return NextResponse.json(task, { headers: clearCacheHeaders() })
    }

    // ─── Approve Inspection (with audit trail) ───────────
    if (action === 'approve-inspection') {
      const { id, performedBy, checklist, photos } = body
      if (!id) return cachedError('Task ID is required', 400)

      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return cachedError('Task not found', 404)

      // Update task to inspected
      const task = await db.hkTask.update({
        where: { id },
        data: {
          status: 'inspected',
          inspectedBy: performedBy || 'Inspector',
          completedTime: new Date(),
        },
      })

      // Create audit record
      await db.hkInspectionAudit.create({
        data: {
          hkTaskId: id,
          roomId: existingTask.room.id,
          roomNumber: existingTask.room.number,
          action: 'approve',
          performedBy: performedBy || 'Inspector',
          checklistJson: checklist ? JSON.stringify(checklist) : null,
          photosJson: photos ? JSON.stringify(photos) : null,
        },
      })

      return NextResponse.json(task, { headers: clearCacheHeaders() })
    }

    // ─── Force Mutation (with audit trail) ───────────────
    if (action === 'force-mutation') {
      const { id, performedBy, status, priority, reason } = body
      if (!id) return cachedError('Task ID is required', 400)

      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return cachedError('Task not found', 404)

      const updateData: Prisma.HkTaskUpdateInput = {}
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (status === 'inspected' || status === 'cleaned') updateData.completedTime = new Date()

      const task = await db.hkTask.update({
        where: { id },
        data: updateData,
      })

      // Create audit record for forced action
      await db.hkInspectionAudit.create({
        data: {
          hkTaskId: id,
          roomId: existingTask.room.id,
          roomNumber: existingTask.room.number,
          action: 'force_mutation',
          performedBy: performedBy || 'Unknown',
          reason: reason || `Forced status change to ${status || priority} on occupied room`,
        },
      })

      return NextResponse.json(task, { headers: clearCacheHeaders() })
    }

    // ─── Update Task Status (standard) ───────────────────
    if (action === 'update-task-status') {
      const { id, status, priority, inspectedBy } = body
      if (!id) return cachedError('Task ID is required', 400)

      const updateData: Prisma.HkTaskUpdateInput = {}
      if (status) updateData.status = status
      if (inspectedBy) updateData.inspectedBy = inspectedBy
      if (priority) updateData.priority = priority
      if (status === 'inspected' || status === 'cleaned') updateData.completedTime = new Date()

      const task = await db.hkTask.update({
        where: { id },
        data: updateData,
      })

      return NextResponse.json(task, { headers: clearCacheHeaders() })
    }

    // Legacy fallback: if no action but id+status present, treat as update-task-status
    if (!action && body.id && body.status) {
      const { id, status } = body
      const task = await db.hkTask.update({
        where: { id },
        data: { status },
      })
      return NextResponse.json(task, { headers: clearCacheHeaders() })
    }

    return cachedError('Unknown action', 400)
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Housekeeping POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to process request', 500, msg.substring(0, 300))
  }
}
