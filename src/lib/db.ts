/**
 * Prisma Client — PostgreSQL via Supabase (with PgBouncer support).
 *
 * In production (Vercel), DATABASE_URL points to Supabase's PgBouncer port (6543).
 * We inject `pgbouncer=true` and connection-limiting params to prevent
 * 42P05 (prepared statement already exists) and 26000 (invalid SQL statement name)
 * errors that PgBouncer's transaction-mode pooling causes.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Build a PgBouncer-compatible connection URL.
 * Strips any existing query params and appends the required ones.
 */
function getPgBouncerUrl(): string {
  let url = process.env.DATABASE_URL ?? ''
  if (!url) return url

  // Strip existing query params
  if (url.includes('?')) {
    url = url.split('?')[0]
  }

  const params = new URLSearchParams()
  params.set('pgbouncer', 'true')
  params.set('connection_limit', '3')
  params.set('statement_cache_size', '0')
  params.set('connect_timeout', '10')
  params.set('pool_timeout', '10')

  return url + '?' + params.toString()
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getPgBouncerUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Retry wrapper for transient DB errors (PgBouncer, connection drops) */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (
        i === retries ||
        !['42P05', '26000', '08006', '57P01', '57P02'].includes(code ?? '')
      ) {
        throw e
      }
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}
