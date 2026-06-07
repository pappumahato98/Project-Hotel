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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
        </div>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}
