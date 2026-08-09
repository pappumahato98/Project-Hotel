/**
 * Prisma Client — PostgreSQL with Connection Pooling.
 *
 * Features:
 *   - Lazy initialization (avoids Turbopack/Webpack env-loading race conditions)
 *   - Environment validation on first connection
 *   - Automatic SSL enforcement with Supabase CA certificate (sslmode=verify-full)
 *   - Connection pool limits for PgBouncer compatibility
 *   - Global singleton (prevents multiple clients in dev hot-reload)
 */
import { PrismaClient } from '@prisma/client'
import { hasPostgresConfigured } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined
let _validated = false

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

  const url = process.env.DATABASE_URL!
  const hasQuery = url.includes('?')
  const separator = hasQuery ? '&' : '?'
  const params: string[] = []

  // ── SSL enforcement ──────────────────────────────────────────
  // Check for Supabase CA cert inside function body (not top-level import)
  // to avoid webpack bundler "Can't resolve 'fs'" errors.
  let hasCert = false
  let certPath = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeFs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodePath = require('node:path')
    certPath = nodePath.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt')
    hasCert = nodeFs.existsSync(certPath)
  } catch {
    // fs/path not available — skip cert check, use sslmode=require as fallback
  }

  const explicitSslmode = url.match(/sslmode=([a-z-]+)/)?.[1]

  if (!explicitSslmode) {
    if (hasCert) {
      params.push('sslmode=verify-full', `sslrootcert=${certPath}`)
      console.warn(`[db] SSL enforced: sslmode=verify-full with Supabase CA cert (${certPath})`)
    } else {
      params.push('sslmode=require')
      console.warn('[db] SSL enforced: sslmode=require (no CA cert at certs/prod-ca-2021.crt)')
    }
  } else if (['disable', 'allow', 'prefer'].includes(explicitSslmode)) {
    console.warn(`[db] Weak SSL mode (sslmode=${explicitSslmode}). Use sslmode=verify-full.`)
  } else if (explicitSslmode === 'verify-full' && !url.includes('sslrootcert=')) {
    if (hasCert) {
      params.push(`sslrootcert=${certPath}`)
      console.warn(`[db] sslrootcert injected: ${certPath}`)
    }
  }

  // ── Connection pool limits ───────────────────────────────────
  if (!url.includes('connection_limit=')) {
    params.push('connection_limit=10', 'pool_timeout=10')
  }

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
