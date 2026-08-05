'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { Building2, Loader2 } from 'lucide-react'

// All module imports are deferred to useEffect to minimize Turbopack's
// initial compilation scope and prevent OOM in memory-constrained environments.

export default function Home() {
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const [loginModule, setLoginModule] = useState<React.ComponentType | null>(null)
  const [appShellModule, setAppShellModule] = useState<React.ComponentType | null>(null)

  // Load modules on demand based on auth state
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && !loginModule) {
      import('@/components/auth/login-page').then(m => setLoginModule(() => m.LoginPage))
    }
  }, [_hasHydrated, isAuthenticated, loginModule])

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !appShellModule) {
      import('@/components/layout/app-shell').then(m => setAppShellModule(() => m.AppShell))
    }
  }, [_hasHydrated, isAuthenticated, appShellModule])

  // Hydration loading state
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
            <Building2 className="size-8" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading Meridian PMS...
          </div>
        </div>
      </div>
    )
  }

  // Loading state while modules are being imported
  if (!isAuthenticated && !loginModule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isAuthenticated && !appShellModule) {
    return (
      <div className="h-svh flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const LoginPage = loginModule!
    return <LoginPage />
  }

  const AppShell = appShellModule!
  return <AppShell />
}
