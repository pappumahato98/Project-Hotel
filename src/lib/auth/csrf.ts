/**
 * CSRF Protection — Double-Submit Cookie pattern.
 *
 * 1. Server sets a non-httpOnly CSRF cookie on login/refresh.
 * 2. Client reads the cookie via document.cookie.
 * 3. Client sends the same value in X-CSRF-Token header on mutating requests.
 * 4. Server compares cookie value vs header value — must match.
 *
 * Why this works:
 * - An attacker's site CANNOT read our cookie (SameSite=Lax prevents sending on cross-origin POST).
 *   Even without SameSite, the attacker can't READ the non-httpOnly cookie via JS from a
 *   different origin due to browser same-origin policy on document.cookie.
 * - Access tokens are sent via Authorization header (not cookies), so they're already
 *   CSRF-safe. CSRF protection is only critical for the /auth/refresh endpoint
 *   which reads the refresh token from an httpOnly cookie.
 *
 * Defense-in-depth layers:
 * - Double-submit cookie (this file)
 * - SameSite=Lax on cookies
 * - Origin/Referer header validation on cookie-authenticated endpoints
 */

import { randomBytes, timingSafeEqual } from 'crypto'

const CSRF_TOKEN_BYTES = 32 // 256-bit token
const CSRF_COOKIE_TTL_SECS = 86400 // 24 hours (refreshed on each login/refresh)

/**
 * Generate a new CSRF token.
 * Returns the raw token string and the Set-Cookie header value.
 */
export function generateCsrfToken(): { token: string; setCookieHeader: string } {
  const token = randomBytes(CSRF_TOKEN_BYTES).toString('hex')
  const isSecure = process.env.NODE_ENV === 'production'
  const setCookieHeader = [
    `__meridian_csrf=${token}`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${CSRF_COOKIE_TTL_SECS}`,
    isSecure ? 'Secure' : '',
  ].filter(Boolean).join('; ')
  return { token, setCookieHeader }
}

/**
 * Validate CSRF using double-submit pattern:
 * Compare the token from X-CSRF-Token header with the __meridian_csrf cookie.
 * Returns true if both present and match (constant-time comparison).
 */
export function validateCsrf(req: Request): boolean {
  const headerToken = req.headers.get('x-csrf-token')
  const cookieToken = extractCsrfFromCookies(req.headers.get('cookie') || '')

  if (!headerToken || !cookieToken) return false
  if (headerToken.length !== cookieToken.length) return false

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken),
    )
  } catch {
    return false
  }
}

/**
 * Validate Origin/Referer header as additional CSRF defense.
 * Returns true if the origin is acceptable.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const allowed = getAllowedOrigins()

  const check = origin || referer
  if (!check) return true // Same-origin request (no Origin/Referer header)

  return allowed.some(allowedOrigin => check.startsWith(allowedOrigin))
}

/**
 * Extract CSRF token from Cookie header string.
 */
function extractCsrfFromCookies(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)__meridian_csrf=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Get allowed origins for CSRF validation.
 */
function getAllowedOrigins(): string[] {
  // In production, restrict to actual domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return [process.env.NEXT_PUBLIC_APP_URL]
  }
  // Dev/sandbox: allow common local origins
  return [
    'http://localhost:3000',
    'http://localhost:3001',
  ]
}
