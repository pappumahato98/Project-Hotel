'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * ErrorState — Renders when data fetching or an operation fails.
 *
 * **States:** default (with optional retry action).
 * **Accessibility:** Uses role="alert" for immediate screen reader announcement.
 * **Responsive:** Stacks vertically on small screens.
 * **Edge Cases:** Handles missing message by showing generic error.
 *
 * @example
 * <ErrorState message="Failed to load reservations" onRetry={() => refetch()} />
 * <ErrorState message="Network error" variant="inline" />
 */
export function ErrorState({
 message,
 onRetry,
 variant = 'full',
 className,
}: {
 message?: string
 onRetry?: () => void
 /** full: centered block. inline: compact inline display. */
 variant?: 'full'| 'inline'
 className?: string
}) {
 const displayMessage = message || 'Something went wrong. Please try again.'

 if (variant === 'inline') {
 return (
 <div
 role="alert"
 aria-live="assertive"
 aria-label={displayMessage}
 className={cn(
 'flex items-center gap-2 rounded-md border border-status-danger-border bg-status-danger px-3 py-2 text-sm text-status-danger-foreground',
 className
 )}
 >
 <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
 <span className="flex-1 truncate-cell">{displayMessage}</span>
 {onRetry && (
 <Button
 variant="ghost"
 size="sm"
 onClick={onRetry}
 className="shrink-0 h-7 px-2 text-status-danger-foreground hover:bg-status-danger-border"
 aria-label="Retry"
 >
 <RefreshCw className="size-3.5" aria-hidden="true" />
 <span className="sr-only">Retry</span>
 </Button>
 )}
 </div>
 )
 }

 return (
 <div
 role="alert"
 aria-live="assertive"
 aria-label={displayMessage}
 className={cn(
 'flex flex-col items-center justify-center gap-3 py-12 px-4 text-center animate-fade-in',
 className
 )}
 >
 <div className="flex items-center justify-center size-12 rounded-full bg-status-danger text-status-danger-foreground">
 <AlertTriangle className="size-6" aria-hidden="true" />
 </div>
 <div className="flex flex-col items-center gap-1 max-w-sm">
 <h3 className="text-sm font-semibold text-foreground">Error</h3>
 <p className="text-sm text-muted-foreground line-clamp-2">{displayMessage}</p>
 </div>
 {onRetry && (
 <Button
 variant="outline"
 size="sm"
 onClick={onRetry}
 className="mt-1"
 aria-label="Retry loading data"
 >
 <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
 Try Again
 </Button>
 )}
 </div>
 )
}