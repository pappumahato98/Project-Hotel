'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * EmptyState — Renders when a list, table, or section has no data.
 *
 * **States:** default only (no interactive states needed).
 * **Accessibility:** Uses role="status" with aria-live="polite" for screen readers.
 * **Responsive:** Icon size scales, text truncates on small screens.
 * **Edge Cases:** Handles missing title/description gracefully.
 *
 * @example
 * <EmptyState icon={Inbox} title="No reservations" description="Create a new reservation to get started." action={<Button>New Reservation</Button>} />
 */
export function EmptyState({
 icon: Icon,
 title,
 description,
 action,
 className,
}: {
 icon?: LucideIcon
 title: string
 description?: string
 action?: React.ReactNode
 className?: string
}) {
 return (
 <div
 role="status"
 aria-live="polite"
 aria-label={title}
 className={cn(
 'flex flex-col items-center justify-center gap-3 py-12 px-4 text-center animate-fade-in',
 className
 )}
 >
 {Icon && (
 <div className="flex items-center justify-center size-12 rounded-full bg-muted text-muted-foreground">
 <Icon className="size-6" aria-hidden="true" />
 </div>
 )}
 <div className="flex flex-col items-center gap-1 max-w-sm">
 <h3 className="text-sm font-semibold text-foreground">{title}</h3>
 {description && (
 <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
 )}
 </div>
 {action && <div className="mt-1">{action}</div>}
 </div>
 )
}