import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAuth, getClientIp, getClientUA } from '@/lib/security/auth-helpers'
import { passwordChangeLimiter, logSecurityEvent } from '@/lib/security'

export async function PUT(req: NextRequest) {
  // Require authenticated session
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limiting by IP
  const ip = getClientIp(req)
  const rateResult = passwordChangeLimiter(ip)
  if (!rateResult.success) {
    logSecurityEvent({
      type: 'rate_limit_exceeded', level: 'warning',
      userId: auth.user.userId, email: auth.user.email,
      ipAddress: ip, path: '/api/auth/password', method: 'PUT',
      details: `Password change rate limit exceeded for user ${auth.user.email}`,
    })
    return NextResponse.json(
      { error: 'Too many password change attempts. Try again later.', retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000) },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Fetch current password hash from DB
    const user = await db.authUser.findUnique({
      where: { id: auth.user.userId },
      select: { id: true, email: true, passwordHash: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account. Contact administrator.' },
        { status: 401 }
      )
    }

    // Verify current password with bcrypt
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      logSecurityEvent({
        type: 'password_change_failure', level: 'warning',
        userId: auth.user.userId, email: auth.user.email,
        ipAddress: ip, path: '/api/auth/password', method: 'PUT',
        details: 'Password change attempt with incorrect current password',
      })
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash and update the new password
    const newHash = await bcrypt.hash(newPassword, 12)
    await db.authUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    logSecurityEvent({
      type: 'password_change', level: 'info',
      userId: auth.user.userId, email: auth.user.email,
      ipAddress: ip, userAgent: getClientUA(req),
      path: '/api/auth/password', method: 'PUT',
      details: 'Password changed successfully',
    })

    return NextResponse.json({
      message: 'Password changed successfully. Please log in again.',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
