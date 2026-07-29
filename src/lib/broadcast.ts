/**
 * Broadcast a realtime event via Supabase Realtime.
 * Falls back to no-op if Supabase is not configured.
 */
export function broadcastEvent(event: string, data: unknown): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    // No Supabase configured — silently skip (e.g. local dev without Supabase)
    return
  }
  // Future: replace with Supabase Realtime `channel().send()` when server-side
  // Supabase client is available in API routes. For now, this is a no-op
  // placeholder that prevents crashes from hardcoded localhost URLs.
  // Real realtime will be handled via Supabase Realtime subscriptions on the client.
}
