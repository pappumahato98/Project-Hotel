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
 */
import { PrismaClient } from '@prisma/client'
import { hasPostgresConfigured } from '@/lib/env'

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
  // Supabase pooler has a hard limit (free tier: 15 connections).
  // On Vercel serverless, each function invocation is a separate process,
  // so the singleton only helps within a warm instance.
  // connection_limit=1 ensures each PrismaClient opens at most 1 connection.
  // PgBouncer multiplexes, so 1 connection per client is sufficient.
  if (!url.includes('connection_limit=')) {
    params.push('connection_limit=1', 'pool_timeout=10', 'connect_timeout=5')
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
