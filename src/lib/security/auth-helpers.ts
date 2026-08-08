import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/token'
import { db } from '@/lib/db'
import { logSecurityEvent } from './audit'
import { findFallbackUser, isDatabaseError } from '@/lib/auth/fallback-users'
import { rateLimit, RATE_LIMITS, type RateLimitConfig } from './rate-limiter'
import { getStore, authCacheKey, PUBSUB_CHANNELS, type StoreEvent, type SessionInvalidateEvent } from '@/lib/redis'

export type AuthUser = {
  userId: string
  email: string
  role: string
  firstName: string
  lastName: string
}

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  gm: 4,
  manager: 3,
  supervisor: 2,
  staff: 1,
}

// ─── Pub/Sub listener for cross-instance session invalidation ───

let _pubsubInitialized = false

async function ensurePubSubListener(): Promise<void> {
  if (_pubsubInitialized) return
  _pubsubInitialized = true

  const store = await getStore()
  if (!store.isDistributed) return // No need for pub/sub in single-instance

  await store.subscribe(PUBSUB_CHANNELS.SESSION_INVALIDATE, (message: string) => {
    try {
      const event: SessionInvalidateEvent = JSON.parse(message)
      if (event.type === 'session:invalidate') {
        // Clear auth cache entries for this user
        invalidateLocalAuthCache(event.userId)
        console.log(`[auth] Received session invalidation for user ${event.userId}: ${event.reason}`)
      }
    } catch {
      // Ignore malformed messages
    }
  })

  await store.subscribe(PUBSUB_CHANNELS.PERMISSION_CHANGE, (message: string) => {
    try {
      const event: StoreEvent = JSON.parse(message)
      if (event.type === 'permission:change') {
        // Clear auth cache for this user (next request will pick up new role)
        invalidateLocalAuthCache(event.userId)
        console.log(`[auth] Received permission change for user ${event.userId}`)
      }
    } catch {
      // Ignore malformed messages
    }
  })

  await store.subscribe(PUBSUB_CHANNELS.CACHE_CLEAR, (message: string) => {
    try {
      const event: StoreEvent = JSON.parse(message)
      if (event.type === 'cache:clear') {
        invalidateAllLocalAuthCache()
        console.log('[auth] Received cache clear broadcast')
      }
    } catch {
      // Ignore malformed messages
    }
  })
}

// ─── Local auth cache (works with both Redis and in-memory) ───

interface CachedAuth {
  user: AuthUser
  expiresAt: number
}

// Local L1 cache for ultra-fast repeated lookups (even with Redis, avoids network hop)
const _localAuthCache = new Map<string, CachedAuth>()
const AUTH_TTL = 120_000 // 120 seconds

function invalidateLocalAuthCache(userId: string): void {
 for (const [key, cached] of _localAuthCache) {
    if (cached.user.userId === userId) {
      _localAuthCache.delete(key)
    }
  }
}

function invalidateAllLocalAuthCache(): void {
  _localAuthCache.clear()
}

/**
 * Publish a session invalidation event to all instances via Redis Pub/Sub.
 */
export async function broadcastSessionInvalidation(
  userId: string,
  reason: string,
): Promise<void> {
  const store = await getStore()
  if (!store.isDistributed) {
    // Single-instance: just clear local cache
    invalidateLocalAuthCache(userId)
    return
  }

  const event: SessionInvalidateEvent = {
    type: 'session:invalidate',
    userId,
    reason,
    timestamp: Date.now(),
  }
  await store.publish(PUBSUB_CHANNELS.SESSION_INVALIDATE, JSON.stringify(event))
  // Also clear local cache on this instance
  invalidateLocalAuthCache(userId)
}

// ─── Auth Session ─────────────────────────────────────────────

export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  // Ensure pub/sub listener is set up (no-op if already done)
  ensurePubSubListener().catch(() => { /* non-blocking */ })

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check cache using first 32 chars of token as key
  const cacheKey = token.substring(0, 32)

  // L1: Local in-memory cache (fastest, ~1μs)
  const localCached = _localAuthCache.get(cacheKey)
  if (localCached && localCached.expiresAt > Date.now()) {
    return localCached.user
  }

  // L2: Redis / distributed cache (~1ms)
  const store = await getStore()
  if (store.isDistributed) {
    try {
      const redisCached = await store.get(authCacheKey(cacheKey))
      if (redisCached) {
        const parsed: { user: AuthUser; expiresAt: number } = JSON.parse(redisCached)
        if (parsed.expiresAt > Date.now()) {
          // Promote to L1
          _localAuthCache.set(cacheKey, parsed)
          return parsed.user
        }
      }
    } catch {
      // Redis read failure — continue with JWT verification
    }
  }

  // L3: Full JWT verification + DB lookup (~5-20ms)
  const payload = await verifyAccessToken(token)
  if (!payload) {
    const ip = getClientIp(req)
    logSecurityEvent({
      type: 'invalid_token',
      level: 'warning',
      ipAddress: ip,
      path: req.nextUrl.pathname,
      method: req.method,
      details: 'Invalid or expired access token',
    })
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  // Verify user still exists and is active
  let profile: { id: string; email: string; role: string; firstName: string; lastName: string; active: boolean } | null = null
  try {
    profile = await db.authUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, active: true },
    })
  } catch (dbErr: unknown) {
    // Database unreachable — in dev/sandbox, trust the JWT payload
    if (isDatabaseError(dbErr) && process.env.NODE_ENV !== 'production') {
      console.warn('[auth] DB unreachable for session check, using JWT payload')
      const user: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName,
      }
      _localAuthCache.set(cacheKey, { user, expiresAt: Date.now() + AUTH_TTL })
      return user
    }
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again in a few seconds.' },
      { status: 503, headers: { 'Retry-After': '10' } },
    )
  }

  if (!profile || !profile.active) {
    return NextResponse.json({ error: 'Account not found or deactivated' }, { status: 403 })
  }

  const user: AuthUser = {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
  }

  const cacheEntry = { user, expiresAt: Date.now() + AUTH_TTL }

  // Store in L1 local cache
  _localAuthCache.set(cacheKey, cacheEntry)

  // Store in L2 Redis cache
  if (store.isDistributed) {
    try {
      await store.set(authCacheKey(cacheKey), JSON.stringify(cacheEntry), Math.ceil(AUTH_TTL / 1000) + 1)
    } catch {
      // Redis write failure — L1 cache still works
    }
  }

  return user
}

export function requireRole(...roles: string[]) {
  return async (req: NextRequest, user: AuthUser): Promise<NextResponse | null> => {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0
    const requiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 0))
    if (userLevel < requiredLevel) {
      logSecurityEvent({
        type: 'privilege_escalation_attempt', level: 'warning',
        userId: user.userId, email: user.email,
        ipAddress: getClientIp(req), path: req.nextUrl.pathname, method: req.method,
        details: `User role '${user.role}' attempted to access ${roles.join('/')} endpoint`,
      })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    return null
  }
}

export async function requireAuth(req: NextRequest, requiredRoles?: string[]): Promise<{ user: AuthUser } | NextResponse> {
  const sessionOrError = await getAuthSession(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError

  // Per-user rate limiting for authenticated endpoints
  const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
  const routeGroup = isWrite ? 'api:write' : 'api:read'
  const rateErr = await checkRateLimit(req, routeGroup, `${routeGroup}:${sessionOrError.userId}`)
  if (rateErr) return rateErr

  if (requiredRoles && requiredRoles.length > 0) {
    const roleCheck = await requireRole(...requiredRoles)(req, sessionOrError)
    if (roleCheck) return roleCheck
  }
  return { user: sessionOrError }
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

export function getClientUA(req: NextRequest): string {
  return req.headers.get('user-agent') ?? 'unknown'
}

/**
 * Check rate limit for an API request (now async for Redis support).
 * - Public endpoints: pass routeGroup like 'auth:login', key is IP
 * - Authenticated endpoints: pass routeGroup like 'api:write', key is userId
 * Returns NextResponse(429) if rate limited, or null if allowed.
 */
export async function checkRateLimit(
  req: NextRequest,
  routeGroup: string,
  key?: string,
): Promise<NextResponse | null> {
  const config = RATE_LIMITS[routeGroup]
  if (!config) return null // No rate limit configured for this route group

  const rateKey = key ?? `${routeGroup}:${getClientIp(req)}`
  const result = await rateLimit(rateKey, config)

  if (!result.success) {
    const retryAfterSec = Math.ceil((result.retryAfterMs ?? 60_000) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      },
    )
  }

  return null
}
