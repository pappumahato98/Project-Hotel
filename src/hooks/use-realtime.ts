'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseRealtimeOptions {
  propertyId?: string | null
  modules?: string[]
  onEvent?: (event: string, data: unknown) => void
  enabled?: boolean
}

interface UseRealtimeReturn {
  isConnected: boolean
  socket: Socket | null
  emit: (event: string, data: unknown) => void
  broadcast: (event: string, data: unknown) => void
}

// Singleton socket connection
let socketInstance: Socket | null = null
let connectionCount = 0

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { propertyId, modules = [], onEvent, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  const enabledRef = useRef(enabled)

  // Keep refs updated
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  useEffect(() => {
    if (!enabledRef.current) return

    connectionCount++

    // Create singleton connection
    if (!socketInstance) {
      socketInstance = io('/?XTransformPort=3004', {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      })

      socketInstance.on('connect', () => {
        console.log('[Realtime] Connected to server')
        setIsConnected(true)
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('[Realtime] Disconnected:', reason)
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error) => {
        console.warn('[Realtime] Connection error:', error.message)
        setIsConnected(false)
      })

      socketInstance.on('connected', (data: { socketId: string }) => {
        console.log('[Realtime] Server acknowledged connection:', data.socketId)
      })
    }

    const socket = socketInstance

    // Subscribe to property channel
    if (propertyId) {
      socket.emit('subscribe-property', { propertyId })
    }

    // Subscribe to module channels
    for (const mod of modules) {
      socket.emit('subscribe-module', { module: mod })
    }

    // Global event handler
    const handleAnyEvent = (event: string, ...args: unknown[]) => {
      onEventRef.current?.(event, args[0])
    }

    // Listen to common PMS events
    const events = [
      'reservation:created',
      'reservation:updated',
      'reservation:cancelled',
      'reservation:checked_in',
      'reservation:checked_out',
      'room:status_changed',
      'room:assigned',
      'guest:created',
      'guest:updated',
      'folio:charge_posted',
      'folio:payment_received',
      'folio:settled',
      'hk:task_updated',
      'hk:task_created',
      'work_order:created',
      'work_order:updated',
      'night_audit:started',
      'night_audit:completed',
      'shift:closed',
      'pos:order_created',
      'pos:order_updated',
      'dashboard:refresh',
    ]

    const handlers: Array<{ event: string; handler: (...args: unknown[]) => void }> = []
    for (const event of events) {
      const handler = (...args: unknown[]) => {
        onEventRef.current?.(event, args[0])
      }
      socket.on(event, handler)
      handlers.push({ event, handler })
    }

    // Cleanup on unmount
    return () => {
      connectionCount--

      for (const { event, handler } of handlers) {
        socket.off(event, handler)
      }

      // Only disconnect when no more subscribers
      if (connectionCount <= 0 && socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
        connectionCount = 0
        setIsConnected(false)
      }
    }
  }, [propertyId, modules.join(',')])

  const emit = useCallback((event: string, data: unknown) => {
    if (socketInstance?.connected) {
      socketInstance.emit(event, data)
    }
  }, [])

  const broadcast = useCallback((event: string, data: unknown) => {
    // This calls the server-side broadcast endpoint via the socket
    if (socketInstance?.connected) {
      socketInstance.emit('message', { type: event, payload: data })
    }
  }, [])

  return {
    isConnected,
    socket: socketInstance,
    emit,
    broadcast,
  }
}

// ─── Helper: Broadcast from API routes (server-side) ──────────
// Call this from API routes to push realtime events to connected clients
export function broadcastEvent(event: string, data: unknown): void {
  try {
    fetch('http://localhost:3004/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => {
      // Silently fail if realtime service is not available
    })
  } catch {
    // Silently fail
  }
}
