/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * CRITICAL: This function MUST return quickly (< 5 seconds).
 * Vercel serverless kills functions that exceed 30s in register().
 * Schema sync (52 ALTER TABLEs) takes ~24s → MUST run lazily, NOT here.
 *
 * What runs here (fast):
 *   1. Environment validation (< 1ms)
 *   2. Token cleanup timer (< 1ms, just setInterval)
 *   3. Store init (< 100ms, in-memory or Redis connect)
 *
 * What runs lazily on first API request (via requireDb()):
 *   - Schema auto-sync (52 ALTER TABLE IF NOT EXISTS)
 *   - Connection pool warm-up
 */

export async function register() {
  // Dynamic import to avoid circular dependencies at module evaluation time
  const { validateEnv } = await import('@/lib/env')
  const result = validateEnv()

  if (!result.valid) {
    const errMsg = result.errors.map(e => `  - ${e.key}: ${e.message}`).join('\n')
    if (process.env.NODE_ENV === 'production') {
      console.error(`[startup] ⚠️  Environment has ${result.errors.length} error(s):\n${errMsg}\n[startup] App starting anyway — /api/health for diagnostics`)
    } else {
      console.log(`[startup] Environment validation ⚠️ — ${result.errors.length} errors, ${result.warnings.length} warnings`)
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[startup] Environment validation ✅ — ${result.errors.length} errors, ${result.warnings.length} warnings`)
  }

  // Start periodic cleanup of expired refresh tokens (every 5 min)
  try {
    const { startTokenCleanup } = await import('@/lib/auth/cleanup')
    startTokenCleanup()
    console.log('[startup] Token cleanup daemon started (5-min interval)')
  } catch (err) {
    console.warn('[startup] Could not start token cleanup:', err)
  }

  // Pre-warm the store connection (Redis or in-memory) — fast, non-blocking
  try {
    const { getStore, isDistributedStore } = await import('@/lib/redis')
    const store = await getStore()
    const distributed = await isDistributedStore()
    console.log(`[startup] Store initialized — ${distributed ? 'Redis (distributed)' : 'in-memory (single-instance)'}`)
  } catch (err) {
    console.warn('[startup] Store initialization warning:', err)
  }

  // ── Schema sync and dashboard pre-warm: REMOVED from register() ──
  //
  // WHY: Schema sync runs 52 ALTER TABLE statements which takes ~24 seconds.
  // Vercel kills the function at 30s → guaranteed timeout.
  //
  // WHERE IT RUNS INSTEAD:
  //   - requireDb() fires schema sync lazily on the first API request
  //   - It's fire-and-forget (doesn't block the request)
  //   - The singleton Promise prevents duplicate runs
  //
  // Dashboard pre-warm is also removed — on Vercel serverless, each
  // function is a separate process, so warming one instance doesn't help
  // others. On long-running servers (Render/Docker), the first dashboard
  // request naturally warms the cache.
}
