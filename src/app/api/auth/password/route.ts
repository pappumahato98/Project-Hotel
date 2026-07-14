import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, hashPassword, isLegacyHash, destroyAllUserSessions, passwordChangeLimiter, logSecurityEvent } from '@/lib/security'
import { requireAuth, getClientIp, getClientUA } from '@/lib/security/auth-helpers'

export async function PUT(req: NextRequest) {
  // Require authenticated session
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limiting by IP
  const ip = getClientIp(req)
  const rateResult = passwordChangeLimiter(ip)
  if (!rateResult.success) {
    await logSecurityEvent({
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

    // Use session-derived identity — ignore email in body
    const email = auth.user.email

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

    const user = await db.authUser.findUnique({
      where: { id: auth.user.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(currentPassword, user.password)
    if (!valid) {
      await logSecurityEvent({
        type: 'password_change_failure', level: 'warning',
        userId: user.id, email: user.email,
        ipAddress: ip, path: '/api/auth/password', method: 'PUT',
        details: 'Password change attempt with incorrect current password',
      })
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password with bcrypt
    const newHashedPassword = await hashPassword(newPassword)

    await db.authUser.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    })

    // Destroy ALL sessions for this user (force re-login on all devices)
    await destroyAllUserSessions(user.id)

    await logSecurityEvent({
      type: 'password_change', level: 'info',
      userId: user.id, email: user.email,
      ipAddress: ip, userAgent: getClientUA(req),
      path: '/api/auth/password', method: 'PUT',
      details: 'Password changed successfully — all sessions invalidated',
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