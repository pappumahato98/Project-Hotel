import { NextRequest, NextResponse } from 'next/server'
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

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * In demo mode (no Supabase), we accept any Bearer token
 * and return the first admin user from the database.
 */
async function getDemoSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  const authHeader = req.headers.get('authorization')
  // In demo mode, accept any auth header or no auth header
  try {
    const profile = await db.authUser.findFirst({
      where: { role: 'admin', active: true },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'No admin user found in database. Run seed first.' }, { status: 500 })
    }
    return { userId: profile.id, email: profile.email, role: profile.role, firstName: profile.firstName, lastName: profile.lastName }
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
    return NextResponse.json({ error: 'Database error', detail: msg.substring(0, 300) }, { status: 500 })
  }
}

export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  // ── Demo mode: no Supabase configured ──
  if (IS_DEMO) {
    return getDemoSession(req)
  }

  // ── Production mode: validate Supabase JWT ──
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
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

    let profile
    try {
      profile = await db.authUser.findUnique({
        where: { id: supabaseUser.id },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, active: true },
      })
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      return NextResponse.json({ error: 'Database connection failed', detail: msg.substring(0, 300) }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found. Contact an administrator.' }, { status: 403 })
    }
    if (!profile.active) {
      return NextResponse.json({ error: 'Account is deactivated. Contact administrator.' }, { status: 403 })
    }

    return { userId: profile.id, email: profile.email, role: profile.role, firstName: profile.firstName, lastName: profile.lastName }
  } catch (err) {
    return NextResponse.json({ error: 'Auth service error' }, { status: 500 })
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
