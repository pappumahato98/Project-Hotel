import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const vipLevel = searchParams.get('vipLevel')

    const where: Prisma.GuestWhereInput = {}

    if (search) {
      // Build OR conditions for direct guest fields + relation-based search
      const directConditions: Prisma.GuestWhereInput[] = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { nationality: { contains: search } },
        // Company search through reservations
        {
          reservations: {
            some: {
              company: { contains: search },
            },
          },
        },
        // Room number search through reservations → rooms
        {
          reservations: {
            some: {
              room: {
                number: { contains: search },
              },
            },
          },
        },
      ]

      where.OR = directConditions
    }

    if (vipLevel) {
      where.vipLevel = vipLevel
    }

    const guests = await db.guest.findMany({
      where,
      // Limit results when searching to prevent flooding with single-char queries
      ...(search ? { take: 20 } : {}),
      include: {
        reservations: {
          select: {
            id: true,
            confirmationNo: true,
            status: true,
            checkIn: true,
            checkOut: true,
            company: true,
            room: { select: { number: true } },
          },
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

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
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

    const guest = await withRetry(() => db.guest.create({
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
    }))

    afterMutation('guests')
    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Create guest error:', error)
    return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 })
  }
}