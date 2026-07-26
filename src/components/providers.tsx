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

  // Single mount effect: set up Supabase auth listener + register fetch.
  // This version eliminates the race condition that existed between
  // onAuthStateChange and getSession() both trying to fetch the profile.
  useEffect(() => {
    // Skip Supabase setup if env vars aren't configured yet (fresh clone).
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      useAuthStore.setState({ _hasHydrated: true })
      return
    }

    const supabase = createClient()

    // Register auth token getter — reads from the in-memory cache kept
    // in sync by onAuthStateChange below.
    initAuthFetch(
      () => getAccessToken(),
      () => useAuthStore.getState().user?.id ?? null
    )

    // Flag to prevent duplicate profile fetches:
    // onAuthStateChange fires once for INITIAL_SESSION (triggered by getSession below),
    // then again for SIGNED_IN (triggered by signInWithPassword).
    // We only want to fetch the profile once during initialization.
    let initialSessionChecked = false
    // Guard against concurrent profile fetches
    let profileFetchInProgress = false

    const fetchProfile = async (accessToken: string): Promise<boolean> => {
      if (profileFetchInProgress) return false
      profileFetchInProgress = true
      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user) {
            useAuthStore.getState().login(data.user, accessToken)
            return true
          }
        } else {
          const data = await res.json().catch(() => ({}))
          console.error('Profile fetch failed:', res.status, data)
          if (res.status === 403) {
            // Profile not found in DB — seed data missing?
            // Don't sign out, let the user see the app but show error
            if (typeof window !== 'undefined') {
              console.error('Profile not found in database. Your account may not be registered.')
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        profileFetchInProgress = false
      }
      return false
    }

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

        // SIGNED_IN — user just logged in (or session was restored)
        if (event === 'SIGNED_IN') {
          if (!initialSessionChecked) return

          await fetchProfile(session.access_token)
          useAuthStore.setState({ _hasHydrated: true })
        }

        // TOKEN_REFRESHED — token was silently refreshed, just cache it
        if (event === 'TOKEN_REFRESHED') {
          const store = useAuthStore.getState()
          if (store.isAuthenticated && session.access_token) {
            useAuthStore.setState({ token: session.access_token })
          }
        }
      }
    )

    // Initial session check — runs once on mount.
    // This fires onAuthStateChange with INITIAL_SESSION, which we skip
    // via the initialSessionChecked flag.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialSessionChecked = true

      if (session) {
        setAccessToken(session.access_token ?? null)
        await fetchProfile(session.access_token!)
        useAuthStore.setState({ _hasHydrated: true })
      } else {
        useAuthStore.setState({ _hasHydrated: true })
      }
    }).catch(() => {
      initialSessionChecked = true
      useAuthStore.setState({ _hasHydrated: true })
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
