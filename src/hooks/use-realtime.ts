'use client'

import { useCallback, useRef } from 'react'

interface UseRealtimeOptions {
  propertyId?: string | null
  modules?: string[]
  onEvent?: (event: string, data: unknown) => void
  enabled?: boolean
}

interface UseRealtimeReturn {
  isConnected: boolean
  socket: null
  emit: (event: string, data: unknown) => void
  broadcast: (event: string, data: unknown) => void
}

/**
 * Realtime hook — currently a NO-OP.
 *
 * The socket.io realtime service (port 3004) is not running.
 * Previously, attempting to connect caused:
 *   - socket.io polling → 404 → Next.js Fast Refresh full page reload every 3s
 *   - infinite reload loop: socket polls → error → Fast Refresh reload → socket polls again
 *
 * When a realtime mini-service is added, re-enable socket.io here.
 * Until then, this hook returns isConnected=false and does nothing.
 */

// Module-level flag: set to true to actually try connecting (only enable when service exists)
const REALTIME_ENABLED = false

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  // Keep ref updated without triggering re-renders
  const onEventRef = useRef(onEvent)

  const emit = useCallback((_event: string, _data: unknown) => {
    // No-op when realtime service is not running
  }, [])

  const broadcast = useCallback((_event: string, _data: unknown) => {
    // No-op when realtime service is not running
  }, [])

  return {
    isConnected: false,
    socket: null,
    emit,
    broadcast,
  }
}

// ─── Helper: Broadcast from API routes (server-side) ──────────
// When realtime service is added, re-enable this to push events to clients
export function broadcastEvent(event: string, data: unknown): void {
  // No-op when realtime service is not running
  if (!REALTIME_ENABLED) return
  try {
    fetch('/broadcast?XTransformPort=3004', {
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
