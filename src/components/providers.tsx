'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useSettingsStore, useAuthStore } from '@/lib/store'
import { initAuthFetch } from '@/lib/api'
import { setAccessToken, getAccessToken, setCsrfToken, getCsrfToken } from '@/lib/supabase/client'
import { GlobalErrorBoundary } from '@/components/error-boundary'
import { setRealtimeQueryClient } from '@/hooks/use-realtime'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 2-minute staleTime: UI renders instantly from cache (0ms).
            // Data is silently refreshed in background after 2min.
            staleTime: 2 * 60 * 1000,
            // Cache data for 10 minutes even if unused (prevents re-fetch on tab switch)
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            // Keep previous data while new data loads (no flash/empty state)
            placeholderData: (previousData: unknown) => previousData,
          },
        },
      })
  )

  // Wire the QueryClient into the realtime system so that postgres_changes
  // events automatically invalidate the relevant React Query caches.
  useEffect(() => {
    setRealtimeQueryClient(queryClient)
  }, [queryClient])

  useEffect(() => {
    // Register auth fetch helpers
    initAuthFetch(
      () => getAccessToken(),
      () => useAuthStore.getState().user?.id ?? null,
      () => getCsrfToken(),
    )

    // Restore access token from persisted store into the client module
    const persistedToken = useAuthStore.getState().token
    if (persistedToken) {
      setAccessToken(persistedToken)
    }

    // Read CSRF token from cookie
    const csrfFromCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('__meridian_csrf='))
      ?.split('=')[1]
    if (csrfFromCookie) {
      setCsrfToken(csrfFromCookie)
    }

    // If we have a persisted auth state, mark hydrated immediately
    // (onRehydrateStorage handles this, but as a safety net):
    if (persistedToken) {
      useAuthStore.setState({ _hasHydrated: true })
      // Sync settings immediately since we're already authenticated
      useSettingsStore.getState().syncFromBackend(true)
    }

    // Silent background refresh — validates the session without blocking UI
    const silentRefresh = async () => {
      try {
        const headers: Record<string, string> = {}
        if (csrfFromCookie) {
          headers['X-CSRF-Token'] = csrfFromCookie
        }

        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
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
        } else {
          // Refresh failed — clear persisted state silently (no redirect)
          useAuthStore.getState().logout()
          setAccessToken(null)
          setCsrfToken(null)
          // Clear stale cookies
          document.cookie = '__meridian_rt=; Path=/; Max-Age=0'
          document.cookie = '__meridian_csrf=; Path=/; Max-Age=0'
        }
      } catch {
        // Network error — keep persisted state, will retry later
      } finally {
        // Always mark hydrated so the UI renders
        useAuthStore.setState({ _hasHydrated: true })
      }
    }

    // Always try to refresh in the background (even if persisted state exists)
    // Skip if no refresh token cookie — avoids a wasted DB connection on
    // cold start when the user is on the login page for the first time.
    const hasRefreshCookie = document.cookie.includes('__meridian_rt=')
    if (hasRefreshCookie) {
      silentRefresh()
    } else {
      useAuthStore.setState({ _hasHydrated: true })
    }
  }, [])

  // Sync settings when authenticated (state change)
  // Delay 1s to avoid thundering herd with dashboard queries on cold start.
  // Settings are less critical than dashboard data and can wait.
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (!prev.isAuthenticated && state.isAuthenticated) {
        setTimeout(() => {
          useSettingsStore.getState().syncFromBackend(true)
        }, 1_000)
      }
    })
    return unsub
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="fixoria-theme" disableTransitionOnChange>
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </ThemeProvider>
  )
}