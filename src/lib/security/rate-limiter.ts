/**
 * Sliding Window Rate Limiter — in-memory, zero external deps.
 *
 * Stores an array of timestamps per key. On each request:
 * 1. Prune timestamps older than windowMs.
 * 2. If remaining >= maxRequests → reject with Retry-After.
 * 3. Otherwise, push Date.now(), accept.
 *
 * Memory: ~80 bytes per tracked key × ~2000 active keys = ~160KB.
 * Cleanup every 60s prevents unbounded growth.
 */

interface SlidingWindow {
  timestamps: number[]
}

const store = new Map<string, SlidingWindow>()

// Cleanup every 60s — remove entries with all-expired timestamps
const _cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, window] of store) {
    while (window.timestamps.length > 0 && window.timestamps[0] <= now - 300_000) {
      window.timestamps.shift()
    }
    if (window.timestamps.length === 0) store.delete(key)
  }
}, 60_000)

// Prevent the interval from keeping the process alive during tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  clearInterval(_cleanupInterval)
}

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

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
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
