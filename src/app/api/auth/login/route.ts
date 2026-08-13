import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
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
import { getClientIp, getClientUA, checkRateLimit } from '@/lib/security/auth-helpers'
import { findFallbackUser, isDatabaseError, errorSummary } from '@/lib/auth/fallback-users'
import { prewarm } from '@/lib/cache'
import { fetchKpis, fetchAlerts, fetchActivity } from '@/app/api/dashboard/_data'

// ─── POST /api/auth/login ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  try {
    // Parse body first so we can check email-based rate limit
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

    // Rate limit check (per-IP + per-email) using shared sliding-window limiter
    const ipRateErr = await checkRateLimit(req, 'auth:login')
    if (ipRateErr) {
      logSecurityEvent({
        type: 'rate_limit_exceeded', level: 'warning',
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/login', method: 'POST',
        details: `Login IP rate limit exceeded. email=${email}`,
      })
      return ipRateErr
    }

    const emailRateErr = await checkRateLimit(req, 'auth:login:email', `auth:login:email:${email.toLowerCase()}`)
    if (emailRateErr) {
      logSecurityEvent({
        type: 'rate_limit_exceeded', level: 'warning',
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/login', method: 'POST',
        details: `Login email rate limit exceeded. email=${email}`,
      })
      return emailRateErr
    }

    // ── Try database first ──
    let user: {
      id: string; email: string; passwordHash: string | null; active: boolean
      firstName: string; lastName: string; role: string; department: string
      position: string; avatarUrl: string | null; phone: string | null; gender: string | null
    } | null = null
    let usedFallback = false
    let dbReachable = true

    // Helper: try DB query with one retry on connection errors
    async function queryWithRetry<T>(fn: () => Promise<T>): Promise<T> {
      try {
        return await fn()
      } catch (err) {
        if (isDatabaseError(err)) {
          console.warn('[auth] DB connection error, retrying in 500ms...')
          await new Promise(r => setTimeout(r, 500))
          return fn()
        }
        throw err
      }
    }

    try {
      const dbUser = await queryWithRetry(() =>
        db.authUser.findUnique({ where: { email: email.toLowerCase() } })
      )
      if (dbUser) {
        user = dbUser
      }
      // NOTE: Removed db.authUser.count() — saves an extra DB round-trip.
      // If user not found, we just return 401 ("Invalid email or password")
      // which is the correct security response anyway. The DB_EMPTY hint
      // is only useful for first-time setup, which is a one-time event.
    } catch (dbErr: unknown) {
      console.error('[auth] Database query error:', errorSummary(dbErr))

      if (isDatabaseError(dbErr)) {
        dbReachable = false
        console.warn('[auth] Database unreachable after retry, trying fallback auth')
        const fallback = await findFallbackUser(email)
        if (fallback) {
          user = fallback
          usedFallback = true
        }
        // In production without fallback, return a user-friendly message
        if (!user) {
          return NextResponse.json(
            { error: 'Service is busy. Please wait a moment and try again.', detail: 'DB_UNREACHABLE' },
            { status: 503, headers: { 'Retry-After': '5' } },
          )
        }
      } else {
        console.error('[auth] Database schema/query error (not a connection issue):', errorSummary(dbErr))
        return NextResponse.json(
          { error: 'Authentication service error. Please contact administrator.', detail: 'DB_SCHEMA_ERROR' },
          { status: 500 },
        )
      }
    }

    if (!user || !user.active) {
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
      logSecurityEvent({
        type: 'auth_failure', level: 'warning',
        userId: user.id, email: user.email,
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/login', method: 'POST',
        details: 'Invalid password attempt',
      })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // ── Login successful ──
    const accessToken = await signAccessToken(user)
    const { raw: refreshTokenRaw, hash: refreshTokenHash } = generateRefreshToken()
    const csrf = generateCsrfToken()
    const tokenFamilyId = randomUUID()

    // Store refresh token + update lastLogin in parallel (non-blocking)
    if (!usedFallback) {
      Promise.all([
        db.refreshToken.create({
          data: {
            tokenHash: refreshTokenHash, userId: user.id, tokenFamilyId,
            userAgent: getClientUA(req), ipAddress: clientIp,
            expiresAt: getRefreshTokenExpiry(),
          },
        }),
        db.authUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      ]).catch(() => {})
    }

    // Audit log
    logSecurityEvent({
      type: 'auth_success', level: 'info',
      userId: user.id, email: user.email,
      ipAddress: clientIp, userAgent: getClientUA(req),
      path: '/api/auth/login', method: 'POST',
    })

    // Pre-warm dashboard cache in background so it's ready when user lands there
    if (!usedFallback) {
      prewarm('dashboard:kpis', fetchKpis)
      prewarm('dashboard:alerts', fetchAlerts)
      prewarm('dashboard:activity', fetchActivity)
    }

    const cookieOptions = getRefreshCookieOptions()
    const refreshCookie = [
      `${REFRESH_COOKIE_NAME}=${refreshTokenRaw}`,
      `HttpOnly=${cookieOptions.httpOnly}`,
      cookieOptions.secure ? 'Secure' : '',
      `SameSite=${cookieOptions.sameSite.charAt(0).toUpperCase() + cookieOptions.sameSite.slice(1)}`,
      `Path=${cookieOptions.path}`,
      `Max-Age=${cookieOptions.maxAge}`,
    ].filter(Boolean).join('; ')

    const response = NextResponse.json(
      {
        accessToken,
        csrfToken: csrf.token,
        user: {
          id: user.id, email: user.email,
          firstName: user.firstName, lastName: user.lastName,
          role: user.role, department: user.department,
          position: user.position, avatarUrl: user.avatarUrl, phone: user.phone,
          gender: user.gender,
        },
      },
    )

    response.headers.append('Set-Cookie', refreshCookie)
    response.headers.append('Set-Cookie', csrf.setCookieHeader)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}
