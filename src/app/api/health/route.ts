import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hasPostgresConfigured } from '@/lib/env'
import { existsSync } from 'fs'
import { join } from 'path'

// Cache the DB check result for 30 seconds to avoid hammering the database
// (Render health checks hit this endpoint every ~15-30 seconds)
let _lastCheck: { ok: boolean; detail: string; ts: number; accountingOk?: boolean; accountingDetail?: string } | null = null
const CHECK_TTL = 30_000

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // 1. Environment validation
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'not set' })
  } else if (dbUrl.startsWith('file:')) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'file: URL does not work on serverless — use PostgreSQL URL' })
  } else if (!hasPostgresConfigured()) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'invalid format' })
  } else {
    checks.push({ name: 'DATABASE_URL', ok: true, detail: 'postgresql://***@***' })
  }

  // 2. JWT Auth configuration
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret.length < 32) {
    checks.push({ name: 'jwt.secret', ok: false, detail: 'JWT_SECRET not set or too short (need 32+ chars)' })
  } else {
    checks.push({ name: 'jwt.secret', ok: true, detail: `${jwtSecret.length} chars` })
  }

  // 3. Migration status
  const baselineFile = join(process.cwd(), 'prisma', 'baseline-applied')
  if (existsSync(baselineFile)) {
    checks.push({ name: 'db.migrations', ok: true, detail: 'prisma migrate (baseline applied)' })
  } else {
    checks.push({ name: 'db.migrations', ok: true, detail: 'prisma db push (no migration tracking)' })
  }

  // 4. App mode
  checks.push({ name: 'app.auth', ok: true, detail: 'JWT (self-contained)' })

  // 5. DB connectivity + accounting table check — cached for CHECK_TTL
  if (hasPostgresConfigured()) {
    const now = Date.now()
    if (!_lastCheck || (now - _lastCheck.ts) > CHECK_TTL) {
      try {
        const userCount = await db.authUser.count()
        _lastCheck = { ok: true, detail: `${userCount} users`, ts: now }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        _lastCheck = { ok: false, detail: msg.slice(0, 200), ts: now }
      }

      // Also check if accounting tables exist (LedgerAccount)
      if (_lastCheck.ok) {
        try {
          const acctCount = await db.ledgerAccount.count()
          _lastCheck.accountingOk = true
          _lastCheck.accountingDetail = `${acctCount} accounts`
        } catch {
          _lastCheck.accountingOk = false
          _lastCheck.accountingDetail = 'LedgerAccount table missing — run prisma migrate deploy'
        }
      }
    }
    checks.push({ name: 'db.connect', ok: _lastCheck.ok, detail: _lastCheck.detail })
    if (_lastCheck.ok) {
      checks.push({ name: 'db.seeded', ok: true, detail: _lastCheck.detail })
    } else {
      checks.push({ name: 'db.seeded', ok: false, detail: 'Run POST /api/db-setup to seed' })
    }

    if (_lastCheck.accountingOk !== undefined) {
      checks.push({ name: 'db.accounting', ok: _lastCheck.accountingOk, detail: _lastCheck.accountingDetail })
    }
  }

  const allOk = checks.every((c) => c.ok)
  return NextResponse.json(
    { status: allOk ? 'ok' : 'error', checks },
    { status: allOk ? 200 : 500 },
  )
}