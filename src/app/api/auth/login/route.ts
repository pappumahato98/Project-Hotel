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
import { findFallbackUser, isDatabaseError } from '@/lib/auth/fallback-users'

// ─── In-memory rate limiter ─────────────────────────────────────
// Tracks both IP and email independently.
// IP limit: prevents brute-force from a single source
// Email limit: prevents distributed brute-force on one account

interface RateEntry {
  count: number
  resetAt: number
}

const ipAttempts = new Map<string, RateEntry>()
const emailAttempts = new Map<string, RateEntry>()
const IP_MAX = 10        // max failed attempts per IP
const EMAIL_MAX = 8      // max failed attempts per email
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function cleanupMap(map: Map<string, RateEntry>) {
  const now = Date.now()
  for (const [key, entry] of map) {
    if (entry.resetAt <= now) map.delete(key)
  }
}

function checkRate(
  ip: string,
  email: string,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  cleanupMap(ipAttempts)
  cleanupMap(emailAttempts)

  const ipEntry = ipAttempts.get(ip)
  const emailEntry = emailAttempts.get(email.toLowerCase())

  let retryAfter: number | undefined

  if (ipEntry && ipEntry.resetAt > now && ipEntry.count >= IP_MAX) {
    retryAfter = Math.ceil((ipEntry.resetAt - now) / 1000)
  }
  if (emailEntry && emailEntry.resetAt > now && emailEntry.count >= EMAIL_MAX) {
    const emailRetry = Math.ceil((emailEntry.resetAt - now) / 1000)
    if (!retryAfter || emailRetry > retryAfter) retryAfter = emailRetry
  }

  if (retryAfter) return { allowed: false, retryAfter }
  return { allowed: true }
}

function recordFailed(ip: string, email: string) {
  const now = Date.now()
  const lower = email.toLowerCase()

  const ipEntry = ipAttempts.get(ip)
  if (!ipEntry || ipEntry.resetAt <= now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    ipEntry.count++
  }

  const emailEntry = emailAttempts.get(lower)
  if (!emailEntry || emailEntry.resetAt <= now) {
    emailAttempts.set(lower, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    emailEntry.count++
  }
}

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

    // Rate limit check (per-IP + per-email)
    const rateCheck = checkRate(clientIp, email)
    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        level: 'warning',
        ipAddress: clientIp,
        userAgent: getClientUA(req),
        path: '/api/auth/login',
        method: 'POST',
        details: `Login rate limit exceeded. email=${email} retryAfter=${rateCheck.retryAfter}s`,
      })
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
        { status: 429 },
      )
    }

    // ── Try database first ──
    let user: {
      id: string; email: string; passwordHash: string | null; active: boolean
      firstName: string; lastName: string; role: string; department: string
      position: string; avatarUrl: string | null; phone: string | null
    } | null = null
    let usedFallback = false
    let dbReachable = true
    let dbEmpty = false

    try {
      const dbUser = await db.authUser.findUnique({
        where: { email: email.toLowerCase() },
      })
      if (dbUser) {
        user = dbUser
      } else {
        // User not found — check if the table is empty (first-time setup)
        dbEmpty = (await db.authUser.count()) === 0
      }
    } catch (dbErr: unknown) {
      const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.error('[auth] Database query error:', errMsg)

      if (isDatabaseError(dbErr)) {
        // Genuine connection failure — try fallback (dev only)
        dbReachable = false
        console.warn('[auth] Database unreachable, trying fallback auth')
        const fallback = await findFallbackUser(email)
        if (fallback) {
          user = fallback
          usedFallback = true
        }
      } else {
        // Schema/query error (NOT a connection issue) — log and fail
        console.error('[auth] Database schema/query error (not a connection issue):', errMsg.substring(0, 300))
        return NextResponse.json(
          { error: 'Authentication service error. Please contact administrator.', detail: 'DB_SCHEMA_ERROR' },
          { status: 500 },
        )
      }
    }

    // If DB is reachable but empty, return a helpful message
    if (dbReachable && dbEmpty && !user) {
      console.warn('[auth] No users in database. Run POST /api/db-setup to seed default users.')
      return NextResponse.json(
        {
          error: 'No user accounts found in database.',
          hint: 'Run POST /api/db-setup to seed default admin accounts, then try again.',
          code: 'DB_EMPTY',
        },
        { status: 401 },
      )
    }

    if (!user || !user.active) {
      recordFailed(clientIp, email)
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
      recordFailed(clientIp, email)
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

    // ── Login successful ──
    const accessToken = await signAccessToken(user)
    const { raw: refreshTokenRaw, hash: refreshTokenHash } = generateRefreshToken()
    const csrf = generateCsrfToken()

    // Store refresh token in DB (skip if using fallback — no DB available)
    if (!usedFallback) {
      try {
        await db.refreshToken.create({
          data: {
            tokenHash: refreshTokenHash,
            userId: user.id,
            userAgent: getClientUA(req),
            ipAddress: clientIp,
            expiresAt: getRefreshTokenExpiry(),
          },
        })
        await db.authUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
      } catch {
        // DB write failed — non-critical
      }
    }

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
