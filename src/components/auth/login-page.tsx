'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'
import { useAuthStore, useSettingsStore } from '@/lib/store'
import { setAccessToken, setCsrfToken } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const LOGIN_TIMEOUT_MS = 15_000

type AuthView = 'signin' | 'signup' | 'forgot' | 'reset'

export function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const { settings } = useSettingsStore()
  const router = useRouter()

  const [view, setView] = React.useState<AuthView>('signin')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  // Sign In
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  // Sign Up
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [signUpEmail, setSignUpEmail] = React.useState('')
  const [signUpPassword, setSignUpPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showSignUpPassword, setShowSignUpPassword] = React.useState(false)
  const [signUpSuccess, setSignUpSuccess] = React.useState(false)

  // Forgot Password
  const [forgotEmail, setForgotEmail] = React.useState('')
  const [forgotLoading, setForgotLoading] = React.useState(false)
  const [forgotSuccess, setForgotSuccess] = React.useState(false)
  const [forgotError, setForgotError] = React.useState('')

  // Reset Password
  const [resetToken, setResetToken] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('')
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [resetLoading, setResetLoading] = React.useState(false)
  const [resetSuccess, setResetSuccess] = React.useState(false)
  const [resetError, setResetError] = React.useState('')

  React.useEffect(() => () => setLoading(false), [])

  React.useEffect(() => {
    if (isAuthenticated) {
      setLoading(false)
      setError('')
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!password) { setError('Please enter your password'); return }

    setLoading(true)
    setError('')

    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Login timed out. Please check your connection and try again.')
    }, LOGIN_TIMEOUT_MS)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      const data = await res.json()

      // Store access token and CSRF token
      setAccessToken(data.accessToken)
      if (data.csrfToken) setCsrfToken(data.csrfToken)

      // Update auth store
      if (data.user) {
        useAuthStore.getState().login(data.user, data.accessToken)
      }

      // Navigate to dashboard
      router.push('/')
    } catch (err) {
      clearTimeout(timeoutId)
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required')
      return
    }
    if (!signUpEmail.trim()) {
      setError('Please enter your email')
      return
    }
    if (signUpPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (signUpPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: signUpEmail.trim().toLowerCase(),
          password: signUpPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setLoading(false)
        setError(data.error || 'Sign up failed')
        return
      }

      setLoading(false)
      setSignUpSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address')
      return
    }

    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setForgotError(data.error || 'Something went wrong')
        setForgotLoading(false)
        return
      }

      const data = await res.json()
      setForgotLoading(false)

      // If we got a token back, move directly to reset form
      if (data.token) {
        setResetToken(data.token)
        setView('reset')
      } else {
        setForgotSuccess(true)
      }
    } catch {
      setForgotError('Something went wrong. Please try again.')
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')

    if (!newPassword) {
      setResetError('Please enter a new password')
      return
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setResetError(data.error || 'Failed to reset password')
        setResetLoading(false)
        return
      }

      setResetLoading(false)
      setResetSuccess(true)
    } catch {
      setResetError('Something went wrong. Please try again.')
      setResetLoading(false)
    }
  }

  const hotelName = settings.hotelName || 'Meridian Hotel'
  const stars = settings.starRating || 5

  const goBackToSignIn = () => {
    setView('signin')
    setError('')
    setForgotSuccess(false)
    setForgotError('')
    setResetSuccess(false)
    setResetError('')
    setResetToken('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  // ─── Sign In View ───────────────────────────────────────────
  if (view === 'signin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Branding */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{hotelName}</h1>
              <div className="flex items-center justify-center gap-1 mt-1">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Property Management System</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="pb-2 pt-6 px-6">
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      className="pl-10 h-11"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); setForgotEmail(email); setForgotSuccess(false); setForgotError('') }}
                      className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      className="pl-10 pr-10 h-11"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Signing in...</>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signup'); setError(''); setSignUpSuccess(false) }}
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Secured with JWT authentication & CSRF protection
          </p>
        </div>
      </div>
    )
  }

  // ─── Sign Up View ───────────────────────────────────────────
  if (view === 'signup') {
    if (signUpSuccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
          <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Account created!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account has been created successfully. You can now sign in with your credentials.
                </p>
              </div>
              <Button
                onClick={() => { setView('signin'); setSignUpSuccess(false); setError('') }}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{hotelName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your account</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="pb-2 pt-6 px-6">
              <h2 className="text-lg font-semibold">Sign up</h2>
              <p className="text-sm text-muted-foreground">Fill in your details to get started</p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={firstName}
                        onChange={e => { setFirstName(e.target.value); setError('') }}
                        className="pl-10 h-11"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); setError('') }}
                      className="h-11"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={e => { setSignUpEmail(e.target.value); setError('') }}
                      className="pl-10 h-11"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signupPassword"
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={signUpPassword}
                      onChange={e => { setSignUpPassword(e.target.value); setError('') }}
                      className="pl-10 pr-10 h-11"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignUpPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      className="pl-10 h-11"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Creating account...</>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signin'); setError('') }}
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Forgot Password View ────────────────────────────────────
  if (view === 'forgot') {
    if (forgotSuccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
          <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  If an account exists with <strong className="text-foreground">{forgotEmail}</strong>, a password reset link has been sent.
                </p>
              </div>
              <Button
                onClick={goBackToSignIn}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{hotelName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="pb-2 pt-6 px-6">
              <h2 className="text-lg font-semibold">Forgot password?</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll generate a reset token
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError('') }}
                      className="pl-10 h-11"
                      autoComplete="email"
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    'Generate reset token'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={goBackToSignIn}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Reset Password View ────────────────────────────────────
  if (view === 'reset') {
    if (resetSuccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
          <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Password reset!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
              </div>
              <Button
                onClick={goBackToSignIn}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{hotelName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Set new password</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="pb-2 pt-6 px-6">
              <h2 className="text-lg font-semibold">Choose a new password</h2>
              <p className="text-sm text-muted-foreground">
                Enter your new password below (min. 8 characters)
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                    {resetError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setResetError('') }}
                      className="pl-10 pr-10 h-11"
                      autoComplete="new-password"
                      disabled={resetLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword" className="text-sm font-medium">Confirm new password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="confirmNewPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={e => { setConfirmNewPassword(e.target.value); setResetError('') }}
                      className="pl-10 h-11"
                      autoComplete="new-password"
                      disabled={resetLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Resetting...</>
                  ) : (
                    'Reset password'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={goBackToSignIn}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
