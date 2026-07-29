/**
 * Realtime Notification Store
 *
 * Manages realtime notifications from Supabase postgres_changes and broadcast.
 * Tracks unread count, notification history, and provides methods to
 * mark as read / clear.
 */

import { create } from 'zustand'

// ─── Notification Types ────────────────────────────────────────────

export type NotificationCategory =
  | 'room'
  | 'reservation'
  | 'payment'
  | 'housekeeping'
  | 'maintenance'
  | 'inventory'
  | 'security'
  | 'pos'
  | 'activity'
  | 'system'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface RealtimeNotification {
  id: string
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  description: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
  /** Navigation target when clicking the notification */
  action?: {
    module: string
    subModule?: string
    contextId?: string
  }
}

// ─── Color mapping for categories ────────────────────────────────

export const categoryColorMap: Record<NotificationCategory, string> = {
  room: 'bg-blue-500',
  reservation: 'bg-emerald-500',
  payment: 'bg-purple-500',
  housekeeping: 'bg-teal-500',
  maintenance: 'bg-orange-500',
  inventory: 'bg-amber-500',
  security: 'bg-red-500',
  pos: 'bg-pink-500',
  activity: 'bg-indigo-500',
  system: 'bg-gray-500',
}

// ─── Store Interface ────────────────────────────────────────────────

interface NotificationState {
  notifications: RealtimeNotification[]
  unreadCount: number
  isConnected: boolean
  channelCount: number
  lastEventAt: string | null

  // Actions
  addNotification: (notification: Omit<RealtimeNotification, 'id' | 'read' | 'timestamp'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
  setConnected: (connected: boolean) => void
  setChannelCount: (count: number) => void
}

const MAX_NOTIFICATIONS = 100

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  channelCount: 0,
  lastEventAt: null,

  addNotification: (notification) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      timestamp: new Date().toISOString(),
    }

    set((state) => {
      const updated = [newNotification, ...state.notifications]
      const trimmed = updated.length > MAX_NOTIFICATIONS
        ? updated.slice(0, MAX_NOTIFICATIONS)
        : updated

      return {
        notifications: trimmed,
        unreadCount: trimmed.filter((n) => !n.read).length,
        lastEventAt: newNotification.timestamp,
      }
    })
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    })
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clearNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id)
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },

  setConnected: (connected) => {
    set({ isConnected: connected })
  },

  setChannelCount: (count) => {
    set({ channelCount: count })
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────

export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function getSeverityDotClass(severity: NotificationSeverity): string {
  switch (severity) {
    case 'error': return 'bg-red-500'
    case 'warning': return 'bg-amber-500'
    case 'success': return 'bg-emerald-500'
    case 'info': return 'bg-blue-500'
  }
}
