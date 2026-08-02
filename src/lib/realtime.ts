/**
 * Supabase Realtime Client Utilities
 *
 * Provides helpers for subscribing to Supabase Realtime channels:
 *   - Postgres Changes: listen to INSERT/UPDATE/DELETE on tables
 *   - Broadcast: send/receive messages between clients
 *   - Presence: track online status of connected users
 *
 * All subscriptions are lazy-initialized and auto-cleanup on unmount.
 * Requires Supabase client to be initialized via ensureSupabaseClient().
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type { RealtimeChannel }

/**
 * Check if Supabase Realtime is available.
 */
export function isRealtimeAvailable(): boolean {
  return getSupabaseClient() !== null
}

/**
 * Subscribe to Postgres Changes on a specific table.
 * Returns the channel so you can unsubscribe manually.
 * Returns null if Supabase is not configured.
 */
export function subscribeToTable<T extends Record<string, unknown>>(
  table: string,
  callbacks: {
    onInsert?: (payload: { new: T; eventType: 'INSERT' }) => void
    onUpdate?: (payload: { new: T; old: T; eventType: 'UPDATE' }) => void
    onDelete?: (payload: { old: T; eventType: 'DELETE' }) => void
  },
  filter?: { column: string; value: string }
): RealtimeChannel | null {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const channelName = `table-${table}-${Date.now()}`

  const channelConfig: Record<string, unknown> = {
    event: '*',
    schema: 'public',
    table,
  }

  if (filter) {
    channelConfig.filter = `${filter.column}=eq.${filter.value}`
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as never,
      channelConfig,
      (payload: Record<string, unknown>) => {
        const eventType = payload.eventType as string
        if (eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert({ new: payload.new as T, eventType: 'INSERT' })
        } else if (eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate({
            new: payload.new as T,
            old: payload.old as T,
            eventType: 'UPDATE',
          })
        } else if (eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete({ old: payload.old as T, eventType: 'DELETE' })
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to a Broadcast channel for custom messages between clients.
 * Returns null if Supabase is not configured.
 */
export function subscribeToBroadcast<T = unknown>(
  channelName: string,
  callbacks: {
    onMessage: (payload: { type: string; payload: T; timestamp?: string }) => void
  }
): RealtimeChannel | null {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const channel = supabase
    .channel(`broadcast-${channelName}`)
    .on('broadcast', { event: channelName }, (payload: { type: string; payload: T; timestamp?: string }) => {
      callbacks.onMessage(payload)
    })
    .subscribe()

  return channel
}

/**
 * Send a message to a Broadcast channel.
 * No-op if Supabase is not configured.
 */
export function sendBroadcast<T = unknown>(
  channelName: string,
  type: string,
  payload: T
): void {
  const supabase = getSupabaseClient()
  if (!supabase) return

  supabase.channel(`broadcast-${channelName}`).send({
    type: 'broadcast',
    event: channelName,
    payload: { type, payload, timestamp: new Date().toISOString() },
  })
}

/**
 * Track user Presence on a channel.
 * Returns null if Supabase is not configured.
 */
export function trackPresence(
  channelName: string,
  user: { id: string; name: string; role?: string },
  state?: Record<string, unknown>
): RealtimeChannel | null {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const channel = supabase.channel(`presence-${channelName}`, {
    config: { presence: { key: user.id } },
  })

  channel.on('presence', { event: 'sync' }, () => {
    // Presence state synced — can read all users via channel.presenceState()
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        ...state,
        userId: user.id,
        userName: user.name,
        role: user.role ?? 'staff',
        onlineAt: new Date().toISOString(),
      })
    }
  })

  return channel
}

/**
 * Unsubscribe from a channel (cleanup).
 */
export function unsubscribeChannel(channel: RealtimeChannel | null): void {
  if (channel) {
    try {
      channel.unsubscribe()
    } catch {
      // Channel may already be closed
    }
  }
}
