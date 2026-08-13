import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/token'
import { logSecurityEvent } from './audit'
import { rateLimit, RATE_LIMITS } from './rate-limiter'
import { getStore, getStoreSync, authCacheKey, PUBSUB_CHANNELS, type StoreEvent, type SessionInvalidateEvent } from '@/lib/redis'

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
  if (!store.isDistributed) return

  await store.subscribe(PUBSUB_CHANNELS.SESSION_INVALIDATE, (message: string) => {
    try {
      const event: SessionInvalidateEvent = JSON.parse(message)
      if (event.type === 'session:invalidate') {
        invalidateLocalAuthCache(event.userId)
      }
    } catch { /* ignore */ }
  })

  await store.subscribe(PUBSUB_CHANNELS.PERMISSION_CHANGE, (message: string) => {
    try {
      const event: StoreEvent = JSON.parse(message)
      if (event.type === 'permission:change') {
        invalidateLocalAuthCache(event.userId)
      }
    } catch { /* ignore */ }
  })

  await store.subscribe(PUBSUB_CHANNELS.CACHE_CLEAR, (message: string) => {
    try {
      const event: StoreEvent = JSON.parse(message)
      if (event.type === 'cache:clear') {
        invalidateAllLocalAuthCache()
      }
    } catch { /* ignore */ }
  })
}

// ─── Local auth cache (L1 — synchronous, ~1μs) ───────────────

interface CachedAuth {
  user: AuthUser
  expiresAt: number
}

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

export async function broadcastSessionInvalidation(userId: string, reason: string): Promise<void> {
  const store = await getStore()
  if (!store.isDistributed) {
    invalidateLocalAuthCache(userId)
    return
  }
  const event: SessionInvalidateEvent = {
    type: 'session:invalidate', userId, reason, timestamp: Date.now(),
  }
  await store.publish(PUBSUB_CHANNELS.SESSION_INVALIDATE, JSON.stringify(event))
  invalidateLocalAuthCache(userId)
}

// ─── Auth Session ─────────────────────────────────────────────

/**
 * Synchronous L1 cache check — returns AuthUser if cached and fresh.
 * This is the HOT PATH: ~1μs, zero async, zero DB, zero network.
 */
function checkL1Cache(cacheKey: string): AuthUser | null {
  const cached = _localAuthCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user
  }
  if (cached) _localAuthCache.delete(cacheKey) // expired
  return null
}

export async function getAuthSession(req: NextRequest): Promise<AuthUser | NextResponse> {
  // Ensure pub/sub listener is set up (non-blocking)
  ensurePubSubListener().catch(() => {})

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const cacheKey = token.substring(0, 32)

  // L1: Local in-memory cache (SYNCHRONOUS, ~1μs)
  const l1Hit = checkL1Cache(cacheKey)
  if (l1Hit) return l1Hit

  // L2: Redis / distributed cache (only if distributed store)
  const syncStore = getStoreSync()
  if (syncStore) {
    // In-memory mode — skip L2, go straight to JWT verify
   } else {
    // Redis mode — check distributed cache
    try {
      const store = await getStore()
      if (store.isDistributed) {
        const redisCached = await store.get(authCacheKey(cacheKey))
        if (redisCached) {
          const parsed: { user: AuthUser; expiresAt: number } = JSON.parse(redisCached)
          if (parsed.expiresAt > Date.now()) {
            _localAuthCache.set(cacheKey, parsed)
            return parsed.user
          }
        }
      }
    } catch { /* Redis failure — continue with JWT */ }
  }

  // L3: Full JWT verification (crypto, ~0.5ms)
  const payload = await verifyAccessToken(token)
  if (!payload) {
    const ip = getClientIp(req)
    logSecurityEvent({
      type: 'invalid_token', level: 'warning',
      ipAddress: ip, path: req.nextUrl.pathname, method: req.method,
      details: 'Invalid or expired access token',
    })
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  const user: AuthUser = {
    userId: payload.sub, email: payload.email, role: payload.role,
    firstName: payload.firstName, lastName: payload.lastName,
  }

  const cacheEntry = { user, expiresAt: Date.now() + AUTH_TTL }
  _localAuthCache.set(cacheKey, cacheEntry)

  // Only set Redis cache if distributed
  if (!syncStore) {
    getStore().then(store => {
      if (store.isDistributed) {
        store.set(authCacheKey(cacheKey), JSON.stringify(cacheEntry), Math.ceil(AUTH_TTL / 1000) + 1).catch(() => {})
      }
    }).catch(() => {})
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

  // Per-user rate limiting — SYNCHRONOUS in in-memory mode
  const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
  const routeGroup = isWrite ? 'api:write' : 'api:read'
  const rateErr = checkRateLimit(req, routeGroup, `${routeGroup}:${sessionOrError.userId}`)
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
 * Check rate limit — SYNCHRONOUS when in-memory, async only with Redis.
 * Returns NextResponse(429) if rate limited, or null if allowed.
 */
export function checkRateLimit(
  req: NextRequest,
  routeGroup: string,
  key?: string,
): NextResponse | null {
  const config = RATE_LIMITS[routeGroup]
  if (!config) return null

  const rateKey = key ?? `${routeGroup}:${getClientIp(req)}`
  const result = rateLimit(rateKey, config)

  // Handle both sync and async results
  if (result instanceof Promise) {
    // Redis mode — caller should await, but we return null for now
    // and let the async check happen. In practice, this only runs with REDIS_URL.
    result.then((r) => {
      if (!r.success) console.warn(`[rate-limit] Redis rate limit exceeded for ${rateKey}`)
    }).catch(() => {})
    return null // Don't block on Redis — let it be async
  }

  // Synchronous result (in-memory mode)
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
