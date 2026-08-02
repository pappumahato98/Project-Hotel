import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  getClearRefreshCookie,
} from '@/lib/auth/token'
import { generateCsrfToken, validateCsrf, validateOrigin } from '@/lib/auth/csrf'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp, getClientUA } from '@/lib/security/auth-helpers'

/**
 * Parse a raw cookie string into a key→value map.
 */
function parseCookies(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!cookieHeader) return map
  for (const pair of cookieHeader.split(';')) {
    const trimmed = pair.trim()
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const name = trimmed.substring(0, eqIdx).trim()
    const value = trimmed.substring(eqIdx + 1).trim()
    map.set(name, value)
  }
  return map
}

// ─── POST /api/auth/refresh ────────────────────────────────────

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  // 1. Validate Origin
  if (!validateOrigin(req)) {
    logSecurityEvent({
      type: 'suspicious_request',
      level: 'warning',
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/refresh',
      method: 'POST',
      details: 'Origin/Referer validation failed',
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Validate CSRF
  if (!validateCsrf(req)) {
    logSecurityEvent({
      type: 'suspicious_request',
      level: 'warning',
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/refresh',
      method: 'POST',
      details: 'CSRF token validation failed',
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Read refresh token from cookie
  const cookies = parseCookies(req.headers.get('cookie') || '')
  const rawToken = cookies.get(REFRESH_COOKIE_NAME)
  if (!rawToken) {
    return NextResponse.json(
      { error: 'Refresh token not found' },
      {
        status: 401,
        headers: { 'Set-Cookie': getClearRefreshCookie() },
      },
    )
  }

  // 4. Hash and look up in DB
  const tokenHash = hashRefreshToken(rawToken)

  const tokenRecord = await db.refreshToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          active: true,
        },
      },
    },
  })

  if (!tokenRecord || !tokenRecord.user.active) {
    // Delete the (possibly invalid) cookie
    if (tokenRecord) {
      // Token found but user inactive — delete the token
      await db.refreshToken.deleteMany({ where: { tokenHash } }).catch(() => {})
    }
    logSecurityEvent({
      type: 'auth_failure',
      level: 'warning',
      userId: tokenRecord?.userId,
      email: tokenRecord?.user?.email,
      ipAddress: clientIp,
      userAgent: getClientUA(req),
      path: '/api/auth/refresh',
      method: 'POST',
      details: tokenRecord ? 'Inactive user attempted token refresh' : 'Invalid or expired refresh token',
    })
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      {
        status: 401,
        headers: { 'Set-Cookie': getClearRefreshCookie() },
      },
    )
  }

  // 5. Delete old refresh token (rotation)
  await db.refreshToken.deleteMany({ where: { tokenHash } })

  // 6. Generate new tokens
  const user = tokenRecord.user
  const accessToken = await signAccessToken(user)
  const { raw: newRefreshRaw, hash: newRefreshHash } = generateRefreshToken()
  const csrf = generateCsrfToken()

  // 7. Store new refresh token in DB
  await db.refreshToken.create({
    data: {
      tokenHash: newRefreshHash,
      userId: user.id,
      userAgent: getClientUA(req),
      ipAddress: clientIp,
      expiresAt: getRefreshTokenExpiry(),
    },
  })

  // Build response with cookies
  const cookieOptions = getRefreshCookieOptions()
  const refreshCookie = [
    `${REFRESH_COOKIE_NAME}=${newRefreshRaw}`,
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
      },
    },
    {
      headers: {
        'Set-Cookie': [refreshCookie, csrf.setCookieHeader].join(', '),
      },
    },
  )
}
