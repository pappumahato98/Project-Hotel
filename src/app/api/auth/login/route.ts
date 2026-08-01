import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from '@/lib/auth/token'
import { generateCsrfToken } from '@/lib/auth/csrf'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp, getClientUA } from '@/lib/security/auth-helpers'

// ─── In-memory rate limiter ─────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function cleanupRateLimits() {
  const now = Date.now()
  for (const [ip, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(ip)
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  cleanupRateLimits()
  const entry = loginAttempts.get(ip)
  if (!entry) return { allowed: true }
  if (entry.resetAt <= Date.now()) {
    loginAttempts.delete(ip)
    return { allowed: true }
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000) }
  }
  return { allowed: true }
}

function recordFailedAttempt(ip: string) {
  cleanupRateLimits()
  const entry = loginAttempts.get(ip)
  if (!entry) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS })
  } else {
    entry.count++
  }
}

// ─── POST /api/auth/login ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  // Rate limit check
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      level: 'warning',
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/login',
      method: 'POST',
      details: `Login rate limit exceeded for IP. retryAfter=${rateCheck.retryAfter}s`,
    })
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
      { status: 429 },
    )
  }

  // Parse body
  let email: string | undefined
  let password: string | undefined
  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Find user
  const user = await db.authUser.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user || !user.active) {
    recordFailedAttempt(clientIp)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'No password set for this account. Contact administrator.' },
      { status: 401 },
    )
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    recordFailedAttempt(clientIp)
    logSecurityEvent({
      type: 'auth_failure',
      level: 'warning',
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/login',
      method: 'POST',
      details: 'Invalid password attempt',
    })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // Generate tokens
  const accessToken = await signAccessToken(user)
  const { raw: refreshTokenRaw, hash: refreshTokenHash } = generateRefreshToken()
  const csrf = generateCsrfToken()

  // Store refresh token in DB
  await db.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId: user.id,
      userAgent: getClientUA(req),
      ipAddress: clientIp,
      expiresAt: getRefreshTokenExpiry(),
    },
  })

  // Update last login
  await db.authUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  // Log success
  logSecurityEvent({
    type: 'auth_success',
    level: 'info',
    userId: user.id,
    email: user.email,
    ipAddress: clientIp,
    userAgent: getClientUA(req),
    path: '/api/auth/login',
    method: 'POST',
  })

  // Build response with cookies
  const cookieOptions = getRefreshCookieOptions()
  const refreshCookie = [
    `${REFRESH_COOKIE_NAME}=${refreshTokenRaw}`,
    `HttpOnly=${cookieOptions.httpOnly}`,
    cookieOptions.secure ? 'Secure' : '',
    `SameSite=${cookieOptions.sameSite.charAt(0).toUpperCase() + cookieOptions.sameSite.slice(1)}`,
    `Path=${cookieOptions.path}`,
    `Max-Age=${cookieOptions.maxAge}`,
  ].filter(Boolean).join('; ')

  return NextResponse.json(
    {
      accessToken,
      csrfToken: csrf.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        position: user.position,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
    },
    {
      headers: {
        'Set-Cookie': [refreshCookie, csrf.setCookieHeader].join(', '),
      },
    },
  )
}
