import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// Force recompile for new Prisma client model (HkInspectionAudit)

// ─── Settings helper ──────────────────────────────────────
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') { try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value } }
    else map[r.key] = r.value
  }
  return map
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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

      const items = await db.lostFound.findMany({
        where: lfWhere,
        orderBy: { foundDate: 'desc' },
      })

      return NextResponse.json(items)
    }

    // Inspection audit history
    if (section === 'inspection-audit') {
      const taskId = searchParams.get('taskId')
      const roomId = searchParams.get('roomId')
      const where: Prisma.HkInspectionAuditWhereInput = {}
      if (taskId) where.hkTaskId = taskId
      if (roomId) where.roomId = roomId

      const audits = await db.hkInspectionAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json(audits)
    }

    // Tasks section (default)
    const where: Prisma.HkTaskWhereInput = {}
    if (status) where.status = status
    if (priority) where.priority = priority

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
    const allTasks = await db.hkTask.findMany({ where })
    const summary = {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      assigned: allTasks.filter((t) => t.status === 'assigned').length,
      inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
      cleaned: allTasks.filter((t) => t.status === 'cleaned').length,
      inspected: allTasks.filter((t) => t.status === 'inspected').length,
      failed: allTasks.filter((t) => t.status === 'failed').length,
    }

    // Read settings for hotel name
    const s = await getSettingsMap()
    const hotelName = (s.hotelName as string) ?? 'Hotel'

    return NextResponse.json({
      tasks,
      summary,
      settings: { hotelName },
    })
  } catch (error) {
    console.error('Housekeeping API error:', error)
    return NextResponse.json({ error: 'Failed to fetch housekeeping data' }, { status: 500 })
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

      return NextResponse.json(item, { status: 201 })
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

      return NextResponse.json(item)
    }

    // ─── Reject & Reassign (with audit trail) ────────────
    if (action === 'reject-inspection') {
      const { id, performedBy, reason, checklist, photos } = body
      if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
      if (!performedBy) return NextResponse.json({ error: 'Performer info is required' }, { status: 400 })

      // Get the task for room info
      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

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

      return NextResponse.json(task)
    }

    // ─── Approve Inspection (with audit trail) ───────────
    if (action === 'approve-inspection') {
      const { id, performedBy, checklist, photos } = body
      if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

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

      return NextResponse.json(task)
    }

    // ─── Force Mutation (with audit trail) ───────────────
    if (action === 'force-mutation') {
      const { id, performedBy, status, priority, reason } = body
      if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

      const existingTask = await db.hkTask.findUnique({
        where: { id },
        include: { room: { select: { id: true, number: true } } },
      })
      if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

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

      return NextResponse.json(task)
    }

    // ─── Update Task Status (standard) ───────────────────
    if (action === 'update-task-status') {
      const { id, status, priority, inspectedBy } = body
      if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

      const updateData: Prisma.HkTaskUpdateInput = {}
      if (status) updateData.status = status
      if (inspectedBy) updateData.inspectedBy = inspectedBy
      if (priority) updateData.priority = priority
      if (status === 'inspected' || status === 'cleaned') updateData.completedTime = new Date()

      const task = await db.hkTask.update({
        where: { id },
        data: updateData,
      })

      return NextResponse.json(task)
    }

    // Legacy fallback: if no action but id+status present, treat as update-task-status
    if (!action && body.id && body.status) {
      const { id, status } = body
      const task = await db.hkTask.update({
        where: { id },
        data: { status },
      })
      return NextResponse.json(task)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Housekeeping POST error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}