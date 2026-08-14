import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

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
      return cachedError('Guest not found', 404)
    }
    return cachedJson({ guest }, req, { tier: 'medium' })
  } catch (error) {
    console.error('Fetch guest error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Internal server error', 500, msg.substring(0, 300))
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
      return cachedError('No valid fields to update', 400)
    }

    // Validate name not empty
    if (data.firstName !== undefined && (!data.firstName || String(data.firstName).trim() === '')) {
      return cachedError('First name is required', 400)
    }
    if (data.lastName !== undefined && (!data.lastName || String(data.lastName).trim() === '')) {
      return cachedError('Last name is required', 400)
    }

    const updated = await withRetry(() => db.guest.update({
      where: { id },
      data,
    }))

    afterMutation('guests')
    return NextResponse.json({ guest: updated, message: 'Guest updated successfully' }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Update guest error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Internal server error', 500, msg.substring(0, 300))
  }
}

// DELETE /api/guests/[id] — Delete guest
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    // Check if guest has active reservations
    const activeReservations = await db.reservation.count({
      where: {
        guestId: id,
        status: { in: ['confirmed', 'checked_in', 'tentative'] },
      },
    })

    if (activeReservations > 0) {
      return cachedError(`Cannot delete guest with ${activeReservations} active reservation(s)`, 409)
    }

    await withRetry(() => db.guest.delete({ where: { id } }))
    afterMutation('guests')
    return NextResponse.json({ success: true, message: 'Guest deleted successfully' }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Delete guest error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete guest', 500, msg.substring(0, 300))
  }
}
