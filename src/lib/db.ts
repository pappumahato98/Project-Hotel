import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// PgBouncer error codes that indicate transient prepared-statement issues
const PGBOUNCER_RETRY_CODES = new Set(['42P05', '26000', '08006', '57P01', '57P02'])
const MAX_RETRIES = 2

/**
 * Build a PgBouncer-compatible DATABASE_URL.
 *
 * Key fixes:
 * 1. `pgbouncer=true` — tells Prisma to avoid prepared statements
 * 2. `connection_limit=3` — limits Prisma's connection pool per serverless instance
 *    (PgBouncer transaction pooler typically has 20-30 total connections;
 *     with many Vercel function instances, a small limit prevents exhaustion)
 * 3. `statement_cache_size=0` — disables pg driver's prepared statement cache
 *    entirely, preventing 42P05/26000 errors at the driver level
 * 4. `connect_timeout=10` — 10s connect timeout (vs pg default of 60s)
 * 5. `pool_timeout=10` — 10s wait for a connection from the pool
 */
function getPgBouncerUrl(): string | undefined {
  let url = process.env.DATABASE_URL
  if (!url) return url

  const params = new URLSearchParams()
  if (url.includes('?')) {
    const existing = new URLSearchParams(url.split('?')[1])
    for (const [k, v] of existing) params.set(k, v)
    url = url.split('?')[0]
  }

  params.set('pgbouncer', 'true')
  params.set('connection_limit', '3')
  params.set('statement_cache_size', '0')
  params.set('connect_timeout', '10')
  params.set('pool_timeout', '10')

  return `${url}?${params.toString()}`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: { url: getPgBouncerUrl() },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Retry wrapper for Prisma queries that may fail with transient PgBouncer errors.
 *
 * Use this for critical dashboard queries.  It retries up to MAX_RETRIES times
 * with a short delay, specifically for known PgBouncer error codes.
 *
 * NOTE: Most queries don't need this because pgbouncer=true + statement_cache_size=0
 * prevents prepared statement issues.  This is a safety net for edge cases.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error
      const code = error instanceof Error
        ? (error as { code?: string }).code
        : null

      if (!code || !PGBOUNCER_RETRY_CODES.has(code)) {
        throw error // not a retryable error
      }

      if (attempt === MAX_RETRIES) {
        console.error(`[db] PgBouncer retry exhausted after ${MAX_RETRIES} attempts:`, code)
        throw error
      }

      console.warn(`[db] PgBouncer error ${code}, retrying (${attempt + 1}/${MAX_RETRIES})...`)
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1))) // 200ms, 400ms
    }
  }
  throw lastError
}
