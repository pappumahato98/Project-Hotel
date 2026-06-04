'use client'

import * as React from 'react'
import {
  BookOpen, Keyboard, FileText, Headset, ChevronRight, ArrowLeft,
  LayoutDashboard, BedDouble, Users, ChevronDown, Zap, Monitor, Globe,
  Clock, Star, DollarSign, Hotel,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NAV_ITEMS } from '@/lib/navigation'
import { useNavigationStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────
type HelpPage = 'main' | 'getting-started' | 'keyboard-shortcuts' | 'user-manual' | 'contact-support'

// ─── Kbd Badge ──────────────────────────────────────────────────────
function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm',
      className
    )}>
      {children}
    </kbd>
  )
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const modKey = isMac ? '⌘' : 'Ctrl'

// ─── Main Menu Page ────────────────────────────────────────────────
function MainMenuPage({ onNavigate }: { onNavigate: (page: HelpPage) => void }) {
  const menuItems = [
    {
      id: 'getting-started' as const,
      icon: BookOpen,
      title: 'Getting Started Guide',
      desc: 'Learn the basics of the PMS system',
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      id: 'keyboard-shortcuts' as const,
      icon: Keyboard,
      title: 'Keyboard Shortcuts',
      desc: `${modKey}K — Quick Search, ${modKey}B — Toggle Sidebar`,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'user-manual' as const,
      icon: FileText,
      title: 'User Manual',
      desc: 'Complete reference documentation',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
    },
    {
      id: 'contact-support' as const,
      icon: Headset,
      title: 'Contact IT Support',
      desc: 'ext. 1000 or it@meridian.com',
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
    },
  ]

  return (
    <div className="space-y-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
          className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all hover:bg-muted/50 hover:shadow-sm active:scale-[0.99]"
          onClick={() => onNavigate(item.id)}
        >
          <div className="flex items-center gap-3">
            <div className={cn('flex size-9 items-center justify-center rounded-lg', item.color)}>
              <item.icon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
        </button>
      ))}

      <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/50 dark:border-amber-800">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">System Version</p>
        <p className="text-xs text-amber-700 dark:text-amber-400">Meridian PMS v2.0.0 — Build 2024.01</p>
      </div>
    </div>
  )
}

// ─── Getting Started Guide Page ────────────────────────────────────
function GettingStartedPage() {
  const [expandedStep, setExpandedStep] = React.useState<number | null>(null)

  const steps = [
    {
      number: 1,
      title: 'Dashboard Overview',
      icon: LayoutDashboard,
      summary: 'Your central command center for hotel operations.',
      details: [
        'The Dashboard provides a real-time overview of occupancy, revenue, and daily activity.',
        'Key metrics: Occupancy Rate, ADR (Average Daily Rate), RevPAR, Total Revenue.',
        'Quick-action cards let you jump directly to check-ins, check-outs, and reservations.',
        'Use the date picker to view historical data and compare performance.',
      ],
    },
    {
      number: 2,
      title: 'Front Desk Operations',
      icon: Hotel,
      summary: 'Manage reservations, check-ins, check-outs, and guest folios.',
      details: [
        'Reservations Tab: Create, edit, and manage all bookings with room assignment.',
        'Arrivals Tab: See today\'s expected arrivals — process check-ins quickly.',
        'In-House Tab: Monitor current guests — extend stays, transfer rooms, add charges.',
        'Departures Tab: Process check-outs with payment, print receipts, batch operations.',
        'Folio Tab: Manage guest billing — room charges, incidentals, payments.',
        'Calendar Tab: Visual timeline of all reservations by room.',
      ],
    },
    {
      number: 3,
      title: 'Room Management',
      icon: BedDouble,
      summary: 'Room board, types, rates, and room restrictions.',
      details: [
        'Room Board: Visual floor map showing room status (available, occupied, maintenance, OOO).',
        'Room Types: Define room categories (Standard, Deluxe, Suite) with rate management.',
        'Restrictions: Set minimum/maximum stay, closed-out dates, and booking limits.',
        'Click any room on the board to see full details, guest info, and housekeeping status.',
      ],
    },
    {
      number: 4,
      title: 'Housekeeping',
      icon: Star,
      summary: 'Task management, room inspections, lost & found.',
      details: [
        'Task Board: Assign cleaning tasks, track progress, and manage priorities.',
        'Inspection: Quality control checks after cleaning with pass/fail ratings.',
        'Lost & Found: Log items, match with guests, manage return tracking.',
        'Rooms auto-appear as tasks after guest check-out.',
      ],
    },
    {
      number: 5,
      title: 'Point of Sale (POS)',
      icon: DollarSign,
      summary: 'Restaurant, bar, spa, and business center billing.',
      details: [
        'Each outlet has its own POS with menu items and pricing.',
        'Charge items directly to guest rooms or process standalone payments.',
        'Kitchen Display: Real-time order queue for food preparation.',
        'Spa & Business Center: Service scheduling and billing.',
      ],
    },
    {
      number: 6,
      title: 'Guest CRM & Events',
      icon: Users,
      summary: 'Guest profiles, loyalty programs, campaigns, and event management.',
      details: [
        'Guest Profiles: Full guest history, preferences, VIP status, and stay records.',
        'Loyalty: Points tracking, tier management, reward redemption.',
        'Campaigns: Email/SMS marketing campaigns with templates.',
        'Events: Banquet booking, event calendar, and order management.',
      ],
    },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/50">
        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
          🎯 Follow these steps to get started with the Meridian PMS system. Click any section to expand.
        </p>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {steps.map((step) => (
          <div key={step.number} className="rounded-lg border">
            <button
              className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {step.number}
                </div>
                <div className="flex items-center gap-2">
                  <step.icon className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.summary}</p>
                  </div>
                </div>
              </div>
              <ChevronDown className={cn(
                'size-4 text-muted-foreground transition-transform',
                expandedStep === step.number && 'rotate-180'
              )} />
            </button>
            {expandedStep === step.number && (
              <div className="border-t px-3 pb-3 pt-2 bg-muted/20">
                <ul className="space-y-1.5">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Keyboard Shortcuts Reference Page ─────────────────────────────
function KeyboardShortcutsPage() {
  const [expandedCat, setExpandedCat] = React.useState<string | null>('global')

  const shortcutCategories = [
    {
      id: 'global',
      label: 'Global Shortcuts',
      icon: Globe,
      color: 'text-emerald-600',
      shortcuts: [
        { keys: [modKey, 'K'], desc: 'Quick Search — search modules and pages' },
        { keys: [modKey, 'B'], desc: 'Toggle Sidebar — show or hide the navigation sidebar' },
        { keys: [modKey, '/'], desc: 'Keyboard Shortcuts — show this help panel' },
        { keys: ['Shift', '?'], desc: 'Show keyboard shortcuts (alternative)' },
        { keys: ['Esc'], desc: 'Close any open dialog, popover, or menu' },
      ],
    },
    {
      id: 'navigation',
      label: 'Navigation Shortcuts',
      icon: Monitor,
      color: 'text-amber-600',
      shortcuts: [
        { keys: ['Alt', '0'], desc: 'Go to Dashboard' },
        { keys: ['Alt', '1'], desc: 'Go to Front Desk' },
        { keys: ['Alt', '2'], desc: 'Go to Room Management' },
        { keys: ['Alt', '3'], desc: 'Go to Operations' },
        { keys: ['Alt', '4'], desc: 'Go to Point of Sale' },
        { keys: ['Alt', '5'], desc: 'Go to Housekeeping' },
        { keys: ['Alt', '6'], desc: 'Go to Guest CRM' },
        { keys: ['Alt', '7'], desc: 'Go to HR & Payroll' },
        { keys: ['Alt', '8'], desc: 'Go to Events & Banquet' },
        { keys: ['Alt', '9'], desc: 'Go to Accounting' },
        { keys: ['Alt+Shift', '1'], desc: 'Go to Inventory' },
        { keys: ['Alt+Shift', '2'], desc: 'Go to Maintenance' },
        { keys: ['Alt+Shift', '3'], desc: 'Go to Revenue Management' },
        { keys: ['Alt+Shift', '4'], desc: 'Go to Channel Manager' },
      ],
    },
    {
      id: 'forms',
      label: 'Form & Dialog Shortcuts',
      icon: Zap,
      color: 'text-blue-600',
      shortcuts: [
        { keys: ['Enter'], desc: 'Submit form / Save changes in dialog' },
        { keys: ['Tab'], desc: 'Move to next form field' },
        { keys: ['Shift', 'Tab'], desc: 'Move to previous form field' },
        { keys: ['Shift', 'Enter'], desc: 'Insert newline in text areas' },
        { keys: [modKey, 'Enter'], desc: 'Submit in text areas (alternative to Enter)' },
      ],
    },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          ⌨️ Keyboard shortcuts help you work faster. Click a category to expand the full list.
        </p>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {shortcutCategories.map((cat) => (
          <div key={cat.id} className="rounded-lg border">
            <button
              className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            >
              <div className="flex items-center gap-3">
                <cat.icon className={cn('size-4', cat.color)} />
                <span className="text-sm font-medium">{cat.label}</span>
                <Badge variant="secondary" className="text-[10px]">{cat.shortcuts.length}</Badge>
              </div>
              <ChevronDown className={cn(
                'size-4 text-muted-foreground transition-transform',
                expandedCat === cat.id && 'rotate-180'
              )} />
            </button>
            {expandedCat === cat.id && (
              <div className="border-t px-3 pb-3 pt-2 bg-muted/20 space-y-1.5">
                {cat.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{s.desc}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                      {s.keys.map((key, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span className="text-[10px] text-muted-foreground mx-0.5">+</span>}
                          <Kbd>{key}</Kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── User Manual Page ──────────────────────────────────────────────
function UserManualPage() {
  const { navigateTo } = useNavigationStore()
  const [expandedModule, setExpandedModule] = React.useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50">
        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
          📖 Browse the complete module reference. Click a module to expand, then jump directly to it.
        </p>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="rounded-lg border">
              <div
                role="button"
                tabIndex={0}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setExpandedModule(expandedModule === item.id ? null : item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedModule(expandedModule === item.id ? null : item.id) }}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className={cn('size-4', item.color ?? 'text-muted-foreground')} />}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.children && (
                      <p className="text-[10px] text-muted-foreground">{item.children.length} sub-modules</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.children && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateTo(item.id)
                      }}
                    >
                      Open
                    </Button>
                  )}
                  <ChevronDown className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    expandedModule === item.id && 'rotate-180'
                  )} />
                </div>
              </div>
              {expandedModule === item.id && item.children && (
                <div className="border-t px-3 pb-3 pt-2 bg-muted/20 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    return (
                      <button
                        key={child.id}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                        onClick={() => {
                          navigateTo(item.id, child.id)
                          toast.success(`Navigated to ${child.label}`)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {ChildIcon && <ChildIcon className="size-3 text-muted-foreground" />}
                          <span className="text-muted-foreground">{child.label}</span>
                        </div>
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Contact IT Support Page ──────────────────────────────────────
function ContactSupportPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/50">
        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
          🛟 Our IT team is available to assist you with any technical issues.
        </p>
      </div>

      <div className="space-y-3">
        {/* Primary Contact */}
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Headset className="size-4 text-rose-600" />
            Primary Support
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Phone Extension</span>
              <Badge variant="outline" className="font-mono">ext. 1000</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Email</span>
              <Badge variant="outline">it@meridian.com</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Emergency Line</span>
              <Badge variant="outline" className="font-mono">ext. 9999</Badge>
            </div>
          </div>
        </div>

        {/* Support Hours */}
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="size-4 text-amber-600" />
            Support Hours
          </h4>
          <div className="space-y-2">
            {[
              { day: 'Monday — Friday', hours: '07:00 — 22:00', active: true },
              { day: 'Saturday', hours: '08:00 — 20:00', active: true },
              { day: 'Sunday & Holidays', hours: '09:00 — 18:00', active: false },
            ].map((schedule) => (
              <div key={schedule.day} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'size-1.5 rounded-full',
                    schedule.active ? 'bg-emerald-500' : 'bg-amber-500'
                  )} />
                  <span className="text-xs">{schedule.day}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{schedule.hours}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Fixes */}
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="size-4 text-emerald-600" />
            Quick Fixes
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="mt-0.5">1.</span>
              <span><strong>Page not loading?</strong> — Try pressing <Kbd>F5</Kbd> to refresh your browser.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5">2.</span>
              <span><strong>Slow response?</strong> — Check your internet connection. Use <Kbd>Shift + ?</Kbd> for keyboard help.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5">3.</span>
              <span><strong>Search not working?</strong> — Press <Kbd>{modKey} + K</Kbd> to open the command palette.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5">4.</span>
              <span><strong>Sidebar missing?</strong> — Press <Kbd>{modKey} + B</Kbd> to toggle the sidebar.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Help & Support Dialog ────────────────────────────────────
export function HelpSupportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = React.useState<HelpPage>('main')

  // Reset page when dialog opens/closes
  React.useEffect(() => {
    if (open) setPage('main')
  }, [open])

  const pageConfig: Record<HelpPage, { title: string; desc: string; showBack: boolean }> = {
    main: { title: 'Help & Support', desc: 'Resources and support contacts.', showBack: false },
    'getting-started': { title: 'Getting Started Guide', desc: 'Learn the basics of the PMS system.', showBack: true },
    'keyboard-shortcuts': { title: 'Keyboard Shortcuts', desc: 'Use shortcuts to navigate and act faster.', showBack: true },
    'user-manual': { title: 'User Manual', desc: 'Complete module reference documentation.', showBack: true },
    'contact-support': { title: 'Contact IT Support', desc: 'Get help from our IT team.', showBack: true },
  }

  const config = pageConfig[page]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {config.showBack && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 -ml-2"
                onClick={() => setPage('main')}
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              {page === 'main' && <Headset className="size-4 text-muted-foreground" />}
              {page === 'getting-started' && <BookOpen className="size-4 text-emerald-600" />}
              {page === 'keyboard-shortcuts' && <Keyboard className="size-4 text-amber-600" />}
              {page === 'user-manual' && <FileText className="size-4 text-blue-600" />}
              {page === 'contact-support' && <Headset className="size-4 text-rose-600" />}
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.desc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Page content */}
        {page === 'main' && <MainMenuPage onNavigate={setPage} />}
        {page === 'getting-started' && <GettingStartedPage />}
        {page === 'keyboard-shortcuts' && <KeyboardShortcutsPage />}
        {page === 'user-manual' && <UserManualPage />}
        {page === 'contact-support' && <ContactSupportPage />}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {config.showBack ? 'Close' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
