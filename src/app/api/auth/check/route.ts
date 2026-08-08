import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * GET /api/auth/check — Temporary diagnostic for login debugging.
 * Returns info about the admin user without exposing sensitive data.
 * TODO: Remove this endpoint after auth is working.
 */
export async function GET() {
  try {
    // Find admin user
    const user = await db.authUser.findUnique({
      where: { email: 'admin@meridian.com' },
      select: { id: true, email: true, role: true, active: true, passwordHash: true, createdAt: true },
    })

    if (!user) {
      // List all emails to help debug
      const allUsers = await db.authUser.findMany({ select: { email: true, role: true, active: true } })
      return NextResponse.json({
        admin_found: false,
        all_users: allUsers,
        hint: 'admin@meridian.com not found in database',
      })
    }

    // Test password comparison
    const passwordOk = await bcrypt.compare('admin123', user.passwordHash)
    const hashLength = user.passwordHash?.length || 0
    const hashPrefix = user.passwordHash?.substring(0, 7) || ''

    return NextResponse.json({
      admin_found: true,
      email: user.email,
      role: user.role,
      active: user.active,
      password_hash_length: hashLength,
      password_hash_prefix: hashPrefix,
      password_test: passwordOk,
      created_at: user.createdAt,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg.substring(0, 500) }, { status: 500 })
  }
}
