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
  const { validateEnv, hasPostgresConfigured } = await import('@/lib/env')
  const result = validateEnv()

  if (!result.valid) {
    const errMsg = result.errors.map(e => `  - ${e.key}: ${e.message}`).join('\n')
    if (process.env.NODE_ENV === 'production') {
      // Log but do NOT throw — let the app start so health endpoint and
      // setup instructions are accessible via /api/health
      console.error(`[startup] ⚠️  Environment has ${result.errors.length} error(s):\n${errMsg}\n[startup] App starting anyway — /api/health for diagnostics`)
    } else {
      const ok = '⚠️'
      console.log(`[startup] Environment validation ${ok} — ${result.errors.length} errors, ${result.warnings.length} warnings`)
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

  // Pre-warm the store connection (Redis or in-memory)
  try {
    const { getStore, isDistributedStore } = await import('@/lib/redis')
    const store = await getStore()
    const distributed = await isDistributedStore()
    console.log(`[startup] Store initialized — ${distributed ? 'Redis (distributed)' : 'in-memory (single-instance)'}`)
  } catch (err) {
    console.warn('[startup] Store initialization warning:', err)
  }

  // Auto-sync database schema (adds missing columns if schema drift detected)
  // This runs before any API request, preventing PrismaClientUnknownRequestError
  try {
    if (hasPostgresConfigured()) {
      const { syncSchema } = await import('@/lib/db')
      await syncSchema()
    }
  } catch (err) {
    console.warn('[startup] Schema auto-sync skipped:', err instanceof Error ? err.message : err)
  }

  // Graceful shutdown: handled by hosting platform (Vercel/Render/Docker).
  // Removed separate shutdown handler file to avoid Edge Runtime static
  // analysis failures from process.on/process.exit in the import chain.

  // Pre-warm dashboard cache in the background (non-blocking, DELAYED 5s).
  // Delay prevents competing with schema sync for PgBouncer pool slots.
  // On long-running servers (Render, Docker), this means the first dashboard
  // request hits a warm cache. On Vercel serverless, the benefit is limited
  // since each function is a separate process, but it helps warm instances.
  if (hasPostgresConfigured()) {
    // Fire-and-forget — don't block startup, delay 5s to avoid pool contention
    setTimeout(() => {
      import('@/app/api/dashboard/_data').then(({ fetchKpis, fetchAlerts }) => {
        Promise.all([fetchKpis(), fetchAlerts()])
          .then(() => console.log('[startup] Dashboard cache pre-warmed'))
          .catch((err) => console.warn('[startup] Dashboard pre-warm failed (non-fatal):', err instanceof Error ? err.message : err))
      }).catch(() => { /* module load failed, skip */ })
    }, 5_000)
  }
}
