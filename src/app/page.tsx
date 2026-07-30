'use client'

import React, { Suspense } from 'react'
import { useAuthStore } from '@/lib/store'
import { Building2, Loader2 } from 'lucide-react'

const AppShell = React.lazy(() => import('@/components/layout/app-shell').then(m => ({ default: m.AppShell })))
const LoginPage = React.lazy(() => import('@/components/auth/login-page').then(m => ({ default: m.LoginPage })))

export default function Home() {
  const { isAuthenticated, _hasHydrated } = useAuthStore()

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

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LoginPage />
      </Suspense>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="h-svh flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AppShell />
    </Suspense>
  )
}
