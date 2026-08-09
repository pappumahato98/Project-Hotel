'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, TrendingUp, TrendingDown, BedDouble, DollarSign,
  CalendarCheck, CalendarX, ShoppingCart, ClipboardList,
  AlertTriangle, Star, Clock, ArrowRight, UserCheck, CreditCard,
  Wrench, UtensilsCrossed, FileText, Moon, Coffee, AlertCircle,
  PartyPopper, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  LogOut, WifiOff, RefreshCw, Radio, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, CheckCircle2, Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Types ─────────────────────────────────────────────────────────────
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

interface DashboardData {
  kpis: KpisData['kpis']
  roomStatusBreakdown: Record<string, number>
  alerts: AlertsData['alerts']
  revenueChart: KpisData['revenueChart']
  recentActivity: ActivityData['recentActivity']
}

// ─── Helpers ───────────────────────────────────────────────────────────
function formatNum(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
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

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Tooltip for Stacked Bar Chart ─────────────────────────────────────
function OccupancyTooltipContent({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-md">
      <p className="mb-1.5 text-xs font-semibold text-[#111827]">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <div className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-[#6B7280]">{item.name}:</span>
          <span className="font-semibold text-[#111827]">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────
function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-9 w-36" />
      <Skeleton className="mt-2 h-3 w-48" />
    </div>
  )
}

// ─── 1. KPI Cards Row (Fixoria Style) ───────────────────────────────────
function KpiCards({ data }: { data: DashboardData }) {
  const { kpis } = data
  const totalBookings = kpis.arrivals + kpis.departures + kpis.occupiedRooms

  const cards = [
    {
      title: 'Total Booking',
      value: formatNum(totalBookings),
      subtitle: 'Total Booking last 365 days',
      trend: kpis.occupancyTrend,
      icon: Users,
      isPositive: true,
    },
    {
      title: 'Check In',
      value: formatNum(kpis.arrivals),
      subtitle: 'Check In last 365 days',
      trend: kpis.occupancyTrend,
      icon: CheckCircle2,
      isPositive: true,
    },
    {
      title: 'Check Out',
      value: formatNum(kpis.departures),
      subtitle: 'Check Out last 365 days',
      trend: -15,
      icon: LogOut,
      isPositive: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-xl border border-[#E5E7EB] bg-white p-5 transition-shadow hover:shadow-md"
            style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg',
                    card.isPositive ? 'bg-emerald-50' : 'bg-red-50'
                  )}
                >
                  <Icon className={cn('size-4', card.isPositive ? 'text-emerald-600' : 'text-red-500')} />
                </div>
                <span className="text-sm font-medium text-[#6B7280]">{card.title}</span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  card.isPositive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-500'
                )}
              >
                {card.isPositive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {card.isPositive ? '+' : ''}{Math.abs(card.trend)}%
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#111827]">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">{card.subtitle}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── 2. Occupancy Stacked Bar Chart ─────────────────────────────────────
function OccupancyChart({ data }: { data: DashboardData }) {
  const { roomStatusBreakdown, kpis } = data
  const [filter, setFilter] = React.useState('7d')

  const available = (roomStatusBreakdown['vacant_clean'] ?? 0) + (roomStatusBreakdown['inspected'] ?? 0)
  const occupied = roomStatusBreakdown['occupied'] ?? 0
  const notReady =
    (roomStatusBreakdown['vacant_dirty'] ?? 0) +
    (roomStatusBreakdown['cleaning'] ?? 0) +
    (roomStatusBreakdown['out_of_order'] ?? 0)

  const chartData = data.revenueChart.map((entry) => {
    const total = kpis.totalRooms || 1
    const occRate = occupied / total
    const availRate = available / total
    const notReadyRate = notReady / total
    return {
      date: formatChartDate(entry.date),
      Available: Math.round(availRate * total + (Math.random() * 2 - 1)),
      Occupied: Math.round(occRate * total + (Math.random() * 2 - 1)),
      'Not Ready': Math.round(notReadyRate * total),
    }
  })

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-xl border border-[#E5E7EB] bg-white p-5"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#111827]">Occupancy</h3>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger size="sm" className="w-28 h-8 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex h-64 items-center justify-center text-sm text-[#6B7280]">
          No occupancy data available yet.
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-[#E5E7EB] bg-white p-5"
      style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">Occupancy</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-[#D1D5DB]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-[#22C55E]" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-[#15803D]" />
              <span>Not Ready</span>
            </div>
          </div>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger size="sm" className="w-28 h-8 text-xs rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<OccupancyTooltipContent />} cursor={{ fill: 'rgba(249,250,251,0.6)' }} />
            <Bar dataKey="Available" stackId="a" fill="#D1D5DB" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Occupied" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Not Ready" stackId="a" fill="#15803D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── 3. Revenue Overview (Fixoria Style) ────────────────────────────────
function RevenueOverview({ data }: { data: DashboardData }) {
  const { kpis } = data
  const offlineRevenue = kpis.roomRevenue
  const platformRevenue = kpis.fAndBRevenue + kpis.otherRevenue
  const total = kpis.totalRevenue || 1

  const channels = [
    { name: 'Direct Booking', pct: Math.round((kpis.roomRevenue / total) * 100), color: '#22C55E' },
    { name: 'Walk-in', pct: Math.round(((kpis.fAndBRevenue * 0.6) / total) * 100), color: '#10B981' },
    { name: 'Online OTA', pct: Math.round(((kpis.fAndBRevenue * 0.4) / total) * 100), color: '#6EE7B7' },
    { name: 'Corporate', pct: Math.round(((kpis.otherRevenue * 0.5) / total) * 100), color: '#34D399' },
    { name: 'Others', pct: Math.round(((kpis.otherRevenue * 0.5) / total) * 100), color: '#A7F3D0' },
  ]

  return (
    <div
      className="rounded-xl border border-[#E5E7EB] bg-white p-5"
      style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
    >
      <h3 className="text-sm font-semibold text-[#111827]">Revenue Overview</h3>
      <div className="mt-4">
        <p className="text-3xl font-bold text-[#111827]">{formatCurrency(kpis.totalRevenue)}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {kpis.revenueTrend >= 0 ? (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="size-3" />
              +{Math.abs(kpis.revenueTrend)}%
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
              <ArrowDownRight className="size-3" />
              {kpis.revenueTrend}%
            </span>
          )}
          <span className="text-xs text-[#6B7280]">vs last period</span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-[#F9FAFB] p-3">
          <p className="text-xs text-[#6B7280]">Offline Revenue</p>
          <p className="mt-1 text-sm font-bold text-[#111827]">{formatCurrency(offlineRevenue)}</p>
          <Progress value={(offlineRevenue / total) * 100} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-lg bg-[#F9FAFB] p-3">
          <p className="text-xs text-[#6B7280]">Platform Revenue</p>
          <p className="mt-1 text-sm font-bold text-[#111827]">{formatCurrency(platformRevenue)}</p>
          <Progress value={(platformRevenue / total) * 100} className="mt-2 h-1.5" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <p className="text-xs font-medium text-[#6B7280]">Channel Breakdown</p>
        {channels.map((ch) => (
          <div key={ch.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827] font-medium">{ch.name}</span>
              <span className="text-[#6B7280]">{ch.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ch.pct}%`, backgroundColor: ch.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 4. Recent Arrivals Table ───────────────────────────────────────────
function RecentArrivals({ data }: { data: DashboardData }) {
  const { recentActivity, alerts } = data

  const arrivals = React.useMemo(() => {
    const checkinActivity = recentActivity
      .filter((a) => a.type === 'check_in')
      .map((a) => ({
        id: a.id,
        roomNumber: a.detail.match(/Room\s+(\S+)/i)?.[1] || '-',
        guestName: a.title.replace(/Check[- ]?in/i, '').trim() || 'Guest',
        time: a.timestamp,
      }))

    const vipArrivals = alerts.vipArrivals.map((v) => ({
      id: v.id,
      roomNumber: v.roomNumber || '-',
      guestName: v.guestName,
      time: v.checkIn,
      isVip: true,
    }))

    return [...vipArrivals, ...checkinActivity].slice(0, 8)
  }, [recentActivity, alerts.vipArrivals])

  return (
    <div
      className="rounded-xl border border-[#E5E7EB] bg-white"
      style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#111827]">Recent Arrivals</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-[#6B7280] hover:text-[#111827]">
          View All
          <ArrowRight className="ml-1 size-3" />
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#6B7280]">
            <Users className="size-8 opacity-30" />
            <p className="mt-2 text-sm">No recent arrivals</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Room</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Guest</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Time</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Action</th>
              </tr>
            </thead>
            <tbody>
              {arrivals.map((arrival) => (
                <tr
                  key={arrival.id}
                  className="border-b border-[#F3F4F6] last:border-0 transition-colors hover:bg-[#F9FAFB]"
                >
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {arrival.roomNumber}
                    </span>
                    {arrival.isVip && (
                      <Star className="ml-1.5 inline size-3 text-amber-400" />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                          {getInitials(arrival.guestName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-[#111827]">{arrival.guestName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-[#6B7280]">{getTimeAgo(arrival.time)}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="size-4 text-[#6B7280]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Reservation</DropdownMenuItem>
                        <DropdownMenuItem>Assign Room</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── 5. Calendar Widget ─────────────────────────────────────────────────
function CalendarWidget({ data }: { data: DashboardData }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [activeTab, setActiveTab] = React.useState('all')

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const roomCards = React.useMemo(() => {
    const rooms: Array<{
      id: string
      roomNumber: string
      guestName: string
      status: 'occupied' | 'checking-in' | 'checking-out'
      checkIn: string
      checkOut: string
    }> = []

    data.alerts.vipArrivals.forEach((v) => {
      rooms.push({
        id: v.id,
        roomNumber: v.roomNumber || 'TBD',
        guestName: v.guestName,
        status: 'checking-in',
        checkIn: v.checkIn,
        checkOut: '',
      })
    })

    const checkinActs = data.recentActivity.filter((a) => a.type === 'check_in').slice(0, 3)
    checkinActs.forEach((a, idx) => {
      const roomNum = a.detail.match(/Room\s+(\S+)/i)?.[1] || `${101 + idx}`
      rooms.push({
        id: a.id,
        roomNumber: roomNum,
        guestName: a.title.replace(/Check[- ]?in[:\s]*/i, '').trim() || 'Guest',
        status: 'occupied',
        checkIn: a.timestamp,
        checkOut: '',
      })
    })

    const checkoutActs = data.recentActivity.filter((a) => a.type === 'check_out').slice(0, 2)
    checkoutActs.forEach((a, idx) => {
      const roomNum = a.detail.match(/Room\s+(\S+)/i)?.[1] || `${201 + idx}`
      rooms.push({
        id: `co-${a.id}`,
        roomNumber: roomNum,
        guestName: a.title.replace(/Check[- ]?out[:\s]*/i, '').trim() || 'Guest',
        status: 'checking-out',
        checkIn: '',
        checkOut: a.timestamp,
      })
    })

    return rooms
  }, [data.recentActivity, data.alerts.vipArrivals])

  const filteredRooms = activeTab === 'all'
    ? roomCards
    : roomCards.filter((r) => r.status === activeTab)

  return (
    <div
      className="rounded-xl border border-[#E5E7EB] bg-white"
      style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
    >
      <div className="border-b border-[#E5E7EB] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#111827]">Calendar</h3>
      </div>
      {/* Mini Calendar */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <ChevronLeft className="size-4 text-[#6B7280]" />
          </button>
          <span className="text-sm font-semibold text-[#111827]">{monthName}</span>
          <button
            onClick={nextMonth}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <ChevronRight className="size-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-[10px] font-medium text-[#6B7280] py-1">{d}</div>
          ))}
          {blanks.map((b) => (
            <div key={`b-${b}`} />
          ))}
          {days.map((day) => (
            <button
              key={day}
              className={cn(
                'flex size-7 items-center justify-center rounded-lg text-xs transition-colors mx-auto',
                isToday(day)
                  ? 'bg-[#22C55E] text-white font-semibold'
                  : 'text-[#111827] hover:bg-[#F3F4F6]'
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <Separator className="mx-5 my-2" />
      {/* Room Filter Tabs */}
      <div className="px-5 pt-1 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-7 w-full">
            <TabsTrigger value="all" className="text-[10px] px-2.5 h-5">All</TabsTrigger>
            <TabsTrigger value="occupied" className="text-[10px] px-2.5 h-5">Occupied</TabsTrigger>
            <TabsTrigger value="checking-in" className="text-[10px] px-2.5 h-5">Check-in</TabsTrigger>
            <TabsTrigger value="checking-out" className="text-[10px] px-2.5 h-5">Check-out</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {/* Room Cards */}
      <div className="max-h-72 overflow-y-auto px-5 pb-4 space-y-2.5">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-[#6B7280]">
            <BedDouble className="size-6 opacity-30" />
            <p className="mt-1 text-xs">No rooms to display</p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className="rounded-lg border border-[#E5E7EB] p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-md px-1.5 py-0 text-[10px] font-semibold border-0',
                      room.status === 'occupied' && 'bg-emerald-100 text-emerald-700',
                      room.status === 'checking-in' && 'bg-blue-100 text-blue-700',
                      room.status === 'checking-out' && 'bg-orange-100 text-orange-700',
                    )}
                  >
                    {room.roomNumber}
                  </Badge>
                  <span className="text-xs font-medium text-[#111827]">{room.guestName}</span>
                </div>
              </div>
              <div className="mt-2.5">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div
                    className={cn(
                      'absolute left-[10%] h-full rounded-full transition-all',
                      room.status === 'occupied' && 'w-[60%] bg-[#22C55E]',
                      room.status === 'checking-in' && 'w-[15%] bg-[#3B82F6]',
                      room.status === 'checking-out' && 'w-[85%] bg-[#F97316]',
                    )}
                  />
                  <div
                    className={cn(
                      'absolute size-2.5 rounded-full border-2 border-white -top-0.5 transition-all',
                      room.status === 'occupied' && 'left-[65%] bg-[#22C55E]',
                      room.status === 'checking-in' && 'left-[20%] bg-[#3B82F6]',
                      room.status === 'checking-out' && 'left-[90%] bg-[#F97316]',
                    )}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>{room.checkIn ? formatChartDate(room.checkIn) : '-'}</span>
                <span>{room.checkOut ? formatChartDate(room.checkOut) : '-'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── 6. Operational Alerts (Redesigned) ──────────────────────────────────
function OperationalAlerts({ data }: { data: DashboardData }) {
  const { alerts } = data
  const hasAlerts =
    alerts.emergencyWorkOrders.length > 0 ||
    alerts.vipArrivals.length > 0 ||
    alerts.outOfOrderCount > 0 ||
    alerts.unassignedArrivals > 0 ||
    alerts.creditLimitBreaches.length > 0 ||
    alerts.overdueCheckouts > 0 ||
    alerts.highPriorityWorkflowTasks.length > 0

  if (!hasAlerts) return null

  const alertItems: Array<{
    id: string
    icon: React.ElementType
    iconBg: string
    iconColor: string
    title: string
    description: string
    borderColor: string
    bgColor: string
  }> = []

  if (alerts.emergencyWorkOrders.length > 0) {
    alertItems.push({
      id: 'emergency', icon: Wrench, iconBg: 'bg-red-100', iconColor: 'text-red-600',
      title: `${alerts.emergencyWorkOrders.length} Emergency Work Order${alerts.emergencyWorkOrders.length > 1 ? 's' : ''}`,
      description: alerts.emergencyWorkOrders.map((wo) => wo.title).join(' \u00B7 '),
      borderColor: 'border-l-red-500', bgColor: 'bg-red-50/50',
    })
  }
  if (alerts.vipArrivals.length > 0) {
    alertItems.push({
      id: 'vip', icon: Star, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      title: `${alerts.vipArrivals.length} VIP Arrival${alerts.vipArrivals.length > 1 ? 's' : ''} Today`,
      description: alerts.vipArrivals.map((v) => v.guestName).join(' \u00B7 '),
      borderColor: 'border-l-amber-500', bgColor: 'bg-amber-50/50',
    })
  }
  if (alerts.outOfOrderCount > 0) {
    alertItems.push({
      id: 'ooo', icon: AlertCircle, iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
      title: `${alerts.outOfOrderCount} Room${alerts.outOfOrderCount > 1 ? 's' : ''} Out of Order`,
      description: alerts.outOfOrderRooms.map((r) => `Room ${r.number} (Floor ${r.floor})`).join(' \u00B7 '),
      borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50/50',
    })
  }
  if (alerts.unassignedArrivals > 0) {
    alertItems.push({
      id: 'unassigned', icon: CalendarCheck, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600',
      title: `${alerts.unassignedArrivals} Unassigned Arrival${alerts.unassignedArrivals > 1 ? 's' : ''}`,
      description: 'Confirmed reservations without room assignments.',
      borderColor: 'border-l-yellow-500', bgColor: 'bg-yellow-50/50',
    })
  }
  if (alerts.creditLimitBreaches.length > 0) {
    alertItems.push({
      id: 'credit', icon: CreditCard, iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
      title: `${alerts.creditLimitBreaches.length} Credit Limit Breach${alerts.creditLimitBreaches.length > 1 ? 'es' : ''}`,
      description: alerts.creditLimitBreaches.map((b) => `${b.guestName}${b.roomNumber ? ` (${b.roomNumber})` : ''}`).join(' \u00B7 '),
      borderColor: 'border-l-rose-500', bgColor: 'bg-rose-50/50',
    })
  }
  if (alerts.highPriorityWorkflowTasks.length > 0) {
    alertItems.push({
      id: 'workflow', icon: ClipboardList, iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
      title: `${alerts.highPriorityWorkflowTasks.length} High-Priority Task${alerts.highPriorityWorkflowTasks.length > 1 ? 's' : ''}`,
      description: alerts.highPriorityWorkflowTasks.slice(0, 3).map((w) => w.title).join(' \u00B7 '),
      borderColor: 'border-l-violet-500', bgColor: 'bg-violet-50/50',
    })
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-4">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-[#111827]">Operational Alerts</h3>
        <Badge variant="outline" className="ml-auto h-5 px-2 text-[10px] rounded-full border-amber-200 bg-amber-50 text-amber-700">
          {alertItems.length}
        </Badge>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-2">
        {alertItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className={cn('flex items-start gap-3 rounded-lg border-l-4 p-3', item.borderColor, item.bgColor)}
            >
              <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', item.iconBg)}>
                <Icon className={cn('size-3.5', item.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#111827]">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-[#6B7280] line-clamp-2">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 7. Recent Activity Feed ────────────────────────────────────────────
function RecentActivityFeed({ data }: { data: DashboardData }) {
  const { recentActivity } = data
  const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    reservation: { icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
    folio: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    pos: { icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-100' },
    work_order: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100' },
    check_in: { icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-100' },
    check_out: { icon: LogOut, color: 'text-rose-600', bg: 'bg-rose-100' },
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#111827]">Activity Feed</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-[#6B7280] hover:text-[#111827]">
          View All
          <ArrowRight className="ml-1 size-3" />
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#6B7280]">
            <Clock className="size-8 opacity-30" />
            <p className="mt-2 text-sm">No recent activity.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {recentActivity.slice(0, 10).map((activity) => {
              const config = typeConfig[activity.type] ?? typeConfig.folio
              const Icon = config.icon
              return (
                <div key={activity.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#F9FAFB]">
                  <div className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', config.bg)}>
                    <Icon className={cn('size-3.5', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111827] leading-tight truncate">{activity.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6B7280]">
                      <span className="truncate">{activity.detail}</span>
                      {activity.amount !== undefined && (
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] rounded-md">
                          {formatCurrency(activity.amount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#6B7280]">{getTimeAgo(activity.timestamp)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 8. Quick Actions ───────────────────────────────────────────────────
function QuickActions() {
  const { navigateTo } = useNavigationStore()
  const actions = [
    { label: 'New Reservation', icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100', onClick: () => navigateTo('front-desk', 'reservations') },
    { label: 'Walk-in Check-in', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100', onClick: () => navigateTo('front-desk', 'arrivals') },
    { label: 'Post Charge', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100', onClick: () => navigateTo('front-desk', 'folio') },
    { label: 'Night Audit', icon: Moon, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100', onClick: () => navigateTo('operations', 'night-audit') },
  ]

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h3 className="text-sm font-semibold text-[#111827] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              className={cn('flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:shadow-sm', action.bg)}
              onClick={action.onClick}
            >
              <Icon className={cn('size-5', action.color)} />
              <span className="text-[11px] font-medium text-[#111827]">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── 9. Realtime Status Card ────────────────────────────────────────────
function RealtimeStatusCard() {
  const { isConnected, channelCount } = useNotificationStore()
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Radio className="size-4 text-[#6B7280]" />
        <h3 className="text-sm font-semibold text-[#111827]">Realtime</h3>
      </div>
      <div className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'
      )}>
        <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
        <span className="text-xs font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
        <span className="ml-auto text-[10px] text-[#6B7280]">{channelCount} channels</span>
      </div>
    </div>
  )
}

// ─── 10. Room Status Summary ────────────────────────────────────────────
function RoomStatusSummary({ data }: { data: DashboardData }) {
  const { roomStatusBreakdown, kpis } = data
  const statuses = [
    { key: 'vacant_clean', label: 'Available', color: '#22C55E' },
    { key: 'occupied', label: 'Occupied', color: '#3B82F6' },
    { key: 'vacant_dirty', label: 'Dirty', color: '#F59E0B' },
    { key: 'cleaning', label: 'Cleaning', color: '#F97316' },
    { key: 'out_of_order', label: 'OOO', color: '#EF4444' },
    { key: 'inspected', label: 'Inspected', color: '#8B5CF6' },
  ]

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#111827]">Room Status</h3>
        <span className="text-xs text-[#6B7280]">{kpis.totalRooms} total</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const count = roomStatusBreakdown[s.key] ?? 0
          if (count === 0) return null
          const pct = kpis.totalRooms > 0 ? Math.round((count / kpis.totalRooms) * 100) : 0
          return (
            <div key={s.key} className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-2.5 py-1">
              <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] font-medium text-[#111827]">{count}</span>
              <span className="text-[10px] text-[#6B7280]">{s.label} ({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Loading State ──────────────────────────────────────────────────────
function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 overflow-y-auto bg-[#F9FAFB]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-64" />
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-48" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────────
function DashboardError({ error, refetch }: { error: Error; refetch: () => void }) {
  const isServerDown = error.message?.includes('Server unavailable') || error.message?.includes('Failed to fetch')
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 overflow-y-auto bg-[#F9FAFB]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#F3F4F6]">
          {isServerDown ? <WifiOff className="size-6 text-[#6B7280]" /> : <AlertCircle className="size-6 text-[#EF4444]" />}
        </div>
        <h3 className="text-base font-semibold text-[#111827]">
          {isServerDown ? 'Connecting to server...' : 'Failed to load dashboard'}
        </h3>
        <p className="text-sm text-[#6B7280] max-w-md">
          {isServerDown
            ? 'The server is starting up. This may take a moment.'
            : error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-lg">
        <RefreshCw className="size-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

// ─── Main Dashboard Module ──────────────────────────────────────────────
export function DashboardModule() {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/api/dashboard'),
    refetchInterval: 60000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 30_000,
  })

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
      unassignedArrivals: 0, creditLimitBreaches: [], pendingHkTasks: 0,
      openWorkflowTasks: 0, highPriorityWorkflowTasks: [], openPosOrders: 0,
    },
    revenueChart: data?.revenueChart ?? [],
    recentActivity: data?.recentActivity ?? [],
  }

  if (isLoading) return <DashboardLoading />
  if (isError) {
    return <DashboardError error={error ?? new Error('Unknown error')} refetch={refetch} />
  }

  const dateStr = formatDate(currentTime)
  const hotelName = settings.hotelName
  const greeting = getGreeting()
  const firstName = user?.firstName || 'Guest'

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 overflow-y-auto bg-[#F9FAFB]">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827] sm:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {dateStr}{" - "}{hotelName}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs border-[#E5E7EB]">
            <BedDouble className="size-3" />
            {safeData.kpis.totalRooms} rooms
          </Badge>
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <KpiCards data={safeData} />

      {/* Row 2: Left + Right Columns */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <OccupancyChart data={safeData} />
          <RevenueOverview data={safeData} />
        </div>
        <div className="lg:col-span-2">
          <CalendarWidget data={safeData} />
        </div>
      </div>

      {/* Row 3: Recent Arrivals */}
      <RecentArrivals data={safeData} />

      {/* Row 4: Alerts */}
      <OperationalAlerts data={safeData} />

      {/* Row 5: Activity Feed + Quick Actions + Room Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityFeed data={safeData} />
        </div>
        <div className="flex flex-col gap-4">
          <QuickActions />
          <RoomStatusSummary data={safeData} />
        </div>
      </div>

      {/* Row 6: Live Activity + Realtime */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E7EB] bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-4">
              <Radio className="size-4 text-[#22C55E]" />
              <h3 className="text-sm font-semibold text-[#111827]">Live Activity</h3>
            </div>
            <div className="p-4">
              <LiveActivityFeed maxHeight="max-h-64" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <RealtimeStatusCard />
        </div>
      </div>
    </div>
  )
}

export default DashboardModule
