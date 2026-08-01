'use client'

import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettingsStore, useAuthStore } from '@/lib/store'
import { initAuthFetch } from '@/lib/api'
import { createClient, setAccessToken, getAccessToken, isDemoMode } from '@/lib/supabase/client'
import { RealtimeProvider } from '@/components/shared/realtime-provider'

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
    // ── Demo mode: auto-login as admin ──
    if (isDemoMode()) {
      // Set demo token for apiFetch
      setAccessToken('demo-token')
      initAuthFetch(() => getAccessToken(), () => useAuthStore.getState().user?.id ?? null)

      // Fetch admin profile and settings in parallel (saves ~100-300ms)
      const profilePromise = fetch('/api/auth/profile', {
        headers: { Authorization: 'Bearer demo-token' },
      })
        .then(res => res.json())
        .then(data => {
          if (data?.user) {
            useAuthStore.getState().login(data.user, 'demo-token')
          }
        })
        .catch(err => {
          console.error('Demo login failed:', err)
        })

      const settingsPromise = useSettingsStore.getState().syncFromBackend(true)

      Promise.all([profilePromise, settingsPromise])
        .finally(() => {
          useAuthStore.setState({ _hasHydrated: true })
        })
      return
    }

    // ── Production mode: Supabase auth ──
    const supabase = createClient()
    initAuthFetch(
      () => getAccessToken(),
      () => useAuthStore.getState().user?.id ?? null
    )

    let initialSessionChecked = false
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
        } else if (res.status === 403) {
          console.error('Profile not found in database.')
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        profileFetchInProgress = false
      }
      return false
    }

    let profilePromise: Promise<boolean> | null = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAccessToken(session?.access_token ?? null)
        if (event === 'SIGNED_OUT' || !session) {
          useAuthStore.getState().logout()
          useAuthStore.setState({ _hasHydrated: true })
          return
        }
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // Deduplicate: if getSession() is already fetching, piggyback on that promise
          if (profilePromise) {
            await profilePromise
          } else {
            await fetchProfile(session.access_token)
          }
          useAuthStore.setState({ _hasHydrated: true })
        }
        if (event === 'TOKEN_REFRESHED') {
          const store = useAuthStore.getState()
          if (store.isAuthenticated && session.access_token) {
            useAuthStore.setState({ token: session.access_token })
          }
        }
      }
    )

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setAccessToken(session.access_token ?? null)
        profilePromise = fetchProfile(session.access_token!)
        await profilePromise
      }
      useAuthStore.setState({ _hasHydrated: true })
      profilePromise = null
    }).catch(() => {
      profilePromise = null
      useAuthStore.setState({ _hasHydrated: true })
    })

    return () => { subscription.unsubscribe() }
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
      {isDemoMode() ? children : <RealtimeProvider>{children}</RealtimeProvider>}
    </QueryClientProvider>
  )
}
