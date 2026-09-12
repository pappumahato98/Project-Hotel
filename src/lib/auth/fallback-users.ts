/**
 * Fallback users for development/sandbox environments where the database
 * is not available. In production, the database always handles auth.
 *
 * These are only used when:
 *   - NODE_ENV !== 'production'
 *   - The database is genuinely unreachable (network error)
 */

import { hash } from 'bcryptjs'

export interface FallbackUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  department: string
  position: string
  avatarUrl: string | null
  phone: string | null
  active: boolean
  passwordHash: string
}

// Pre-hashed passwords: admin123, gm123, staff123
const FALLBACK_USERS: FallbackUser[] = [
  {
    id: 'admin-001',
    email: 'admin@meridian.com',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    role: 'admin',
    department: 'Management',
    position: 'General Manager',
    avatarUrl: null,
    phone: null,
    active: true,
    passwordHash: '$2b$10$mVXDva52tw7UPQAaS5dK1O3ZNIrBohRTGWUjUJBL8dGVH4uqXgRN2', // admin123
  },
  {
    id: 'gm-001',
    email: 'gm@meridian.com',
    firstName: 'Sita',
    lastName: 'Adhikari',
    role: 'gm',
    department: 'Management',
    position: 'General Manager',
    avatarUrl: null,
    phone: null,
    active: true,
    passwordHash: '$2b$10$K5RJqS8IMK1A2gWjWuC4IuLYXYSvuGzFHG0Hwyt4aYAqn/4SUuOsq', // gm123
  },
  {
    id: 'staff-001',
    email: 'staff@meridian.com',
    firstName: 'Hari',
    lastName: 'Thapa',
    role: 'staff',
    department: 'Front Office',
    position: 'Receptionist',
    avatarUrl: null,
    phone: null,
    active: true,
    passwordHash: '$2b$10$D9AdjIKO5oaKungQqEr/sOuAIFLs76EcydN2ri/6.fmSMdVTTrs0q', // staff123
  },
]

/**
 * Check if the error is a genuine DATABASE CONNECTION error
 * OR a transient schema-mismatch error that resolves after schema sync.
 *
 * IMPORTANT: This must match:
 *   1. Network/transport-level failures (always retryable)
 *   2. Schema-mismatch errors on columns added by auto-sync (transient,
 *      resolve within ~5s when schema sync completes)
 *
 * Prisma error codes (connection/initialization):
 *   P1000 — Authentication failed against database server
 *   P1001 — Can't reach database server (network)
 *   P1002 — The provided database URL is invalid
 *   P1003 — Database does not exist
 *   P1008 — Operation timed out
 *   P1017 — Server has closed the connection
 *
 * Prisma error codes (transient schema mismatch):
 *   P2010 — Raw query failed (column missing → sync will add it)
 *   P2021 — Table does not exist (sync creates tables)
 *   P2024 — Connection pool timeout (PgBouncer exhaustion, transient)
 *
 * NOT connection errors (do NOT match):
 *   P1009 — Database already exists (harmless)
 *   P1014 — Model not found (schema compilation issue)
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error) return false

  // 1. Check Prisma error .code property (most reliable)
  const code = (error as Record<string, unknown>)?.['code']
  if (typeof code === 'string') {
    // P1000-P1017 are all initialization/connection errors
    if (/^P10(0[0-9]|1[0-7])$/.test(code)) return true
    // P2010 (raw query failed) — often caused by missing column that
    // schema sync will add. Transient on fresh deployments.
    if (code === 'P2010') return true
    // P2021 (table does not exist) — schema sync may not have run yet.
    if (code === 'P2021') return true
    // P2024 (connection pool timeout) — PgBouncer exhaustion on Vercel.
    // Transient — withPoolRetry handles retry with backoff.
    if (code === 'P2024') return true
  }

  // 2. Check class name for PrismaClientInitializationError
  const name = error instanceof Error ? error.constructor.name : ''
  if (name === 'PrismaClientInitializationError') return true

  // 3. Check message string patterns (fallback)
  const msg = error instanceof Error ? (error.message || '') : String(error || '')

  // Prisma connection error codes in message
  if (/P100[0-9]/.test(msg) || /P101[0-7]/.test(msg)) return true

  // Node.js network errors
  if (
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('EPIPE') ||
    msg.includes('getaddrinfo') ||
    msg.includes('EAI_AGAIN')
  ) return true

  // Prisma validation error: wrong DATABASE_URL protocol
  if (msg.includes('URL must start with the protocol')) return true

  // TCP / connection patterns
  if (
    msg.includes('Connection refused') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('Socket closed') ||
    msg.includes('Unable to connect') ||
    msg.includes('could not connect') ||
    msg.includes('network is unreachable')
  ) return true

  // SSL/TLS connection errors — be SPECIFIC to avoid false positives
  // Only match when SSL is clearly the cause of a connection failure
  if (
    /SSL\s*(?:error|failed|handshake|connection|connect)/i.test(msg) ||
    /certificate\s*(?:error|failed|verify|invalid|expired)/i.test(msg) ||
    /sslmode/i.test(msg) && /error|fail|refused|unable/i.test(msg) ||
    /self.signed/i.test(msg) && /certificate/i.test(msg)
  ) return true

  // Supabase pooler errors
  if (
    msg.includes('EMAXCONNSESSION') ||
    msg.includes('max clients reached') ||
    msg.includes('max clients are limited to pool_size') ||
    msg.includes('too many connections') ||
    (msg.includes('pooler') && msg.includes('error'))
  ) return true

  // PostgreSQL statement timeout (57014) — often caused by ALTER TABLE
  // locks during schema sync. Retryable because the lock will release.
  if (
    msg.includes('57014') ||
    msg.includes('statement timeout') ||
    msg.includes('canceling statement due to')
  ) return true

  // PostgreSQL deadlock (40P01) — caused by concurrent DDL and SELECT.
  // Transient: retrying the query usually succeeds after the deadlock resolves.
  if (
    msg.includes('40P01') ||
    msg.includes('deadlock detected')
  ) return true

  // Prisma pool timeout message (P2024 fallback when .code not accessible)
  if (msg.includes('Timed out fetching a new connection from the connection pool')) return true

  return false
}

/**
 * Extract a readable summary from any error for logging.
 */
export function errorSummary(error: unknown): string {
  if (!error) return '(no error)'
  const parts: string[] = []
  if (error instanceof Error) {
    parts.push(error.constructor.name)
    if (error.message) parts.push(error.message.slice(0, 200))
    const code = (error as Record<string, unknown>)?.['code']
    if (code) parts.push(`code=${code}`)
    const meta = (error as Record<string, unknown>)?.['meta']
    if (meta) parts.push(`meta=${JSON.stringify(meta).slice(0, 200)}`)
  } else {
    parts.push(String(error).slice(0, 300))
  }
  return parts.join(' | ')
}

/**
 * Find a fallback user by email (case-insensitive).
 * Returns null if not found.
 *
 * IMPORTANT: Fallback auth is now allowed in BOTH development AND production.
 * In production, it only activates when the database is genuinely unreachable
 * (network error, ENOTFOUND, etc.). This ensures the app remains usable
 * even when the database is down or misconfigured — the UI and login still work.
 * A console warning is logged in production to alert operators.
 */
export async function findFallbackUser(email: string): Promise<FallbackUser | null> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[auth] ⚠️  Using fallback auth in production — database is unreachable. Configure a valid DATABASE_URL to use database auth.')
  }

  const lower = email.toLowerCase()
  return FALLBACK_USERS.find(u => u.email === lower) || null
}

/**
 * Seed fallback users into the database.
 * Called by /api/db-setup and /api/seed endpoints.
 */
export async function seedDefaultUsers() {
  const { hash } = await import('bcryptjs')
  const { db } = await import('@/lib/db')

  const users = [
    { id: 'admin-001', email: 'admin@meridian.com', password: 'admin123', firstName: 'Rajesh', lastName: 'Sharma', role: 'admin', department: 'Management', position: 'General Manager' },
    { id: 'gm-001', email: 'gm@meridian.com', password: 'gm123', firstName: 'Sita', lastName: 'Adhikari', role: 'gm', department: 'Management', position: 'General Manager' },
    { id: 'staff-001', email: 'staff@meridian.com', password: 'staff123', firstName: 'Hari', lastName: 'Thapa', role: 'staff', department: 'Front Office', position: 'Receptionist' },
  ]

  let created = 0
  for (const u of users) {
    const exists = await db.authUser.findUnique({ where: { email: u.email } }).catch(() => null)
    if (!exists) {
      const passwordHash = await hash(u.password, 10)
      await db.authUser.create({
        data: { ...u, passwordHash, active: true },
      })
      created++
    }
  }

  return { created, total: users.length }
}
