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
import fs from 'fs'
import path from 'path'
import { hasPostgresConfigured } from '@/lib/env'

// ─── Supabase SSL Certificate ────────────────────────────────────
// Supabase Root CA 2021 — used for sslmode=verify-full to prevent
// man-in-the-middle attacks. The cert is resolved relative to project root
// so it works in any deployment environment.
const SUPABASE_CA_CERT_PATH = path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt')

// ─── Connection Pool Configuration ──────────────────────────────
// Tuned for Supabase PgBouncer (transaction mode, port 5432).
// Supabase free tier: 60 direct connections, 200 pooler connections.
// Render starter: shared pool. Pro: dedicated 25 connections.
// We use conservative defaults that work across all plans.

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

  // 1. SSL enforcement — use verify-full with Supabase CA cert when available
  const hasCert = fs.existsSync(SUPABASE_CA_CERT_PATH)
  const explicitSslmode = url.match(/sslmode=([a-z-]+)/)?.[1]

  if (!explicitSslmode) {
    if (hasCert) {
      // Best security: verify-full with CA certificate
      params.push('sslmode=verify-full', `sslrootcert=${SUPABASE_CA_CERT_PATH}`)
      console.warn('[db] SSL enforced: sslmode=verify-full with Supabase CA certificate. '
        + `Certificate: ${SUPABASE_CA_CERT_PATH}`)
    } else {
      // Fallback: require SSL but skip cert verification
      params.push('sslmode=require')
      console.warn('[db] SSL enforced: sslmode=require (no CA cert found at certs/prod-ca-2021.crt). '
        + 'Drop the Supabase CA cert there for verify-full protection.')
    }
  } else if (['disable', 'allow', 'prefer'].includes(explicitSslmode)) {
    console.warn(`[db] \u26a0\ufe0f  Weak SSL mode detected (sslmode=${explicitSslmode}). `
      + 'Insecure connections may be intercepted. Use sslmode=require or sslmode=verify-full for production.')
  } else if (explicitSslmode === 'verify-full' && !url.includes('sslrootcert=')) {
    // User wants verify-full but didn't provide cert path — inject ours
    if (hasCert) {
      params.push(`sslrootcert=${SUPABASE_CA_CERT_PATH}`)
      console.warn(`[db] sslrootcert injected: ${SUPABASE_CA_CERT_PATH}`)
    } else {
      console.warn('[db] \u26a0\ufe0f  sslmode=verify-full without sslrootcert. '
        + 'Connection may fail. Place Supabase CA cert at certs/prod-ca-2021.crt')
    }
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