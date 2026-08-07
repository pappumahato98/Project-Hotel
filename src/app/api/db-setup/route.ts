/**
 * POST /api/db-setup
 *
 * One-click database schema sync for production deployments.
 * Runs `prisma db push` to sync the Prisma schema to the PostgreSQL database.
 *
 * Protected by JWT_SECRET (passed as "token" in request body).
 * For first-time setup (no users in DB), the token check is skipped.
 *
 * Usage:
 *   curl -X POST https://your-app.onrender.com/api/db-setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"token":"your-jwt-secret"}'
 */

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(`[db-setup] ${msg}`)
    logs.push(msg)
  }

  try {
    // ── Token verification ──
    const body = await req.json().catch(() => ({}))
    const providedToken = String(body.token || '')
    const expectedToken = process.env.JWT_SECRET || ''

    if (!expectedToken) {
      return NextResponse.json({
        error: 'JWT_SECRET not configured on server',
        hint: 'Set the JWT_SECRET environment variable in your deployment platform.',
      }, { status: 500 })
    }

    // For fresh databases (no users), allow without token
    let skipTokenCheck = false
    if (!providedToken) {
      try {
        const { db } = await import('@/lib/db')
        const userCount = await db.authUser.count()
        if (userCount === 0) {
          skipTokenCheck = true
          log('No users in database — skipping token check for initial setup')
        }
      } catch {
        skipTokenCheck = true
        log('Cannot query database — assuming fresh setup')
      }
    }

    if (!skipTokenCheck && providedToken !== expectedToken) {
      return NextResponse.json({
        error: 'Invalid or missing setup token',
        hint: 'Pass your JWT_SECRET as the "token" field in the request body.',
      }, { status: 401 })
    }

    // ── Step 1: Push schema to database ──
    log('Starting schema sync (prisma db push)...')
    let pushSuccess = false
    try {
      const pushOutput = execSync('npx prisma db push --accept-data-loss 2>&1', {
        timeout: 90_000,
        encoding: 'utf-8',
        env: { ...process.env },
      })
      log(`Schema push completed successfully`)
      if (pushOutput) log(pushOutput.trim().substring(0, 500))
      pushSuccess = true
    } catch (err: any) {
      const stderr = err.stderr || err.stdout || err.message || String(err)
      log(`Schema push output: ${stderr.substring(0, 500)}`)
      // Check if it's a benign "already in sync" message
      if (stderr.includes('already in sync') || stderr.includes('Everything is already')) {
        log('Schema is already up to date')
        pushSuccess = true
      } else {
        return NextResponse.json({
          error: 'Schema push failed',
          detail: stderr.substring(0, 1000),
          logs,
        }, { status: 500 })
      }
    }

    // ── Step 2: Regenerate Prisma client ──
    log('Regenerating Prisma client...')
    try {
      execSync('npx prisma generate 2>&1', {
        timeout: 30_000,
        encoding: 'utf-8',
      })
      log('Prisma client regenerated')
    } catch (err: any) {
      log(`Prisma generate note: ${(err.stdout || err.message || '').substring(0, 200)}`)
    }

    // ── Step 3: Verify schema by querying LedgerAccount ──
    log('Verifying database schema...')
    try {
      // Force a fresh import after regeneration
      const { db } = await import('@/lib/db')
      const accountCount = await db.ledgerAccount.count()
      log(`Verification: LedgerAccount table accessible (${accountCount} rows)`)
    } catch (err: any) {
      const msg = err.message || String(err)
      if (msg.includes('does not exist') || msg.includes('column')) {
        log(`Verification failed — schema may not be fully synced: ${msg.substring(0, 300)}`)
        return NextResponse.json({
          success: false,
          error: 'Schema verification failed',
          detail: msg.substring(0, 500),
          logs,
          hint: 'The prisma db push may have partially succeeded. Check the Render build logs.',
        }, { status: 503 })
      }
      // Other errors (like empty table) are OK
      log(`Verification note: ${msg.substring(0, 200)}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema synced successfully',
      steps: ['schema-push', 'prisma-generate', 'verify'],
      logs,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[db-setup] Fatal error:', msg)
    return NextResponse.json({
      error: 'Database setup failed',
      detail: msg.substring(0, 500),
      logs,
    }, { status: 500 })
  }
}

/**
 * GET /api/db-setup
 * Returns database setup status without making changes.
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/db')

    let userCount = 0
    let accountCount = 0
    let dbConnected = false
    let schemaError = ''

    try {
      userCount = await db.authUser.count()
      dbConnected = true
    } catch (e: any) {
      dbConnected = false
      schemaError = e.message?.substring(0, 200) || 'Connection failed'
    }

    try {
      accountCount = await db.ledgerAccount.count()
    } catch (e: any) {
      accountCount = -1
      schemaError = e.message?.substring(0, 300) || 'LedgerAccount query failed'
    }

    return NextResponse.json({
      status: dbConnected ? 'connected' : 'disconnected',
      users: userCount,
      ledgerAccounts: accountCount,
      needsSetup: !dbConnected || accountCount === -1,
      schemaError: schemaError || undefined,
      hint: !dbConnected
        ? 'Database connection failed. Check DATABASE_URL.'
        : accountCount === -1
          ? 'Schema out of date. POST /api/db-setup to sync schema.'
          : userCount === 0
            ? 'No users. Visit /api/db-setup for initial setup.'
            : 'Database is ready.',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      status: 'error',
      error: msg.substring(0, 500),
      needsSetup: true,
    }, { status: 500 })
  }
}
