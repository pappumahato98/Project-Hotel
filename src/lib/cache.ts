/**
 * Server-side in-memory cache with TTL.
 *
 * On Vercel each Serverless Function instance has its own memory space,
 * but within a single cold-start / warm invocation the cache survives
 * across concurrent requests — eliminating redundant DB round-trips
 * when the orchestrator + individual endpoints are hit simultaneously.
 *
 * For cross-instance dedup, rely on the 5-minute TTL being short enough
 * that stale data is never a problem.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number // epoch ms
}

const store = new Map<string, CacheEntry<unknown>>()

/** Default TTL: 5 minutes */
const DEFAULT_TTL_MS = 5 * 60 * 1000

/**
 * Get a cached value, or compute + store it.
 * Returns `null` when the cache is empty / expired and `fn` is not provided.
 */
export function getCached<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value as T
  }
  if (entry) store.delete(key) // expired — clean up
  return null
}

/**
 * Compute and cache a value.  If the key already has a fresh entry,
 * the existing value is returned without calling `fn`.
 */
export async function getOrSet<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = getCached<T>(key, ttlMs)
  if (cached !== null) return cached

  const value = await fn()
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}

/**
 * Manually invalidate a cache key (useful after mutations).
 */
export function invalidateCache(key: string | string[]): void {
  const keys = Array.isArray(key) ? key : [key]
  for (const k of keys) store.delete(k)
}

/**
 * Invalidate ALL dashboard cache entries.
 */
export function invalidateDashboardCache(): void {
  const prefix = 'dashboard:'
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}

/**
 * Debug helper — returns cache size (used in dev only).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] }
}
