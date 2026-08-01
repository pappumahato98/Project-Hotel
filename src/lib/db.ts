/**
 * Prisma Client — PostgreSQL (Supabase).
 *
 * Lazy initialization: the client is created on first query, not at module
 * evaluation time. This avoids Turbopack env-loading race conditions where
 * process.env.DATABASE_URL may be empty when the module is first compiled.
 *
 * PgBouncer params should be embedded in the DATABASE_URL itself (see .env).
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined

function getDb(): PrismaClient {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }
  _db = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
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
