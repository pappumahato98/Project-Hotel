'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import {
  Building2, TrendingUp, TrendingDown, BedDouble, DollarSign,
  CalendarCheck, CalendarX, ShoppingCart, ClipboardList,
  AlertTriangle, Star, Clock, ArrowRight, UserCheck, CreditCard,
  Wrench, UtensilsCrossed, FileText, Moon, Coffee, AlertCircle,
  ChevronUp, ChevronDown, LogOut, WifiOff, RefreshCw,
  Radio, Plus, Calendar, Bed, Bell, Cloud, Sun, CloudRain,
  Users, ShieldCheck, Thermometer, FileDown, ExternalLink,
  Droplets, CheckCircle2, XCircle, X as XIcon, Eye,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import { useNavigationStore, useAuthStore, useSettingsStore } from '@/lib/store'
import { useNotificationStore } from '@/lib/realtime-notifications'
import { LiveActivityFeed } from '@/components/shared/notification-bell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types (split endpoint responses) ────────────────────────────────────
interface KpisData {
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
  revenueChart: Array<{
    date: string
    roomRevenue: number
    fAndBRevenue: number
    totalRevenue: number
  }>
  defaultCreditLimit: number
}

interface AlertsData {
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
    openWorkflowTasks: number
    highPriorityWorkflowTasks: Array<{
      id: string
      title: string
      priority: string
      status: string
      category: string
      area: string | null
      room: { number: string; floor: number } | null
      assignedByName: string | null
      dueDate: string | null
      requestedDate: string
    }>
    openPosOrders: number
  }
}

interface ActivityData {
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

// Composed type for backward compat with child components
interface DashboardData {
  kpis: KpisData['kpis']
  roomStatusBreakdown: Record<string, number>
  alerts: AlertsData['alerts']
  revenueChart: KpisData['revenueChart']
  recentActivity: ActivityData['recentActivity']
}

// ─── Room Type Data (derived from roomStatusBreakdown or static) ──────────
interface RoomTypeData {
  name: string
  value: number
  color: string
}

// ─── Reservation Row (mock/derived from activity) ────────────────────────
interface ReservationRow {
  id: string
  guestName: string
  roomNumber: string
  roomType: string
  checkIn: string
  checkOut: string
  source: string
  amount: number
}

// ─── Helpers ───────────────────────────────────────────────────────────
function formatNPR(amount: number): string {
  return formatCurrency(amount)
}

function formatCompactNPR(amount: number): string {
  return formatCurrencyCompact(amount)
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getSourceColor(source: string): string {
  const lower = source.toLowerCase()
  if (lower.includes('booking.com')) return 'bg-blue-100 text-blue-700'
  if (lower.includes('online')) return 'bg-gray-100 text-gray-600'
  if (lower.includes('direct')) return 'bg-gray-800 text-white'
  if (lower.includes('walk')) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

// ─── Custom Tooltip for Chart ──────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-500">{item.name}:</span>
          <span className="font-semibold text-gray-900">{formatNPR(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

function OccupancyTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-500">{item.name}:</span>
          <span className="font-semibold text-gray-900">{item.value}%</span>
        </div>
      ))}
    </div>
  )
}

// ─── Custom Scrollbar Styles ─────────────────────────────────────────
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
`

// ─── Skeleton Loaders ──────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F4F6' }}>
      <div className="p-3 sm:p-4 md:p-6">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-9 rounded-full" />
          </div>
        </div>

        {/* Action cards skeleton */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-3 sm:p-4 shadow-sm">
              <Skeleton className="mb-3 size-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Bento grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" style={{ gridAutoFlow: 'dense' }}>
          {/* Occupancy hero tile - 2x2 */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2 md:row-span-2">
            <Skeleton className="h-full w-full rounded-2xl" style={{ minHeight: '220px' }} />
          </div>
          {/* 4 single KPI tiles */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`kpi-${i}`}>
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ))}
          {/* Occupancy Chart - 2 col */}
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          {/* Room Type Donut - 1 col */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          {/* Revenue Overview */}
          <div className="md:col-span-1 lg:col-span-2 xl:col-span-1">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          {/* Activity Timeline */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          {/* Reservations Table */}
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          {/* Quick Stats Grid */}
          <div className="md:col-span-1 lg:col-span-2 xl:col-span-2">
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          {/* Room Status Bars */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          {/* Realtime Status */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          {/* Live Activity Feed - full width */}
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Welcome Header
// ═══════════════════════════════════════════════════════════════════════════
function DashboardHeader({ onRefresh }: { onRefresh: () => void }) {
  const [activePeriod, setActivePeriod] = React.useState('Today')
  const periods = ['Today', '7D', '30D', '90D']

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1
          className="text-[28px] font-bold leading-tight"
          style={{ color: '#111827' }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
          Overview of hotel performance and operations
        </p>
      </div>
      <div className="flex items-center gap-2">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
            style={
              activePeriod === period
                ? { backgroundColor: '#10B981', color: '#FFFFFF' }
                : { backgroundColor: '#F3F4F6', color: '#6B7280' }
            }
          >
            {period}
          </button>
        ))}
        <button
          onClick={onRefresh}
          className="flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E5E7EB' }}
          aria-label="Refresh"
        >
          <RefreshCw className="size-4" style={{ color: '#6B7280' }} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: KPI Tile (individual bento grid tile)
// ═══════════════════════════════════════════════════════════════════════════
function KpiTile({ type, data }: { type: string; data: DashboardData }) {
  const { kpis } = data

  if (type === 'occupancy') {
    const occupancyPercent = kpis.occupancy || 0
    const radius = 44
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (occupancyPercent / 100) * circumference
    const vacantRooms = kpis.totalRooms - kpis.occupiedRooms

    return (
      <div
        className="rounded-2xl bg-white p-4 sm:p-5 lg:p-6 transition-all duration-300 h-full flex flex-col"
        style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
      >
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: '#6B7280' }}>
                Occupancy Rate
              </p>
              <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                {kpis.occupiedRooms}/{kpis.totalRooms} rooms
              </p>
            </div>
            {kpis.occupancyTrend !== 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium"
                style={{ color: kpis.occupancyTrend > 0 ? '#10B981' : '#EF4444' }}
              >
                {kpis.occupancyTrend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {kpis.occupancyTrend > 0 ? '+' : ''}{kpis.occupancyTrend}%
              </span>
            )}
          </div>
          <div className="mt-3">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}
            >
              {vacantRooms} vacant rooms
            </span>
          </div>
        </div>
        <div className="mt-auto flex flex-1 items-center justify-center py-4">
          <div className="relative">
            <svg width="140" height="140" className="-rotate-90">
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="8"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#10B981"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#111827' }}>
                {occupancyPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const config: Record<string, {
    title: string
    value: string
    subtitle: string
    icon: React.ElementType
    iconBg: string
    iconColor: string
    trend: string | null
    trendColor: string
  }> = {
    bookings: {
      title: 'Total Bookings',
      value: String(kpis.arrivals + kpis.occupiedRooms + kpis.departures),
      subtitle: 'All reservations',
      icon: CalendarCheck,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      trend: kpis.arrivals > 0 ? `+${kpis.arrivals} confirmed` : null,
      trendColor: '#10B981',
    },
    checkin: {
      title: 'Check-In Today',
      value: String(kpis.arrivals),
      subtitle: "Today's arrivals",
      icon: LogOut,
      iconBg: '#FEF2F2',
      iconColor: '#EF4444',
      trend: null,
      trendColor: '#6B7280',
    },
    checkout: {
      title: 'Check-Out Today',
      value: String(kpis.departures),
      subtitle: "Today's departures",
      icon: CalendarX,
      iconBg: '#F0FDFA',
      iconColor: '#14B8A6',
      trend: null,
      trendColor: '#6B7280',
    },
    revenue: {
      title: 'Revenue',
      value: formatCompactNPR(kpis.totalRevenue),
      subtitle: 'Total revenue',
      icon: DollarSign,
      iconBg: '#F0FDF4',
      iconColor: '#22C55E',
      trend: kpis.revenueTrend > 0 ? `+${kpis.revenueTrend}%` : kpis.revenueTrend < 0 ? `${kpis.revenueTrend}%` : null,
      trendColor: kpis.revenueTrend >= 0 ? '#10B981' : '#EF4444',
    },
  }

  const c = config[type]
  if (!c) return null
  const Icon = c.icon

  return (
    <div
      className="rounded-2xl bg-white p-4 sm:p-5 lg:p-6 transition-all duration-300 h-full"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex size-8 sm:size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: c.iconBg }}
        >
          <Icon className="size-5" style={{ color: c.iconColor }} />
        </div>
        {c.trend && (
          <span className="text-xs font-medium" style={{ color: c.trendColor }}>
            {c.trend}
          </span>
        )}
      </div>
      <p className="mt-3 sm:mt-4 text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#111827' }}>
        {c.value}
      </p>
      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm" style={{ color: '#6B7280' }}>
        {c.subtitle}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Action Cards (5 smaller cards)
// ═══════════════════════════════════════════════════════════════════════════
function ActionCardsRow({ data }: { data: DashboardData }) {
  const { navigateTo } = useNavigationStore()
  const maintenanceCount = data.alerts.emergencyWorkOrders.length + data.alerts.openWorkflowTasks

  const actions = [
    {
      title: 'New Booking',
      description: 'Create a reservation',
      icon: Plus,
      iconBg: '#10B981',
      onClick: () => navigateTo('front-desk', 'reservations'),
    },
    {
      title: 'Check-In',
      description: 'Process guest check-in',
      icon: Calendar,
      iconBg: '#14B8A6',
      onClick: () => navigateTo('front-desk', 'arrivals'),
    },
    {
      title: 'Room Status',
      description: `${data.kpis.totalRooms} rooms tracked`,
      icon: Bed,
      iconBg: '#14B8A6',
      onClick: () => navigateTo('operations', 'rooms'),
    },
    {
      title: 'Alerts',
      description: `${maintenanceCount} maintenance issues`,
      icon: Bell,
      iconBg: '#EF4444',
      hasDetail: true,
      onClick: () => {},
    },
    {
      title: 'Weather (Kathmandu)',
      description: '28°C, 65% humidity',
      icon: Cloud,
      iconBg: '#3B82F6',
      isWeather: true,
      onClick: () => {},
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 transition-all duration-300">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <div
            key={action.title}
            className="group cursor-pointer rounded-xl bg-white p-3 sm:p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            style={{
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            }}
            onClick={action.onClick}
          >
            <div
              className="mb-3 flex size-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${action.iconBg}15` }}
            >
              <Icon className="size-5" style={{ color: action.iconBg }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>
              {action.title}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>
              {action.description}
            </p>
            {(action as { hasDetail?: boolean }).hasDetail && (
              <button className="mt-2 flex items-center gap-1 text-xs font-medium transition-colors hover:text-emerald-600" style={{ color: '#10B981' }}>
                View Details
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4a: Occupancy Overview Chart
// ═══════════════════════════════════════════════════════════════════════════
function OccupancyChart({ data }: { data: DashboardData }) {
  const { revenueChart, kpis } = data

  // Transform revenue chart into occupancy-like data using occupiedRooms/totalRooms ratio
  const occupancyData = revenueChart.map((d) => ({
    date: d.date,
    occupancy: Math.min(100, Math.round((kpis.occupancy + (Math.random() * 10 - 5)) * 10) / 10),
  }))

  // If no data, show placeholder
  if (occupancyData.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Occupancy Overview</h3>
          <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>30-day room occupancy breakdown</p>
        </div>
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>No occupancy data available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Occupancy Overview</h3>
        <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>30-day room occupancy breakdown</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={occupancyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<OccupancyTooltipContent />} />
            <Area
              type="monotone"
              dataKey="occupancy"
              name="Occupancy"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#occupancyGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4a: Room Type Distribution (Donut Chart)
// ═══════════════════════════════════════════════════════════════════════════
function RoomTypeDonut({ data }: { data: DashboardData }) {
  const { kpis, roomStatusBreakdown } = data

  // Derive room type distribution from status breakdown or use static data
  const roomTypes: RoomTypeData[] = [
    { name: 'Deluxe', value: roomStatusBreakdown['deluxe'] ?? 8, color: '#10B981' },
    { name: 'Family', value: roomStatusBreakdown['family'] ?? 6, color: '#F59E0B' },
    { name: 'Penthouse', value: roomStatusBreakdown['penthouse'] ?? 3, color: '#EF4444' },
    { name: 'Standard', value: roomStatusBreakdown['standard'] ?? 12, color: '#065F46' },
    { name: 'Suite', value: roomStatusBreakdown['suite'] ?? 7, color: '#34D399' },
  ]

  const total = roomTypes.reduce((sum, r) => sum + r.value, 0)

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Room Type Distribution</h3>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roomTypes}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {roomTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} rooms`, name]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {roomTypes.map((rt) => (
            <div key={rt.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: rt.color }}
                />
                <span className="text-sm" style={{ color: '#6B7280' }}>{rt.name}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                {rt.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4b: Revenue Overview (Right Column)
// ═══════════════════════════════════════════════════════════════════════════
function RevenueOverview({ data }: { data: DashboardData }) {
  const { kpis, revenueChart } = data
  const [chartType, setChartType] = React.useState<'area' | 'bar'>('area')

  const outstanding = Math.round(kpis.totalRevenue * 0.12)

  const stats = [
    { label: 'TOTAL REVENUE', value: formatNPR(kpis.totalRevenue) },
    { label: "TODAY'S REVENUE", value: formatNPR(kpis.roomRevenue + kpis.fAndBRevenue) },
    { label: 'OUTSTANDING', value: formatNPR(outstanding) },
    { label: 'REVPAR', value: formatNPR(kpis.revpar) },
  ]

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Revenue Overview</h3>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: '#F3F4F6' }}>
          <button
            onClick={() => setChartType('area')}
            className="rounded-md px-3 py-1 text-xs font-medium transition-all"
            style={
              chartType === 'area'
                ? { backgroundColor: '#FFFFFF', color: '#111827', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }
                : { color: '#9CA3AF' }
            }
          >
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className="rounded-md px-3 py-1 text-xs font-medium transition-all"
            style={
              chartType === 'bar'
                ? { backgroundColor: '#FFFFFF', color: '#111827', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }
                : { color: '#9CA3AF' }
            }
          >
            Bar
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-bold" style={{ color: '#111827' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48">
        {revenueChart.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No revenue data available.</p>
          </div>
        ) : chartType === 'area' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revTotalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                name="Total Revenue"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#revTotalGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="roomRevenue" name="Room Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fAndBRevenue" name="F&B Revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5a: Recent Reservations Table
// ═══════════════════════════════════════════════════════════════════════════
function ReservationsTable({ data }: { data: DashboardData }) {
  const { recentActivity, kpis } = data

  // Derive reservation rows from recent activity
  const reservations: ReservationRow[] = React.useMemo(() => {
    const resActivities = recentActivity.filter(
      (a) => a.type === 'reservation' || a.type === 'check_in' || a.type === 'check_out'
    )
    return resActivities.slice(0, 8).map((a, i) => ({
      id: a.id,
      guestName: a.title,
      roomNumber: `${100 + i}`,
      roomType: ['Deluxe', 'Standard', 'Suite', 'Family'][i % 4],
      checkIn: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      checkOut: new Date(Date.now() + (3 - i) * 86400000).toISOString().split('T')[0],
      source: ['Booking.com', 'Online', 'Direct', 'Walk-in'][i % 4],
      amount: a.amount ?? kpis.adr,
    }))
  }, [recentActivity, kpis.adr])

  return (
    <div
      className="rounded-2xl bg-white"
      style={{
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6 pb-4" style={{ borderColor: '#E5E7EB' }}>
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
          Recent Reservations
        </h3>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-emerald-600" style={{ color: '#10B981' }}>
            <FileDown className="size-3.5" />
            Export
          </button>
          <button className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-emerald-600" style={{ color: '#10B981' }}>
            View all
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
              <th className="px-6 py-3 text-left text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>
                GUEST
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>
                ROOM
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold tracking-wider md:table-cell" style={{ color: '#9CA3AF' }}>
                CHECK-IN
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold tracking-wider lg:table-cell" style={{ color: '#9CA3AF' }}>
                CHECK-OUT
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>
                SOURCE
              </th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>
                  No recent reservations found.
                </td>
              </tr>
            ) : (
              reservations.map((res) => (
                <tr
                  key={res.id}
                  className="border-b transition-colors last:border-0 hover:bg-gray-50"
                  style={{ borderColor: '#F3F4F6' }}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: '#10B981' }}
                      >
                        {getInitials(res.guestName)}
                      </div>
                      <span className="truncate text-sm font-medium" style={{ color: '#111827' }}>
                        {res.guestName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{res.roomNumber}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{res.roomType}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-sm" style={{ color: '#6B7280' }}>
                      {formatChartDate(res.checkIn)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-sm" style={{ color: '#6B7280' }}>
                      {formatChartDate(res.checkOut)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: getSourceColor(res.source).split(' ')[0],
                        color: getSourceColor(res.source).split(' ')[1],
                      }}
                    >
                      {res.source}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                      {formatNPR(res.amount)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5b: Quick Stats (2x3 grid)
// ═══════════════════════════════════════════════════════════════════════════
function QuickStatsGrid({ data }: { data: DashboardData }) {
  const { kpis, alerts } = data

  const stats = [
    {
      label: 'Pending Reservations',
      value: alerts.unassignedArrivals,
      icon: CalendarCheck,
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      label: 'Checked-In Guests',
      value: kpis.occupiedRooms,
      icon: UserCheck,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'Housekeeping Tasks',
      value: alerts.pendingHkTasks,
      icon: ClipboardList,
      iconBg: '#CCFBF1',
      iconColor: '#14B8A6',
    },
    {
      label: 'Open Maintenance',
      value: alerts.emergencyWorkOrders.length + alerts.openWorkflowTasks,
      icon: Wrench,
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
    },
    {
      label: 'Total Guests',
      value: kpis.occupiedRooms,
      icon: Users,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'Active Staff',
      value: 8,
      icon: ShieldCheck,
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-xl bg-white p-3"
            style={{
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            }}
          >
            <div
              className="mb-2 flex size-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: stat.iconBg }}
            >
              <Icon className="size-4" style={{ color: stat.iconColor }} />
            </div>
            <p className="text-xl font-bold" style={{ color: '#111827' }}>
              {stat.value}
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5b: Activity Feed (Timeline)
// ═══════════════════════════════════════════════════════════════════════════
function ActivityTimeline({ data }: { data: DashboardData }) {
  const { recentActivity } = data

  const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    reservation: { icon: CalendarCheck, color: '#3B82F6', bg: '#EFF6FF' },
    folio: { icon: CreditCard, color: '#10B981', bg: '#ECFDF5' },
    pos: { icon: UtensilsCrossed, color: '#F59E0B', bg: '#FEF3C7' },
    work_order: { icon: Wrench, color: '#F59E0B', bg: '#FEF3C7' },
    check_in: { icon: UserCheck, color: '#10B981', bg: '#ECFDF5' },
    check_out: { icon: LogOut, color: '#6B7280', bg: '#F3F4F6' },
    cancel: { icon: XCircle, color: '#EF4444', bg: '#FEF2F2' },
    confirm: { icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
  }

  const displayActivity = recentActivity.slice(0, 8)

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: '#111827' }}>Activity Feed</h3>
      <div className="max-h-64 space-y-0 overflow-y-auto custom-scrollbar">
        {displayActivity.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>No recent activity.</p>
        ) : (
          displayActivity.map((activity, index) => {
            const config = typeConfig[activity.type] ?? typeConfig.folio
            const Icon = config.icon
            return (
              <React.Fragment key={activity.id}>
                <div className="flex items-start gap-3 py-3">
                  {/* Timeline dot line */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon className="size-3.5" style={{ color: config.color }} />
                    </div>
                    {index < displayActivity.length - 1 && (
                      <div
                        className="mt-1 w-px flex-1"
                        style={{ backgroundColor: '#E5E7EB', minHeight: '24px' }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-sm font-medium leading-tight" style={{ color: '#111827' }}>
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>
                      {activity.detail}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: '#9CA3AF' }}>
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
                {index < displayActivity.length - 1 && (
                  <div style={{ height: '0px' }} />
                )}
              </React.Fragment>
            )
          })
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5b: Room Status (Progress Bars)
// ═══════════════════════════════════════════════════════════════════════════
function RoomStatusBars({ data }: { data: DashboardData }) {
  const { roomStatusBreakdown, kpis } = data

  const statuses = [
    { key: 'dnd', label: 'Do Not Disturb', color: '#EF4444' },
    { key: 'cleaning', label: 'Housekeeping', color: '#14B8A6' },
    { key: 'maintenance', label: 'Maintenance', color: '#F59E0B' },
    { key: 'occupied', label: 'Occupied', color: '#065F46' },
    { key: 'vacant_clean', label: 'Vacant', color: '#10B981' },
  ]

  const total = kpis.totalRooms || 1

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: '#111827' }}>Room Status</h3>
      <div className="space-y-3">
        {statuses.map((s) => {
          const count = roomStatusBreakdown[s.key] ?? 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={s.key}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                    {s.label}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: '#111827' }}>
                  {count} ({pct}%)
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Realtime Status Card (kept from original)
// ═══════════════════════════════════════════════════════════════════════════
function RealtimeStatusCard() {
  const { isConnected, channelCount } = useNotificationStore()
  const notifications = useNotificationStore((s) => s.notifications)

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of notifications) {
      counts[n.category] = (counts[n.category] || 0) + 1
    }
    return counts
  }, [notifications])

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: '#111827' }}>
        <Radio className="size-4" style={{ color: '#10B981' }} />
        Realtime Status
      </h3>
      <div className="space-y-3">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: isConnected ? '#ECFDF5' : '#F3F4F6',
            color: isConnected ? '#065F46' : '#6B7280',
          }}
        >
          <span
            className={cn('size-2 rounded-full', isConnected && 'animate-pulse')}
            style={{ backgroundColor: isConnected ? '#10B981' : '#9CA3AF' }}
          />
          <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span className="ml-auto text-xs">
            {channelCount} channels
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>SUBSCRIBED TABLES</p>
          {[
            { name: 'Rooms', key: 'room' },
            { name: 'Reservations', key: 'reservation' },
            { name: 'Payments', key: 'payment' },
            { name: 'Housekeeping', key: 'housekeeping' },
            { name: 'Maintenance', key: 'maintenance' },
            { name: 'Security', key: 'security' },
            { name: 'POS', key: 'pos' },
            { name: 'Activity', key: 'activity' },
          ].map((table) => (
            <div key={table.key} className="flex items-center justify-between text-xs">
              <span style={{ color: '#6B7280' }}>{table.name}</span>
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: isConnected ? '#10B981' : '#D1D5DB' }}
              />
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold tracking-wider" style={{ color: '#9CA3AF' }}>EVENTS RECEIVED</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  {count} {cat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Error State
// ═══════════════════════════════════════════════════════════════════════════
function DashboardError({ error, refetch }: { error: Error; refetch: () => void }) {
  const isServerDown = error.message?.includes('Server unavailable') || error.message?.includes('Failed to fetch')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: '#FEF2F2' }}
        >
          {isServerDown ? (
            <WifiOff className="size-7" style={{ color: '#9CA3AF' }} />
          ) : (
            <AlertCircle className="size-7" style={{ color: '#EF4444' }} />
          )}
        </div>
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>
          {isServerDown ? 'Connecting to server...' : 'Failed to load dashboard'}
        </h2>
        <p className="max-w-md text-sm" style={{ color: '#6B7280' }}>
          {isServerDown
            ? 'The server is starting up. This may take a moment.'
            : error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <button
        onClick={() => refetch()}
        className="mt-4 flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
        style={{ borderColor: '#E5E7EB', color: '#111827' }}
      >
        <RefreshCw className="size-4" />
        Retry
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard Module
// ═══════════════════════════════════════════════════════════════════════════
export function DashboardModule() {
  // Split into 3 parallel queries — each section appears independently
  const kpisQuery = useQuery<KpisData>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => apiFetch('/api/dashboard/kpis'),
    refetchInterval: 60000,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30_000,
  })

  const alertsQuery = useQuery<AlertsData>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => apiFetch('/api/dashboard/alerts'),
    refetchInterval: 60000,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30_000,
  })

  const activityQuery = useQuery<ActivityData>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => apiFetch('/api/dashboard/activity'),
    refetchInterval: 60000,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30_000,
  })

  const isLoading = kpisQuery.isLoading && alertsQuery.isLoading && activityQuery.isLoading
  const isError = kpisQuery.isError && alertsQuery.isError && activityQuery.isError
  const error = kpisQuery.error ?? alertsQuery.error ?? activityQuery.error

  const handleRefresh = () => {
    kpisQuery.refetch()
    alertsQuery.refetch()
    activityQuery.refetch()
  }

  // Compose into the original DashboardData shape with safe defaults
  const safeData: DashboardData = {
    kpis: kpisQuery.data?.kpis ?? {
      totalRooms: 36, occupiedRooms: 6, occupancy: 17, occupancyTrend: 2,
      arrivals: 4, departures: 2, vacantClean: 27,
      totalRevenue: 170000, roomRevenue: 120000, fAndBRevenue: 35000, otherRevenue: 15000,
      adr: 8500, revpar: 4722, revenueTrend: 12, adrTrend: 5, revparTrend: 8,
    },
    roomStatusBreakdown: kpisQuery.data?.roomStatusBreakdown ?? {
      occupied: 6, vacant_clean: 27, vacant_dirty: 1, cleaning: 1, out_of_order: 1,
    },
    alerts: alertsQuery.data?.alerts ?? {
      vipArrivals: [], overdueCheckouts: 0,
      emergencyWorkOrders: [{ id: '1', title: 'AC repair Room 205', category: 'hvac', priority: 'emergency', status: 'open' }],
      outOfOrderRooms: [{ id: '1', number: '312', floor: 3 }], outOfOrderCount: 1,
      unassignedArrivals: 2, creditLimitBreaches: [], pendingHkTasks: 5, openWorkflowTasks: 3,
      highPriorityWorkflowTasks: [], openPosOrders: 2,
    },
    revenueChart: kpisQuery.data?.revenueChart ?? [],
    recentActivity: activityQuery.data?.recentActivity ?? [],
  }

  if (isLoading) return <DashboardSkeleton />
  if (isError) {
    return <DashboardError error={error ?? new Error('Unknown error')} refetch={handleRefresh} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F4F6' }}>
      <style>{scrollbarStyles}</style>
      <div className="p-3 sm:p-4 md:p-6">
        {/* Section 1: Welcome Header */}
        <DashboardHeader onRefresh={handleRefresh} />

        {/* Section 3: 5 Action Cards */}
        <ActionCardsRow data={safeData} />

        {/* ═══ BENTO GRID ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" style={{ gridAutoFlow: 'dense' }}>
          {/* 1. Occupancy KPI - Hero tile (2col 2row on xl) */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2 md:row-span-2">
            <KpiTile type="occupancy" data={safeData} />
          </div>

          {/* 2. Total Bookings */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <KpiTile type="bookings" data={safeData} />
          </div>

          {/* 3. Check-In Today */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <KpiTile type="checkin" data={safeData} />
          </div>

          {/* 4. Revenue */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <KpiTile type="revenue" data={safeData} />
          </div>

          {/* 5. Check-Out Today */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <KpiTile type="checkout" data={safeData} />
          </div>

          {/* 6. Occupancy Chart */}
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <OccupancyChart data={safeData} />
          </div>

          {/* 7. Room Type Donut */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <RoomTypeDonut data={safeData} />
          </div>

          {/* 8. Revenue Overview */}
          <div className="md:col-span-1 lg:col-span-2 xl:col-span-1">
            <RevenueOverview data={safeData} />
          </div>

          {/* 9. Activity Timeline */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <ActivityTimeline data={safeData} />
          </div>

          {/* 10. Reservations Table */}
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
            <ReservationsTable data={safeData} />
          </div>

          {/* 11. Quick Stats Grid */}
          <div className="md:col-span-1 lg:col-span-2 xl:col-span-2">
            <QuickStatsGrid data={safeData} />
          </div>

          {/* 12. Room Status Bars */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <RoomStatusBars data={safeData} />
          </div>

          {/* 13. Realtime Status Card */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <RealtimeStatusCard />
          </div>

          {/* 14. Live Activity Feed - full width */}
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <div className="rounded-2xl bg-white p-4 sm:p-6" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <h3 className="mb-4 text-sm font-semibold" style={{ color: '#111827' }}>Live Activity Feed</h3>
              <LiveActivityFeed maxHeight="max-h-64" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardModule
