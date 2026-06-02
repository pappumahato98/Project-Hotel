'use client'

import { useAuthStore } from '@/lib/store'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/components/auth/login-page'

export default function Home() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppShell />
}
