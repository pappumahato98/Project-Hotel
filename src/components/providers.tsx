'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettingsStore, useAuthStore, hydrateAuthFromStorage } from '@/lib/store'
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

  // Single mount effect: hydrate auth → register fetch → sync settings
  useEffect(() => {
    // 1. Restore auth from localStorage (sets isAuthenticated + user + token)
    hydrateAuthFromStorage()

    // 2. Register auth token/user-id getters so apiFetch auto-attaches headers
    initAuthFetch(
      () => useAuthStore.getState().token,
      () => useAuthStore.getState().user?.id ?? null
    )

    // 3. If hydrated as authenticated, sync settings from backend
    const auth = useAuthStore.getState()
    if (auth.isAuthenticated) {
      useSettingsStore.getState().syncFromBackend()
    }
  }, [])

  // Sync settings whenever auth state transitions to authenticated
  // (handles fresh login as well as hydration)
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
