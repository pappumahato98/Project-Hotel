import { NextRequest, NextResponse } from 'next/server'
import { destroySession, logSecurityEvent } from '@/lib/security'
import { getAuthSession, getClientIp } from '@/lib/security/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    // Attempt to extract and destroy the session
    const authHeader = req.headers.get('authorization')
    let destroyedSession = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim()
      if (token) {
        await destroySession(token)
        destroyedSession = true
      }
    }

    // Log the event (best-effort — if no session, log by IP only)
    const ip = getClientIp(req)
    if (!destroyedSession) {
      await logSecurityEvent({
        type: 'session_destroyed',
        level: 'info',
        ipAddress: ip,
        path: '/api/auth/logout',
        method: 'POST',
        details: 'Logout called with no valid session token',
      })
    } else {
      // Try to log with user context from the session we just destroyed
      // (session is gone from DB, so we log IP only)
      await logSecurityEvent({
        type: 'session_destroyed',
        level: 'info',
        ipAddress: ip,
        path: '/api/auth/logout',
        method: 'POST',
        details: 'User logged out successfully',
      })
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, return success — client should clear local state regardless
    return NextResponse.json({ success: true, message: 'Logged out successfully' })
  }
}