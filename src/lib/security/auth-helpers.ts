import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { logSecurityEvent } from './audit'

/**
 * AuthUser — the shape every API route expects.
 *
 * Kept identical to the previous custom-auth version so all 67 API routes
 * work without changes. `userId` is the Supabase Auth user UUID (which is
 * also the AuthUser.id in our profiles table).
 */
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

/**
 * Validate a Supabase access token (JWT) from the Authorization header
 * and return the matching profile row from our AuthUser table.
 *
 * Flow:
 *   1. Extract `Bearer <jwt>` from Authorization header
 *   2. supabase.auth.getUser(jwt) → validates JWT, returns Supabase user
 *   3. db.authUser.findUnique({ id: supabaseUser.id }) → app profile (role, name, etc.)
 *   4. Return merged AuthUser
 */
export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Create a Supabase client configured to validate the passed access token.
  // We use the anon key + the user's JWT — supabase.auth.getUser(token)
  // verifies the JWT signature and returns the user if valid.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token)

  if (error || !supabaseUser) {
    const ip = getClientIp(req)
    await logSecurityEvent({
      type: 'invalid_token', level: 'warning',
      ipAddress: ip, path: req.nextUrl.pathname, method: req.method,
      details: 'Invalid or expired Supabase access token',
    })
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  // Fetch the app-specific profile (role, name, department, etc.)
  const profile = await db.authUser.findUnique({
    where: { id: supabaseUser.id },
    select: { id: true, email: true, role: true, firstName: true, lastName: true, active: true },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found. Contact an administrator.' },
      { status: 403 }
    )
  }

  if (!profile.active) {
    return NextResponse.json(
      { error: 'Account is deactivated. Contact administrator.' },
      { status: 403 }
    )
  }

  return {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
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
        ipAddress: getClientIp(req),
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
