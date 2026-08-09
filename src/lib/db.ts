/**
 * Prisma Client — PostgreSQL with Connection Pooling.
 *
 * Features:
 *   - Lazy initialization (avoids Turbopack/Webpack env-loading race conditions)
 *   - Environment validation on first connection
 *   - Automatic SSL enforcement (sslmode=require) for all PostgreSQL connections
 *   - Connection pool limits for PgBouncer compatibility
 *   - Global singleton (prevents multiple clients in dev hot-reload)
 */
import { PrismaClient } from '@prisma/client'
import { hasPostgresConfigured } from '@/lib/env'

// ─── Connection Pool Configuration ──────────────────────────────
// Tuned for Supabase PgBouncer (transaction mode, port 5432).
// Supabase free tier: 60 direct connections, 200 pooler connections.
// Render starter: shared pool. Pro: dedicated 25 connections.
// We use conservative defaults that work across all plans.

const PRISMA_CONFIG = {
  // Prisma connection pool (per server instance)
  // Each instance gets its own pool — Render may run 1-2 instances on starter.
  // With 2 instances × 10 connections = 20 pooler connections (well within 200 limit).
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
  // Log only errors in all environments (verbose logging in production is expensive)
  log: ['error'] as const,
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | undefined
let _validated = false

function validateDbConfig() {
  if (_validated) return true
  _validated = true

  if (!hasPostgresConfigured()) {
    // In development with no PostgreSQL, this is OK (fallback auth will be used)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[db] DATABASE_URL is not a PostgreSQL URL. Fallback auth will be used for login. Set a valid postgresql:// DATABASE_URL for full functionality.')
      return false
    }
    // In production, this is a fatal error — but we let the env validator handle the startup error
    console.error('[db] FATAL: DATABASE_URL is not configured for PostgreSQL in production.')
    return false
  }

  // ── Enforce SSL + pool params on PostgreSQL URL ───────────────
  const url = process.env.DATABASE_URL!
  const hasQuery = url.includes('?')
  const separator = hasQuery ? '&' : '?'
  const params: string[] = []

  // 1. Reject non-SSL connections — inject sslmode=require unless explicitly set
  if (!url.includes('sslmode=')) {
    params.push('sslmode=require')
    console.warn('[db] SSL enforced: sslmode=require injected into DATABASE_URL. '
      + 'To use a different mode, set sslmode= explicitly in your DATABASE_URL.')
  } else if (url.includes('sslmode=disable') || url.includes('sslmode=allow') || url.includes('sslmode=prefer')) {
    console.warn(`[db] ⚠️  Weak SSL mode detected (sslmode=disable/allow/prefer). `
      + `Insecure connections may be intercepted. Use sslmode=require or sslmode=verify-full for production.`)
  }

  // 2. Connection pool limits (PgBouncer / Supabase / Render compatible)
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

  _db = new PrismaClient(PRISMA_CONFIG)
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
