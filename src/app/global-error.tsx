'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global app error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
          <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Application Error
              </h2>
              <p className="text-sm text-muted-foreground">
                A client-side exception has occurred. This is usually caused by a
                network issue or stale session. Please try refreshing the page.
              </p>
              {error.message && (
                <p className="text-xs font-mono text-muted-foreground/70 bg-muted/50 rounded-md p-2 mt-2 break-all">
                  {error.message}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="size-4" />
                Go Home
              </Button>
              <Button onClick={reset} className="gap-2">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
