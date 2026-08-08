/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * Validates environment variables before any request is processed.
 * In production: blocks startup if critical vars are missing.
 * In development: logs warnings but allows startup (fallback users work).
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
}