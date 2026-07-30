import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'

// GET /api/guests/[id] — Fetch single guest
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const guest = await db.guest.findUnique({
      where: { id },
      include: {
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { room: { select: { number: true, type: { select: { name: true } } } } },
        },
      },
    })
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }
    return NextResponse.json({ guest })
  } catch (error) {
    console.error('Fetch guest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/guests/[id] — Update guest
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await req.json()

    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'nationality',
      'idType', 'idNumber', 'dateOfBirth', 'gender', 'address',
      'city', 'country', 'vipLevel', 'preferences', 'loyaltyPoints',
      'loyaltyTier', 'notes',
    ]

    const data: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate name not empty
    if (data.firstName !== undefined && (!data.firstName || String(data.firstName).trim() === '')) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }
    if (data.lastName !== undefined && (!data.lastName || String(data.lastName).trim() === '')) {
      return NextResponse.json({ error: 'Last name is required' }, { status: 400 })
    }

    const updated = await db.guest.update({
      where: { id },
      data,
    })

    return NextResponse.json({ guest: updated, message: 'Guest updated successfully' })
  } catch (error) {
    console.error('Update guest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}