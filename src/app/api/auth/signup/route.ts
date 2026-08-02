import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logSecurityEvent } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await db.authUser.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.authUser.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'staff',
        active: false,
      },
    })

    logSecurityEvent({
      type: 'signup', level: 'info',
      email: normalizedEmail,
      ipAddress: getClientIp(req),
      path: '/api/auth/signup', method: 'POST',
      details: 'New account created (pending activation)',
    })

    return NextResponse.json({ message: 'Account created. An administrator will activate your account.' }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
