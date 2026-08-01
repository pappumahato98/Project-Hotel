import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // 1. DATABASE_URL presence
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'not set' })
  } else if (dbUrl.startsWith('file:')) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'file: URL does not work on serverless — use PostgreSQL URL' })
  } else {
    checks.push({ name: 'DATABASE_URL', ok: true, detail: dbUrl.split('@')[1]?.split('.')[0] ? 'postgresql://***@***' : dbUrl.split(':')[0] + '://' })
  }

  // 2. JWT Auth configuration
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret.length < 32) {
    checks.push({ name: 'jwt.secret', ok: false, detail: 'JWT_SECRET not set or too short (need 32+ chars)' })
  } else {
    checks.push({ name: 'jwt.secret', ok: true, detail: `${jwtSecret.length} chars` })
  }

  // 3. App mode
  checks.push({ name: 'app.auth', ok: true, detail: 'JWT (self-contained)' })

  // 4. DB connectivity + has data
  try {
    const userCount = await db.authUser.count()
    checks.push({ name: 'db.connect', ok: true })
    checks.push({ name: 'db.seeded', ok: userCount > 0, detail: userCount > 0 ? `${userCount} users` : '0 users — run setup-supabase.sh' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    checks.push({ name: 'db.connect', ok: false, detail: msg.slice(0, 200) })
  }

  const allOk = checks.every((c) => c.ok)
  return NextResponse.json(
    { status: allOk ? 'ok' : 'error', checks },
    { status: allOk ? 200 : 500 },
  )
}
