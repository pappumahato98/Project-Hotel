'use client'

import React from 'react'
import { useRealtimeProvider, usePresence } from '@/hooks/use-realtime'
import { useNotificationStore } from '@/lib/realtime-notifications'
import { cn } from '@/lib/utils'
import { Radio } from 'lucide-react'

/**
 * RealtimeProvider
 *
 * Wraps the app and subscribes to all Supabase Realtime channels
 * when the user is authenticated. Also tracks presence.
 *
 * Shows a subtle connection indicator in the bottom-right corner.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, channelCount } = useRealtimeProvider()
  usePresence('meridian-online')

  return (
    <>
      {children}
      {/* Connection indicator — bottom right corner */}
      <div
        className={cn(
          'fixed bottom-2 right-2 z-50 flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium shadow-sm transition-opacity',
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800',
          // Only show when connected and authenticated, fade out otherwise
          channelCount > 0 ? 'opacity-80 hover:opacity-100' : 'opacity-0 pointer-events-none'
        )}
        title={`Realtime: ${channelCount} channels ${isConnected ? 'connected' : 'disconnected'}`}
      >
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
        )} />
        <Radio className="size-3" />
        <span>Realtime</span>
      </div>
    </>
  )
}
