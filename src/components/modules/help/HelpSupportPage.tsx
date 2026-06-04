'use client'

import * as React from 'react'
import {
  BookOpen, Keyboard, FileText, Headset, ChevronRight, ChevronDown,
  LayoutDashboard, BedDouble, Users, Zap, Monitor, Globe,
  Clock, Star, DollarSign, Hotel, BadgeCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NAV_ITEMS } from '@/lib/navigation'
import { useNavigationStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Constants ──────────────────────────────────────────────────────
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const modKey = isMac ? '⌘' : 'Ctrl'

// ─── Kbd Badge ──────────────────────────────────────────────────────
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
      {children}
    </kbd>
  )
}

// ─── Page Header ────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
          <Headset className="size-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-sm text-muted-foreground">
            Resources, guides, and support contacts for the Meridian PMS system.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Getting Started Section ─────────────────────────────────────────
function GettingStartedSection() {
  const [expandedStep, setExpandedStep] = React.useState<number | null>(null)

  const steps = [
    {
      number: 1,
      title: 'Dashboard Overview',
      icon: LayoutDashboard,
      color: 'text-emerald-600',
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
      color: 'text-amber-600',
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
      color: 'text-blue-600',
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
      color: 'text-purple-600',
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
      color: 'text-orange-600',
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
      color: 'text-rose-600',
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
            <BookOpen className="size-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">Getting Started Guide</CardTitle>
            <CardDescription className="text-xs">Follow these steps to get started with the PMS system.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
                  <step.icon className={cn('size-4', step.color)} />
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
      </CardContent>
    </Card>
  )
}

// ─── Keyboard Shortcuts Section ──────────────────────────────────────
function KeyboardShortcutsSection() {
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
        { keys: [modKey, '/'], desc: 'Keyboard Shortcuts — show shortcuts dialog' },
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
        { keys: [modKey, 'Enter'], desc: 'Submit in text areas (alternative)' },
      ],
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
            <Keyboard className="size-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
            <CardDescription className="text-xs">Use shortcuts to navigate and act faster across the system.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-3">
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
      </CardContent>
    </Card>
  )
}

// ─── User Manual Section ─────────────────────────────────────────────
function UserManualSection() {
  const { navigateTo } = useNavigationStore()
  const [expandedModule, setExpandedModule] = React.useState<string | null>(null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
            <FileText className="size-4 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">User Manual</CardTitle>
            <CardDescription className="text-xs">Complete module reference. Click a module to explore sub-modules.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
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
                        toast.success(`Navigated to ${item.label}`)
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
      </CardContent>
    </Card>
  )
}

// ─── Contact IT Support Section ─────────────────────────────────────
function ContactSupportSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50">
            <Headset className="size-4 text-rose-600" />
          </div>
          <div>
            <CardTitle className="text-base">Contact IT Support</CardTitle>
            <CardDescription className="text-xs">Our IT team is available to assist you with any technical issues.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary Contact */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Headset className="size-4 text-rose-600" />
            Primary Support
          </h4>
          <div className="space-y-2.5">
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
              <Badge variant="destructive" className="font-mono text-[10px]">ext. 9999</Badge>
            </div>
          </div>
        </div>

        {/* Support Hours */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
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
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-emerald-600" />
            Quick Fixes
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-muted-foreground/60">1.</span>
              <span><strong>Page not loading?</strong> — Press <Kbd>F5</Kbd> to refresh.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-muted-foreground/60">2.</span>
              <span><strong>Slow response?</strong> — Check internet. Use <Kbd>Shift + ?</Kbd> for help.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-muted-foreground/60">3.</span>
              <span><strong>Search not working?</strong> — Press <Kbd>{modKey} + K</Kbd> for command palette.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-muted-foreground/60">4.</span>
              <span><strong>Sidebar missing?</strong> — Press <Kbd>{modKey} + B</Kbd> to toggle sidebar.</span>
            </p>
          </div>
        </div>

        {/* System Version */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/50 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">System Version</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Meridian PMS v2.0.0 — Build 2024.01</p>
            </div>
            <BadgeCheck className="size-5 text-amber-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Full Help & Support Page ──────────────────────────────────────
export function HelpSupportPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <PageHeader />

      {/* Main Content Grid — 2 columns on desktop, stacked on mobile */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <GettingStartedSection />
          <KeyboardShortcutsSection />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <UserManualSection />
          <ContactSupportSection />
        </div>
      </div>
    </div>
  )
}
