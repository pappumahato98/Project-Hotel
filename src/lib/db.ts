/**
 * Prisma Client — SQLite (local file database).
 *
 * Lazy initialization: the client is created on first query, not at module
 * evaluation time. This avoids Turbopack env-loading race conditions where
 * process.env.DATABASE_URL may be empty when the module is first compiled.
 *
 * Falls back to `file:./db/custom.db` if DATABASE_URL is not set,
 * so the app works out of the box without a .env file.
 */
import { PrismaClient } from '@prisma/client'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'

const DEFAULT_DB_URL = 'file:./db/custom.db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Ensure the database directory exists */
function ensureDbDir(url: string) {
  // Extract file path from "file:..." URL and make it absolute from project root
  const filePath = url.replace(/^file:/, '')
  const absPath = resolve(process.cwd(), filePath)
  try {
    mkdirSync(dirname(absPath), { recursive: true })
  } catch {
    // Directory already exists or cannot be created
  }
}

let _db: PrismaClient | undefined

function getDb(): PrismaClient {
  if (_db) return _db
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma
    return _db
  }

  const dbUrl = process.env.DATABASE_URL || DEFAULT_DB_URL
  ensureDbDir(dbUrl)

  _db = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
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

/** Retry wrapper — no-op for SQLite (no connection pool), kept for API compatibility */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}
