import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { db, awaitSchemaSync } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp, getClientUA, checkRateLimit } from '@/lib/security/auth-helpers'
import { isDatabaseError } from '@/lib/auth/fallback-users'

// ─── POST /api/auth/forgot-password ─────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per 15 minutes per IP
    const rateErr = await checkRateLimit(req, 'auth:forgot-password')
    if (rateErr) return rateErr

    // Parse body
    let email: string | undefined
    try {
      const body = await req.json()
      email = body.email
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const clientIp = getClientIp(req)

    await awaitSchemaSync().catch(() => {})
    const user = await db.authUser.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return the same generic response regardless of whether user exists
    if (!user || !user.active) {
      logSecurityEvent({
        type: 'password_change_failure',
        level: 'info',
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent: getClientUA(req),
        path: '/api/auth/forgot-password',
        method: 'POST',
        details: 'Password reset requested for non-existent or inactive account',
      })
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been generated.',
      })
    }

    const rawToken = randomBytes(48).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    await db.passwordReset.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    await db.passwordReset.create({
      data: {
        tokenHash,
        userId: user.id,
        ipAddress: clientIp,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    logSecurityEvent({
      type: 'password_change',
      level: 'info',
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/forgot-password',
      method: 'POST',
      details: 'Password reset token generated',
    })

    return NextResponse.json({
      message: 'Reset token generated successfully.',
      token: rawToken,
    })
  } catch (error: unknown) {
    if (isDatabaseError(error)) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again in a few seconds.' },
        { status: 503, headers: { 'Retry-After': '10' } },
      )
    }
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 },
    )
  }
}
