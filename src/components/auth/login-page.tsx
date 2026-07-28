'use client'

import * as React from 'react'
import { Building2, Star, Loader2, Eye, EyeOff, Zap } from 'lucide-react'
import { useAuthStore, useSettingsStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Detect missing Supabase config (empty env vars) to show a setup banner.
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Login timeout — if no response in 15s, show an error */
const LOGIN_TIMEOUT_MS = 15_000

export function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const { settings } = useSettingsStore()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  // Cleanup loading state if component unmounts while loading
  React.useEffect(() => {
    return () => setLoading(false)
  }, [])

  // Once authenticated (set by the onAuthStateChange listener), stop loading
  React.useEffect(() => {
    if (isAuthenticated) {
      setLoading(false)
      setError('')
    }
  }, [isAuthenticated])

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    if (!SUPABASE_CONFIGURED) {
      setError('Supabase is not configured. Add credentials to .env and restart.')
      return
    }
    setLoading(true)
    setError('')

    const trimmedEmail = loginEmail.trim().toLowerCase()

    // Set a timeout to catch stuck logins (Vercel network issues, etc.)
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Login timed out. Please check your connection and try again.')
    }, LOGIN_TIMEOUT_MS)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      })
      clearTimeout(timeoutId)

      if (signInError) {
        setLoading(false)
        setError(signInError.message)
        return
      }
      // Success — onAuthStateChange listener in Providers handles:
      // 1. Profile fetch from /api/auth/profile
      // 2. Auth store update (user data + isAuthenticated)
      // 3. Dashboard navigation
      // Loading state is cleared when isAuthenticated becomes true
    } catch (err) {
      clearTimeout(timeoutId)
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      setLoading(false)
    }
  }

  // Demo login — uses Supabase signInWithPassword
  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password123')
    doLogin(demoEmail, 'password123')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 size-80 rounded-full bg-amber-200/30 dark:bg-amber-900/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-orange-200/30 dark:bg-orange-900/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-rose-200/20 dark:bg-rose-900/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2 pt-8">
          {/* Logo */}
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
            <Building2 className="size-8" />
          </div>

          {/* Hotel Name */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {settings.hotelName}
            </h1>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: settings.starRating }).map((_, i) => (
                <Star
                  key={i}
                  className="size-4 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Property Management System
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          {/* Supabase not configured banner */}
          {!SUPABASE_CONFIGURED && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/60">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Supabase not configured
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Authentication is disabled. Add your Supabase project credentials
                to <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 py-0.5 font-mono">.env</code> and restart the dev server.
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-amber-100 dark:bg-amber-900/60 px-2 py-1 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200 font-mono">{`DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}</pre>
            </div>
          )}

          {/* Quick Demo Login Buttons */}
          <div className="mb-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-3" />
              Quick Demo Login
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9 justify-center gap-1"
                onClick={() => handleDemoLogin('admin@meridian.com')}
                disabled={loading}
              >
                <Building2 className="size-3" />
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9 justify-center gap-1"
                onClick={() => handleDemoLogin('gm@meridian.com')}
                disabled={loading}
              >
                <Star className="size-3" />
                GM
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9 justify-center gap-1"
                onClick={() => handleDemoLogin('sunita@meridian.com')}
                disabled={loading}
              >
                <Loader2 className="size-3" />
                Staff
              </Button>
            </div>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or sign in manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <button type="button" className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-11 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold shadow-md shadow-amber-500/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Demo Credentials Hint */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/50">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                Demo Credentials
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-medium min-w-[44px]">Admin:</span>
                  <code className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-mono text-[11px]">
                    admin@meridian.com
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-medium min-w-[44px]">GM:</span>
                  <code className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-mono text-[11px]">
                    gm@meridian.com
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-medium min-w-[44px]">Staff:</span>
                  <code className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-mono text-[11px]">
                    sunita@meridian.com
                  </code>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Password for all accounts:{' '}
                    <code className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-mono text-[11px]">
                      password123
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {settings.hotelName}. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
