'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettingsStore, useAuthStore } from '@/lib/store'
import { initAuthFetch } from '@/lib/api'
import { setAccessToken, getAccessToken, setCsrfToken, getCsrfToken } from '@/lib/supabase/client'

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

  useEffect(() => {
    // Register auth fetch helpers
    initAuthFetch(
      () => getAccessToken(),
      () => useAuthStore.getState().user?.id ?? null,
      () => getCsrfToken(),
    )

    // Read CSRF token from cookie
    const csrfFromCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('__meridian_csrf='))
      ?.split('=')[1]
    if (csrfFromCookie) {
      setCsrfToken(csrfFromCookie)
    }

    // Try to restore session by refreshing the access token
    // (if a valid refresh token cookie exists)
    const restoreSession = async () => {
      try {
        const headers: Record<string, string> = {
          credentials: 'include' as any,
        }
        if (csrfFromCookie) {
          headers['X-CSRF-Token'] = csrfFromCookie
        }

        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers,
        })

        if (res.ok) {
          const data = await res.json()
          if (data?.accessToken) {
            setAccessToken(data.accessToken)
            if (data.csrfToken) setCsrfToken(data.csrfToken)
            if (data.user) {
              useAuthStore.getState().login(data.user, data.accessToken)
            }
          }
        }
      } catch {
        // No valid refresh token — user needs to log in
      } finally {
        useAuthStore.setState({ _hasHydrated: true })
      }
    }

    restoreSession()
  }, [])

  // Sync settings when authenticated
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
