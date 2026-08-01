import { db } from '@/lib/db'

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
 * Invalidate ALL cache entries (nuclear option — use sparingly).
 */
export function invalidateAllCache(): void {
  store.clear()
}

/**
 * Convenience: invalidate caches related to a specific module after a mutation.
 * Call this after every successful POST / PATCH / DELETE.
 *
 * Usage:
 *   afterMutation('rooms')          // invalidates room-related + dashboard caches
 *   afterMutation('reservations')    // invalidates reservation-related + dashboard caches
 *   afterMutation()                   // invalidates everything (dashboard + all module data)
 */
export function afterMutation(module?: string): void {
  // Always invalidate dashboard (it aggregates everything)
  invalidateDashboardCache()

  if (!module) {
    invalidateAllCache()
    return
  }

  // Module-specific cache keys
  const moduleKeys: Record<string, string[]> = {
    rooms: ['rooms', 'room-status', 'room-types'],
    reservations: ['reservations', 'arrivals', 'departures', 'in-house'],
    guests: ['guests', 'guest-directory'],
    folio: ['folio', 'folio-transactions', 'guest-ledger'],
    'check-in': ['rooms', 'reservations', 'in-house', 'arrivals'],
    employees: ['employees'],
    'work-orders': ['work-orders', 'maintenance'],
    housekeeping: ['housekeeping', 'hk-tasks', 'hk-workflow'],
    inventory: ['inventory', 'stock', 'purchase-orders', 'requisitions'],
    pos: ['pos', 'pos-orders', 'pos-daily-sales'],
    settings: ['settings', 'system-settings'],
    accounting: ['accounting', 'journal', 'ledger', 'financial-reports'],
    events: ['events', 'banquet-orders'],
    revenue: ['revenue', 'rate-plans', 'demand-calendar'],
    channels: ['channels', 'channel-bookings'],
    hr: ['hr', 'employees', 'attendance', 'payroll', 'schedules', 'leave', 'training'],
    operations: ['operations', 'night-audit', 'shift-handover', 'cashier'],
    maintenance: ['maintenance', 'work-orders', 'assets'],
  }

  const keys = moduleKeys[module]
  if (keys) {
    // Use startsWith for exact prefix matching (avoids false positives from 'includes')
    for (const k of store.keys()) {
      if (keys.some(prefix => k.startsWith(prefix + ':'))) {
        store.delete(k)
      }
    }
  }
}

/**
 * Debug helper — returns cache size (used in dev only).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] }
}

/**
 * Returns a cached settings map (key → parsed value).
 * TTL: 5 minutes — settings change rarely.
 */
export async function getSettingsMap(): Promise<Record<string, unknown>> {
  return getOrSet('system-settings:map', async () => {
    const rows = await db.systemSetting.findMany()
    const map: Record<string, unknown> = {}
    for (const s of rows) {
      if (s.type === 'number') map[s.key] = parseFloat(s.value)
      else if (s.type === 'boolean') map[s.key] = s.value === 'true'
      else if (s.type === 'json') { try { map[s.key] = JSON.parse(s.value) } catch { map[s.key] = s.value } }
      else map[s.key] = s.value
    }
    return map
  }, 5 * 60 * 1000)
}
