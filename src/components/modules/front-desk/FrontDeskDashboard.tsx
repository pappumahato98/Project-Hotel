'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  LogIn,
  LogOut,
  BedDouble,
  Hotel,
  Percent,
  AlertTriangle,
  CalendarPlus,
  Footprints,
  ArrowRightLeft,
  Bell,
  Clock,
  ArrowDownToLine,
  RefreshCw,
  LayoutDashboard,
  Star,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

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
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useNavigationStore, useFrontDeskContextStore } from '@/lib/store'
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────

interface DashboardSnapshot {
  totalRooms: number
  arrivals: number
  departures: number
  inHouse: number
  available: number
  occupancyPct: number
  overbookingCount: number
}

interface TimelineEntry {
  id: string
  type: 'check_in' | 'check_out' | 'room_move' | 'reservation_modified'
  time: string
  description: string
  guestName: string
  roomNumber?: string
  details?: string
}

interface UpcomingArrival {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
  specialRequests: string | null
  source: string | null
  guest: { firstName: string; lastName: string; vipLevel: string } | null
  room: { number: string; type: { name: string; code: string } } | null
}

interface DashboardData {
  snapshot: DashboardSnapshot
  timeline: TimelineEntry[]
  upcomingArrivals: UpcomingArrival[]
}

// ─── Constants ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'new-reservation',
    icon: CalendarPlus,
    title: 'New Reservation',
    description: 'Create a booking for a guest',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    id: 'walk-in-checkin',
    icon: Footprints,
    title: 'Walk-In Check-In',
    description: 'Register & check in a walk-in guest',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    id: 'room-transfer',
    icon: ArrowRightLeft,
    title: 'Room Transfer',
    description: 'Move guest to another room',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-950',
  },
  {
    id: 'wake-up-call',
    icon: Bell,
    title: 'Wake-Up Call',
    description: 'Schedule a wake-up call',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    id: 'late-checkout',
    icon: Clock,
    title: 'Late Checkout',
    description: 'Request late checkout approval',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-950',
  },
  {
    id: 'express-checkout',
    icon: LogOut,
    title: 'Express Checkout',
    description: 'Process express guest checkout',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-950',
  },
] as const

// ─── Helper: Timeline Icon ──────────────────────────────────────────

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case 'check_in':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 ring-4 ring-background">
          <LogIn className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )
    case 'check_out':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950 ring-4 ring-background">
          <LogOut className="size-4 text-rose-600 dark:text-rose-400" />
        </div>
      )
    case 'room_move':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950 ring-4 ring-background">
          <ArrowRightLeft className="size-4 text-violet-600 dark:text-violet-400" />
        </div>
      )
    default:
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 ring-4 ring-background">
          <MessageSquare className="size-4 text-sky-600 dark:text-sky-400" />
        </div>
      )
  }
}

// ─── Helper: Source Badge ──────────────────────────────────────────

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
    booking_com: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-700',
    direct: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  }

  const colorClass = colors[source] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colorClass)}>
      {source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  )
}

// ─── Loading Skeletons ───────────────────────────────────────────

function SnapshotSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function UpcomingArrivalsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent className="p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function FrontDeskDashboard() {
  const { navigateTo, setActiveSubModule } = useNavigationStore()

  const handleArrivalClick = (arrival: UpcomingArrival) => {
    useFrontDeskContextStore.getState().setPrefillReservationId(arrival.id)
    navigateTo('front-desk', 'check-in')
  }

  // ─── Dashboard data query ────────────────────────────────────
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardData>({
    queryKey: ['front-desk-dashboard'],
    queryFn: () => apiFetch('/api/front-desk/dashboard'),
    refetchInterval: 60000,
  })

  const snapshot = data?.snapshot
  const timeline = data?.timeline || []
  const upcomingArrivals = data?.upcomingArrivals || []

  // ─── Quick action handler ───────────────────────────────────
  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'new-reservation':
        setActiveSubModule('reservations')
        toast.success('Navigated to Reservations', {
          description: 'Create a new booking from the Reservations tab.',
        })
        break
      case 'walk-in-checkin':
        setActiveSubModule('arrivals')
        toast.success('Navigated to Arrivals', {
          description: 'Use the Walk-in Check-in button on the Arrivals page.',
        })
        break
      case 'room-transfer':
        toast.info('Room Transfer', {
          description: 'Go to Calendar and drag a reservation to another room.',
        })
        break
      case 'wake-up-call':
        toast.info('Wake-Up Call', {
          description: 'Schedule wake-up calls from the In-House guest details.',
        })
        break
      case 'late-checkout':
        toast.info('Late Checkout Request', {
          description: 'Manage late checkout requests from the In-House view.',
        })
        break
      case 'express-checkout':
        setActiveSubModule('departures')
        toast.success('Navigated to Departures', {
          description: 'Process express checkout from the Departures tab.',
        })
        break
      default:
        break
    }
  }

  // ─── Determine overbooking alert visibility ──────────────────
  const showOverbookingAlert = useMemo(() => {
    return snapshot ? snapshot.overbookingCount > 0 : false
  }, [snapshot])

  // ─── Snapshot cards data ────────────────────────────────────
  const snapshotCards = useMemo(() => {
    if (!snapshot) return []
    const cards = [
      {
        label: 'Arrivals Today',
        value: snapshot.arrivals,
        icon: LogIn,
        iconBg: 'bg-emerald-100 dark:bg-emerald-950',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        label: 'Departures Today',
        value: snapshot.departures,
        icon: LogOut,
        iconBg: 'bg-rose-100 dark:bg-rose-950',
        iconColor: 'text-rose-600 dark:text-rose-400',
      },
      {
        label: 'In-House Guests',
        value: snapshot.inHouse,
        icon: BedDouble,
        iconBg: 'bg-sky-100 dark:bg-sky-950',
        iconColor: 'text-sky-600 dark:text-sky-400',
      },
      {
        label: 'Available Rooms',
        value: snapshot.available,
        icon: Hotel,
        iconBg: 'bg-teal-100 dark:bg-teal-950',
        iconColor: 'text-teal-600 dark:text-teal-400',
      },
      {
        label: 'Occupancy',
        value: `${snapshot.occupancyPct}%`,
        icon: Percent,
        iconBg: 'bg-amber-100 dark:bg-amber-950',
        iconColor: 'text-amber-600 dark:text-amber-400',
        subtext: `${snapshot.inHouse} / ${snapshot.totalRooms} rooms`,
      },
    ]

    // Only show overbooking alert if there are overbookings
    if (snapshot.overbookingCount > 0) {
      cards.push({
        label: 'Overbooking Alert',
        value: snapshot.overbookingCount,
        icon: AlertTriangle,
        iconBg: 'bg-red-100 dark:bg-red-950',
        iconColor: 'text-red-600 dark:text-red-400',
        subtext: `${snapshot.overbookingCount} room${snapshot.overbookingCount > 1 ? 's' : ''} double-booked`,
      })
    }

    return cards
  }, [snapshot])

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Front Desk Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Real-time operational snapshot — {formatDate(new Date())}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* ─── Today's Snapshot Cards ──────────────────────────── */}
      {isLoading ? (
        <SnapshotSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="size-8 mb-2 opacity-40" />
            <p className="text-sm">Failed to load dashboard data</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          'grid gap-2',
          showOverbookingAlert
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        )}>
          {snapshotCards.map((card) => (
            <Card key={card.label} className={cn(
              card.label === 'Overbooking Alert' && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
            )}>
              <CardContent className="p-2.5 flex items-center gap-3">
                <div className={cn('flex size-10 items-center justify-center rounded-lg shrink-0', card.iconBg)}>
                  <card.icon className={cn('size-5', card.iconColor)} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                  {'subtext' in card && card.subtext && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.subtext}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Quick Actions Panel ─────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <LayoutDashboard className="size-4 text-muted-foreground" />
          Quick Actions
        </h3>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
              onClick={() => handleQuickAction(action.id)}
            >
              <CardContent className="p-2.5 flex flex-col items-center text-center gap-2">
                <div className={cn('flex size-10 items-center justify-center rounded-lg', action.bg)}>
                  <action.icon className={cn('size-5', action.color)} />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* ─── Bottom Grid: Timeline + Upcoming Arrivals ──────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ─── Today's Activity Timeline ──────────────────── */}
        <div>
          {isLoading ? (
            <TimelineSkeleton />
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  Today&apos;s Activity
                </CardTitle>
                <CardDescription>Recent front desk operations for today</CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Clock className="size-8 mb-2 opacity-40" />
                    <p className="text-sm">No activity recorded yet today</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto pr-1 space-y-0">
                    {timeline.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-3 pb-4">
                        {/* Timeline line + icon */}
                        <div className="flex flex-col items-center shrink-0">
                          <TimelineIcon type={entry.type} />
                          {idx < timeline.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {entry.guestName}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0 shrink-0',
                                entry.type === 'check_in'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : entry.type === 'check_out'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                    : entry.type === 'room_move'
                                      ? 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                                      : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
                              )}
                            >
                              {entry.description}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{formatTime(entry.time)}</span>
                            {entry.roomNumber && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <BedDouble className="size-3" />
                                  {entry.roomNumber}
                                </span>
                              </>
                            )}
                            {entry.details && (
                              <>
                                <span>•</span>
                                <span className="italic truncate max-w-[200px]">{entry.details}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Upcoming Arrivals ──────────────────────────── */}
        <div>
          {isLoading ? (
            <UpcomingArrivalsSkeleton />
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownToLine className="size-4 text-muted-foreground" />
                  Upcoming Arrivals
                </CardTitle>
                <CardDescription>Next expected arrivals for today</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {upcomingArrivals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ArrowDownToLine className="size-8 mb-2 opacity-40" />
                    <p className="text-sm">No upcoming arrivals for today</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Guest</TableHead>
                        <TableHead className="text-xs">Room</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Source</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">ETA</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingArrivals.map((arrival) => {
                        const guestName = arrival.guest
                          ? `${arrival.guest.firstName} ${arrival.guest.lastName}`
                          : 'Unknown Guest'
                        const isVip = arrival.guest?.vipLevel && arrival.guest.vipLevel !== 'none'

                        return (
                          <TableRow key={arrival.id} onClick={() => handleArrivalClick(arrival)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium">{guestName}</span>
                                {isVip && (
                                  <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                    <Star className="size-2.5 fill-amber-500 text-amber-500 mr-0.5" />
                                    VIP
                                  </Badge>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground block">
                                {arrival.confirmationNo}
                              </span>
                            </TableCell>
                            <TableCell>
                              {arrival.room ? (
                                <span className="text-sm">
                                  {arrival.room.number}
                                  <span className="text-muted-foreground text-xs ml-1">
                                    ({arrival.room.type.code})
                                  </span>
                                </span>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                                  Unassigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <SourceBadge source={arrival.source} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(arrival.checkIn)}
                              </span>
                              {arrival.specialRequests && (
                                <p className="text-[10px] text-muted-foreground italic mt-0.5 max-w-[160px] truncate">
                                  {arrival.specialRequests}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  arrival.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                                )}
                              >
                                {arrival.status === 'confirmed' ? 'Confirmed' : 'Tentative'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
