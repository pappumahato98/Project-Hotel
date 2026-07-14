import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export interface SessionData {
  token: string
  userId: string
  email: string
  role: string
  firstName: string
  lastName: string
  ipAddress?: string
  userAgent?: string
  expiresAt: Date
}

// In-memory cache for fast lookups (fallback to DB if not in cache)
const sessionCache = new Map<string, SessionData>()

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = new Date()
  for (const [token, session] of sessionCache) {
    if (session.expiresAt < now) {
      sessionCache.delete(token)
    }
  }
}, 5 * 60 * 1000)

export async function createSession(user: {
  id: string; email: string; role: string; firstName: string; lastName: string
}, req?: { ipAddress?: string; userAgent?: string }): Promise<string> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
  const ipAddress = req?.ipAddress
  const userAgent = req?.userAgent?.substring(0, 500)

  // Store in DB
  await db.session.create({
    data: { token, userId: user.id, ipAddress, userAgent, expiresAt },
  })

  // Store in cache
  const sessionData: SessionData = {
    token, userId: user.id, email: user.email, role: user.role,
    firstName: user.firstName, lastName: user.lastName,
    ipAddress, userAgent, expiresAt,
  }
  sessionCache.set(token, sessionData)

  // Clean up old sessions for this user (keep max 5)
  const userSessions = await db.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  if (userSessions.length > 5) {
    const toDelete = userSessions.slice(5)
    for (const s of toDelete) {
      sessionCache.delete(s.token)
      await db.session.delete({ where: { id: s.id } }).catch(() => {})
    }
  }

  return token
}

export async function validateSession(token: string): Promise<SessionData | null> {
  // Check cache first
  const cached = sessionCache.get(token)
  if (cached && cached.expiresAt > new Date()) {
    return cached
  }

  // Fallback to DB
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, role: true, firstName: true, lastName: true, active: true } } },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  const sessionData: SessionData = {
    token: session.token,
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    ipAddress: session.ipAddress ?? undefined,
    userAgent: session.userAgent ?? undefined,
    expiresAt: session.expiresAt,
  }

  sessionCache.set(token, sessionData)
  return sessionData
}

export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token)
  await db.session.deleteMany({ where: { token } }).catch(() => {})
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  const sessions = await db.session.findMany({ where: { userId }, select: { token: true } })
  for (const s of sessions) {
    sessionCache.delete(s.token)
  }
  await db.session.deleteMany({ where: { userId } }).catch(() => {})
}