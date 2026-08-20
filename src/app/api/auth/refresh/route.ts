import { NextRequest, NextResponse } from 'next/server'
import { db, awaitSchemaSync } from '@/lib/db'
import {
  signAccessToken,
  hashRefreshToken,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  getClearRefreshCookie,
} from '@/lib/auth/token'
import { generateCsrfToken, validateCsrf, validateOrigin } from '@/lib/auth/csrf'
import { rotateRefreshToken } from '@/lib/auth/rotation'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp, getClientUA, checkRateLimit } from '@/lib/security/auth-helpers'
import { isDatabaseError, errorSummary } from '@/lib/auth/fallback-users'

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

// ─── POST /api/auth/refresh ─────────────────────────

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  try {
    // 1. Validate Origin
    if (!validateOrigin(req)) {
      logSecurityEvent({
        type: 'suspicious_request', level: 'warning',
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/refresh', method: 'POST',
        details: 'Origin/Referer validation failed',
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Validate CSRF
    if (!validateCsrf(req)) {
      logSecurityEvent({
        type: 'suspicious_request', level: 'warning',
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/refresh', method: 'POST',
        details: 'CSRF token validation failed',
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Rate limit
    const rateErr = await checkRateLimit(req, 'auth:refresh')
    if (rateErr) return rateErr

    // 4. Read refresh token from cookie
    const cookies = parseCookies(req.headers.get('cookie') || '')
    const rawToken = cookies.get(REFRESH_COOKIE_NAME)
    if (!rawToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401, headers: { 'Set-Cookie': getClearRefreshCookie() } },
      )
    }

    // 5. Hash and look up in DB
    // Wait for schema sync — it ALTERs AuthUser which could lock the relation query
    await awaitSchemaSync(10_000).catch(() => {})
    const tokenHash = hashRefreshToken(rawToken)

    const tokenRecord = await db.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: {
        user: {
          select: {
            id: true, email: true, role: true,
            firstName: true, lastName: true, active: true,
            department: true, position: true,
            avatarUrl: true, phone: true, gender: true,
          },
        },
      },
    })

    if (!tokenRecord || !tokenRecord.user || !tokenRecord.user.active) {
      if (tokenRecord) {
        await db.refreshToken.deleteMany({ where: { tokenHash } }).catch(() => {})
      }
      logSecurityEvent({
        type: 'auth_failure', level: 'warning',
        userId: tokenRecord?.userId, email: tokenRecord?.user?.email,
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/refresh', method: 'POST',
        details: tokenRecord ? (tokenRecord.user ? 'Inactive user attempted token refresh' : 'Orphaned refresh token (user deleted)') : 'Invalid or expired refresh token',
      })
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401, headers: { 'Set-Cookie': getClearRefreshCookie() } },
      )
    }

    // 6. Rotate with replay detection
    const rotationResult = await rotateRefreshToken(tokenHash, req)

    if ('replayDetected' in rotationResult) {
      // Replay attack! Clear cookie, force re-login
      logSecurityEvent({
        type: 'token_family_revoked', level: 'critical',
        userId: rotationResult.userId,
        ipAddress: clientIp, userAgent: getClientUA(req),
        path: '/api/auth/refresh', method: 'POST',
        details: 'Token family revoked due to replay attack. User must re-login.',
      })
      return NextResponse.json(
        { error: 'Session compromised. Please log in again.' },
        { status: 401, headers: { 'Set-Cookie': getClearRefreshCookie() } },
      )
    }

    // 7. Generate new access token + CSRF
    const user = tokenRecord.user
    const accessToken = await signAccessToken(user)
    const csrf = generateCsrfToken()

    // Build response with cookies
    const cookieOptions = getRefreshCookieOptions()
    const refreshCookie = [
      `${REFRESH_COOKIE_NAME}=${rotationResult.newRaw}`,
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
          role: user.role,
          department: user.department,
          position: user.position,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          gender: user.gender,
        },
      },
    )

    response.headers.append('Set-Cookie', refreshCookie)
    response.headers.append('Set-Cookie', csrf.setCookieHeader)

    return response
  } catch (error: unknown) {
    // Graceful degradation for DB-unreachable in production
    if (isDatabaseError(error)) {
      console.error('[auth] Token refresh DB error:', errorSummary(error))
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again in a few seconds.' },
        { status: 503, headers: { 'Retry-After': '10' } },
      )
    }
    console.error('Token refresh error:', errorSummary(error))
    return NextResponse.json(
      { error: 'Session refresh failed' },
      { status: 500 },
    )
  }
}
