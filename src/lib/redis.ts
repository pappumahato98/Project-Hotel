/**
 * Redis Client Abstraction with In-Memory Fallback
 *
 * Provides a unified `KVStore` interface that:
 * - Production (REDIS_URL set): uses ioredis for distributed state
 * - Development/Sandbox (no REDIS_URL): uses in-memory Map (zero deps)
 *
 * This enables multi-instance deployments where rate limiting, auth cache,
 * and pub/sub events are shared across all instances.
 *
 * Usage:
 *   import { getStore } from '@/lib/redis'
 *   const store = getStore()
 *   await store.set('key', 'value', 60) // 60s TTL
 *   const val = await store.get('key')
 */

// Dynamic import to avoid bundling ioredis in sandbox/dev where 'stream' module is unavailable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisCtor: any = null
async function getRedisClass() {
  if (!RedisCtor) {
    try {
      const mod = await import('ioredis')
      RedisCtor = mod.default
    } catch {
      RedisCtor = null
    }
  }
  return RedisCtor
}
type RedisClient = any

// ─── Key-Value Store Interface ─────────────────────────────────

export interface KVStore {
  /** Get a string value. Returns null if not found or expired. */
  get(key: string): Promise<string | null>

  /** Set a string value with optional TTL in seconds. */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>

  /** Delete a key. Returns number of keys removed. */
  del(key: string): Promise<number>

  /** Atomically increment a counter. Creates key with 0 if missing. */
  incr(key: string): Promise<number>

  /** Set TTL on existing key. Returns true if key exists. */
  expire(key: string, ttlSeconds: number): Promise<boolean>

  /** Get remaining TTL in seconds. Returns -1 if no TTL, -2 if key doesn't exist. */
  ttl(key: string): Promise<number>

  /** Check if key exists. */
  exists(key: string): Promise<boolean>

  /** Set a hash field. */
  hset(key: string, field: string, value: string): Promise<void>

  /** Get a hash field. Returns null if not found. */
  hget(key: string, field: string): Promise<string | null>

  /** Delete hash field(s). */
  hdel(key: string, field: string): Promise<number>

  /** Get all fields and values of a hash. */
  hgetall(key: string): Promise<Record<string, string>>

  /** Get all members of a sorted set with scores, within score range [min, max]. */
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>

  /** Add member to sorted set with score. Returns new length. */
  zadd(key: string, score: number, member: string): Promise<number>

  /** Remove member from sorted set. Returns number removed. */
  zrem(key: string, member: string): Promise<number>

  /** Remove sorted set members with scores in range. */
  zremrangebyscore(key: string, min: number, max: number): Promise<number>

  /** Publish a message to a channel. Returns number of subscribers that received it. */
  publish(channel: string, message: string): Promise<number>

  /** Subscribe to a channel. Handler is called on each message. */
  subscribe(channel: string, handler: (message: string) => void): Promise<void>

  /** Unsubscribe from a channel. */
  unsubscribe(channel: string): Promise<void>

  /** Ping the store. Returns true if healthy. */
  ping(): Promise<boolean>

  /** Close all connections. Call on graceful shutdown. */
  quit(): Promise<void>

  /** Whether this store is Redis-backed (distributed) or in-memory. */
  readonly isDistributed: boolean
}

// ─── In-Memory Fallback Store ───────────────────────────────────

class MemoryStore implements KVStore {
  readonly isDistributed = false

  // String keys
  private data = new Map<string, { value: string; expiresAt: number | null }>()
  // Hash keys
  private hashes = new Map<string, Map<string, string>>()
  // Sorted sets: member -> score
  private sortedSets = new Map<string, Map<string, number>>()
  // Pub/sub
  private subscribers = new Map<string, Set<(msg: string) => void>>()

  private clean(key: string): boolean {
    const entry = this.data.get(key)
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(key)
      return true
    }
    return false
  }

  async get(key: string): Promise<string | null> {
    this.clean(key)
    return this.data.get(key)?.value ?? null
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }

  async del(key: string): Promise<number> {
    this.clean(key)
    return this.data.delete(key) ? 1 : 0
  }

  async incr(key: string): Promise<number> {
    this.clean(key)
    const entry = this.data.get(key)
    const val = entry ? parseInt(entry.value, 10) + 1 : 1
    this.data.set(key, { value: String(val), expiresAt: entry?.expiresAt })
    return val
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.data.get(key)
    if (!entry) return false
    entry.expiresAt = Date.now() + ttlSeconds * 1000
    return true
  }

  async ttl(key: string): Promise<number> {
    this.clean(key)
    const entry = this.data.get(key)
    if (!entry) return -2
    if (!entry.expiresAt) return -1
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  }

  async exists(key: string): Promise<boolean> {
    this.clean(key)
    return this.data.has(key)
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    let hash = this.hashes.get(key)
    if (!hash) {
      hash = new Map()
      this.hashes.set(key, hash)
    }
    hash.set(field, value)
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.get(field) ?? null
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.hashes.get(key)?.delete(field) ? 1 : 0
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key)
    if (!hash) return {}
    const result: Record<string, string> = {}
    for (const [k, v] of hash) result[k] = v
    return result
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const zset = this.sortedSets.get(key)
    if (!zset) return []
    const result: string[] = []
    for (const [member, score] of zset) {
      if (score >= min && score <= max) result.push(member)
    }
    return result
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    let zset = this.sortedSets.get(key)
    if (!zset) {
      zset = new Map()
      this.sortedSets.set(key, zset)
    }
    const isNew = !zset.has(member)
    zset.set(member, score)
    return isNew ? 1 : 0
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.sortedSets.get(key)?.delete(member) ? 1 : 0
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const zset = this.sortedSets.get(key)
    if (!zset) return 0
    let count = 0
    for (const [member, score] of zset) {
      if (score >= min && score <= max) {
        zset.delete(member)
        count++
      }
    }
    return count
  }

  async publish(channel: string, message: string): Promise<number> {
    const subs = this.subscribers.get(channel)
    if (!subs || subs.size === 0) return 0
    // Copy to avoid mutation during iteration
    for (const handler of [...subs]) {
      try { handler(message) } catch { /* handler error is isolated */ }
    }
    return subs.size
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    let subs = this.subscribers.get(channel)
    if (!subs) {
      subs = new Set()
      this.subscribers.set(channel, subs)
    }
    subs.add(handler)
  }

  async unsubscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.subscribers.get(channel)?.delete(handler)
  }

  async ping(): Promise<boolean> {
    return true
  }

  async quit(): Promise<void> {
    this.data.clear()
    this.hashes.clear()
    this.sortedSets.clear()
    this.subscribers.clear()
  }
}

// ─── Redis-backed Distributed Store ─────────────────────────────

class RedisStore implements KVStore {
  readonly isDistributed = true
  private client!: RedisClient
  private subscriber!: RedisClient
  private subscriberReady = false
  private redisUrl: string

  private constructor(redisUrl: string) {
    this.redisUrl = redisUrl
  }

  static async create(redisUrl: string): Promise<RedisStore> {
    const RC = await getRedisClass()
    if (!RC) throw new Error('ioredis not available')
    const instance = new RedisStore(redisUrl)
    // Main client for commands
    instance.client = new RC(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000)
        return delay
      },
      enableReadyCheck: true,
      lazyConnect: true,
    })

    // Separate connection for pub/sub (Redis requires dedicated connection)
    instance.subscriber = new RC(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000)
        return delay
      },
      lazyConnect: true,
    })

    instance.subscriber.on('ready', () => {
      instance.subscriberReady = true
      console.log('[redis] Subscriber connected')
    })

    instance.subscriber.on('error', (err: Error) => {
      console.warn('[redis] Subscriber error:', err.message)
    })

    // Reconnect subscriber on close
    instance.subscriber.on('close', () => {
      instance.subscriberReady = false
    })

    return instance
  }

  async connect(): Promise<void> {
    await this.client.connect()
    await this.subscriber.connect()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds)
    return result === 1
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value)
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field)
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key)
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max)
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member)
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member)
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return this.client.zremrangebyscore(key, String(min), String(max))
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message)
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    // Ensure subscriber is connected before subscribing
    if (!this.subscriberReady) {
      try {
        await this.subscriber.connect()
      } catch {
        // Will retry via ioredis retryStrategy
      }
    }
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (ch: string, msg: string) => {
      if (ch === channel) {
        try { handler(msg) } catch { /* handler error is isolated */ }
      }
    })
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscriber.unsubscribe(channel)
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  async quit(): Promise<void> {
    try { await this.client.quit() } catch { /* ignore */ }
    try { await this.subscriber.quit() } catch { /* ignore */ }
    this.subscriberReady = false
  }
}

// ─── Singleton Factory ──────────────────────────────────────────

let _store: KVStore | null = null
let _storeInitializing: Promise<KVStore> | null = null

/**
 * Get the singleton KV store instance.
 * - If REDIS_URL is set → RedisStore (distributed, multi-instance)
 * - If REDIS_URL is not set → MemoryStore (single instance, zero deps)
 *
 * Thread-safe: only one store instance is ever created.
 */
export async function getStore(): Promise<KVStore> {
  if (_store) return _store
  if (_storeInitializing) return _storeInitializing

  _storeInitializing = createStore().then((s) => {
    _store = s
    return s
  })

  return _storeInitializing
}

async function createStore(): Promise<KVStore> {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    console.log('[store] REDIS_URL not set — using in-memory store (single-instance mode)')
    return new MemoryStore()
  }

  // Validate URL format
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    console.warn(`[store] Invalid REDIS_URL format (must start with redis:// or rediss://) — falling back to in-memory`)
    return new MemoryStore()
  }

  try {
    const store = await RedisStore.create(redisUrl)
    await store.connect()
    const healthy = await store.ping()
    if (!healthy) {
      console.warn('[store] Redis PING failed — falling back to in-memory')
      return new MemoryStore()
    }
    console.log('[store] Redis connected — distributed mode active')
    return store
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[store] Redis connection failed: ${msg} — falling back to in-memory`)
    return new MemoryStore()
  }
}

/**
 * Close the store connection. Call on graceful shutdown.
 */
export async function closeStore(): Promise<void> {
  if (_store) {
    await _store.quit()
    _store = null
    _storeInitializing = null
  }
}

/**
 * Check if the store is distributed (Redis-backed).
 */
export async function isDistributedStore(): Promise<boolean> {
  const store = await getStore()
  return store.isDistributed
}

// ─── Key Namespace Helpers ──────────────────────────────────────

/** Prefix all keys with app namespace to avoid collisions on shared Redis. */
export const STORE_PREFIX = 'meridian: '

export function rateLimitKey(key: string): string {
  return `${STORE_PREFIX}rl:${key}`
}

export function authCacheKey(tokenPrefix: string): string {
  return `${STORE_PREFIX}auth:${tokenPrefix}`
}

export function sessionKey(userId: string, sessionId: string): string {
  return `${STORE_PREFIX}session:${userId}:${sessionId}`
}

// ─── Pub/Sub Channel Constants ──────────────────────────────────

export const PUBSUB_CHANNELS = {
  /** Broadcast when a user's auth cache should be invalidated across all instances */
  SESSION_INVALIDATE: `${STORE_PREFIX}pubsub:session:invalidate`,
  /** Broadcast when a user's role/permissions change */
  PERMISSION_CHANGE: `${STORE_PREFIX}pubsub:permission:change`,
  /** Broadcast cache clear events */
  CACHE_CLEAR: `${STORE_PREFIX}pubsub:cache:clear`,
} as const

// ─── Event Types for Pub/Sub Messages ───────────────────────────

export interface SessionInvalidateEvent {
  type: 'session:invalidate'
  userId: string
  reason: string
  timestamp: number
}

export interface PermissionChangeEvent {
  type: 'permission:change'
  userId: string
  newRole: string
  timestamp: number
}

export interface CacheClearEvent {
  type: 'cache:clear'
  pattern?: string
  timestamp: number
}

export type StoreEvent = SessionInvalidateEvent | PermissionChangeEvent | CacheClearEvent
