import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/profile?userId=xxx — Fetch user profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const user = await db.authUser.findUnique({
      where: { id: userId },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Also fetch Employee record for hire date
    const employee = await db.employee.findFirst({
      where: { email: user.email },
      select: { hireDate: true },
    })

    return NextResponse.json({
      user: { ...user, hireDate: employee?.hireDate ?? null },
    })
  } catch (error) {
    console.error('Fetch profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/auth/profile — Update user profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Allowed fields for profile update
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone',
      'dateOfBirth', 'gender', 'address', 'city', 'country', 'nationality',
      'idType', 'idNumber', 'twoFactorEnabled',
    ]

    const data: Record<string, string | boolean | null> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        data[key] = updates[key]
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
    if (data.email && data.email !== '') {
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

    return NextResponse.json({ user: updated, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
