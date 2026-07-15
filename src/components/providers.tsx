'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettingsStore, useAuthStore } from '@/lib/store'
import { initAuthFetch } from '@/lib/api'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Register auth token getter so apiFetch auto-attaches Bearer tokens
  useEffect(() => {
    initAuthFetch(() => useAuthStore.getState().token)
  }, [])

  // Sync settings from backend once after mount — only when authenticated
  useEffect(() => {
    const auth = useAuthStore.getState()
    if (auth.isAuthenticated) {
      useSettingsStore.getState().syncFromBackend()
    }
  }, [])

  // Also sync settings after login
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (!prev.isAuthenticated && state.isAuthenticated) {
        useSettingsStore.getState().syncFromBackend(true)
      }
    })
    return unsub
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
