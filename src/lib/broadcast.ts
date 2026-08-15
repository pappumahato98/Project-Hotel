/**
 * Server-side broadcast utility.
 *
 * NOTE: Supabase Realtime `postgres_changes` is the primary realtime mechanism.
 * The client subscribes to table changes via `use-realtime.ts`, which also
 * invalidates React Query caches so the UI refreshes automatically.
 *
 * This module is kept as a no-op placeholder for any future server-initiated
 * broadcast needs (e.g., server → client push notifications).
 * The pg_notify triggers in the database migration are decorative —
 * they fire but no server-side listener processes them. This is by design:
 * postgres_changes handles everything the client needs.
 */

// Re-exported for backward compatibility — no-op in current architecture.
export function broadcastEvent(_event: string, _data: unknown): void {
  // Server-side broadcast is not needed — the client uses postgres_changes
  // subscriptions which are more efficient (no server round-trip needed).
  // If you need server-initiated push, use Supabase Realtime Broadcast
  // via a server-side Supabase admin client.
}
