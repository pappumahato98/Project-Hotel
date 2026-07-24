'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, TrendingUp, TrendingDown, BedDouble, DollarSign,
  CalendarCheck, CalendarX, ShoppingCart, ClipboardList,
  AlertTriangle, Star, Clock, ArrowRight, UserCheck, CreditCard,
  Wrench, UtensilsCrossed, FileText, Moon, Coffee, AlertCircle,
  PartyPopper, ChevronUp, ChevronDown, LogOut, WifiOff, RefreshCw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNavigationStore, useAuthStore, useSettingsStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ─────────────────────────────────────────────────────────────
interface DashboardData {
  kpis: {
    totalRooms: number
    occupiedRooms: number
    occupancy: number
    occupancyTrend: number
    arrivals: number
    departures: number
    vacantClean: number
    totalRevenue: number
    roomRevenue: number
    fAndBRevenue: number
    otherRevenue: number
    adr: number
    revpar: number
    revenueTrend: number
    adrTrend: number
    revparTrend: number
  }
  roomStatusBreakdown: Record<string, number>
  alerts: {
    vipArrivals: Array<{
      id: string
      confirmationNo: string
      guestName: string
      vipLevel: string | null
      roomNumber: string | null
      checkIn: string
    }>
    overdueCheckouts: number
    emergencyWorkOrders: Array<{
      id: string
      title: string
      category: string
      priority: string
      status: string
    }>
    outOfOrderRooms: Array<{ id: string; number: string; floor: number }>
    outOfOrderCount: number
    unassignedArrivals: number
    creditLimitBreaches: Array<{
      id: string
      guestName: string
      roomNumber: string | null
      balance: number
      creditLimit: number
    }>
    pendingHkTasks: number
    openPosOrders: number
  }
  revenueChart: Array<{
    date: string
    roomRevenue: number
    fAndBRevenue: number
    totalRevenue: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    title: string
    detail: string
    status: string
    amount?: number
    timestamp: string
  }>
}

// ─── Helpers ───────────────────────────────────────────────────────────
const nprFormatter = new Intl.NumberFormat('en-NP', {
  style: 'currency',
  currency: 'NPR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNPR(amount: number): string {
  return nprFormatter.format(amount)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Custom Tooltip for Chart ──────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">{formatNPR(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────
function WelcomeBannerSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-1 h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function StatsRowSkeleton() {
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 1. Welcome Banner ──────────────────────────────────────────────────
function WelcomeBanner({ data }: { data: DashboardData }) {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const businessStatus = currentTime.getHours() >= 6 && currentTime.getHours() < 22

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10">
      <CardContent className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md">
              <Building2 className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {getGreeting()}, {user?.firstName || 'Guest'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {formatDate(currentTime)} — {settings.hotelName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                businessStatus
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950 dark:text-red-300'
              )}
            >
              <span className={cn(
                'size-1.5 rounded-full',
                businessStatus ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              {businessStatus ? 'Open' : 'Closed'}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-full px-3 py-1 text-xs">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              5-Star
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 2. KPI Cards Row ───────────────────────────────────────────────────
function KpiCards({ data }: { data: DashboardData }) {
  const { kpis } = data
  const kpiItems = [
    {
      label: 'Occupancy',
      value: `${kpis.occupancy}%`,
      trend: kpis.occupancyTrend,
      icon: BedDouble,
      iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
      progress: kpis.occupancy,
      showProgress: true,
    },
    {
      label: 'ADR',
      value: formatNPR(kpis.adr),
      trend: kpis.adrTrend,
      icon: DollarSign,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      showProgress: false,
    },
    {
      label: 'RevPAR',
      value: formatNPR(kpis.revpar),
      trend: kpis.revparTrend,
      icon: TrendingUp,
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
      showProgress: false,
    },
    {
      label: 'Total Revenue Today',
      value: formatNPR(kpis.totalRevenue),
      trend: kpis.revenueTrend,
      icon: DollarSign,
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      showProgress: false,
    },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {kpiItems.map((kpi) => {
        const Icon = kpi.icon
        const isPositive = kpi.trend >= 0
        return (
          <Card key={kpi.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className={cn('flex size-8 items-center justify-center rounded-md', kpi.iconBg)}>
                  <Icon className="size-4" />
                </div>
                <div className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  isPositive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                )}>
                  {isPositive ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                  {Math.abs(kpi.trend)}%
                </div>
              </div>
              <div className="mt-3">
                <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{kpi.label}</p>
              </div>
              {kpi.showProgress && (
                <div className="mt-3">
                  <Progress value={kpi.progress} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── 3. Today's Quick Stats ─────────────────────────────────────────────
function QuickStatsRow({ data }: { data: DashboardData }) {
  const { kpis, alerts } = data

  const stats = [
    { label: 'Rooms Available', value: kpis.vacantClean, icon: BedDouble, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400' },
    { label: 'In-House Guests', value: kpis.occupiedRooms, icon: UserCheck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400' },
    { label: "Today's Arrivals", value: kpis.arrivals, icon: CalendarCheck, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400' },
    { label: "Today's Departures", value: kpis.departures, icon: CalendarX, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400' },
    { label: 'Open POS Orders', value: alerts.openPosOrders, icon: ShoppingCart, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400' },
    { label: 'Pending HK Tasks', value: alerts.pendingHkTasks, icon: ClipboardList, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400' },
  ]

  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <div className={cn('flex size-10 items-center justify-center rounded-lg', stat.color)}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 4. Operational Alerts ─────────────────────────────────────────────
function OperationalAlerts({ data }: { data: DashboardData }) {
  const { alerts } = data
  const hasAlerts =
    alerts.emergencyWorkOrders.length > 0 ||
    alerts.vipArrivals.length > 0 ||
    alerts.outOfOrderCount > 0 ||
    alerts.unassignedArrivals > 0 ||
    alerts.creditLimitBreaches.length > 0 ||
    alerts.overdueCheckouts > 0

  if (!hasAlerts) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-500" />
          Operational Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Emergency Work Orders */}
        {alerts.emergencyWorkOrders.length > 0 && (
          <Alert className="border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
            <Wrench className="size-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-800 dark:text-red-200">
              {alerts.emergencyWorkOrders.length} Emergency Work Order{alerts.emergencyWorkOrders.length > 1 ? 's' : ''}
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              {alerts.emergencyWorkOrders.map((wo) => wo.title).join(' • ')}
            </AlertDescription>
          </Alert>
        )}

        {/* VIP Arrivals */}
        {alerts.vipArrivals.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <Star className="size-4 text-amber-500 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              {alerts.vipArrivals.length} VIP Arrival{alerts.vipArrivals.length > 1 ? 's' : ''} Today
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {alerts.vipArrivals.map((v) => v.guestName).join(' • ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Rooms Out of Order */}
        {alerts.outOfOrderCount > 0 && (
          <Alert className="border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100">
            <AlertCircle className="size-4 text-orange-500 dark:text-orange-400" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">
              {alerts.outOfOrderCount} Room{alerts.outOfOrderCount > 1 ? 's' : ''} Out of Order
            </AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              {alerts.outOfOrderRooms.map((r) => `Room ${r.number} (Floor ${r.floor})`).join(' • ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Unassigned Arrivals */}
        {alerts.unassignedArrivals > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100">
            <CalendarCheck className="size-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              {alerts.unassignedArrivals} Unassigned Arrival{alerts.unassignedArrivals > 1 ? 's' : ''}
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              Confirmed reservations without room assignments. Please allocate rooms before check-in.
            </AlertDescription>
          </Alert>
        )}

        {/* Credit Limit Breaches */}
        {alerts.creditLimitBreaches.length > 0 && (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
            <CreditCard className="size-4 text-rose-600 dark:text-rose-400" />
            <AlertTitle className="text-rose-800 dark:text-rose-200">
              {alerts.creditLimitBreaches.length} Credit Limit Breach{alerts.creditLimitBreaches.length > 1 ? 'es' : ''}
            </AlertTitle>
            <AlertDescription className="text-rose-700 dark:text-rose-300">
              {alerts.creditLimitBreaches.map((b) =>
                `${b.guestName}${b.roomNumber ? ` (Room ${b.roomNumber})` : ''}: ${formatNPR(b.balance)}`
              ).join(' • ')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 5. Revenue Chart ───────────────────────────────────────────────────
function RevenueChart({ data }: { data: DashboardData }) {
  const { revenueChart } = data

  if (revenueChart.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No revenue data available yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Revenue Trend</CardTitle>
            <CardDescription>Last 7 days — Room & F&B revenue</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Room Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">F&B Revenue</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="roomRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fAndBRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="roomRevenue"
                name="Room Revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#roomRevenue)"
              />
              <Area
                type="monotone"
                dataKey="fAndBRevenue"
                name="F&B Revenue"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#fAndBRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 6. Room Status Overview ────────────────────────────────────────────
function RoomStatusOverview({ data }: { data: DashboardData }) {
  const { roomStatusBreakdown, kpis } = data

  const statuses = [
    { key: 'vacant_clean', label: 'Vacant Clean', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
    { key: 'occupied', label: 'Occupied', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    { key: 'vacant_dirty', label: 'Vacant Dirty', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    { key: 'cleaning', label: 'Cleaning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
    { key: 'out_of_order', label: 'Out of Order', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    { key: 'inspected', label: 'Inspected', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Room Status Overview</CardTitle>
          <span className="text-sm text-muted-foreground">{kpis.totalRooms} Total Rooms</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const count = roomStatusBreakdown[s.key] ?? 0
            if (count === 0) return null
            return (
              <Badge
                key={s.key}
                className={cn('gap-1.5 rounded-full px-3 py-1 text-xs font-medium', s.color)}
              >
                {s.label}: {count}
              </Badge>
            )
          })}
        </div>
        <Separator className="my-3" />
        <div className="space-y-2">
          {statuses.map((s) => {
            const count = roomStatusBreakdown[s.key] ?? 0
            const pct = kpis.totalRooms > 0 ? Math.round((count / kpis.totalRooms) * 100) : 0
            return (
              <div key={s.key} className="flex items-center gap-3 text-xs">
                <span className="w-24 text-muted-foreground">{s.label}</span>
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        s.key === 'vacant_clean' && 'bg-emerald-500',
                        s.key === 'occupied' && 'bg-blue-500',
                        s.key === 'vacant_dirty' && 'bg-yellow-500',
                        s.key === 'cleaning' && 'bg-amber-500',
                        s.key === 'out_of_order' && 'bg-red-500',
                        s.key === 'inspected' && 'bg-purple-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right font-medium tabular-nums">{count} ({pct}%)</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 7. Recent Activity Feed ────────────────────────────────────────────
function RecentActivityFeed({ data }: { data: DashboardData }) {
  const { recentActivity } = data

  const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    reservation: { icon: CalendarCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950' },
    folio: { icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950' },
    pos: { icon: UtensilsCrossed, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950' },
    work_order: { icon: Wrench, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950' },
    check_in: { icon: LogOut, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-950' },
    check_out: { icon: LogOut, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950' },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {recentActivity.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          )}
          {recentActivity.map((activity, index) => {
            const config = typeConfig[activity.type] ?? typeConfig.folio
            const Icon = config.icon
            return (
              <React.Fragment key={activity.id}>
                <div className="flex items-start gap-3 py-3">
                  <div className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                    config.bg
                  )}>
                    <Icon className={cn('size-3.5', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{activity.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{activity.detail}</span>
                      {activity.amount !== undefined && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {formatNPR(activity.amount)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
                        {activity.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
                {index < recentActivity.length - 1 && <Separator />}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 8. Quick Actions Grid ───────────────────────────────────────────────
function QuickActions() {
  const { navigateTo } = useNavigationStore()

  const actions = [
    {
      label: 'New Reservation',
      description: 'Create a booking',
      icon: CalendarCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900',
      border: 'border-blue-200 dark:border-blue-800',
      onClick: () => navigateTo('front-desk', 'reservations'),
    },
    {
      label: 'Walk-in Check-in',
      description: 'Register walk-in guest',
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900',
      border: 'border-emerald-200 dark:border-emerald-800',
      onClick: () => navigateTo('front-desk', 'arrivals'),
    },
    {
      label: 'Post Room Charge',
      description: 'Charge to guest folio',
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900',
      border: 'border-amber-200 dark:border-amber-800',
      onClick: () => navigateTo('front-desk', 'folio'),
    },
    {
      label: 'Night Audit',
      description: 'End-of-day close',
      icon: Moon,
      color: 'text-purple-600',
      bg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900',
      border: 'border-purple-200 dark:border-purple-800',
      onClick: () => navigateTo('operations', 'night-audit'),
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                variant="outline"
                className={cn(
                  'h-auto flex-col items-start gap-2 p-4 text-left transition-all hover:shadow-sm',
                  action.bg,
                  action.border
                )}
                onClick={action.onClick}
              >
                <div className="flex w-full items-center gap-3">
                  <Icon className={cn('size-5', action.color)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold', action.color)}>{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/50" />
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading State ──────────────────────────────────────────────────────
function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <WelcomeBannerSkeleton />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <StatsRowSkeleton />
      <div className="grid gap-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-64" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────────
function DashboardError({ error, refetch }: { error: Error; refetch: () => void }) {
  const isServerDown = error.message?.includes('Server unavailable') || error.message?.includes('Failed to fetch')
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 overflow-y-auto">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          {isServerDown ? <WifiOff className="size-6 text-muted-foreground" /> : <AlertCircle className="size-6 text-destructive" />}
        </div>
        <AlertTitle className="text-base">
          {isServerDown ? 'Connecting to server...' : 'Failed to load dashboard'}
        </AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground max-w-md">
          {isServerDown
            ? 'The server is starting up. This may take a moment.'
            : error.message || 'An unexpected error occurred.'}
        </AlertDescription>
      </div>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCw className="size-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

// ─── Main Dashboard Module ──────────────────────────────────────────────
export function DashboardModule() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/api/dashboard'),
    refetchInterval: 10000, // refresh every 10s
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })

  // Defensive defaults — guard against partial API responses
  const safeData: DashboardData = {
    kpis: data?.kpis ?? {
      totalRooms: 0, occupiedRooms: 0, occupancy: 0, occupancyTrend: 0,
      arrivals: 0, departures: 0, vacantClean: 0,
      totalRevenue: 0, roomRevenue: 0, fAndBRevenue: 0, otherRevenue: 0,
      adr: 0, revpar: 0, revenueTrend: 0, adrTrend: 0, revparTrend: 0,
    },
    roomStatusBreakdown: data?.roomStatusBreakdown ?? {},
    alerts: data?.alerts ?? {
      vipArrivals: [], overdueCheckouts: 0,
      emergencyWorkOrders: [], outOfOrderRooms: [], outOfOrderCount: 0,
      unassignedArrivals: 0, creditLimitBreaches: [], pendingHkTasks: 0, openPosOrders: 0,
    },
    revenueChart: data?.revenueChart ?? [],
    recentActivity: data?.recentActivity ?? [],
    settings: data?.settings,
  }

  if (isLoading) return <DashboardLoading />
  if (isError || !data) return <DashboardError error={error ?? new Error('Unknown error')} refetch={refetch} />

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6 overflow-y-auto">
      {/* 1. Welcome Banner */}
      <div className="flex items-center gap-2">
        <WelcomeBanner data={safeData} />
      </div>

      {/* 2. KPI Cards */}
      <KpiCards data={safeData} />

      {/* 3. Quick Stats Row */}
      <QuickStatsRow data={safeData} />

      {/* Two-column layout: Alerts + Room Status | Chart */}
      <div className="grid gap-2 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* 4. Operational Alerts */}
          <OperationalAlerts data={safeData} />

          {/* 6. Room Status Overview */}
          <RoomStatusOverview data={safeData} />
        </div>

        {/* 5. Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart data={safeData} />
        </div>
      </div>

      {/* Two-column layout: Recent Activity | Quick Actions */}
      <div className="grid gap-2 lg:grid-cols-3">
        {/* 7. Recent Activity Feed */}
        <div className="lg:col-span-2">
          <RecentActivityFeed data={safeData} />
        </div>

        {/* 8. Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

export default DashboardModule
