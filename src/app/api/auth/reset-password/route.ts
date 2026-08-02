import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Hash the token to look up in DB
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const resetRecord = await db.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, active: true } } },
    })

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    if (resetRecord.usedAt) {
      return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 })
    }

    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 })
    }

    if (!resetRecord.user.active) {
      return NextResponse.json({ error: 'Account is not active. Contact administrator.' }, { status: 403 })
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.authUser.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    })

    // Mark token as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    })

    // Delete all refresh tokens for this user (force re-login)
    await db.refreshToken.deleteMany({ where: { userId: resetRecord.userId } })

    logSecurityEvent({
      type: 'password_change',
      level: 'info',
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      ipAddress: getClientIp(req),
      path: '/api/auth/reset-password',
      method: 'POST',
      details: 'Password reset via token',
    })

    return NextResponse.json({ message: 'Password reset successful. You can now sign in with your new password.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
