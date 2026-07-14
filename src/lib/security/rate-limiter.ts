// In-memory rate limiter (no external deps needed)
interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup every 60s
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60_000)

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: options.maxRequests - 1, resetAt }
  }

  if (entry.count >= options.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: options.maxRequests - entry.count, resetAt: entry.resetAt }
}

// Pre-configured limiters
export const loginLimiter = (key: string) =>
  rateLimit(`login:${key}`, { maxRequests: 5, windowMs: 60_000 }) // 5 per minute

export const apiLimiter = (key: string) =>
  rateLimit(`api:${key}`, { maxRequests: 100, windowMs: 60_000 }) // 100 per minute

export const passwordChangeLimiter = (key: string) =>
  rateLimit(`pwd:${key}`, { maxRequests: 3, windowMs: 15 * 60_000 }) // 3 per 15min