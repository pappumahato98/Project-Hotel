import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const hash = hashPassword(password)
  return hash === hashedPassword
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, currentPassword, newPassword } = body

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, current password, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const user = await db.authUser.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    const valid = verifyPassword(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    const newHashedPassword = hashPassword(newPassword)

    await db.authUser.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    })

    // Log password change activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
        action: 'Change Password',
        module: 'Security',
        details: 'User changed their account password',
      },
    })

    return NextResponse.json({
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
