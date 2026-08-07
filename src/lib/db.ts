/**
 * Prisma Client — PostgreSQL.
 *
 * Lazy initialization: the client is created on first query, not at module
 * evaluation time. This avoids Turbopack/Webpack env-loading race conditions
 * where process.env.DATABASE_URL may be empty when the module is first compiled.
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

/** Retry wrapper — kept for API compatibility */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}
