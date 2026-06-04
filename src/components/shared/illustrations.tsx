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

export function NoDataIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="20" width="110" height="130" rx="8" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="62" y="42" width="60" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="62" y="56" width="45" height="6" rx="3" className="fill-muted-foreground/10" />
      <rect x="62" y="70" width="55" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="62" y="84" width="40" height="6" rx="3" className="fill-muted-foreground/10" />
      <rect x="62" y="98" width="50" height="6" rx="3" className="fill-muted-foreground/8" />
      <circle cx="130" cy="100" r="22" className="fill-background stroke-primary/40" strokeWidth="2.5" />
      <line x1="145" y1="115" x2="162" y2="132" className="stroke-primary/40" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="50" r="3" className="fill-primary/20" />
      <circle cx="170" cy="40" r="2.5" className="fill-primary/15" />
      <circle cx="25" cy="110" r="2" className="fill-primary/10" />
      <circle cx="175" cy="125" r="3" className="fill-primary/15" />
      <circle cx="124" cy="94" r="4" className="fill-primary/10" />
    </svg>
  )
}

export function NoResultsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="40" width="140" height="50" rx="12" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="46" y="57" width="80" height="8" rx="4" className="fill-muted-foreground/15" />
      <circle cx="100" cy="110" r="26" className="fill-background stroke-primary/30" strokeWidth="2.5" />
      <line x1="118" y1="128" x2="140" y2="150" className="stroke-primary/30" strokeWidth="3" strokeLinecap="round" />
      <text x="100" y="117" textAnchor="middle" className="fill-primary/40" fontSize="22" fontWeight="600">?</text>
      <circle cx="35" cy="130" r="4" className="fill-primary/10" />
      <circle cx="165" cy="30" r="3" className="fill-primary/15" />
    </svg>
  )
}

export function NoFinancialIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="30" width="130" height="100" rx="8" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <line x1="55" y1="45" x2="55" y2="115" className="stroke-muted-foreground/10" strokeWidth="1" />
      <line x1="80" y1="45" x2="80" y2="115" className="stroke-muted-foreground/10" strokeWidth="1" />
      <line x1="105" y1="45" x2="105" y2="115" className="stroke-muted-foreground/10" strokeWidth="1" />
      <line x1="130" y1="45" x2="130" y2="115" className="stroke-muted-foreground/10" strokeWidth="1" />
      <line x1="55" y1="115" x2="150" y2="115" className="stroke-muted-foreground/15" strokeWidth="1.5" />
      <line x1="60" y1="105" x2="75" y2="95" className="stroke-muted-foreground/20" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="75" y1="95" x2="90" y2="100" className="stroke-muted-foreground/20" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="90" y1="100" x2="105" y2="85" className="stroke-muted-foreground/20" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="105" y1="85" x2="120" y2="90" className="stroke-muted-foreground/20" strokeWidth="2" strokeDasharray="4 3" />
      <line x1="120" y1="90" x2="135" y2="75" className="stroke-muted-foreground/20" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="100" cy="80" r="14" className="fill-background stroke-primary/30" strokeWidth="2" />
      <text x="100" y="85" textAnchor="middle" className="fill-primary/40" fontSize="16" fontWeight="600">$</text>
    </svg>
  )
}

export function ErrorIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="75" rx="50" ry="30" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <ellipse cx="72" cy="78" rx="25" ry="22" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <ellipse cx="128" cy="78" rx="25" ry="22" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <polygon points="95,55 108,55 102,75 112,75 90,105 96,82 86,82" className="fill-amber-500/60" />
      <line x1="68" y1="105" x2="65" y2="118" className="stroke-primary/30" strokeWidth="2" strokeLinecap="round" />
      <line x1="100" y1="108" x2="97" y2="121" className="stroke-primary/25" strokeWidth="2" strokeLinecap="round" />
      <line x1="132" y1="105" x2="129" y2="118" className="stroke-primary/30" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function SuccessIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="72" y="50" width="56" height="45" rx="6" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <path d="M72,60 Q55,60 55,72 Q55,84 72,84" className="stroke-primary/30" strokeWidth="2" fill="none" />
      <path d="M128,60 Q145,60 145,72 Q145,84 128,84" className="stroke-primary/30" strokeWidth="2" fill="none" />
      <rect x="88" y="95" width="24" height="8" rx="2" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <rect x="78" y="103" width="44" height="6" rx="3" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <polygon points="100,58 103,66 112,66 105,72 107,80 100,76 93,80 95,72 88,66 97,66" className="fill-primary/40" />
      <circle cx="150" cy="45" r="16" className="fill-primary/10 stroke-primary/30" strokeWidth="2" />
      <polyline points="143,45 148,51 158,39" className="stroke-primary/50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

export function NoRoomsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="30" width="100" height="110" rx="4" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="85" y="95" width="30" height="45" rx="2" className="fill-background stroke-muted-foreground/20" strokeWidth="1.5" />
      <circle cx="110" cy="118" r="2" className="fill-muted-foreground/25" />
      <rect x="60" y="42" width="22" height="18" rx="2" className="fill-background stroke-muted-foreground/15" strokeWidth="1.5" />
      <rect x="118" y="42" width="22" height="18" rx="2" className="fill-background stroke-muted-foreground/15" strokeWidth="1.5" />
      <rect x="60" y="68" width="22" height="18" rx="2" className="fill-background stroke-muted-foreground/15" strokeWidth="1.5" />
      <rect x="118" y="68" width="22" height="18" rx="2" className="fill-background stroke-muted-foreground/15" strokeWidth="1.5" />
      <path d="M45,30 L100,10 L155,30" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
    </svg>
  )
}

export function NoStaffIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="50" r="18" className="fill-primary/25" />
      <path d="M68,115 Q68,78 100,78 Q132,78 132,115" className="fill-primary/20" />
      <circle cx="52" cy="65" r="14" className="fill-primary/15" />
      <path d="M28,120 Q28,88 52,88 Q76,88 76,120" className="fill-primary/12" />
      <circle cx="148" cy="65" r="14" className="fill-primary/15" />
      <path d="M124,120 Q124,88 148,88 Q172,88 172,120" className="fill-primary/12" />
      <circle cx="100" cy="125" r="12" className="fill-background stroke-primary/30" strokeWidth="2" />
      <line x1="94" y1="125" x2="106" y2="125" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
      <line x1="100" y1="119" x2="100" y2="131" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NoTasksIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="55" y="25" width="90" height="115" rx="6" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="82" y="18" width="36" height="16" rx="4" className="fill-muted-foreground/20 stroke-muted-foreground/30" strokeWidth="2" />
      <rect x="70" y="50" width="14" height="14" rx="3" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="92" y="54" width="40" height="5" rx="2.5" className="fill-muted-foreground/12" />
      <rect x="70" y="74" width="14" height="14" rx="3" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="92" y="78" width="35" height="5" rx="2.5" className="fill-muted-foreground/10" />
      <rect x="70" y="98" width="14" height="14" rx="3" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="92" y="102" width="38" height="5" rx="2.5" className="fill-muted-foreground/12" />
      <circle cx="155" cy="50" r="16" className="fill-background stroke-primary/25" strokeWidth="2" />
      <path d="M155,40 L157,47 L164,47 L158,51 L160,58 L155,54 L150,58 L152,51 L146,47 L153,47 Z" className="fill-primary/30" />
    </svg>
  )
}

export function NoItemsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="45" y="80" width="110" height="55" rx="6" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <path d="M45,80 L100,65 L155,80" className="stroke-muted-foreground/20" strokeWidth="2" fill="none" />
      <path d="M45,80 L100,60 L155,80 L100,95 Z" className="fill-muted/50 stroke-muted-foreground/15" strokeWidth="1.5" />
      <rect x="55" y="90" width="90" height="35" rx="3" className="fill-background" />
      <circle cx="100" cy="107" r="12" className="fill-primary/10 stroke-primary/25" strokeWidth="1.5" />
      <text x="100" y="112" textAnchor="middle" className="fill-primary/35" fontSize="14" fontWeight="600">?</text>
      <circle cx="155" cy="40" r="14" className="fill-background stroke-primary/25" strokeWidth="2" />
      <line x1="164" y1="49" x2="175" y2="60" className="stroke-primary/25" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NoEventsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="100,20 125,80 75,80" className="fill-primary/15 stroke-primary/25" strokeWidth="2" />
      <rect x="80" y="65" width="40" height="8" rx="1" className="fill-primary/20" />
      <circle cx="100" cy="20" r="5" className="fill-primary/25" />
      <rect x="65" y="90" width="70" height="45" rx="4" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <rect x="70" y="95" width="60" height="25" rx="2" className="fill-background" />
      <rect x="50" y="35" width="8" height="4" rx="2" className="fill-amber-500/25" transform="rotate(25 54 37)" />
      <rect x="140" y="30" width="7" height="3" rx="1.5" className="fill-primary/25" transform="rotate(-30 143.5 31.5)" />
      <circle cx="40" cy="80" r="3" className="fill-primary/20" />
      <circle cx="160" cy="75" r="2.5" className="fill-amber-500/20" />
    </svg>
  )
}

export function NoMailIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="45" width="120" height="80" rx="6" className="fill-muted stroke-muted-foreground/20" strokeWidth="2" />
      <path d="M40,51 L100,90 L160,51" className="stroke-muted-foreground/20" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M40,45 L100,80 L160,45" className="fill-muted stroke-muted-foreground/15" strokeWidth="1.5" />
      <circle cx="100" cy="75" r="18" className="fill-background stroke-primary/20" strokeWidth="2" />
      <text x="100" y="81" textAnchor="middle" className="fill-primary/30" fontSize="16" fontWeight="500">@</text>
      <circle cx="30" cy="60" r="3" className="fill-primary/12" />
      <circle cx="170" cy="110" r="2.5" className="fill-primary/10" />
    </svg>
  )
}

export function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="75" cy="55" r="16" className="fill-primary/25" />
      <path d="M50,105 Q50,78 75,78 Q100,78 100,105" className="fill-primary/20" />
      <rect x="95" y="65" width="50" height="35" rx="4" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <rect x="98" y="68" width="44" height="28" rx="2" className="fill-background" />
      <polyline points="104,88 112,82 120,86 128,76 136,80" className="stroke-primary/40" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90,100 L110,100 L150,100 L155,105 L85,105 Z" className="fill-muted stroke-primary/20" strokeWidth="1.5" />
    </svg>
  )
}
