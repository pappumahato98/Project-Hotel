import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.subject) data.subject = body.subject
    if (body.description !== undefined) data.description = body.description
    if (body.category) data.category = body.category
    if (body.priority) data.priority = body.priority
    if (body.status) data.status = body.status
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo
    if (body.assignedName !== undefined) data.assignedName = body.assignedName
    if (body.resolution !== undefined) data.resolution = body.resolution

    if (body.status === 'resolved' || body.status === 'closed') {
      data.resolvedAt = new Date()
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data,
    })

    return NextResponse.json(ticket, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Support Ticket PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update support ticket', 500, msg.substring(0, 300))
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.supportTicket.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Support Ticket DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete support ticket', 500, msg.substring(0, 300))
  }
}
