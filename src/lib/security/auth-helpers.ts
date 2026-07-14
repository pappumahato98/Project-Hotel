import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from './session-store'
import { logSecurityEvent } from './audit'
import type { SessionData } from './session-store'

export type AuthUser = Pick<SessionData, 'userId' | 'email' | 'role' | 'firstName' | 'lastName'>

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  gm: 4,
  manager: 3,
  supervisor: 2,
  staff: 1,
}

export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const session = await validateSession(token)
  if (!session) {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    await logSecurityEvent({
      type: 'invalid_token', level: 'warning',
      ipAddress: ip, path: req.nextUrl.pathname, method: req.method,
      details: 'Invalid or expired session token',
    })
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
    firstName: session.firstName,
    lastName: session.lastName,
  }
}

export function requireRole(...roles: string[]) {
  return async (req: NextRequest, user: AuthUser): Promise<NextResponse | null> => {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0
    const requiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 0))

    if (userLevel < requiredLevel) {
      await logSecurityEvent({
        type: 'privilege_escalation_attempt', level: 'warning',
        userId: user.userId, email: user.email,
        ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
        path: req.nextUrl.pathname, method: req.method,
        details: `User role '${user.role}' attempted to access ${roles.join('/')} endpoint`,
      })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return null // Authorized
  }
}

// Convenience: auth guard that returns [user, errorResponse]
export async function requireAuth(req: NextRequest, requiredRoles?: string[]): Promise<{ user: AuthUser } | NextResponse> {
  const sessionOrError = await getAuthSession(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError

  if (requiredRoles && requiredRoles.length > 0) {
    const roleCheck = await requireRole(...requiredRoles)(req, sessionOrError)
    if (roleCheck) return roleCheck
  }

  return { user: sessionOrError }
}

// Get client IP address
export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

// Get client user agent
export function getClientUA(req: NextRequest): string {
  return req.headers.get('user-agent') ?? 'unknown'
}