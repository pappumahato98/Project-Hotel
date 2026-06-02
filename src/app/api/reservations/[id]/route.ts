import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        guest: true,
        room: { include: { type: true } },
        folios: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        },
        property: { select: { id: true, name: true, currency: true, taxRate: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Reservation detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle special status transitions
    if (body.status === 'checked_in' && body.roomId) {
      await db.room.update({
        where: { id: body.roomId },
        data: { status: 'occupied' },
      })
    }

    if (body.status === 'checked_out' && body.roomId) {
      await db.room.update({
        where: { id: body.roomId },
        data: { status: 'vacant_dirty' },
      })
    }

    const reservation = await db.reservation.update({
      where: { id },
      data: body,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, vipLevel: true } },
        room: { select: { id: true, number: true, floor: true, wing: true, type: { select: { name: true, code: true } } } },
        folios: { select: { id: true, balance: true, status: true } },
      },
    })

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Update reservation error:', error)
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.reservation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete reservation error:', error)
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
  }
}
