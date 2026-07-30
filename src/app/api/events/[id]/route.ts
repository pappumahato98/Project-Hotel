import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const event = await db.event.findUnique({ where: { id } })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Event GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

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
    if (body.name) data.name = body.name
    if (body.organizerName) data.organizerName = body.organizerName
    if (body.organizerPhone !== undefined) data.organizerPhone = body.organizerPhone
    if (body.organizerEmail !== undefined) data.organizerEmail = body.organizerEmail
    if (body.eventType) data.eventType = body.eventType
    if (body.venue !== undefined) data.venue = body.venue
    if (body.startDate) data.startDate = new Date(body.startDate)
    if (body.endDate) data.endDate = new Date(body.endDate)
    if (body.expectedPax !== undefined) data.expectedPax = body.expectedPax
    if (body.status) data.status = body.status
    if (body.totalRevenue !== undefined) data.totalRevenue = body.totalRevenue
    if (body.depositAmount !== undefined) data.depositAmount = body.depositAmount
    if (body.depositPaid !== undefined) data.depositPaid = body.depositPaid
    if (body.notes !== undefined) data.notes = body.notes

    const event = await db.event.update({
      where: { id },
      data,
    })

    broadcastEvent('event:updated', event)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Event PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
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
    await db.event.delete({ where: { id } })
    broadcastEvent('event:deleted', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
