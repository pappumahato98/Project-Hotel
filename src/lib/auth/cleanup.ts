import { db } from '@/lib/db'

let _cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Delete all expired refresh tokens and tokens revoked >24h ago.
 * Safe to run from multiple instances (DELETE WHERE is idempotent).
 *
 * @param intervalMs - How often to run cleanup (default: 5 minutes)
 */
export function startTokenCleanup(intervalMs = 5 * 60_000): void {
  if (_cleanupTimer) return // Already running

  _cleanupTimer = setInterval(async () => {
    try {
      const now = new Date()
      const revokedCutoff = new Date(Date.now() - 24 * 60 * 60_1000) // 24h ago

      const result = await db.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: revokedCutoff } },
          ],
        },
      })

      if (result.count > 0) {
        console.log(`[cleanup] Deleted ${result.count} expired/revoked refresh tokens`)
      }
    } catch {
      // Cleanup is best-effort — never let it crash the server
    }
  }, intervalMs)

  // Don't prevent Node.js from exiting
  if (_cleanupTimer && typeof _cleanupTimer.unref === 'function') {
    _cleanupTimer.unref()
  }
}
