import { db, awaitSchemaSync } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { getOrSet, invalidateCache } from '@/lib/cache'

// GET /api/auth/profile — Fetch current user's profile (session-derived)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const data = await getOrSet(`auth:profile:${auth.user.userId}`, async () => {
      // requireAuth() already fetched authUser and returned auth.user — don't re-fetch.
      // Only fetch the employee record (hireDate) which requireAuth doesn't provide.
      let hireDate: string | null = null
      try {
        const employee = await db.employee.findFirst({
          where: { email: auth.user.email },
          select: { hireDate: true },
        })
        hireDate = employee?.hireDate ?? null
      } catch {
        // DB unavailable — continue without hireDate
      }

      return { user: { ...auth.user, hireDate } }
    }, 60000)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Fetch profile error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', detail: msg.substring(0, 300) },
      { status: 500 }
    )
  }
}

// PUT /api/auth/profile — Update current user's own profile (session-derived)
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    // Use session-derived userId — ignore any userId in the body
    const userId = auth.user.userId

    // Allowed fields for profile update
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone',
      'dateOfBirth', 'gender', 'address', 'city', 'country', 'nationality',
      'idType', 'idNumber', 'twoFactorEnabled', 'avatarUrl',
    ]

    const data: Record<string, string | boolean | null> = {}
    for (const key of allowedFields) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate firstName/lastName not empty
    if (data.firstName !== undefined && (!data.firstName || String(data.firstName).trim() === '')) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }
    if (data.lastName !== undefined && (!data.lastName || String(data.lastName).trim() === '')) {
      return NextResponse.json({ error: 'Last name is required' }, { status: 400 })
    }

    // Check for email uniqueness if changing email
    if (data.email && String(data.email).trim() !== '') {
      await awaitSchemaSync().catch(() => {})
      const existing = await db.authUser.findFirst({
        where: { email: String(data.email).toLowerCase(), NOT: { id: userId } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Email address is already in use' }, { status: 409 })
      }
      data.email = String(data.email).toLowerCase()
    }

    const updated = await db.authUser.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        position: true,
        avatarUrl: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        country: true,
        nationality: true,
        idType: true,
        idNumber: true,
        twoFactorEnabled: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log activity
    const changedFields = Object.keys(data).join(', ')
    await db.activityLog.create({
      data: {
        userId: updated.id,
        userName: `${updated.firstName} ${updated.lastName}`,
        action: 'profile_update',
        module: 'Profile',
        details: `Updated profile fields: ${changedFields}`,
      },
    })

    invalidateCache('auth:profile:' + userId)

    return NextResponse.json({ user: updated, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}