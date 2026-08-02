/**
 * useRealtime — Supabase Realtime subscription hook
 *
 * Subscribes to all key Supabase Realtime channels when the user is
 * authenticated. Fetches realtime config from the server on first mount,
 * then initializes the Supabase client and subscribes to all tables.
 *
 * Usage:
 *   <RealtimeProvider>  // in Providers.tsx or AppShell, wraps the app
 *     {children}
 *   </RealtimeProvider>
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient, ensureSupabaseClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/realtime-notifications'
import { useAuthStore } from '@/lib/store'
import { subscribeToTable, unsubscribeChannel, type RealtimeChannel } from '@/lib/realtime'
import type { NotificationCategory, NotificationSeverity } from '@/lib/realtime-notifications'
import { toast } from 'sonner'

// ─── Config: Which tables to subscribe to and how to map events ───

interface TableSubscription {
  table: string
  filter?: { column: string; value: string }
  onInsert?: (payload: Record<string, unknown>) => NotificationEvent | null
  onUpdate?: (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => NotificationEvent | null
  onDelete?: (payload: Record<string, unknown>) => NotificationEvent | null
}

interface NotificationEvent {
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  description: string
  showToast?: boolean
  action?: {
    module: string
    subModule?: string
  }
}

// ─── Status display helpers ──────────────────────────────────────

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// ─── Room subscriptions ────────────────────────────────────────────

const ROOM_SUB: TableSubscription = {
  table: 'Room',
  onUpdate: ({ new: row, old: prev }) => {
    if (prev.status === row.status) return null
    return {
      category: 'room',
      severity: row.status === 'out_of_order' ? 'error' : row.status === 'occupied' ? 'info' : 'success',
      title: `Room ${row.number || row.id} → ${formatStatus(row.status)}`,
      description: `Floor ${row.floor || '?'}, ${row.wing ? `Wing ${row.wing}` : ''}`.trim(),
      showToast: row.status === 'out_of_order' || row.status === 'occupied',
      action: { module: 'rooms' },
    }
  },
}

// ─── Reservation subscriptions ────────────────────────────────────

const RESERVATION_SUB: TableSubscription = {
  table: 'Reservation',
  onInsert: (row) => ({
    category: 'reservation',
    severity: 'info',
    title: `New Reservation: ${row.confirmationNo || '—'}`,
    description: `${row.guestName || 'Guest'} — ${row.status ? formatStatus(row.status as string) : ''}`,
    showToast: true,
    action: { module: 'front-desk', subModule: 'reservations' },
  }),
  onUpdate: ({ new: row, old: prev }) => {
    if (prev.status === row.status) return null
    const severity: NotificationSeverity =
      row.status === 'checked_in' ? 'success'
        : row.status === 'checked_out' ? 'info'
        : row.status === 'cancelled' ? 'warning'
        : row.status === 'no_show' ? 'warning'
        : 'info'

    return {
      category: 'reservation',
      severity,
      title: `${row.confirmationNo || 'Reservation'} → ${formatStatus(row.status as string)}`,
      description: `${row.guestName || 'Guest'}${row.roomNumber ? ` · Room ${row.roomNumber}` : ''}`,
      showToast: ['checked_in', 'checked_out', 'cancelled', 'no_show'].includes(row.status as string),
      action: { module: 'front-desk', subModule: 'arrivals' },
    }
  },
}

// ─── FolioPayment subscriptions ────────────────────────────────────

const PAYMENT_SUB: TableSubscription = {
  table: 'FolioPayment',
  onInsert: (row) => ({
    category: 'payment',
    severity: 'success',
    title: `Payment Received: NPR ${(row.amount as number)?.toLocaleString() || '0'}`,
    description: `${row.guestName || 'Guest'} — ${row.method || 'Payment'}`,
    showToast: true,
    action: { module: 'front-desk', subModule: 'settlement' },
  }),
}

// ─── HkTask subscriptions ─────────────────────────────────────────

const HK_TASK_SUB: TableSubscription = {
  table: 'HkTask',
  onInsert: (row) => ({
    category: 'housekeeping',
    severity: 'info',
    title: `New HK Task: ${formatStatus(row.taskType as string)}`,
    description: `Room ${row.roomNumber || '?'}, Priority: ${row.priority || 'normal'}`,
    showToast: false,
    action: { module: 'housekeeping' },
  }),
  onUpdate: ({ new: row, old: prev }) => {
    if (prev.status === row.status) return null
    const isCompletion = row.status === 'cleaned' || row.status === 'inspected' || row.status === 'completed'
    return {
      category: 'housekeeping',
      severity: isCompletion ? 'success' : 'info',
      title: `HK Task ${row.taskType || ''} → ${formatStatus(row.status as string)}`,
      description: `Room ${row.roomNumber || '?'}`,
      showToast: isCompletion,
      action: { module: 'housekeeping' },
    }
  },
}

// ─── WorkOrder subscriptions ───────────────────────────────────────

const WORK_ORDER_SUB: TableSubscription = {
  table: 'WorkOrder',
  onInsert: (row) => ({
    category: 'maintenance',
    severity: row.priority === 'emergency' ? 'error' : 'info',
    title: `Work Order: ${row.title || 'New request'}`,
    description: `${row.category || 'General'} — Priority: ${row.priority || 'normal'}`,
    showToast: row.priority === 'emergency',
    action: { module: 'maintenance' },
  }),
  onUpdate: ({ new: row, old: prev }) => {
    if (prev.status === row.status) return null
    return {
      category: 'maintenance',
      severity: row.status === 'completed' ? 'success' : 'info',
      title: `Work Order "${row.title || ''}" → ${formatStatus(row.status as string)}`,
      description: `Room ${row.roomNumber || '?'}`,
      showToast: false,
      action: { module: 'maintenance' },
    }
  },
}

// ─── SecurityEvent subscriptions ───────────────────────────────────

const SECURITY_SUB: TableSubscription = {
  table: 'SecurityEvent',
  onInsert: (row) => ({
    category: 'security',
    severity: row.level === 'critical' ? 'error' : row.level === 'warning' ? 'warning' : 'info',
    title: `Security: ${row.type || 'Event'}`,
    description: (row.details as string) || 'Security event logged',
    showToast: row.level === 'critical' || row.level === 'warning',
    action: undefined,
  }),
}

// ─── PosOrder subscriptions ───────────────────────────────────────

const POS_ORDER_SUB: TableSubscription = {
  table: 'PosOrder',
  onUpdate: ({ new: row, old: prev }) => {
    if (prev.status === row.status) return null
    return {
      category: 'pos',
      severity: row.status === 'completed' ? 'success' : 'info',
      title: `POS Order #${String(row.id).slice(-6)} → ${formatStatus(row.status as string)}`,
      description: `${row.outletName || 'Outlet'}`,
      showToast: false,
      action: { module: 'pos' },
    }
  },
}

// ─── InventoryItem subscriptions ─────────────────────────────────

const INVENTORY_SUB: TableSubscription = {
  table: 'InventoryItem',
  onUpdate: ({ new: row, old: prev }) => {
    const oldStock = prev.currentStock as number
    const newStock = row.currentStock as number
    const reorderPoint = row.reorderPoint as number
    if (oldStock <= reorderPoint || newStock > reorderPoint) return null
    return {
      category: 'inventory',
      severity: 'warning',
      title: `Low Stock: ${row.name || 'Item'}`,
      description: `Current: ${newStock}, Reorder at: ${reorderPoint}`,
      showToast: true,
      action: { module: 'inventory' },
    }
  },
}

// ─── ActivityLog subscriptions ────────────────────────────────────

const ACTIVITY_SUB: TableSubscription = {
  table: 'ActivityLog',
  onInsert: (row) => ({
    category: 'activity',
    severity: 'info',
    title: row.action ? formatStatus(row.action as string) : 'Activity',
    description: (row.details as string) || '',
    showToast: false,
  }),
}

// ─── All subscriptions ────────────────────────────────────────────

const ALL_SUBSCRIPTIONS: TableSubscription[] = [
  ROOM_SUB,
  RESERVATION_SUB,
  PAYMENT_SUB,
  HK_TASK_SUB,
  WORK_ORDER_SUB,
  SECURITY_SUB,
  POS_ORDER_SUB,
  INVENTORY_SUB,
  ACTIVITY_SUB,
]

// ─── Hook: useRealtimeProvider ────────────────────────────────────

/**
 * Top-level hook that:
 * 1. Fetches realtime config from server
 * 2. Initializes Supabase client
 * 3. Subscribes to all configured tables
 *
 * Should be used once when the user is authenticated.
 */
export function useRealtimeProvider(): {
  isConnected: boolean
  channelCount: number
} {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const setConnected = useNotificationStore((s) => s.setConnected)
  const setChannelCount = useNotificationStore((s) => s.setChannelCount)
  const isConnected = useNotificationStore((s) => s.isConnected)
  const channelCount = useNotificationStore((s) => s.channelCount)
  const channelsRef = useRef<(RealtimeChannel | null)[]>([])

  const handleEvent = useCallback((event: NotificationEvent) => {
    addNotification(event)

    if (event.showToast) {
      const toastOptions: Record<string, unknown> = {
        description: event.description,
        duration: 5000,
      }
      switch (event.severity) {
        case 'error':
          toast.error(event.title, toastOptions)
          break
        case 'warning':
          toast.warning(event.title, toastOptions)
          break
        case 'success':
          toast.success(event.title, toastOptions)
          break
        default:
          toast.info(event.title, toastOptions)
      }
    }
  }, [addNotification])

  useEffect(() => {
    if (!isAuthenticated) {
      channelsRef.current.forEach((ch) => unsubscribeChannel(ch))
      channelsRef.current = []
      setChannelCount(0)
      setConnected(false)
      return
    }

    // Initialize Supabase client and subscribe
    let cancelled = false

    const initAndSubscribe = async () => {
      // Ensure Supabase client is initialized
      const client = await ensureSupabaseClient()
      if (cancelled || !client) {
        if (!cancelled) console.info('[Realtime] Supabase not configured — realtime disabled')
        return
      }

      const channels: (RealtimeChannel | null)[] = []

      for (const sub of ALL_SUBSCRIPTIONS) {
        if (cancelled) break
        try {
          const channel = subscribeToTable(sub.table, {
            onInsert: sub.onInsert
              ? (payload) => {
                  const event = sub.onInsert!(payload.new as Record<string, unknown>)
                  if (event) handleEvent(event)
                }
              : undefined,
            onUpdate: sub.onUpdate
              ? (payload) => {
                  const event = sub.onUpdate!(
                    payload.new as Record<string, unknown>,
                    payload.old as Record<string, unknown>
                  )
                  if (event) handleEvent(event)
                }
              : undefined,
            onDelete: sub.onDelete
              ? (payload) => {
                  const event = sub.onDelete!(payload.old as Record<string, unknown>)
                  if (event) handleEvent(event)
                }
              : undefined,
          })

          if (channel) {
            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED' && !cancelled) {
                setConnected(true)
              }
            })
          }

          channels.push(channel)
        } catch (err) {
          console.error(`Failed to subscribe to ${sub.table}:`, err)
        }
      }

      if (!cancelled) {
        channelsRef.current = channels
        const activeChannels = channels.filter(Boolean).length
        setChannelCount(activeChannels)
        setConnected(activeChannels > 0)
        if (activeChannels > 0) {
          console.info(`[Realtime] Connected — ${activeChannels} channels subscribed`)
        }
      }
    }

    initAndSubscribe()

    return () => {
      cancelled = true
      channelsRef.current.forEach((ch) => unsubscribeChannel(ch))
      channelsRef.current = []
      setChannelCount(0)
      setConnected(false)
    }
  }, [isAuthenticated, handleEvent, setConnected, setChannelCount])

  return {
    isConnected,
    channelCount,
  }
}

// ─── Hook: useRealtimeSubscription ────────────────────────────────

/**
 * Subscribe to a single table's realtime changes.
 * Waits for Supabase client to be initialized before subscribing.
 */
export function useRealtimeSubscription(
  table: string,
  callbacks: {
    onInsert?: (payload: Record<string, unknown>) => void
    onUpdate?: (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => void
    onDelete?: (payload: Record<string, unknown>) => void
  },
  filter?: { column: string; value: string },
  enabled: boolean = true
): void {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const subscribe = async () => {
      // Wait for Supabase client
      const client = await ensureSupabaseClient()
      if (cancelled || !client) return

      if (getSupabaseClient()) {
        const channel = subscribeToTable(table, {
          onInsert: callbacks.onInsert
            ? (payload) => callbacks.onInsert!(payload.new as Record<string, unknown>)
            : undefined,
          onUpdate: callbacks.onUpdate
            ? (payload) => callbacks.onUpdate!(
                payload.new as Record<string, unknown>,
                payload.old as Record<string, unknown>
              )
            : undefined,
          onDelete: callbacks.onDelete
            ? (payload) => callbacks.onDelete!(payload.old as Record<string, unknown>)
            : undefined,
        }, filter)

        channelRef.current = channel
      }
    }

    subscribe()

    return () => {
      cancelled = true
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, enabled, filter, callbacks.onInsert, callbacks.onUpdate, callbacks.onDelete])
}

// ─── Hook: usePresence ────────────────────────────────────────────

/**
 * Track the current user's presence on a channel.
 */
export function usePresence(channelName: string = 'meridian-online'): void {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let cancelled = false

    const initPresence = async () => {
      const client = await ensureSupabaseClient()
      if (cancelled || !client) return

      const supabase = getSupabaseClient()
      if (!supabase) return

      const channel = supabase.channel(`presence-${channelName}`, {
        config: { presence: { key: user.id } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        // State synced
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !cancelled) {
          await channel.track({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            role: user.role,
            onlineAt: new Date().toISOString(),
          })
        }
      })

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(async () => {
        if (cancelled) return
        try {
          await channel.track({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            role: user.role,
            onlineAt: new Date().toISOString(),
          })
        } catch {
          // Channel may have closed
        }
      }, 30_000)

      // Store ref for cleanup
      return () => {
        clearInterval(heartbeat)
        channel.unsubscribe()
      }
    }

    let cleanup: (() => void) | undefined
    initPresence().then((c) => { cleanup = c as unknown as (() => void) }).catch(() => {})

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isAuthenticated, user, channelName])
}