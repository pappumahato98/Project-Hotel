/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * 1. Validates environment variables before any request is processed.
 * 2. Starts background daemons (token cleanup).
 * 3. Pre-warms the Redis/store connection.
 * 4. Registers graceful shutdown handlers (Node.js runtime only).
 */

export async function register() {
  // Dynamic import to avoid circular dependencies at module evaluation time
  const { validateEnv } = await import('@/lib/env')
  const result = validateEnv()

  if (!result.valid && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Environment validation failed. Fix the errors above before deploying.\n' +
      result.errors.map(e => `  - ${e.key}: ${e.message}`).join('\n')
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    const ok = result.errors.length === 0 ? '✅' : '⚠️'
    console.log(`[startup] Environment validation ${ok} — ${result.errors.length} errors, ${result.warnings.length} warnings`)
  }

  // Start periodic cleanup of expired refresh tokens (every 5 min)
  try {
    const { startTokenCleanup } = await import('@/lib/auth/cleanup')
    startTokenCleanup()
    console.log('[startup] Token cleanup daemon started (5-min interval)')
  } catch (err) {
    console.warn('[startup] Could not start token cleanup:', err)
  }

  // Pre-warm the store connection (Redis or in-memory)
  try {
    const { getStore, isDistributedStore } = await import('@/lib/redis')
    const store = await getStore()
    const distributed = await isDistributedStore()
    console.log(`[startup] Store initialized — ${distributed ? 'Redis (distributed)' : 'in-memory (single-instance)'}`)
  } catch (err) {
    console.warn('[startup] Store initialization warning:', err)
  }

  // Register graceful shutdown handlers — deferred to avoid Edge Runtime static analysis
  try { await import('./instrumentation-shutdown') } catch { /* not available in Edge */ }
}
