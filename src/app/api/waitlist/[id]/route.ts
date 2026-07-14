import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { guestName, contactPhone, contactEmail, roomPreference, roomTypeId, checkInDate, checkOutDate, adults, children, priority, status, notes } = body

    const data: Record<string, unknown> = {}
    if (guestName !== undefined) data.guestName = guestName
    if (contactPhone !== undefined) data.contactPhone = contactPhone || null
    if (contactEmail !== undefined) data.contactEmail = contactEmail || null
    if (roomPreference !== undefined) data.roomPreference = roomPreference || null
    if (roomTypeId !== undefined) data.roomTypeId = roomTypeId || null
    if (checkInDate !== undefined) data.checkInDate = checkInDate
    if (checkOutDate !== undefined) data.checkOutDate = checkOutDate
    if (adults !== undefined) data.adults = adults
    if (children !== undefined) data.children = children
    if (priority !== undefined) data.priority = priority
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes || null

    const entry = await db.waitlistEntry.update({
      where: { id },
      data,
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Waitlist PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update waitlist entry' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.waitlistEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete waitlist entry' }, { status: 500 })
  }
}