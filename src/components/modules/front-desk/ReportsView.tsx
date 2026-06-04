'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  Users,
  BedDouble,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  BarChart3,
  FileText,
  DollarSign,
  Activity,
  ArrowRightLeft,
  Clock,
  Hotel,
  Receipt,
  RefreshCw,
  Percent,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableFooter,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/format'
import { nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────

interface SummaryData {
  report: string
  totalRooms: number
  arrivals: number
  departures: number
  inHouse: number
  totalReservations: number
  occupancyPct: number
  totalRevenue: number
  totalPaid: number
  outstanding: number
  moveLogs: number
}

interface ArrivalReservation {
  id: string
  confirmationNo: string
  guest: { firstName: string; lastName: string; vipLevel: string } | null
  room: { id: string; number: string; type: { name: string; code: string } } | null
  checkIn: string
  checkOut: string
  source: string | null
  specialRequests: string | null
  status: string
  adults: number
  children: number
}

interface ArrivalsData {
  report: string
  date: string
  reservations: ArrivalReservation[]
  total: number
}

interface DepartureFolio {
  total: number
  paid: number
  balance: number
}

interface DepartureReservation {
  id: string
  confirmationNo: string
  guest: { firstName: string; lastName: string } | null
  room: { id: string; number: string; type: { name: string; code: string } } | null
  checkIn: string
  checkOut: string
  folios: DepartureFolio[] | null
  status: string
}

interface DeparturesData {
  report: string
  date: string
  reservations: DepartureReservation[]
  total: number
}

interface InHouseFolio {
  total: number
  paid: number
  balance: number
}

interface InHouseReservation {
  id: string
  confirmationNo: string
  guest: { firstName: string; lastName: string; vipLevel: string } | null
  room: { id: string; number: string; type: { name: string; code: string } } | null
  checkIn: string
  checkOut: string
  status: string
  folios: InHouseFolio[] | null
}

interface InHouseData {
  report: string
  reservations: InHouseReservation[]
  total: number
}

interface RoomMove {
  id: string
  reservationId: string
  confirmationNo: string
  fromRoomNumber: string
  toRoomNumber: string
  fromCheckIn: string
  toCheckIn: string
  fromCheckOut: string
  toCheckOut: string
  moveType: string
  reason: string
  changedByName: string
  createdAt: string
}

interface RoomMovesData {
  report: string
  moves: RoomMove[]
  total: number
}

interface OccupancyDay {
  date: string
  total: number
  occupied: number
  arrivals: number
  departures: number
}

interface OccupancyData {
  report: string
  totalRooms: number
  days: OccupancyDay[]
}

interface RevenueData {
  report: string
  totalRevenue: number
  totalPaid: number
  outstanding: number
  totalReservations: number
  totalRooms: number
  averageRate: number
}

// ─── Report Tab Config ───────────────────────────────────────────────

const REPORT_TABS = [
  { value: 'summary', label: 'Daily Summary', icon: BarChart3 },
  { value: 'arrivals', label: 'Arrivals', icon: ArrowDownToLine },
  { value: 'departures', label: 'Departures', icon: ArrowUpFromLine },
  { value: 'inhouse', label: 'In-House', icon: Users },
  { value: 'room-moves', label: 'Room Moves', icon: ArrowRightLeft },
  { value: 'occupancy', label: 'Occupancy', icon: Activity },
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
] as const

type ReportType = (typeof REPORT_TABS)[number]['value']

// ─── Helper: Report Query Hook ─────────────────────────────────────────

function useReportQuery<T>(type: ReportType, date?: string) {
  return useQuery<T>({
    queryKey: ['front-desk-reports', type, date],
    queryFn: async () => {
      const params = new URLSearchParams({ type })
      if (date) params.set('date', date)
      const res = await fetch(`/api/front-desk/reports?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to fetch ${type} report`)
      return res.json()
    },
    refetchInterval: 30000,
  })
}

// ─── Loading Skeleton Component ───────────────────────────────────────

function ReportSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: cols }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: cols }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icon className="size-8 mb-2 opacity-40" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  subtext?: string
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('flex size-10 items-center justify-center rounded-lg', iconBg)}>
          <Icon className={cn('size-5', iconColor)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Source Badge ─────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-xs text-muted-foreground">—</span>

  const colors: Record<string, string> = {
    online: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-700',
    walk_in: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-700',
    phone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    email: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
    agent: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    corporate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    group: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-pink-300 dark:border-pink-700',
  }

  const colorClass = colors[source] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colorClass)}>
      {source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  )
}

// ─── Move Type Badge ───────────────────────────────────────────────────

function MoveTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    room_change: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-700',
    date_shift: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    room_and_date: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-700',
  }

  const colorClass = colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colorClass)}>
      {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  )
}

// ─── Sub-Report Components ────────────────────────────────────────────

// 1. Daily Summary
function SummaryReport({ date }: { date?: string }) {
  const { data, isLoading, error, refetch, isFetching } = useReportQuery<SummaryData>('summary', date)

  if (isLoading) return <StatsCardSkeleton />
  if (error) return <EmptyState icon={FileText} message="Failed to load daily summary" />

  const summary = data as SummaryData

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Rooms"
          value={summary.totalRooms}
          icon={Hotel}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
        />
        <StatCard
          label="Today's Arrivals"
          value={summary.arrivals}
          icon={ArrowDownToLine}
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Today's Departures"
          value={summary.departures}
          icon={ArrowUpFromLine}
          iconBg="bg-rose-100 dark:bg-rose-950"
          iconColor="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          label="In-House Guests"
          value={summary.inHouse}
          icon={Users}
          iconBg="bg-sky-100 dark:bg-sky-950"
          iconColor="text-sky-600 dark:text-sky-400"
        />
        <StatCard
          label="Occupancy"
          value={`${summary.occupancyPct}%`}
          icon={Percent}
          iconBg="bg-amber-100 dark:bg-amber-950"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Total Reservations"
          value={summary.totalReservations}
          icon={CalendarDays}
          iconBg="bg-violet-100 dark:bg-violet-950"
          iconColor="text-violet-600 dark:text-violet-400"
        />
      </div>

      <Separator />

      {/* Financial Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(summary.totalPaid)}
          icon={Receipt}
          iconBg="bg-green-100 dark:bg-green-950"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          icon={TrendingUp}
          iconBg={summary.outstanding > 0 ? 'bg-rose-100 dark:bg-rose-950' : 'bg-gray-100 dark:bg-gray-800'}
          iconColor={summary.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'}
        />
        <StatCard
          label="Room Moves Today"
          value={summary.moveLogs}
          icon={ArrowRightLeft}
          iconBg="bg-violet-100 dark:bg-violet-950"
          iconColor="text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Refresh indicator */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-3', isFetching && 'animate-spin')} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  )
}

// 2. Arrivals Report
function ArrivalsReport({ date }: { date?: string }) {
  const { data, isLoading, error } = useReportQuery<ArrivalsData>('arrivals', date)

  if (isLoading) return <TableSkeleton cols={6} rows={6} />
  if (error) return <EmptyState icon={ArrowDownToLine} message="Failed to load arrivals report" />

  const arrivalsData = data as ArrivalsData
  const arrivals = arrivalsData.reservations || []

  if (arrivals.length === 0) {
    return <EmptyState icon={ArrowDownToLine} message="No arrivals scheduled for this date" />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Guest</TableHead>
              <TableHead className="text-xs">Confirmation</TableHead>
              <TableHead className="text-xs">Room</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Check-In</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Check-Out</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Source</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arrivals.map((res, idx) => {
              const guestName = res.guest
                ? `${res.guest.firstName} ${res.guest.lastName}`
                : 'Unknown Guest'
              const isVip = res.guest?.vipLevel && res.guest.vipLevel !== 'none'

              return (
                <TableRow
                  key={res.id}
                  className={cn(idx % 2 !== 0 && 'bg-muted/30')}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{guestName}</span>
                      {isVip && (
                        <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                          VIP
                        </Badge>
                      )}
                    </div>
                    {res.specialRequests && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                        {res.specialRequests}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{res.confirmationNo}</span>
                  </TableCell>
                  <TableCell>
                    {res.room ? (
                      <span className="text-sm">{res.room.number} <span className="text-muted-foreground text-xs">({res.room.type.code})</span></span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(res.checkIn)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(res.checkOut)}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <SourceBadge source={res.source} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        res.status === 'checked_in'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-700'
                          : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
                      )}
                    >
                      {res.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={6} className="text-xs text-muted-foreground">
                Total Arrivals
              </TableCell>
              <TableCell className="font-bold text-sm">{arrivalsData.total}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}

// 3. Departures Report
function DeparturesReport({ date }: { date?: string }) {
  const { data, isLoading, error } = useReportQuery<DeparturesData>('departures', date)

  if (isLoading) return <TableSkeleton cols={5} rows={6} />
  if (error) return <EmptyState icon={ArrowUpFromLine} message="Failed to load departures report" />

  const departuresData = data as DeparturesData
  const departures = departuresData.reservations || []

  if (departures.length === 0) {
    return <EmptyState icon={ArrowUpFromLine} message="No departures scheduled for this date" />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Guest</TableHead>
              <TableHead className="text-xs">Room</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Check-Out</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Nights</TableHead>
              <TableHead className="text-xs">Folio Balance</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departures.map((res, idx) => {
              const guestName = res.guest
                ? `${res.guest.firstName} ${res.guest.lastName}`
                : 'Unknown Guest'

              const folioBalance = res.folios && res.folios.length > 0
                ? res.folios.reduce((sum, f) => sum + (f.balance || 0), 0)
                : 0

              const nights = nightsBetween(res.checkIn, res.checkOut)

              return (
                <TableRow
                  key={res.id}
                  className={cn(idx % 2 !== 0 && 'bg-muted/30')}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{guestName}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{res.confirmationNo}</span>
                  </TableCell>
                  <TableCell>
                    {res.room ? (
                      <span className="text-sm">{res.room.number} <span className="text-muted-foreground text-xs">({res.room.type.code})</span></span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(res.checkOut)}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-sm font-medium',
                      folioBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                    )}>
                      {formatCurrency(folioBalance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        res.status === 'checked_out'
                          ? 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                          : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
                      )}
                    >
                      {res.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-xs text-muted-foreground">
                Total Departures
              </TableCell>
              <TableCell className="font-bold text-sm">{departuresData.total}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}

// 4. In-House Report
function InHouseReport() {
  const { data, isLoading, error } = useReportQuery<InHouseData>('inhouse')

  if (isLoading) return <TableSkeleton cols={6} rows={8} />
  if (error) return <EmptyState icon={Users} message="Failed to load in-house report" />

  const inHouseData = data as InHouseData
  const guests = inHouseData.reservations || []

  if (guests.length === 0) {
    return <EmptyState icon={Users} message="No guests currently in-house" />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Guest</TableHead>
                <TableHead className="text-xs">Room</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Check-In</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Check-Out</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Nights</TableHead>
                <TableHead className="text-xs">Folio Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((res, idx) => {
                const guestName = res.guest
                  ? `${res.guest.firstName} ${res.guest.lastName}`
                  : 'Unknown Guest'
                const isVip = res.guest?.vipLevel && res.guest.vipLevel !== 'none'
                const nights = nightsBetween(res.checkIn, res.checkOut)

                const folioBalance = res.folios && res.folios.length > 0
                  ? res.folios.reduce((sum, f) => sum + (f.balance || 0), 0)
                  : 0

                return (
                  <TableRow
                    key={res.id}
                    className={cn(idx % 2 !== 0 && 'bg-muted/30')}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{guestName}</span>
                        {isVip && (
                          <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            VIP
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{res.confirmationNo}</span>
                    </TableCell>
                    <TableCell>
                      {res.room ? (
                        <span className="text-sm">{res.room.number} <span className="text-muted-foreground text-xs">({res.room.type.code})</span></span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(res.checkIn)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(res.checkOut)}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-sm font-medium',
                        folioBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                      )}>
                        {formatCurrency(folioBalance)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-xs text-muted-foreground">
                  Total In-House
                </TableCell>
                <TableCell className="font-bold text-sm">{inHouseData.total}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 5. Room Move Log
function RoomMovesReport() {
  const { data, isLoading, error } = useReportQuery<RoomMovesData>('room-moves')

  if (isLoading) return <TableSkeleton cols={6} rows={6} />
  if (error) return <EmptyState icon={ArrowRightLeft} message="Failed to load room moves" />

  const movesData = data as RoomMovesData
  const moves = movesData.moves || []

  if (moves.length === 0) {
    return <EmptyState icon={ArrowRightLeft} message="No room moves recorded" />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Date/Time</TableHead>
                <TableHead className="text-xs">Guest</TableHead>
                <TableHead className="text-xs">Room Change</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Reason</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moves.map((move, idx) => (
                <TableRow
                  key={move.id}
                  className={cn(idx % 2 !== 0 && 'bg-muted/30')}
                >
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{formatDateTime(move.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium">{move.confirmationNo}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">{move.confirmationNo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {move.fromRoomNumber}
                      </Badge>
                      <ArrowRightLeft className="size-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 dark:border-violet-700">
                        {move.toRoomNumber}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <MoveTypeBadge type={move.moveType} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground max-w-[180px] truncate block">
                      {move.reason || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs">{move.changedByName || '—'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-xs text-muted-foreground">
                  Total Moves
                </TableCell>
                <TableCell className="font-bold text-sm">{movesData.total}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 6. Occupancy Report (7-day trend)
function OccupancyReport() {
  const { data, isLoading, error } = useReportQuery<OccupancyData>('occupancy')

  if (isLoading) return <TableSkeleton cols={6} rows={7} />
  if (error) return <EmptyState icon={Activity} message="Failed to load occupancy report" />

  const occupancyData = data as OccupancyData
  const days = occupancyData.days || []

  if (days.length === 0) {
    return <EmptyState icon={Activity} message="No occupancy data available" />
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Rooms"
          value={occupancyData.totalRooms}
          icon={Hotel}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
        />
        {(() => {
          const avgOccupancy = days.length > 0
            ? Math.round(days.reduce((sum, d) => {
                const pct = d.total > 0 ? (d.occupied / d.total) * 100 : 0
                return sum + pct
              }, 0) / days.length)
            : 0

          return (
            <>
              <StatCard
                label="Avg. Occupancy (7 days)"
                value={`${avgOccupancy}%`}
                icon={Percent}
                iconBg="bg-amber-100 dark:bg-amber-950"
                iconColor="text-amber-600 dark:text-amber-400"
              />
              <StatCard
                label="Peak Occupancy"
                value={`${Math.max(...days.map(d => d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0))}%`}
                icon={TrendingUp}
                iconBg="bg-emerald-100 dark:bg-emerald-950"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
            </>
          )
        })()}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Total Rooms</TableHead>
                <TableHead className="text-xs">Occupied</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Arrivals</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Departures</TableHead>
                <TableHead className="text-xs">Occupancy %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day, idx) => {
                const occPct = day.total > 0 ? Math.round((day.occupied / day.total) * 100) : 0
                const isToday = day.date === new Date().toISOString().split('T')[0]

                return (
                  <TableRow
                    key={day.date}
                    className={cn(
                      idx % 2 !== 0 && 'bg-muted/30',
                      isToday && 'bg-emerald-50/50 dark:bg-emerald-950/20',
                    )}
                  >
                    <TableCell>
                      <span className={cn(
                        'text-sm font-medium',
                        isToday && 'text-emerald-700 dark:text-emerald-400',
                      )}>
                        {formatDate(day.date)}
                      </span>
                      {isToday && (
                        <Badge className="text-[9px] px-1 py-0 ml-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                          Today
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{day.total}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{day.occupied}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ArrowDownToLine className="size-3" />
                        {day.arrivals}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <ArrowUpFromLine className="size-3" />
                        {day.departures}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Visual occupancy bar */}
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              occPct >= 80
                                ? 'bg-emerald-500'
                                : occPct >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500',
                            )}
                            style={{ width: `${Math.min(occPct, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          occPct >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : occPct >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400',
                        )}>
                          {occPct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// 7. Revenue Summary
function RevenueReport() {
  const { data, isLoading, error } = useReportQuery<RevenueData>('revenue')

  if (isLoading) return <StatsCardSkeleton />
  if (error) return <EmptyState icon={DollarSign} message="Failed to load revenue report" />

  const revenue = data as RevenueData

  const collectionRate = revenue.totalRevenue > 0
    ? Math.round((revenue.totalPaid / revenue.totalRevenue) * 100)
    : 0

  const revenuePerRoom = revenue.totalRooms > 0
    ? Math.round(revenue.totalRevenue / revenue.totalRooms)
    : 0

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(revenue.totalRevenue)}
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          iconColor="text-emerald-600 dark:text-emerald-400"
          subtext={`RevPAR: ${formatCurrency(revenuePerRoom)}`}
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(revenue.totalPaid)}
          icon={Receipt}
          iconBg="bg-green-100 dark:bg-green-950"
          iconColor="text-green-600 dark:text-green-400"
          subtext={`${collectionRate}% collection rate`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(revenue.outstanding)}
          icon={TrendingUp}
          iconBg={revenue.outstanding > 0 ? 'bg-rose-100 dark:bg-rose-950' : 'bg-gray-100 dark:bg-gray-800'}
          iconColor={revenue.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'}
        />
      </div>

      <Separator />

      {/* Secondary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Average Rate"
          value={formatCurrency(revenue.averageRate)}
          icon={BarChart3}
          iconBg="bg-sky-100 dark:bg-sky-950"
          iconColor="text-sky-600 dark:text-sky-400"
        />
        <StatCard
          label="Total Reservations"
          value={revenue.totalReservations}
          icon={CalendarDays}
          iconBg="bg-violet-100 dark:bg-violet-950"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          label="Total Rooms"
          value={revenue.totalRooms}
          icon={Hotel}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* Collection Rate Visual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Collection Rate</span>
            <span className={cn(
              'text-sm font-bold',
              collectionRate >= 80
                ? 'text-emerald-600 dark:text-emerald-400'
                : collectionRate >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400',
            )}>
              {collectionRate}%
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                collectionRate >= 80
                  ? 'bg-emerald-500'
                  : collectionRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500',
              )}
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportType>('summary')

  const activeTabConfig = REPORT_TABS.find((t) => t.value === activeTab)
  const ActiveIcon = activeTabConfig?.icon || BarChart3

  const reportDescriptions: Record<ReportType, string> = {
    summary: "Today's operational overview with key metrics and financials",
    arrivals: "Expected guest check-ins for the selected date",
    departures: "Expected guest check-outs for the selected date",
    inhouse: 'All guests currently checked in and their folio status',
    'room-moves': 'History of room changes made via the calendar',
    occupancy: '7-day occupancy trend with daily breakdown',
    revenue: 'Financial overview including revenue, payments, and outstanding balances',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="size-6 text-muted-foreground" />
            Front Desk Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Operational insights and daily performance metrics
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)} className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          {REPORT_TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs sm:text-sm gap-1.5"
              >
                <TabIcon className="size-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Tab Content */}
        {REPORT_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ActiveIcon className="size-5 text-muted-foreground" />
                <div>
                  <h3 className="text-base font-semibold">{tab.label}</h3>
                  <p className="text-xs text-muted-foreground">{reportDescriptions[tab.value]}</p>
                </div>
              </div>
            </div>

            {/* Report Content */}
            {tab.value === 'summary' && <SummaryReport />}
            {tab.value === 'arrivals' && <ArrivalsReport />}
            {tab.value === 'departures' && <DeparturesReport />}
            {tab.value === 'inhouse' && <InHouseReport />}
            {tab.value === 'room-moves' && <RoomMovesReport />}
            {tab.value === 'occupancy' && <OccupancyReport />}
            {tab.value === 'revenue' && <RevenueReport />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
