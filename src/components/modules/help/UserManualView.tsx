'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Clock,
  UtensilsCrossed,
  ClipboardCheck,
  Users,
  UserCog,
  PartyPopper,
  Calculator,
  Package,
  Wrench,
  TrendingUp,
  Globe,
  CheckCircle2,
  Info,
  Search,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

interface ModuleDoc {
  id: string
  name: string
  icon: LucideIcon
  color: string
  overview: string
  features: string[]
  tip: string
}

const MODULE_DOCS: ModuleDoc[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: 'emerald',
    overview:
      'Central hub displaying real-time hotel KPIs, revenue metrics, occupancy rates, and recent activities.',
    features: [
      'KPI cards for key performance metrics',
      'Revenue chart with daily, weekly, and monthly views',
      'Quick actions for common tasks',
      'Recent activity feed for real-time updates',
    ],
    tip: 'Visit dashboard first each shift for a quick property overview.',
  },
  {
    id: 'front-desk',
    name: 'Front Desk',
    icon: CalendarDays,
    color: 'blue',
    overview:
      'Complete guest lifecycle management from reservation creation to check-out.',
    features: [
      'Reservations with search and filters',
      'Arrivals with VIP sorting and preferences',
      'In-House guest management',
      'Departures with express checkout',
      'Guest Folio for billing and charges',
    ],
    tip: 'Use the Room Board to see real-time room status across all floors.',
  },
  {
    id: 'room-management',
    name: 'Room Management',
    icon: BedDouble,
    color: 'teal',
    overview:
      'Manage room inventory, types, configurations, and restrictions.',
    features: [
      'Floor-based room board with live status',
      'Room types with rate plans',
      'Date-based restrictions (stop sell, CTA/CTD, min/max LOS)',
    ],
    tip: 'Set room restrictions during high-demand periods for better rate control.',
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Clock,
    color: 'amber',
    overview:
      'Daily operational procedures including audits, day close, and shift management.',
    features: [
      'Night audit with revenue verification',
      'Day close checklist',
      'Cashier shift tracking',
      'Shift handover notes',
    ],
    tip: 'Complete night audit before running day close to ensure data accuracy.',
  },
  {
    id: 'pos',
    name: 'Point of Sale',
    icon: UtensilsCrossed,
    color: 'orange',
    overview:
      'Manage all F&B outlets and services including restaurant, bar, spa, and business center.',
    features: [
      'Table management for restaurants',
      'Menu ordering and kitchen display',
      'Order tracking and status updates',
    ],
    tip: 'Room charges from POS automatically post to guest folios.',
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    icon: ClipboardCheck,
    color: 'green',
    overview:
      'Coordinate housekeeping tasks, inspections, and lost & found management.',
    features: [
      'Task board with priority management',
      'Room inspections with scoring',
      'Lost and found tracking',
    ],
    tip: 'Check-out rooms are automatically flagged for housekeeping.',
  },
  {
    id: 'crm',
    name: 'Guest CRM',
    icon: Users,
    color: 'rose',
    overview:
      'Build lasting guest relationships with profile management, loyalty programs, and campaigns.',
    features: [
      'Guest profiles with stay history',
      'Loyalty tier management',
      'Marketing campaigns and communications',
    ],
    tip: 'VIP guests are automatically highlighted across all modules.',
  },
  {
    id: 'hr',
    name: 'HR & Payroll',
    icon: UserCog,
    color: 'pink',
    overview:
      'Manage employees, track attendance, and process payroll.',
    features: [
      'Employee directory with profiles',
      'Attendance tracking and shifts',
      'Payroll processing and reports',
    ],
    tip: 'Attendance integrates with shift management for accurate tracking.',
  },
  {
    id: 'events',
    name: 'Events & Banquet',
    icon: PartyPopper,
    color: 'orange-500',
    overview:
      'Plan and manage events, banquet orders, and BEO documentation.',
    features: [
      'Event calendar with drag-and-drop',
      'BEO / order management',
      'Deposit tracking',
    ],
    tip: 'Create events well in advance for proper resource allocation.',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    icon: Calculator,
    color: 'purple',
    overview:
      'Financial management with ledger, journal entries, and comprehensive reports.',
    features: [
      'Chart of accounts management',
      'Journal entry management',
      'Revenue and expense reports',
    ],
    tip: 'Reconcile journal entries daily for accurate financial reporting.',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: Package,
    color: 'cyan-700',
    overview:
      'Track stock levels, manage vendors, and process requisitions.',
    features: [
      'Stock level monitoring with alerts',
      'Vendor management and ordering',
      'Requisition workflow',
    ],
    tip: 'Set reorder points to receive automatic low-stock alerts.',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: Wrench,
    color: 'orange-700',
    overview:
      'Manage work orders, asset register, and preventive maintenance.',
    features: [
      'Work order tracking and assignment',
      'Asset register with warranty info',
    ],
    tip: 'Emergency work orders automatically flag for priority handling.',
  },
  {
    id: 'revenue',
    name: 'Revenue Management',
    icon: TrendingUp,
    color: 'emerald-700',
    overview:
      'Optimize pricing strategies with demand forecasting and rate intelligence.',
    features: [
      'Demand calendar with projections',
      'Pricing rules engine',
      'Competitive rate intelligence',
    ],
    tip: 'Review rate intelligence weekly for competitive positioning.',
  },
  {
    id: 'channel-manager',
    name: 'Channel Manager',
    icon: Globe,
    color: 'sky-600',
    overview:
      'Manage online distribution channels and track booking performance.',
    features: [
      'Channel connectivity status',
      'Booking management and sync',
      'Commission tracking and analysis',
    ],
    tip: 'Monitor channel sync status regularly to prevent overbookings.',
  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400', iconBg: 'bg-blue-500' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-400', iconBg: 'bg-teal-500' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400', iconBg: 'bg-orange-500' },
  green: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', iconBg: 'bg-green-500' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-400', iconBg: 'bg-rose-500' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-400', iconBg: 'bg-pink-500' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-400', iconBg: 'bg-purple-500' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-400', iconBg: 'bg-cyan-500' },
}

function getColorClasses(color: string) {
  return COLOR_MAP[color] || COLOR_MAP.blue
}

export function UserManualView() {
  const [selectedId, setSelectedId] = useState<string>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_DOCS
    const q = searchQuery.toLowerCase()
    return MODULE_DOCS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q) ||
        m.features.some((f) => f.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const selectedDoc = MODULE_DOCS.find((m) => m.id === selectedId) || MODULE_DOCS[0]

  // If search active, ensure selected is still in filtered list
  const activeDoc = filteredDocs.find((m) => m.id === selectedDoc.id) || filteredDocs[0]

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
        {/* Module list sidebar */}
        <ScrollArea className="md:w-64 shrink-0">
          <div className="flex md:flex-col gap-1 md:gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {filteredDocs.map((mod) => {
              const Icon = mod.icon
              const colors = getColorClasses(mod.color)
              const isActive = activeDoc?.id === mod.id
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedId(mod.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors text-left cursor-pointer w-full',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-md',
                      colors.bg
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                  </div>
                  <span>{mod.name}</span>
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Content area */}
        <Card className="flex-1 min-w-0">
          <CardContent className="p-6 space-y-5">
            {activeDoc ? (
              <>
                {/* Module header */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-lg',
                      getColorClasses(activeDoc.color).bg
                    )}
                  >
                    {(() => {
                      const Icon = activeDoc.icon
                      return <Icon className={cn('h-5 w-5', getColorClasses(activeDoc.color).text)} />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{activeDoc.name}</h2>
                    <p className="text-sm text-muted-foreground">{activeDoc.overview}</p>
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Key Features
                  </h3>
                  <ul className="space-y-2">
                    {activeDoc.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tip */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <span className="font-medium">Tip: </span>
                      {activeDoc.tip}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No modules match your search.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
