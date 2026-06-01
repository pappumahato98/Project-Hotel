import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const vipLevel = searchParams.get('vipLevel')

    const where: Prisma.GuestWhereInput = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nationality: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (vipLevel) {
      where.vipLevel = vipLevel
    }

    const guests = await db.guest.findMany({
      where,
      include: {
        reservations: {
          select: { id: true, confirmationNo: true, status: true, checkIn: true, checkOut: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.guest.count({ where })

    return NextResponse.json({ guests, total })
  } catch (error) {
    console.error('Guests API error:', error)
    return NextResponse.json({ error: 'Failed to fetch guest profiles' }, { status: 500 })
  }
}
