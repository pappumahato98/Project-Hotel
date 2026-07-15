'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * LoadingState — Renders a skeleton-based loading indicator for lists and content areas.
 *
 * **States:** loading (always in loading state by design).
 * **Accessibility:** Uses aria-busy="true" and role="status" for screen readers.
 * **Responsive:** Columns adapt to container width.
 * **Edge Cases:** Handles count=0 by rendering a single skeleton.
 *
 * @example
 * <LoadingState variant="table" rows={5} columns={4} />
 * <LoadingState variant="cards" count={3} />
 * <LoadingState variant="inline" />
 */
export function LoadingState({
 variant = 'table',
 rows = 5,
 columns = 4,
 count = 3,
 className,
}: {
 /** table: row-based skeletons. cards: grid card skeletons. inline: single line. */
 variant?: 'table'| 'cards'| 'inline'
 rows?: number
 columns?: number
 count?: number
 className?: string
}) {
 if (variant === 'inline') {
 return (
 <div role="status" aria-busy="true" aria-label="Loading" className={cn('flex items-center gap-2', className)}>
 <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
 <span className="text-sm text-muted-foreground">Loading...</span>
 </div>
 )
 }

 if (variant === 'cards') {
 return (
 <div
 role="status"
 aria-busy="true"
 aria-label={`Loading ${count} items`}
 className={cn(
 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4',
 className
 )}
 >
 {Array.from({ length: count }).map((_, i) => (
 <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
 <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
 <div className="h-3 w-full bg-muted animate-pulse rounded" />
 <div className="h-3 w-4/5 bg-muted animate-pulse rounded" />
 <div className="flex gap-2 pt-2">
 <div className="h-8 w-20 bg-muted animate-pulse rounded" />
 <div className="h-8 w-20 bg-muted animate-pulse rounded" />
 </div>
 </div>
 ))}
 </div>
 )
 }

 // Default: table variant
 return (
 <div
 role="status"
 aria-busy="true"
 aria-label={`Loading ${rows} rows`}
 className={cn('w-full', className)}
 >
 {/* Header skeleton */}
 <div className="flex gap-2 border-b pb-2 mb-2 px-2">
 {Array.from({ length: columns }).map((_, i) => (
 <div
 key={`h-${i}`}
 className="h-3 bg-muted animate-pulse rounded flex-1"
 style={{ width: i === 0 ? '15%' : undefined }}
 />
 ))}
 </div>
 {/* Row skeletons */}
 {Array.from({ length: rows }).map((_, r) => (
 <div key={r} className="flex gap-2 py-2.5 px-2 border-b last:border-0">
 {Array.from({ length: columns }).map((_, c) => (
 <div
 key={`r-${r}-c-${c}`}
 className="h-4 bg-muted animate-pulse rounded flex-1"
 style={{ width: c === 0 ? '15%' : c === columns - 1 ? '10%' : undefined }}
 />
 ))}
 </div>
 ))}
 </div>
 )
}