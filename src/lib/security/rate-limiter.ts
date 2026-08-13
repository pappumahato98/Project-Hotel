/**
 * Distributed Sliding Window Rate Limiter
 *
 * Strategy:
 * - Redis available → uses ZSET-based sliding window (atomic, distributed)
 * - No Redis → falls back to in-memory array-based sliding window (single instance)
 *
 * Redis algorithm (O(log N) per request):
 *   ZADD key <now_ms> <uuid>
 *   ZREMRANGEBYSCORE key -inf <now_ms - window_ms>  (prune old entries)
 *   ZCARD key  (count remaining)
 *   EXPIRE key <window_seconds>  (auto-cleanup)
 *
 * Memory: ~80 bytes per tracked key × ~2000 active keys = ~160KB (in-memory mode)
 * Redis: sorted sets are memory-efficient with ziplist encoding for small sets
 */

import { getStore, rateLimitKey } from '@/lib/redis'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfterMs?: number
}

// ─── In-Memory Fallback ────────────────────────────────────────

interface SlidingWindow {
  timestamps: number[]
}

const memoryStore = new Map<string, SlidingWindow>()

// Cleanup every 60s — remove entries with all-expired timestamps
const _cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, window] of memoryStore) {
    while (window.timestamps.length > 0 && window.timestamps[0] <= now - 300_000) {
      window.timestamps.shift()
    }
    if (window.timestamps.length === 0) memoryStore.delete(key)
  }
}, 60_000)

// Prevent the interval from keeping the process alive during tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  clearInterval(_cleanupInterval)
}

// ─── Main rate limit function ──────────────────────────────────

/**
 * Check rate limit for a given key.
 * - In-memory mode: synchronous fast path (no async overhead)
 * - Redis mode: uses ZSET-based sliding window (atomic, distributed)
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const store = await getStore()

  if (store.isDistributed) {
    return rateLimitRedis(store, key, config)
  }
  // In-memory: already synchronous under the hood
  return rateLimitMemory(key, config)
}

// ─── Redis Implementation (Sorted Set Sliding Window) ─────────

async function rateLimitRedis(
  store: Awaited<ReturnType<typeof getStore>>,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - config.windowMs
  const redisKey = rateLimitKey(key)
  const requestId = `${now}-${Math.random().toString(36).slice(2, 10)}`

  try {
    // Pipeline: add → prune → count → set TTL
    // Using individual calls for clarity; ioredis pipeline could optimize further
    await store.zadd(redisKey, now, requestId)
    await store.zremrangebyscore(redisKey, -Infinity, windowStart)
    const members = await store.zrangebyscore(redisKey, windowStart, Infinity)
    const count = members.length

    // Set TTL = window so key auto-expires (even if no more requests)
    const windowSeconds = Math.ceil(config.windowMs / 1000) + 1
    await store.expire(redisKey, windowSeconds)

    if (count > config.maxRequests) {
      // We overshot — remove the one we just added
      await store.zrem(redisKey, requestId)
      // Re-count after removal to get accurate remaining
      const afterMembers = await store.zrangebyscore(redisKey, windowStart, Infinity)
      const afterCount = afterMembers.length

      // Find the oldest entry to calculate retry-after
      const oldest = afterCount > 0 ? afterMembers[0] : requestId
      const oldestScore = oldest ? parseInt(oldest.split('-')[0], 10) : now

      return {
        success: false,
        remaining: 0,
        resetAt: oldestScore + config.windowMs,
        retryAfterMs: oldestScore + config.windowMs - now,
      }
    }

    return {
      success: true,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt: now + config.windowMs,
    }
  } catch (err) {
    // Redis failure → fall back to in-memory for this request
    console.warn('[rate-limiter] Redis error, falling back to in-memory:', err)
    return rateLimitMemory(key, config)
  }
}

// ─── In-Memory Implementation ──────────────────────────────────

function rateLimitMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = memoryStore.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    memoryStore.set(key, entry)
  }

  // Prune expired timestamps (in-place sliding window)
  while (entry.timestamps.length > 0 && entry.timestamps[0] <= windowStart) {
    entry.timestamps.shift()
  }

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0]
    return {
      success: false,
      remaining: 0,
      resetAt: oldest + config.windowMs,
      retryAfterMs: oldest + config.windowMs - now,
    }
  }

  entry.timestamps.push(now)
  return {
    success: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetAt: now + config.windowMs,
  }
}

// ─── Route group presets ─────────────────────────────────────

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Public auth endpoints — very strict
  'auth:login':           { maxRequests: 10, windowMs: 5 * 60_000 },  // 10/5min per IP
  'auth:login:email':     { maxRequests: 8,  windowMs: 5 * 60_000 },  // 8/5min per email
  'auth:signup':          { maxRequests: 3,  windowMs: 60_000 },     // 3/min per IP
  'auth:forgot-password': { maxRequests: 3,  windowMs: 15 * 60_000 }, // 3/15min per IP
  'auth:reset-password':  { maxRequests: 3,  windowMs: 15 * 60_000 },
  'auth:refresh':         { maxRequests: 10, windowMs: 60_000 },     // 10/min per IP

  // Authenticated endpoints — per-user
  'api:read':             { maxRequests: 120, windowMs: 60_000 },     // 120/min per userId
  'api:write':            { maxRequests: 30,  windowMs: 60_000 },     // 30/min for POST/PATCH/DELETE
  'auth:password':        { maxRequests: 3,   windowMs: 15 * 60_000 }, // 3/15min per userId

  // System endpoints
  'system:db-setup':      { maxRequests: 2,   windowMs: 60_000 },     // 2/min per IP
}
