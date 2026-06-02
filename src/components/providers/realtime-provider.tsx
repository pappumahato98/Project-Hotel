'use client'

import React, { createContext, useContext, useCallback, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { usePropertyStore, useAuthStore } from '@/lib/store'

interface RealtimeEvent {
  id: string
  event: string
  data: unknown
  timestamp: string
  read: boolean
}

interface RealtimeContextType {
  isConnected: boolean
  events: RealtimeEvent[]
  markRead: (eventId: string) => void
  clearEvents: () => void
  unreadCount: number
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  events: [],
  markRead: () => {},
  clearEvents: () => {},
  unreadCount: 0,
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const activePropertyId = usePropertyStore((s) => s.activeProperty.id)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const handleEvent = useCallback((event: string, data: unknown) => {
    const newEvent: RealtimeEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event,
      data,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setEvents((prev) => [newEvent, ...prev].slice(0, 50))
  }, [])

  const { isConnected } = useRealtime({
    propertyId: activePropertyId,
    modules: ['dashboard', 'front-desk', 'rooms', 'housekeeping', 'operations'],
    onEvent: handleEvent,
    enabled: isAuthenticated,
  })

  const markRead = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, read: true } : e))
    )
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  const unreadCount = events.filter((e) => !e.read).length

  return (
    <RealtimeContext.Provider
      value={{ isConnected, events, markRead, clearEvents, unreadCount }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeContext() {
  return useContext(RealtimeContext)
}
