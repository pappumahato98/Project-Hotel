import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashRefreshToken, getClearRefreshCookie, REFRESH_COOKIE_NAME } from '@/lib/auth/token'
import { invalidateAllCache } from '@/lib/cache'

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

/**
 * Build a Set-Cookie header string to clear the CSRF cookie.
 */
function getClearCsrfCookie(): string {
  const isSecure = process.env.NODE_ENV === 'production'
  return `__meridian_csrf=; Path=/; Max-Age=0; SameSite=Lax${isSecure ? '; Secure' : ''}`
}

// ─── POST /api/auth/logout ────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookies = parseCookies(req.headers.get('cookie') || '')
  const rawToken = cookies.get(REFRESH_COOKIE_NAME)

  if (rawToken) {
    const hash = hashRefreshToken(rawToken)
    await db.refreshToken.deleteMany({ where: { tokenHash: hash } }).catch(() => {})
  }

  // Clear all caches
  invalidateAllCache()

  return NextResponse.json(
    { message: 'Logged out' },
    {
      headers: {
        'Set-Cookie': [getClearRefreshCookie(), getClearCsrfCookie()].join(', '),
      },
    },
  )
}
