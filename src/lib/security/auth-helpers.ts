import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/token'
import { db } from '@/lib/db'
import { logSecurityEvent } from './audit'

export type AuthUser = {
  userId: string
  email: string
  role: string
  firstName: string
  lastName: string
}

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  gm: 4,
  manager: 3,
  supervisor: 2,
  staff: 1,
}

// ─── Auth session cache (eliminates redundant DB lookups per API call) ───
interface CachedAuth {
  user: AuthUser
  expiresAt: number
}
const _authCache = new Map<string, CachedAuth>()
const AUTH_TTL = 120_000 // 120 seconds

export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check cache using first 32 chars of token as key
  const cacheKey = token.substring(0, 32)
  const cached = _authCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user
  }

  // Verify JWT
  const payload = await verifyAccessToken(token)
  if (!payload) {
    const ip = getClientIp(req)
    logSecurityEvent({
      type: 'invalid_token',
      level: 'warning',
      ipAddress: ip,
      path: req.nextUrl.pathname,
      method: req.method,
      details: 'Invalid or expired access token',
    })
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  // Verify user still exists and is active
  let profile
  try {
    profile = await db.authUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, active: true },
    })
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
    return NextResponse.json({ error: 'Database connection failed', detail: msg.substring(0, 300) }, { status: 500 })
  }

  if (!profile || !profile.active) {
    return NextResponse.json({ error: 'Account not found or deactivated' }, { status: 403 })
  }

  const user: AuthUser = {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
  }

  // Cache with TTL using token prefix as key
  _authCache.set(cacheKey, { user, expiresAt: Date.now() + AUTH_TTL })
  return user
}

export function requireRole(...roles: string[]) {
  return async (req: NextRequest, user: AuthUser): Promise<NextResponse | null> => {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0
    const requiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 0))
    if (userLevel < requiredLevel) {
      logSecurityEvent({
        type: 'privilege_escalation_attempt', level: 'warning',
        userId: user.userId, email: user.email,
        ipAddress: getClientIp(req), path: req.nextUrl.pathname, method: req.method,
        details: `User role '${user.role}' attempted to access ${roles.join('/')} endpoint`,
      })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    return null
  }
}

export async function requireAuth(req: NextRequest, requiredRoles?: string[]): Promise<{ user: AuthUser } | NextResponse> {
  const sessionOrError = await getAuthSession(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  if (requiredRoles && requiredRoles.length > 0) {
    const roleCheck = await requireRole(...requiredRoles)(req, sessionOrError)
    if (roleCheck) return roleCheck
  }
  return { user: sessionOrError }
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

export function getClientUA(req: NextRequest): string {
  return req.headers.get('user-agent') ?? 'unknown'
}
