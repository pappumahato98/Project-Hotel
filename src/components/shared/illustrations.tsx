'use client'

import { cn } from '@/lib/utils'

// ─── Reusable Empty State Wrapper ───────────────────────────────────────────

interface EmptyStateProps {
  illustration?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ illustration, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {illustration && <div className="mb-4">{illustration}</div>}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── SVG Illustration Components ──────────────────────────────────────────

export function NoScheduleIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="35" width="120" height="100" rx="8" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="40" y="35" width="120" height="28" rx="8" className="fill-primary/15" />
      <rect x="40" y="55" width="120" height="8" className="fill-primary/15" />
      <rect x="70" y="27" width="8" height="18" rx="4" className="stroke-primary/30" strokeWidth="2" fill="background" />
      <rect x="122" y="27" width="8" height="18" rx="4" className="stroke-primary/30" strokeWidth="2" fill="background" />
      {[
        [60, 75], [80, 75], [100, 75], [120, 75], [140, 75],
        [60, 95], [80, 95], [100, 95], [120, 95], [140, 95],
        [60, 115], [80, 115], [100, 115], [120, 115], [140, 115],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" className="fill-muted-foreground/12" />
      ))}
      <circle cx="170" cy="45" r="14" className="fill-background stroke-primary/25" strokeWidth="2" />
      <line x1="170" y1="45" x2="170" y2="37" className="stroke-primary/30" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="170" y1="45" x2="176" y2="48" className="stroke-primary/30" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
