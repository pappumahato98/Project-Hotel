import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const room = await db.room.findUnique({
      where: { id },
      include: {
        type: true,
        property: true,
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
        reservation: {
          select: { id: true, confirmationNo: true, checkIn: true, checkOut: true, roomRate: true, adults: true, children: true, source: true },
          where: { status: { in: ['confirmed', 'checked_in'] } },
          orderBy: { checkIn: 'desc' },
          take: 1,
        },
      },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    return NextResponse.json({ room })
  } catch (error) {
    console.error('Room GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, previousStatus } = body

    // If setting to out_of_order, save the current status as previousStatus
    // If restoring from out_of_order, use the saved previousStatus
    const room = await db.room.findUnique({ where: { id } })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) {
      updateData.status = status
      if (status === 'out_of_order' && !room.previousStatus) {
        // Save current status before going OOO
        updateData.previousStatus = room.status
      }
      if (room.status === 'out_of_order' && status !== 'out_of_order' && room.previousStatus) {
        // When leaving OOO, the caller can pass previousStatus explicitly
        // to override the auto-restore, otherwise we clear it
        if (previousStatus !== undefined) {
          updateData.previousStatus = previousStatus
        }
        // Note: we don't auto-clear previousStatus here; the frontend
        // handles the restore logic
      }
    }
    // Allow explicit previousStatus from the caller (e.g., clearing it)
    if (previousStatus !== undefined && status === undefined) {
      updateData.previousStatus = previousStatus
    }

    const updated = await db.room.update({
      where: { id },
      data: updateData,
      include: {
        type: true,
        property: true,
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true, phone: true, nationality: true } },
        reservation: {
          select: { id: true, confirmationNo: true, checkIn: true, checkOut: true, roomRate: true, adults: true, children: true, source: true },
          where: { status: { in: ['confirmed', 'checked_in'] } },
          orderBy: { checkIn: 'desc' },
          take: 1,
        },
      },
    })
    return NextResponse.json({ room: updated })
  } catch (error) {
    console.error('Room PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}