import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, hashPassword, isLegacyHash } from '@/lib/security'
import { createSession, loginLimiter, logSecurityEvent } from '@/lib/security'
import { getClientIp, getClientUA } from '@/lib/security/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting by IP
    const ip = getClientIp(req)
    const rateResult = loginLimiter(ip)
    if (!rateResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded', level: 'warning',
        ipAddress: ip, path: '/api/auth/login', method: 'POST',
        email: email.toLowerCase(),
        details: `Login rate limit exceeded for IP: ${ip}`,
      })
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.', retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const user = await db.authUser.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      await logSecurityEvent({
        type: 'auth_failure', level: 'info',
        ipAddress: ip, path: '/api/auth/login', method: 'POST',
        email: email.toLowerCase(), details: 'Login attempt with non-existent email',
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      await logSecurityEvent({
        type: 'auth_failure', level: 'warning',
        userId: user.id, email: user.email,
        ipAddress: ip, path: '/api/auth/login', method: 'POST',
        details: 'Login attempt with wrong password',
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await db.authUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Migrate legacy SHA-256 hash to bcrypt in background (don't block response)
    if (isLegacyHash(user.password)) {
      hashPassword(password).then(hashed =>
        db.authUser.update({ where: { id: user.id }, data: { password: hashed } }).catch(() => {})
      )
    }

    // Create server-side session
    const token = await createSession(user, {
      ipAddress: ip,
      userAgent: getClientUA(req),
    })

    await logSecurityEvent({
      type: 'auth_success', level: 'info',
      userId: user.id, email: user.email,
      ipAddress: ip, path: '/api/auth/login', method: 'POST',
      details: `User logged in successfully (role: ${user.role})`,
    })

    const { password: _, ...safeUser } = user

    return NextResponse.json({
      user: safeUser,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}