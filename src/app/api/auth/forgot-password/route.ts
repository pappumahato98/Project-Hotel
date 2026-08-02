import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/auth-helpers'

// ─── POST /api/auth/forgot-password ─────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Parse body
    let email: string | undefined
    try {
      const body = await req.json()
      email = body.email
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const clientIp = getClientIp(req)

    // Find user (case-insensitive via lowercase normalization)
    const user = await db.authUser.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return the same generic response regardless of whether user exists
    // This prevents user enumeration (security best practice)
    if (!user || !user.active) {
      logSecurityEvent({
        type: 'password_change_failure' as any,
        level: 'info',
        email: normalizedEmail,
        ipAddress: clientIp,
        path: '/api/auth/forgot-password',
        method: 'POST',
        details: 'Password reset requested for non-existent or inactive account',
      })
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been generated.',
      })
    }

    // Generate a 48-byte random token → hex = 96 chars
    const rawToken = randomBytes(48).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    // Delete any previous unused resets for this user
    await db.passwordReset.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    })

    // Store the hashed token with 1-hour expiry
    await db.passwordReset.create({
      data: {
        tokenHash,
        userId: user.id,
        ipAddress: clientIp,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // Log security event
    logSecurityEvent({
      type: 'password_change' as any,
      level: 'info',
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      path: '/api/auth/forgot-password',
      method: 'POST',
      details: 'Password reset token generated',
    })

    // Return the raw token in the response (no email service — frontend uses it directly)
    return NextResponse.json({
      message: 'Reset token generated successfully.',
      token: rawToken,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 },
    )
  }
}
