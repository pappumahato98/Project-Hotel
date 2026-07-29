'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  const isAuthError = error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Authentication')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {isAuthError ? 'Session Expired' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAuthError
              ? 'Your session has expired or is invalid. Please sign in again.'
              : 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          {error.message && !isAuthError && (
            <p className="text-xs font-mono text-muted-foreground/70 bg-muted/50 rounded-md p-2 mt-2 break-all">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isAuthError ? (
            <Button
              onClick={() => {
                // Clear auth state and reload
                try {
                  localStorage.removeItem('meridian-settings')
                  localStorage.removeItem('meridian-property')
                  // Force Supabase session cleanup
                  if (typeof window !== 'undefined' && window.location) {
                    document.cookie.split(';').forEach(c => {
                      const name = c.trim().split('=')[0]
                      if (name.includes('sb-')) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                    })
                  }
                } catch {}
                window.location.href = '/'
              }}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Sign In Again
            </Button>
          ) : (
            <>
              <Button onClick={reset} variant="outline" className="gap-2">
                <RotateCcw className="size-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                Reload Page
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
