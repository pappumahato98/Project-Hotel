/**
 * JWT Access Token + Refresh Token utilities.
 *
 * Access Token:  Short-lived (15 min), signed with HS256.
 *   Payload: { sub, email, role, firstName, lastName, jti }
 *   Sent via Authorization: Bearer header.
 *
 * Refresh Token: Opaque (64 random bytes), stored as SHA-256 hash in DB.
 *   Sent via httpOnly Secure SameSite=Strict cookie.
 *   TTL: 7 days.
 */

import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'crypto'

// ─── Config ──────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'meridian-hotel-jwt-secret-change-in-production'
)

const ACCESS_TOKEN_TTL = '15m'       // Access token expires in 15 minutes
const REFRESH_TOKEN_BYTES = 64        // 512-bit random token
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export type JwtPayload = {
  sub: string        // userId
  email: string
  role: string
  firstName: string
  lastName: string
  jti: string        // JWT ID (unique per token)
}

// ─── Access Token ────────────────────────────────────────────────

/**
 * Sign a new access token.
 * Returns the encoded JWT string.
 */
export async function signAccessToken(user: {
  id: string; email: string; role: string; firstName: string; lastName: string
}): Promise<string> {
  const jti = crypto.randomUUID()
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    jti,
  } as JwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setIssuer('meridian-pms')
    .sign(JWT_SECRET)
}

/**
 * Verify and decode an access token.
 * Returns the payload if valid, or null if expired/invalid.
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'meridian-pms',
    })
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

// ─── Refresh Token ───────────────────────────────────────────────

/**
 * Generate a new raw refresh token (opaque, 128 hex chars).
 * Returns { raw, hash } — store `hash` in DB, send `raw` in cookie.
 */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/**
 * Hash a raw refresh token (for DB lookup).
 */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Get the refresh token TTL in milliseconds.
 */
export function getRefreshTokenTtlMs(): number {
  return REFRESH_TOKEN_TTL_MS
}

/**
 * Get the refresh token expiry date.
 */
export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
}

// ─── Cookie Helpers ──────────────────────────────────────────────

export const REFRESH_COOKIE_NAME = '__meridian_rt'
export const CSRF_COOKIE_NAME = '__meridian_csrf'

/**
 * Build the Set-Cookie options for the refresh token.
 */
export function getRefreshCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'strict' | 'lax' | 'none'; path: string; maxAge: number } {
  return {
    httpOnly: true,         // JS cannot read (XSS-safe)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',        // CSRF protection (Sent on top-level nav, not cross-origin POST)
    path: '/',
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  }
}

/**
 * Build Set-Cookie header string to clear the refresh token.
 */
export function getClearRefreshCookie(): string {
  return `${REFRESH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
