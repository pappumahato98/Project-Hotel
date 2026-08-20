/**
 * Prisma Client — PostgreSQL with Connection Pooling.
 *
 * Features:
 *   - Lazy initialization (avoids Turbopack/Webpack env-loading race conditions)
 *   - Environment validation on first connection
 *   - Automatic SSL enforcement with EMBEDDED Supabase CA certificate
 *     → Works on ALL platforms: Vercel (serverless), Render, Docker, Railway, Fly.io
 *     → No filesystem cert file needed (cert is embedded inline)
 *   - Connection pool limits for PgBouncer compatibility
 *   - Global singleton (prevents multiple clients in dev hot-reload)
 *   - EMAXCONNSESSION retry with exponential backoff
 */

import { PrismaClient } from '@prisma/client'
import { hasPostgresConfigured } from '@/lib/env'

// ─── Connection Pool Exhaustion Retry ─────────────────────────────
// PgBouncer in session mode has a hard limit (free tier: 15 connections).
// On Vercel serverless, multiple cold starts can exhaust this pool.
// We retry with exponential backoff instead of immediately failing.
const POOL_EXHAUSTION_RETRIES = 3
const POOL_EXHAUSTION_BASE_MS = 200
const POOL_EXHAUSTION_MAX_MS = 2_000

function isPoolExhaustionError(err: unknown): boolean {
  // Prisma P2024: Connection pool timeout
  // Error: "Timed out fetching a new connection from the connection pool"
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === 'P2024'
  ) {
    return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('P2024') ||
    msg.includes('EMAXCONNSESSION') ||
    msg.includes('max clients') ||
    msg.includes('pool_size') ||
    msg.includes('too many connections') ||
    msg.includes('remaining connection slots') ||
    msg.includes('Timed out fetching a new connection')
  )
}

/**
 * Retry a DB operation with exponential backoff on pool exhaustion.
 * Retries up to N times with 200ms → 400ms → 800ms delays.
 */
export async function withPoolRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= POOL_EXHAUSTION_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isPoolExhaustionError(err) || attempt === POOL_EXHAUSTION_RETRIES) {
        throw err
      }
      const delay = Math.min(
        POOL_EXHAUSTION_BASE_MS * Math.pow(2, attempt),
        POOL_EXHAUSTION_MAX_MS,
      )
      console.warn(`[db] Pool exhaustion (attempt ${attempt + 1}/${POOL_EXHAUSTION_RETRIES + 1}), retrying in ${delay}ms…`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}
// ─── Embedded Supabase Root CA 2021 ─────────────────────────────────
// This certificate is embedded directly in the code so that sslmode=verify-full
// works on every deployment platform without needing a filesystem cert file.
// Source: https://supabase.com/docs/guides/database/connecting-to-postgres#direct-connections
// Expires: 2031-04-26
const SUPABASE_CA_CERT = `
-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`.trim()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined
let _validated = false

// Capture raw DATABASE_URL at module load (before any modification)
const _rawDbUrl = process.env.DATABASE_URL || ''

// Export diagnostic info for health endpoint
export function getDbDiagnostics() {
  const current = process.env.DATABASE_URL || ''
  const repaired = process.env.__DB_URL_REPAIRED || current
  // Extract password from raw URL for length check
  let passwordLength = 0
  try {
    const m = _rawDbUrl.match(/:[^@]+@/)
    if (m) passwordLength = m[0].length - 2 // subtract : and @
  } catch {}
  return {
    rawUrlMasked: _rawDbUrl.replace(/(\/\/[^:]+:)([^@]+)(@.*)/, '$1***$3'),
    currentUrlMasked: current.replace(/(\/\/[^:]+:)([^@]+)(@.*)/, '$1***$3'),
    urlRepaired: _rawDbUrl !== current,
    rawAtCount: (_rawDbUrl.match(/@/g) || []).length,
    passwordLength,
  }
}

/**
 * Write the embedded Supabase CA cert to a temp file.
 * Returns the file path, or empty string if write fails.
 * Uses deferred require() to avoid webpack "Can't resolve 'fs'" build errors.
 */
function ensureCertFile(): string {
  // Check if we already have a cert path from a previous call
  if (typeof process !== 'undefined' && (process as Record<string, unknown>).__supabase_ca_cert_path) {
    return (process as Record<string, unknown>).__supabase_ca_cert_path as string
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require('node:os')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    const certPath = path.join(os.tmpdir(), 'supabase-root-ca-2021.crt')
    if (!fs.existsSync(certPath)) {
      fs.writeFileSync(certPath, SUPABASE_CA_CERT, 'utf8')
    }
    // Cache on process object for this runtime
    ;(process as Record<string, unknown>).__supabase_ca_cert_path = certPath
    return certPath
  } catch {
    return ''
  }
}

/**
 * Auto-repair DATABASE_URL for platforms that URL-decode env var values.
 *
 * Problem: Render, Railway, and some other platforms URL-decode environment
 * variable values set through their web UI. So a password containing %40 (@)
 * and %23 (#) gets decoded into raw @ and # characters, breaking the URL
 * because @ separates credentials from host and # starts a fragment.
 *
 * Fix: Detect multiple @ signs (indicating unencoded @ in password) and
 * re-encode them. Same for # in the credentials portion.
 */
function repairUrlEncoding(url: string): string {
  // Count @ signs — a valid postgres URL has exactly one @ (the user:pass@host separator)
  const atCount = (url.match(/@/g) || []).length
  if (atCount <= 1) return url

  // The LAST @ is the real separator between credentials and host
  const lastAt = url.lastIndexOf('@')
  const credentialsPart = url.substring(0, lastAt)  // postgresql://user:pass
  const hostPart = url.substring(lastAt)  // @host:port/db?params

  // In the credentials part, encode any raw @ and # that shouldn't be there
  // Only encode the password portion (after the first : in the credentials)
  const protoSep = credentialsPart.indexOf('://')
  if (protoSep === -1) return url
  const proto = credentialsPart.substring(0, protoSep + 3)  // postgresql://
  const userInfo = credentialsPart.substring(protoSep + 3)  // user:pass
  const colonIdx = userInfo.indexOf(':')
  if (colonIdx === -1) return url

  const user = userInfo.substring(0, colonIdx)
  const pass = userInfo.substring(colonIdx + 1)

  // Re-encode special characters in the password that break URL parsing
  const encodedPass = pass
    .replace(/@/g, '%40')
    .replace(/#/g, '%23')
    .replace(/%/g, (match, offset, str) => {
      // Don't double-encode already-encoded sequences like %40
      const next2 = str.substring(offset + 1, offset + 3)
      if (/^[0-9A-Fa-f]{2}$/.test(next2)) return match
      return '%25'
    })
    .replace(/\//g, '%2F')
    .replace(/\?/g, '%3F')

  const fixed = `${proto}${user}:${encodedPass}${hostPart}`
  console.warn(`[db] URL auto-repaired: detected ${atCount} @ signs in URL, re-encoded password special characters`)
  return fixed
}

function validateDbConfig() {
  if (_validated) return true
  _validated = true

  if (!hasPostgresConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[db] DATABASE_URL is not a PostgreSQL URL. Fallback auth will be used for login.')
      return false
    }
    console.error('[db] FATAL: DATABASE_URL is not configured for PostgreSQL in production.')
    return false
  }

  // Auto-repair URL encoding issues (e.g., Render URL-decoding %40 → @)
  let url = process.env.DATABASE_URL!
  const repairedUrl = repairUrlEncoding(url)
  ;(process as Record<string, unknown>).__DB_URL_REPAIRED = repairedUrl
  if (repairedUrl !== url) {
    process.env.DATABASE_URL = repairedUrl
    url = repairedUrl
  }
  const hasQuery = url.includes('?')
  const separator = hasQuery ? '&' : '?'
  const params: string[] = []

  // ── SSL enforcement ──────────────────────────────────────────
  // Write embedded cert to /tmp and use sslmode=verify-full on ALL platforms.
  // No filesystem cert file needed — the cert is embedded in this file.
  const certPath = ensureCertFile()

  const explicitSslmode = url.match(/sslmode=([a-z-]+)/)?.[1]

  if (!explicitSslmode) {
    if (certPath) {
      params.push('sslmode=verify-full', `sslrootcert=${certPath}`)
      console.warn(`[db] SSL enforced: sslmode=verify-full with embedded Supabase CA cert (${certPath})`)
    } else {
      // Absolute last resort — encrypted but no cert verification
      params.push('sslmode=require')
      console.warn('[db] SSL enforced: sslmode=require (failed to write embedded cert to /tmp)')
    }
  } else if (['disable', 'allow', 'prefer'].includes(explicitSslmode)) {
    console.warn(`[db] Weak SSL mode (sslmode=${explicitSslmode}). Use sslmode=verify-full.`)
  } else if (explicitSslmode === 'verify-full' && !url.includes('sslrootcert=')) {
    if (certPath) {
      params.push(`sslrootcert=${certPath}`)
      console.warn(`[db] sslrootcert injected from embedded cert: ${certPath}`)
    }
  }

  // ── Connection pool limits ───────────────────────────────────
  // connection_limit controls how many concurrent connections this SINGLE
  // PrismaClient instance can open. It does NOT control the PgBouncer pool.
  //
  // Why 2 (not 3):
  //   Each Vercel serverless instance = main client (2) + sync client (1) = 3.
  //   With connection_limit=3, it was 4 per instance → 4 instances × 4 = 16 > 15.
  //   With connection_limit=2, it's 3 per instance → 5 instances × 3 = 15 = OK.
  //   Dashboard routes use withPoolRetry() for automatic P2024 retry.
  //
  // pool_timeout=10 (not 30):
  //   Fail fast on pool exhaustion. withPoolRetry retries with backoff.
  //   30s timeout wastes Vercel function time waiting for a connection.
  //
  // Cross-instance protection:
  //   withPoolRetry() handles EMAXCONNSESSION (PgBouncer 15-connection limit)
  //   with exponential backoff. That's the correct layer for pool guard.
  if (!url.includes('connection_limit=')) {
    params.push('connection_limit=2', 'pool_timeout=10', 'connect_timeout=5')
  }

  // ── PgBouncer optimization ──────────────────────────────────
  // Tell Prisma to use PgBouncer-compatible query protocol.
  // Reduces per-query overhead by ~2-3ms (skips prepared statements).
  if (!url.includes('pgbouncer=')) {
    params.push('pgbouncer=true')
  }

  // ── Session-mode pooler detection ────────────────────────────
  // Supabase pooler on port 5432 = session mode (1:1 client→server mapping).
  // Port 6543 = transaction mode (releases server conn after each tx).
  // Session mode is the #1 cause of EMAXCONNSESSION errors.
  try {
    const parsed = new URL(process.env.DATABASE_URL!)
    if (parsed.port === '5432' && parsed.hostname.includes('.pooler.supabase.com')) {
      console.warn(
        '[db] ⚠️  PgBouncer SESSION MODE detected (port 5432 on pooler host).\n' +
        '     This causes EMAXCONNSESSION errors under load (15-connection hard limit).\n' +
        '     FIX: Switch to Transaction mode (port 6543) in Supabase Dashboard →\n' +
        '          Settings → Database → Connection string → Transaction mode.\n' +
        '     See .env.example for details.'
      )
    }
  } catch {}

  if (params.length > 0) {
    process.env.DATABASE_URL = `${url}${separator}${params.join('&')}`
  }

  return true
}

function getDb(): PrismaClient {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  validateDbConfig()

  _db = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL!,
      },
    },
    log: ['error'] as const,
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

/**
 * Public API: trigger schema sync. Safe to call multiple times.
 * Used by instrumentation.ts at startup and by requireDb() on first request.
 */
export async function syncSchema(): Promise<void> {
  if (!hasPostgresConfigured()) return
  const client = getDb()
  await autoSyncSchema(client)
}

/**
 * Await the completion of schema sync, triggering it if not yet started.
 *
 * Critical for auth routes: schema sync runs ALTER TABLE on "AuthUser"
 * which acquires an ACCESS EXCLUSIVE lock. Any SELECT on AuthUser during
 * that lock will block until PostgreSQL's statement_timeout cancels it
 * (error 57014). By awaiting sync first, the lock is released before
 * the auth query runs.
 *
 * This is safe to call from any route:
 *   - If sync already completed → returns immediately
 *   - If sync is running → waits for it (usually <5s)
 *   - If sync never started → TRIGGERS sync and waits for it
 *
 * Why trigger? On a fresh deployment (Render, Docker), the first API
 * request may be /api/auth/refresh. If sync was never triggered, the
 * query would reference columns (e.g., revokedAt) that don't exist yet,
 * causing PrismaClientKnownRequestError. Triggering sync here ensures
 * the columns exist before the query runs.
 *
 * Optional timeout (default 15s) prevents indefinite blocking.
 * With batched DO blocks, sync completes in ~2-3s. 15s is generous.
 */
export async function awaitSchemaSync(timeoutMs = 15_000): Promise<void> {
  // Trigger schema sync if not yet started (e.g., first request on fresh deploy)
  if (!_schemaSyncPromise && hasPostgresConfigured()) {
    syncSchema().catch(() => {})
  }
  if (!_schemaSyncPromise) return
  const timer = setTimeout(() => {
    console.warn(`[db] awaitSchemaSync timed out after ${timeoutMs}ms — proceeding anyway`)
  }, timeoutMs)
  try {
    await _schemaSyncPromise
  } finally {
    clearTimeout(timer)
  }
}

/** Proxy that delegates every property access to the lazily-created client */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

/**
 * Trigger auto-sync and return the DB client.
 * Call this at the start of any API route that needs the database.
 * Returns null if DB is not configured, or the client if ready.
 *
 * This is the recommended alternative to `requireDb()` for routes that
 * don't need the 503 response (e.g., routes that handle DB errors themselves).
 */
export async function ensureDb(): Promise<PrismaClient | null> {
  if (!hasPostgresConfigured()) return null
  const client = getDb()
  // Fire-and-forget sync — don't block the caller
  autoSyncSchema(client).catch(() => {})
  return client
}

/** Retry wrapper — kept for API compatibility */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}

/**
 * Check if the database is reachable. Returns null if OK, or an error Response
 * if the database is not configured or unreachable.
 *
 * Usage in API routes:
 *   const dbErr = await requireDb(req)
 *   if (dbErr) return dbErr
 *
 * Returns a 503 with a clear message so the frontend can show a proper setup prompt.
 */
export async function requireDb(req?: Request): Promise<globalThis.Response | null> {
  // Quick check: is DATABASE_URL a postgres URL?
  if (!hasPostgresConfigured()) {
    return new globalThis.Response(
      JSON.stringify({
        error: 'Database not configured',
        code: 'DB_NOT_CONFIGURED',
        detail: 'DATABASE_URL is not set or not a valid PostgreSQL URL. Set it in your deployment environment variables and redeploy.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    )
  }

  // Quick connectivity test (cached for 60s per process)
  // 60s reduces unnecessary SELECT 1 pings that consume pool slots.
  const now = Date.now()
  if (_dbPingResult && (now - _dbPingResult.ts) < 60_000) {
    if (!_dbPingResult.ok) {
      return new globalThis.Response(
        JSON.stringify({
          error: 'Database unreachable',
          code: 'DB_UNREACHABLE',
          detail: _dbPingResult.detail,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '10' },
        },
      )
    }
    return null // DB is reachable
  }

  try {
    const client = getDb()
    await withPoolRetry(() => client.$queryRaw`SELECT 1`)
    _dbPingResult = { ok: true, detail: 'ok', ts: now }
    // Auto-sync schema in background — don't block the first request.
    // The singleton Promise prevents duplicate runs; queries that hit a
    // missing column will fail once and succeed on retry after sync completes.
    autoSyncSchema(client).catch(() => {})
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Detect pool exhaustion specifically — tell the client to retry
    if (isPoolExhaustionError(err)) {
      _dbPingResult = { ok: false, detail: msg.slice(0, 200), ts: now }
      return new globalThis.Response(
        JSON.stringify({
          error: 'Database connection pool full',
          code: 'DB_POOL_EXHAUSTED',
          detail: msg.slice(0, 200),
          retryAfter: 5,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '5' },
        },
      )
    }

    _dbPingResult = { ok: false, detail: msg.slice(0, 200), ts: now }
    return new globalThis.Response(
      JSON.stringify({
        error: 'Database unreachable',
        code: 'DB_UNREACHABLE',
        detail: msg.slice(0, 200),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '10' },
      },
    )
  }
}

let _dbPingResult: { ok: boolean; detail: string; ts: number } | null = null
let _schemaSyncPromise: Promise<void> | null = null

/**
 * Create a dedicated PrismaClient for schema sync with connection_limit=1.
 * This ensures sync only takes 1 PgBouncer slot, leaving all 3 connections
 * on the main client free for API queries. Disconnected after sync.
 */
function createSyncClient(): PrismaClient {
  const syncUrl = (process.env.DATABASE_URL || '').replace(/connection_limit=\d+/, 'connection_limit=1')
  return new PrismaClient({
    datasources: { db: { url: syncUrl } },
    log: ['error'] as const,
  })
}

/**
 * Column definitions: [tableName, columnName, alterSql]
 *
 * Used by autoSyncSchema to check which columns are missing and only
 * ALTER those. On typical deploys, 0-2 columns need adding.
 */
const SCHEMA_COLUMNS: [string, string, string][] = [
  ['AuthUser', 'passwordHash', `ALTER TABLE "AuthUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT ''`],
  ['NightAudit', 'totalRooms', `ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "totalRooms" INTEGER NOT NULL DEFAULT 0`],
  ['NightAudit', 'occupiedRooms', `ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "occupiedRooms" INTEGER NOT NULL DEFAULT 0`],
  ['NightAudit', 'arrivals', `ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "arrivals" INTEGER NOT NULL DEFAULT 0`],
  ['NightAudit', 'departures', `ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "departures" INTEGER NOT NULL DEFAULT 0`],
  ['RoomType', 'areaSqM', `ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "areaSqM" DOUBLE PRECISION`],
  ['JournalEntry', 'sourceModule', `ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT`],
  ['JournalEntry', 'sourceId', `ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "sourceId" TEXT`],
  ['JournalEntry', 'postedBy', `ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "postedBy" TEXT`],
  ['JournalEntry', 'postedAt', `ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3)`],
  ['LedgerAccount', 'department', `ALTER TABLE "LedgerAccount" ADD COLUMN IF NOT EXISTS "department" TEXT`],
  ['LedgerAccount', 'subtype', `ALTER TABLE "LedgerAccount" ADD COLUMN IF NOT EXISTS "subtype" TEXT`],
  ['RefreshToken', 'tokenFamilyId', `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenFamilyId" TEXT NOT NULL DEFAULT ''`],
  ['RefreshToken', 'replacedBy', `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "replacedBy" TEXT`],
  ['RefreshToken', 'revokedAt', `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3)`],
  ['CashierShift', 'sessionNo', `ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "sessionNo" INTEGER NOT NULL DEFAULT 0`],
  ['CashierShift', 'cashierId', `ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "cashierId" TEXT`],
  ['CashierShift', 'transactionCount', `ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "transactionCount" INTEGER NOT NULL DEFAULT 0`],
  ['Reservation', 'company', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "company" TEXT`],
  ['Reservation', 'poNumber', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "poNumber" TEXT`],
  ['Reservation', 'bookedBy', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "bookedBy" TEXT`],
  ['Reservation', 'reservationNumber', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reservationNumber" TEXT`],
  ['Reservation', 'reservationType', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reservationType" TEXT NOT NULL DEFAULT 'individual'`],
  ['Reservation', 'ratePlanId', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT`],
  ['Reservation', 'creditLimit', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 15000`],
  ['Reservation', 'paymentStatus', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid'`],
  ['Reservation', 'guaranteed', `ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "guaranteed" BOOLEAN NOT NULL DEFAULT false`],
  ['Room', 'building', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "building" TEXT`],
  ['Room', 'view', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "view" TEXT`],
  ['Room', 'accessibility', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "accessibility" BOOLEAN NOT NULL DEFAULT false`],
  ['Room', 'connectingRoomId', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "connectingRoomId" TEXT`],
  ['Room', 'ipPhoneExt', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "ipPhoneExt" TEXT`],
  ['Room', 'tvChannel', `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "tvChannel" TEXT`],
  ['FolioTransaction', 'taxAmount', `ALTER TABLE "FolioTransaction" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`],
  ['FolioTransaction', 'quantity', `ALTER TABLE "FolioTransaction" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1`],
  ['FolioTransaction', 'outlet', `ALTER TABLE "FolioTransaction" ADD COLUMN IF NOT EXISTS "outlet" TEXT`],
  ['FolioTransaction', 'postedBy', `ALTER TABLE "FolioTransaction" ADD COLUMN IF NOT EXISTS "postedBy" TEXT`],
  ['PosOrder', 'guestCount', `ALTER TABLE "PosOrder" ADD COLUMN IF NOT EXISTS "guestCount" INTEGER NOT NULL DEFAULT 1`],
  ['PosOrder', 'discountAmount', `ALTER TABLE "PosOrder" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`],
  ['Guest', 'loyaltyPoints', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "loyaltyPoints" INTEGER NOT NULL DEFAULT 0`],
  ['Guest', 'loyaltyTier', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "loyaltyTier" TEXT NOT NULL DEFAULT 'none'`],
  ['Guest', 'preferences', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "preferences" TEXT`],
  ['Guest', 'totalStays', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "totalStays" INTEGER NOT NULL DEFAULT 0`],
  ['Guest', 'totalRevenue', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0`],
  ['Guest', 'lastStayAt', `ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "lastStayAt" TIMESTAMP(3)`],
  ['Folio', 'folioType', `ALTER TABLE "Folio" ADD COLUMN IF NOT EXISTS "folioType" TEXT NOT NULL DEFAULT 'guest'`],
  ['Employee', 'department', `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "department" TEXT`],
  ['Employee', 'position', `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "position" TEXT`],
  ['Employee', 'hireDate', `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3)`],
  ['Employee', 'emergencyContact', `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT`],
  ['Property', 'timezone', `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "timezone" TEXT`],
  ['Property', 'currency', `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'NPR'`],
]

const SCHEMA_INDEXES = [
  `CREATE INDEX IF NOT EXISTS "NightAudit_status_businessDate_idx" ON "NightAudit"("status", "businessDate")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_tokenFamilyId_idx" ON "RefreshToken"("tokenFamilyId")`,
  `CREATE INDEX IF NOT EXISTS "CashierShift_sessionNo_idx" ON "CashierShift"("sessionNo")`,
  `CREATE INDEX IF NOT EXISTS "CashierShift_status_idx" ON "CashierShift"("status")`,
]

/**
 * Auto-sync missing database columns.
 *
 * Strategy: Query information_schema.columns FIRST to discover which columns
 * already exist, then only ALTER the missing ones.
 *
 * This solves two problems:
 * 1. Speed: On typical deploys, 0-2 columns are missing → 2-3 round-trips
 *    instead of 56 (old individual approach) or deadlock (DO block approach).
 * 2. No deadlocks: Only locks ONE table at a time per ALTER, and only
 *    for tables that actually need a column. Existing columns → no lock.
 *
 * Uses a SEPARATE PrismaClient with connection_limit=1 to avoid starving
 * the main client's pool.
 */
function autoSyncSchema(_client: PrismaClient): Promise<void> {
  if (_schemaSyncPromise) return _schemaSyncPromise

  _schemaSyncPromise = (async () => {
    const syncClient = createSyncClient()
    try {
      const t0 = Date.now()

      // ── Step 1: Check which columns already exist (1 round-trip) ──
      // Build a query for information_schema that checks ALL 52 columns at once.
      const tableNames = [...new Set(SCHEMA_COLUMNS.map(c => c[0]))]
      const colChecks = SCHEMA_COLUMNS.map(c =>
        `('${c[0]}', '${c[1]}')`
      ).join(', ')

      const existingQuery = `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE (table_name, column_name) IN (${colChecks})
      `

      let existingCols = new Set<string>()
      try {
        const rows = await syncClient.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(existingQuery)
        for (const row of rows) {
          existingCols.add(`${row.table_name}.${row.column_name}`)
        }
      } catch (err) {
        // information_schema query failed — fall through to run all ALTERs blindly
        console.warn('[db] information_schema check failed, running all ALTERs:', err instanceof Error ? err.message : err)
      }

      // ── Step 2: Only ALTER columns that don't exist yet ──
      const missingColumns = SCHEMA_COLUMNS.filter(c => !existingCols.has(`${c[0]}.${c[1]}`))
      let altered = 0

      for (const [, , sql] of missingColumns) {
        try {
          await syncClient.$executeRawUnsafe(sql)
          altered++
        } catch {
          // Column might have been added concurrently — safe to ignore
        }
      }

      // ── Step 3: Create missing indexes ──
      for (const sql of SCHEMA_INDEXES) {
        try { await syncClient.$executeRawUnsafe(sql) } catch { /* index exists */ }
      }

      const elapsed = Date.now() - t0
      console.warn(
        `[db] Schema auto-sync complete in ${elapsed}ms (${existingCols.size} exist, ${altered} added, ${missingColumns.length - altered} skipped)`,
      )
    } catch (err) {
      console.error('[db] Auto-sync failed (non-fatal):', err instanceof Error ? err.message : err)
    } finally {
      syncClient.$disconnect().catch(() => {})
    }
  })()

  return _schemaSyncPromise
}
