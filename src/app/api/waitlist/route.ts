import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { guestName: { contains: search } },
        { contactPhone: { contains: search } },
        { contactEmail: { contains: search } },
      ]
    }

    const entries = await db.waitlistEntry.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return cachedJson({ entries }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Waitlist GET error:', error)
    return cachedError('Failed to fetch waitlist', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { guestName, contactPhone, contactEmail, roomPreference, roomTypeId, checkInDate, checkOutDate, adults, children, priority, notes } = body

    if (!guestName || !checkInDate || !checkOutDate) {
      return cachedError('guestName, checkInDate, and checkOutDate are required', 400)
    }

    const entry = await db.waitlistEntry.create({
      data: {
        guestName,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        roomPreference: roomPreference || null,
        roomTypeId: roomTypeId || null,
        checkInDate,
        checkOutDate,
        adults: adults ?? 2,
        children: children ?? 0,
        priority: priority || 'Normal',
        notes: notes || null,
      },
    })

    return NextResponse.json({ entry }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Waitlist POST error:', error)
    return cachedError('Failed to create waitlist entry', 500)
  }
}