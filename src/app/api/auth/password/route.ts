import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAuth, getClientIp, getClientUA } from '@/lib/security/auth-helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { passwordChangeLimiter, logSecurityEvent } from '@/lib/security'

export async function PUT(req: NextRequest) {
  // Require authenticated session
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limiting by IP
  const ip = getClientIp(req)
  const rateResult = passwordChangeLimiter(ip)
  if (!rateResult.success) {
    await logSecurityEvent({
      type: 'rate_limit_exceeded', level: 'warning',
      userId: auth.user.userId, email: auth.user.email,
      ipAddress: ip, path: '/api/auth/password', method: 'PUT',
      details: `Password change rate limit exceeded for user ${auth.user.email}`,
    })
    return NextResponse.json(
      { error: 'Too many password change attempts. Try again later.', retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000) },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Verify current password by attempting a Supabase sign-in.
    // (Supabase doesn't expose a "verify password" API; sign-in is the way.)
    const supabaseAnon = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: auth.user.email,
      password: currentPassword,
    })

    if (signInError) {
      await logSecurityEvent({
        type: 'password_change_failure', level: 'warning',
        userId: auth.user.userId, email: auth.user.email,
        ipAddress: ip, path: '/api/auth/password', method: 'PUT',
        details: 'Password change attempt with incorrect current password',
      })
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update password via Supabase Admin API (service role, bypasses RLS)
    const supabaseAdmin = createAdminClient()
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      auth.user.userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Supabase password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    await logSecurityEvent({
      type: 'password_change', level: 'info',
      userId: auth.user.userId, email: auth.user.email,
      ipAddress: ip, userAgent: getClientUA(req),
      path: '/api/auth/password', method: 'PUT',
      details: 'Password changed successfully — Supabase session invalidated',
    })

    return NextResponse.json({
      message: 'Password changed successfully. Please log in again.',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
