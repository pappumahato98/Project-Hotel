'use client'

import * as React from 'react'
import {
  Building2,
  Star,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore, useSettingsStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// Detect missing Supabase config (empty env vars) to show a setup banner.
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Login timeout — if no response in 15s, show an error */
const LOGIN_TIMEOUT_MS = 15_000

export function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const { settings } = useSettingsStore()

  // Shared state
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  // Sign In state
  const [signInEmail, setSignInEmail] = React.useState('')
  const [signInPassword, setSignInPassword] = React.useState('')
  const [showSignInPassword, setShowSignInPassword] = React.useState(false)

  // Sign Up state
  const [signUpFirstName, setSignUpFirstName] = React.useState('')
  const [signUpLastName, setSignUpLastName] = React.useState('')
  const [signUpEmail, setSignUpEmail] = React.useState('')
  const [signUpPassword, setSignUpPassword] = React.useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = React.useState('')
  const [showSignUpPassword, setShowSignUpPassword] = React.useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] =
    React.useState(false)
  const [signUpSuccess, setSignUpSuccess] = React.useState(false)

  // Forgot Password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false)
  const [forgotEmail, setForgotEmail] = React.useState('')
  const [forgotLoading, setForgotLoading] = React.useState(false)
  const [forgotSuccess, setForgotSuccess] = React.useState(false)
  const [forgotError, setForgotError] = React.useState('')

  // Active tab
  const [activeTab, setActiveTab] = React.useState('signin')

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
      setError(
        'Supabase is not configured. Add credentials to .env and restart.'
      )
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
    setSignInEmail(demoEmail)
    setSignInPassword('password123')
    doLogin(demoEmail, 'password123')
  }

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin(signInEmail, signInPassword)
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!SUPABASE_CONFIGURED) {
      setError(
        'Supabase is not configured. Add credentials to .env and restart.'
      )
      return
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        options: {
          data: {
            firstName: signUpFirstName.trim(),
            lastName: signUpLastName.trim(),
          },
        },
      })

      if (signUpError) {
        setLoading(false)
        setError(signUpError.message)
        return
      }

      setLoading(false)
      setSignUpSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      setError(msg)
      setLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!SUPABASE_CONFIGURED) {
      setForgotError(
        'Supabase is not configured. Add credentials to .env and restart.'
      )
      return
    }

    setForgotLoading(true)
    setForgotError('')

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim().toLowerCase(),
        {
          redirectTo: window.location.origin,
        }
      )

      if (resetError) {
        setForgotLoading(false)
        setForgotError(resetError.message)
        return
      }

      setForgotLoading(false)
      setForgotSuccess(true)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send reset email'
      setForgotError(msg)
      setForgotLoading(false)
    }
  }

  const openForgotPassword = () => {
    setForgotEmail(signInEmail)
    setForgotSuccess(false)
    setForgotError('')
    setForgotPasswordOpen(true)
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
        <CardContent className="p-0">
          {/* Header / Branding */}
          <div className="text-center space-y-3 pt-8 pb-2 px-8">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/25">
              <Building2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {settings.hotelName}
              </h1>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: settings.starRating }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Property Management System
              </p>
            </div>
          </div>

          {/* Supabase not configured banner */}
          {!SUPABASE_CONFIGURED && (
            <div className="mx-8 mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950/60">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Supabase not configured
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Authentication is disabled. Add your Supabase project credentials
                to{' '}
                <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 py-0.5 font-mono">
                  .env
                </code>{' '}
                and restart the dev server.
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-amber-100 dark:bg-amber-900/60 px-2 py-1 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200 font-mono">{`DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}</pre>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val)
              setError('')
              setSignUpSuccess(false)
            }}
            className="w-full"
          >
            <div className="px-8">
              <TabsList className="w-full h-10 bg-amber-100/60 dark:bg-amber-950/30 p-1">
                <TabsTrigger
                  value="signin"
                  className="flex-1 h-8 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-amber-400"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 h-8 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-amber-400"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ========== SIGN IN TAB ========== */}
            <TabsContent value="signin" className="mt-0">
              <div className="px-8 pb-8 pt-5">
                {/* Demo Login Buttons */}
                <div className="mb-5 space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="size-3" />
                    Quick Demo
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs h-9 justify-center gap-1.5 border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                      onClick={() => handleDemoLogin('admin@meridian.com')}
                      disabled={loading}
                    >
                      <Building2 className="size-3" />
                      Admin
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs h-9 justify-center gap-1.5 border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                      onClick={() => handleDemoLogin('gm@meridian.com')}
                      disabled={loading}
                    >
                      <Star className="size-3" />
                      GM
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs h-9 justify-center gap-1.5 border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                      onClick={() => handleDemoLogin('sunita@meridian.com')}
                      disabled={loading}
                    >
                      <User className="size-3" />
                      Staff
                    </Button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="signin-email"
                      className="text-sm font-medium"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="signin-password"
                        className="text-sm font-medium"
                      >
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-11 pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 size-11 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        tabIndex={-1}
                      >
                        {showSignInPassword ? (
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
                </form>

                {/* Sign Up Link */}
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </TabsContent>

            {/* ========== SIGN UP TAB ========== */}
            <TabsContent value="signup" className="mt-0">
              <div className="px-8 pb-8 pt-5">
                {signUpSuccess ? (
                  /* Success State */
                  <div className="flex flex-col items-center text-center space-y-4 py-6">
                    <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                      <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold text-foreground">
                        Account Created!
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Please check your email to verify your account, then sign
                        in to continue.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setSignUpSuccess(false)
                        setActiveTab('signin')
                      }}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    {/* Error Message */}
                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        {error}
                      </div>
                    )}

                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-firstname"
                          className="text-sm font-medium"
                        >
                          First Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                          <Input
                            id="signup-firstname"
                            type="text"
                            placeholder="John"
                            value={signUpFirstName}
                            onChange={(e) => setSignUpFirstName(e.target.value)}
                            required
                            autoComplete="given-name"
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-lastname"
                          className="text-sm font-medium"
                        >
                          Last Name
                        </Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          placeholder="Doe"
                          value={signUpLastName}
                          onChange={(e) => setSignUpLastName(e.target.value)}
                          required
                          autoComplete="family-name"
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="signup-email"
                        className="text-sm font-medium"
                      >
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="h-11 pl-10"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="signup-password"
                        className="text-sm font-medium"
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="signup-password"
                          type={showSignUpPassword ? 'text' : 'password'}
                          placeholder="Min. 6 characters"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="h-11 pl-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 size-11 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          tabIndex={-1}
                        >
                          {showSignUpPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="signup-confirm-password"
                        className="text-sm font-medium"
                      >
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="signup-confirm-password"
                          type={showSignUpConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={signUpConfirmPassword}
                          onChange={(e) =>
                            setSignUpConfirmPassword(e.target.value)
                          }
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="h-11 pl-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 size-11 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setShowSignUpConfirmPassword(!showSignUpConfirmPassword)
                          }
                          tabIndex={-1}
                        >
                          {showSignUpConfirmPassword ? (
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
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                )}

                {/* Sign In Link */}
                {!signUpSuccess && (
                  <p className="mt-5 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {settings.hotelName}. All rights
              reserved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== FORGOT PASSWORD DIALOG ========== */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </DialogDescription>
          </DialogHeader>

          {forgotSuccess ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists with that email, you&apos;ll receive a
                password reset link shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {forgotError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="forgot-email"
                  className="text-sm font-medium"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotPasswordOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}

          {forgotSuccess && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotPasswordOpen(false)}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to Sign In
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
