'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettingsStore, useAuthStore } from '@/lib/store'
import { initAuthFetch } from '@/lib/api'
import { createClient, setAccessToken, getAccessToken } from '@/lib/supabase/client'

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

  // Single mount effect: set up Supabase auth listener + register fetch
  useEffect(() => {
    const supabase = createClient()

    // Register auth token getter — reads from the in-memory cache kept
    // in sync by onAuthStateChange below. This lets apiFetch attach a
    // fresh Bearer token to every request synchronously.
    initAuthFetch(
      () => getAccessToken(),
      () => useAuthStore.getState().user?.id ?? null
    )

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Keep the access-token cache in sync
        setAccessToken(session?.access_token ?? null)

        if (event === 'SIGNED_OUT' || !session) {
          useAuthStore.getState().logout()
          useAuthStore.setState({ _hasHydrated: true })
          return
        }

        // SIGNED_IN or TOKEN_REFRESHED — fetch the app profile
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            const data = await fetch('/api/auth/profile', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }).then((r) => (r.ok ? r.json() : null))

            if (data?.user) {
              useAuthStore.getState().login(data.user, session.access_token)
            }
          } catch (err) {
            console.error('Failed to fetch profile after auth change:', err)
          } finally {
            useAuthStore.setState({ _hasHydrated: true })
          }
        }
      }
    )

    // Trigger initial session check (fires onAuthStateChange if a session exists)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null)
      if (session) {
        // Fetch profile for the restored session
        fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.user) {
              useAuthStore.getState().login(data.user, session.access_token!)
            }
          })
          .catch((err) => console.error('Profile fetch error:', err))
          .finally(() => {
            useAuthStore.setState({ _hasHydrated: true })
          })
      } else {
        useAuthStore.setState({ _hasHydrated: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sync settings whenever auth state transitions to authenticated
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
