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
 * Check if the error is a genuine DATABASE CONNECTION error.
 *
 * IMPORTANT: This must ONLY match network/transport-level failures.
 * Do NOT match schema errors, query errors, or other Prisma runtime errors.
 *
 * Prisma error codes:
 *   P1001 — Can't reach database server (network)
 *   P1003 — Database does not exist
 *   P1008 — Operation timed out
 *   P1009 — Database already exists (harmless, not connection)
 *   P1014 — Model not found (schema issue, NOT connection)
 *   P2010 — Raw query failed (query error, NOT connection)
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error) return false
  const msg = error instanceof Error ? error.message : String(error)

  // Prisma connection error codes
  if (/P100[13]/.test(msg)) return true

  // Node.js network errors
  if (
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('EPIPE') ||
    msg.includes('getaddrinfo')
  ) return true

  // TCP / connection refused patterns
  if (
    msg.includes('Connection refused') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('Socket closed') ||
    msg.includes('Unable to connect') ||
    msg.includes('could not connect') ||
    msg.includes('network is unreachable')
  ) return true

  return false
}

/**
 * Find a fallback user by email (case-insensitive).
 * Returns null if not found or if in production.
 */
export async function findFallbackUser(email: string): Promise<FallbackUser | null> {
  if (process.env.NODE_ENV === 'production') return null

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
