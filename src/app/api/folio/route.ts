import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')
    const guestId = searchParams.get('guestId')
    const search = searchParams.get('search')

    const where: Prisma.FolioWhereInput = {}

    if (reservationId) {
      where.reservationId = reservationId
    }

    if (guestId) {
      where.guestId = guestId
    }

    if (search) {
      where.OR = [
        { guest: { firstName: { contains: search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: search, mode: 'insensitive' } } },
        { reservation: { confirmationNo: { contains: search, mode: 'insensitive' } } },
        { reservation: { room: { number: { contains: search } } } },
      ]
    }

    const folios = await db.folio.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, status: true, creditLimit: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ folios })
  } catch (error) {
    console.error('Folio API error:', error)
    return NextResponse.json({ error: 'Failed to fetch folio data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reservationId, guestId, folioType } = body

    // Check if folio already exists for this reservation
    const existingFolio = await db.folio.findFirst({
      where: { reservationId, folioType: folioType || 'guest' },
    })

    if (existingFolio) {
      return NextResponse.json({ folio: existingFolio, message: 'Folio already exists' }, { status: 200 })
    }

    const folio = await db.folio.create({
      data: {
        reservationId,
        guestId,
        folioType: folioType || 'guest',
      },
      include: {
        reservation: true,
        guest: true,
      },
    })

    return NextResponse.json({ folio }, { status: 201 })
  } catch (error) {
    console.error('Create folio error:', error)
    return NextResponse.json({ error: 'Failed to create folio' }, { status: 500 })
  }
}
