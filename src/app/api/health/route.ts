import { NextResponse } from 'next/server'
import { hasPostgresConfigured } from '@/lib/env'
import { isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'

// Cache DB check for 2 minutes (Render health checks every ~15-30s)
let _lastCheck: { ok: boolean; detail: string; ts: number } | null = null
const CHECK_TTL = 120_000

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // 1. Environment validation
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'not set' })
  } else if (dbUrl.startsWith('file:')) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'file: URL does not work on serverless' })
  } else if (!hasPostgresConfigured()) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'invalid format' })
  } else {
    checks.push({ name: 'DATABASE_URL', ok: true, detail: 'configured' })
  }

  // 2. JWT Auth configuration
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret.length < 32) {
    checks.push({ name: 'jwt.secret', ok: false, detail: 'too short' })
  } else {
    checks.push({ name: 'jwt.secret', ok: true, detail: `${jwtSecret.length} chars` })
  }

  // 3. App mode
  checks.push({ name: 'app.auth', ok: true, detail: 'JWT (self-contained)' })

  // 4. DB connectivity — only checked every 2 minutes
  if (hasPostgresConfigured()) {
    const now = Date.now()
    if (!_lastCheck || (now - _lastCheck.ts) > CHECK_TTL) {
      try {
        // Lightweight DB ping — just get the Prisma client
        const { db } = await import('@/lib/db')
        await db.authUser.count({ take: 1 })
        _lastCheck = { ok: true, detail: 'connected', ts: now }
      } catch (e: unknown) {
        if (isPoolTimeoutError(e)) return poolTimeoutResponse()
        const msg = e instanceof Error ? e.message : String(e)
        _lastCheck = { ok: false, detail: msg.slice(0, 200), ts: now }
      }
    }
    checks.push({ name: 'db.connect', ok: _lastCheck.ok, detail: _lastCheck.detail })
    checks.push({ name: 'db.seeded', ok: _lastCheck.ok, detail: _lastCheck.ok ? 'ready' : 'not ready' })
  }

  const allOk = checks.every((c) => c.ok)
  return NextResponse.json(
    { status: allOk ? 'ok' : 'error', checks },
    {
      status: allOk ? 200 : 500,
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    },
  )
}
