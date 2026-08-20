import { db, awaitSchemaSync } from '@/lib/db'
import { hasPostgresConfigured } from '@/lib/env'

let _cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Delete all expired refresh tokens and tokens revoked >24h ago.
 * Safe to run from multiple instances (DELETE WHERE is idempotent).
 * Guards against non-PostgreSQL DATABASE_URL to avoid Prisma validation spam.
 *
 * IMPORTANT: Awaits schema sync before the first cleanup run.
 * On a fresh deployment, the `revokedAt` column is added by schema sync.
 * If cleanup runs before sync completes, the query would fail with
 * PrismaClientKnownRequestError (missing column).
 *
 * @param intervalMs - How often to run cleanup (default: 5 minutes)
 */
export function startTokenCleanup(intervalMs = 5 * 60_000): void {
  if (_cleanupTimer) return // Already running

  // Don't even schedule the timer if DB isn't PostgreSQL.
  // Prevents repeated Prisma validation errors in local dev with SQLite URL.
  if (!hasPostgresConfigured()) {
    console.log('[cleanup] Skipped — DATABASE_URL is not PostgreSQL')
    return
  }

  _cleanupTimer = setInterval(async () => {
    try {
      // Ensure schema sync has completed — revokedAt column may not exist yet
      await awaitSchemaSync(15_000).catch(() => {})

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
