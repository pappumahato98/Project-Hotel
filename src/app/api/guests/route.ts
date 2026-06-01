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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      firstName, lastName, email, phone, nationality,
      idType, idNumber, dateOfBirth, gender, address, city, country,
      vipLevel,
    } = body

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const guest = await db.guest.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        nationality: nationality || null,
        idType: idType || null,
        idNumber: idNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        address: address || null,
        city: city || null,
        country: country || null,
        vipLevel: vipLevel || 'none',
      },
    })

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Create guest error:', error)
    return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 })
  }
}
