/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * 1. Validates environment variables before any request is processed.
 * 2. Starts background daemons (token cleanup).
 * 3. Pre-warms the Redis/store connection.
 * 4. Registers graceful shutdown handlers.
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

  // Register graceful shutdown handlers
  registerShutdownHooks()
}

function registerShutdownHooks(): void {
  const shutdown = async (signal: string) => {
    console.log(`[shutdown] Received ${signal}, starting graceful shutdown...`)

    try {
      const { closeStore } = await import('@/lib/redis')
      await closeStore()
      console.log('[shutdown] Store connection closed')
    } catch {
      // Best effort
    }

    console.log('[shutdown] Graceful shutdown complete')
    // Give the event loop a moment to flush pending writes
    setTimeout(() => process.exit(0), 500)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
