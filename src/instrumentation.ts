/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * CRITICAL: This function MUST return quickly (< 5 seconds).
 *
 * What runs here (fast):
 *   1. Environment validation (< 1ms)
 *   2. Schema sync trigger (fire-and-forget, < 1ms to start)
 *   3. Token cleanup timer (< 1ms, just setInterval)
 *   4. Store init (< 100ms, in-memory or Redis connect)
 *
 * Schema sync (56 DDL statements) runs in the BACKGROUND:
 *   - Fire-and-forget here so it starts at boot, not on first request
 *   - On long-running servers (Render/Docker): completes before first user request
 *   - On Vercel serverless: runs in background, requests await via awaitSchemaSync()
 *   - Singleton Promise prevents duplicate runs
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

  // ── Schema sync: fire-and-forget at boot ───────────────────────
  // Starts 56 ALTER TABLE + 4 CREATE INDEX in the background.
  // On Render/Docker: completes before first user request (~15-25s).
  // On Vercel: runs in background; auth routes await via awaitSchemaSync().
  // register() returns immediately — doesn't block the function.
  // The singleton Promise in autoSyncSchema() prevents duplicate runs.
  try {
    const { syncSchema } = await import('@/lib/db')
    const { hasPostgresConfigured } = await import('@/lib/env')
    if (hasPostgresConfigured()) {
      syncSchema().catch(() => {})
    }
  } catch {
    // Non-fatal: sync will be triggered lazily on first request
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
}
