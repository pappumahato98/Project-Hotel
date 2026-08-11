/**
 * Graceful shutdown handlers — Node.js runtime only.
 * Imported dynamically by instrumentation.ts to avoid Edge Runtime static analysis warnings.
 * This file will silently fail to import in Edge Runtime (caught by the caller).
 */

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
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
