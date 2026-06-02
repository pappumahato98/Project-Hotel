import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'

// Simple password verification using SHA-256 hash comparison
// (The seed script also stores this same hash format)
function verifyPassword(password: string, hashedPassword: string): boolean {
  const hash = createHash('sha256').update(password).digest('hex')
  return hash === hashedPassword
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.authUser.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    const valid = verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await db.authUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate session token
    const token = randomUUID()

    const { password: _, ...safeUser } = user

    return NextResponse.json({
      user: safeUser,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
