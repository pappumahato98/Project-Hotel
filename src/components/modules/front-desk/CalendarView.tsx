'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Crown,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react'
import { format, addDays, startOfDay, isToday, isSameDay, isWeekend, parseISO, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_WIDTH = 60
const ROW_HEIGHT = 44
const ROOM_LABEL_WIDTH = 130
const NUM_DAYS = 14

// ─── Types ──────────────────────────────────────────────────────────────

interface RoomType {
  id: string
  name: string
  code: string
}

interface Room {
  id: string
  number: string
  floor: number
  wing?: string | null
  typeId: string
  status: string
  type?: RoomType | null
}

interface ReservationGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface Reservation {
  id: string
  confirmationNo: string
  guestId: string
  roomId: string
  room?: { number: string; floor: number; wing?: string | null; type?: { name: string; code: string } } | null
  guest?: ReservationGuest | null
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  status: string
  source: string
}

// ─── Status Color Maps ─────────────────────────────────────────────────

const STATUS_BG_MAP: Record<string, string> = {
  confirmed: 'bg-blue-500/80 hover:bg-blue-500',
  checked_in: 'bg-emerald-500/80 hover:bg-emerald-500',
  checked_out: 'bg-gray-400/80 hover:bg-gray-400',
}

const ROOM_STATUS_BG_MAP: Record<string, string> = {
  vacant_clean: 'bg-green-50 dark:bg-green-950/30',
  occupied: 'bg-blue-50 dark:bg-blue-950/30',
  vacant_dirty: 'bg-red-50 dark:bg-red-950/20',
  cleaning: 'bg-amber-50 dark:bg-amber-950/20',
  inspected: 'bg-purple-50 dark:bg-purple-950/20',
  out_of_order: 'bg-gray-100 dark:bg-gray-800/50',
  on_change: 'bg-gray-100 dark:bg-gray-800/50',
}

const ROOM_STATUS_STRIPE: Record<string, string> = {
  out_of_order: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)',
}

// ─── Helper Functions ──────────────────────────────────────────────────

function getDates(startDate: Date, numDays: number): Date[] {
  return Array.from({ length: numDays }, (_, i) => addDays(startDate, i))
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

function getRoomRowBg(status: string): string {
  return ROOM_STATUS_BG_MAP[status] || ''
}

function getReservationBg(status: string): string {
  return STATUS_BG_MAP[status] || 'bg-gray-400/80'
}

function isVip(guest: ReservationGuest | null | undefined): boolean {
  if (!guest) return false
  return guest.vipLevel !== 'none'
}

function getVipBadge(vipLevel: string): string {
  switch (vipLevel) {
    case 'platinum': return 'Platinum'
    case 'gold': return 'Gold'
    case 'silver': return 'Silver'
    default: return ''
  }
}

// ─── Legend Component ────────────────────────────────────────────────────

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      <Separator orientation="vertical" className="h-4 hidden sm:block" />
      {/* Booking Status */}
      <span className="font-semibold text-foreground">Booking:</span>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-blue-500/80" />
        <span>Confirmed</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-emerald-500/80" />
        <span>Checked In</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-gray-400/80" />
        <span>Checked Out</span>
      </div>

      <Separator orientation="vertical" className="h-4 hidden sm:block" />

      {/* VIP */}
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm border-l-2 border-l-amber-500 bg-muted" />
        <span>VIP</span>
      </div>

      <Separator orientation="vertical" className="h-4 hidden sm:block" />

      {/* Date Indicators */}
      <span className="font-semibold text-foreground">Dates:</span>
      <div className="flex items-center gap-1">
        <ArrowDownToLine className="size-3 text-green-500" />
        <span>Arrivals</span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowUpFromLine className="size-3 text-orange-500" />
        <span>Departures</span>
      </div>

      <Separator orientation="vertical" className="h-4 hidden sm:block" />

      {/* Room Status */}
      <span className="font-semibold text-foreground">Room:</span>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-green-50 border border-green-200 dark:bg-green-950/40" />
        <span>Vacant</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-blue-50 border border-blue-200 dark:bg-blue-950/40" />
        <span>Occupied</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-red-50 border border-red-200 dark:bg-red-950/40" />
        <span>Dirty</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-gray-100 border border-gray-200 dark:bg-gray-800/50" />
        <span>Maint.</span>
      </div>
    </div>
  )
}

// ─── Reservation Detail Popover ────────────────────────────────────────

function ReservationPopover({ reservation }: { reservation: Reservation }) {
  const guestName = reservation.guest
    ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
    : 'No Guest'
  const checkInDate = parseISO(reservation.checkIn)
  const checkOutDate = parseISO(reservation.checkOut)
  const nights = Math.max(1, differenceInDays(checkOutDate, checkInDate))
  const vip = isVip(reservation.guest)
  const vipLabel = vip ? getVipBadge(reservation.guest!.vipLevel) : ''

  return (
    <PopoverContent className="w-72 p-4" side="top" align="start" sideOffset={4}>
      <div className="space-y-3">
        {/* Guest & Confirmation */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{guestName}</span>
            {vip && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                <Crown className="size-2.5 mr-0.5" />
                {vipLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {reservation.confirmationNo}
          </p>
        </div>

        <Separator />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div>
            <span className="text-muted-foreground">Room</span>
            <p className="font-medium">
              {reservation.room?.number || 'Unassigned'}
              {reservation.room?.type && (
                <span className="text-muted-foreground"> ({reservation.room.type.code})</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium capitalize">
              {reservation.status.replace('_', ' ')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-in</span>
            <p className="font-medium">{formatDate(reservation.checkIn)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-out</span>
            <p className="font-medium">{formatDate(reservation.checkOut)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Rate / Night</span>
            <p className="font-medium">{formatCurrency(reservation.roomRate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total ({nights}N)</span>
            <p className="font-semibold">{formatCurrency(reservation.totalAmount)}</p>
          </div>
          {reservation.source && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Source</span>
              <p className="font-medium capitalize">{reservation.source.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </PopoverContent>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-40" />
      </div>
      {/* Date header skeleton */}
      <div className="flex gap-0">
        <Skeleton className="h-10 flex-shrink-0" style={{ width: ROOM_LABEL_WIDTH }} />
        <div className="flex gap-0">
          {Array.from({ length: NUM_DAYS }).map((_, i) => (
            <Skeleton key={i} className="h-10 flex-shrink-0" style={{ width: DAY_WIDTH }} />
          ))}
        </div>
      </div>
      {/* Room row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-0">
          <Skeleton className="flex-shrink-0" style={{ width: ROOM_LABEL_WIDTH, height: ROW_HEIGHT }} />
          <div className="flex gap-0">
            {Array.from({ length: NUM_DAYS }).map((_, j) => (
              <Skeleton key={j} className="flex-shrink-0" style={{ width: DAY_WIDTH, height: ROW_HEIGHT }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Calendar View ─────────────────────────────────────────────────

export function CalendarView() {
  const [startDateOffset, setStartDateOffset] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = startOfDay(new Date())
  const startDate = addDays(today, startDateOffset)

  // ─── Fetch Rooms ─────────────────────────────────────────────────────
  const {
    data: roomsData,
    isLoading: roomsLoading,
  } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      const json = await res.json()
      return json
    },
  })

  // ─── Fetch Reservations ──────────────────────────────────────────────
  const {
    data: reservationsData,
    isLoading: reservationsLoading,
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await fetch('/api/reservations')
      if (!res.ok) throw new Error('Failed to fetch reservations')
      const json = await res.json()
      return json
    },
  })

  const rooms: Room[] = roomsData?.rooms || []
  const allReservations: Reservation[] = reservationsData?.reservations || []

  // Filter relevant reservations
  const relevantStatuses = new Set(['confirmed', 'checked_in', 'checked_out'])
  const reservations = useMemo(
    () => allReservations.filter((r: Reservation) => relevantStatuses.has(r.status) && r.roomId),
    [allReservations],
  )

  const dates = useMemo(() => getDates(startDate, NUM_DAYS), [startDate])

  // ─── Compute arrivals/departures per date ────────────────────────────
  const dateStats = useMemo(() => {
    const stats: Map<string, { arrivals: number; departures: number }> = new Map()
    for (const d of dates) {
      const key = format(d, 'yyyy-MM-dd')
      stats.set(key, { arrivals: 0, departures: 0 })
    }
    for (const r of reservations) {
      const ciDate = format(startOfDay(parseISO(r.checkIn)), 'yyyy-MM-dd')
      const coDate = format(startOfDay(parseISO(r.checkOut)), 'yyyy-MM-dd')
      if (stats.has(ciDate)) {
        stats.get(ciDate)!.arrivals += 1
      }
      if (stats.has(coDate)) {
        stats.get(coDate)!.departures += 1
      }
    }
    return stats
  }, [reservations, dates])

  // ─── Build reservation blocks per room ──────────────────────────────
  const reservationBlocks = useMemo(() => {
    const blocks: Map<string, Array<{ reservation: Reservation; left: number; width: number }>> = new Map()

    for (const r of reservations) {
      const ciDay = startOfDay(parseISO(r.checkIn))
      const coDay = startOfDay(parseISO(r.checkOut))

      // Compute column positions
      const startCol = differenceInDays(ciDay, startDate)
      const endCol = differenceInDays(coDay, startDate)

      // Only render if at least partially visible
      if (endCol <= 0 || startCol >= NUM_DAYS) continue

      // Half-day positioning: start from center of check-in day
      const visibleStartCol = Math.max(0, startCol)
      const visibleEndCol = Math.min(NUM_DAYS, endCol)

      let left: number
      let width: number

      if (startCol >= 0 && endCol <= NUM_DAYS) {
        // Fully visible
        left = startCol * DAY_WIDTH + 30
        width = (endCol - startCol) * DAY_WIDTH - 1
      } else if (startCol < 0 && endCol > NUM_DAYS) {
        // Spans entire visible range
        left = 0
        width = NUM_DAYS * DAY_WIDTH
      } else if (startCol < 0) {
        // Starts before visible range
        left = 0
        width = (endCol) * DAY_WIDTH - 1
      } else {
        // Ends after visible range
        left = startCol * DAY_WIDTH + 30
        width = (visibleEndCol - startCol) * DAY_WIDTH - 1
      }

      if (width < 20) width = 20 // Minimum width for readability

      const roomId = r.roomId
      if (!blocks.has(roomId)) blocks.set(roomId, [])
      blocks.get(roomId)!.push({ reservation: r, left, width })
    }
    return blocks
  }, [reservations, startDate])

  // ─── Handlers ────────────────────────────────────────────────────────
  const goToday = useCallback(() => setStartDateOffset(0), [])
  const goPrev = useCallback(() => setStartDateOffset((prev) => prev - 7), [])
  const goNext = useCallback(() => setStartDateOffset((prev) => prev + 7), [])

  const isLoading = roomsLoading || reservationsLoading
  const dateRangeLabel = `${format(dates[0], 'MMM d')} — ${format(dates[dates.length - 1], 'MMM d, yyyy')}`

  // ─── Total visible reservations ────────────────────────────────────
  const visibleReservations = useMemo(() => {
    const rangeStart = format(startDate, 'yyyy-MM-dd')
    const rangeEnd = format(addDays(startDate, NUM_DAYS), 'yyyy-MM-dd')
    return reservations.filter((r) => {
      const ci = format(startOfDay(parseISO(r.checkIn)), 'yyyy-MM-dd')
      const co = format(startOfDay(parseISO(r.checkOut)), 'yyyy-MM-dd')
      return ci < rangeEnd && co > rangeStart
    })
  }, [reservations, startDate])

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Reservation Calendar
          </h2>
          <p className="text-sm text-muted-foreground">
            Room occupancy timeline across {rooms.length} rooms
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={goPrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={goToday}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={goNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground min-w-[180px] text-center">
            {dateRangeLabel}
          </span>
        </div>
      </div>

      {/* ─── Legend ───────────────────────────────────────────────────── */}
      <Card className="py-2 px-4">
        <CardContent className="p-0">
          <CalendarLegend />
        </CardContent>
      </Card>

      {/* ─── Calendar Grid ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <CalendarSkeleton />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarDays className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No rooms configured</p>
              <p className="text-xs">Rooms need to be set up to display the calendar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto" ref={scrollRef}>
              <div
                className="min-w-fit"
                style={{
                  width: ROOM_LABEL_WIDTH + NUM_DAYS * DAY_WIDTH,
                }}
              >
                {/* ─── Date Headers ──────────────────────────────────── */}
                <div className="flex border-b sticky top-0 z-20 bg-background">
                  {/* Room label corner */}
                  <div
                    className="flex-shrink-0 border-r bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                    style={{ width: ROOM_LABEL_WIDTH }}
                  >
                    Room
                  </div>

                  {/* Date columns */}
                  <div className="flex flex-1">
                    {dates.map((date, idx) => {
                      const dayStats = dateStats.get(format(date, 'yyyy-MM-dd'))
                      const hasArrivals = (dayStats?.arrivals ?? 0) > 0
                      const hasDepartures = (dayStats?.departures ?? 0) > 0
                      const todayCol = isToday(date)
                      const weekend = isWeekend(date)

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex-shrink-0 flex flex-col items-center justify-center border-r py-1.5 relative',
                            todayCol && 'bg-primary/5',
                            weekend && !todayCol && 'bg-muted/30',
                          )}
                          style={{ width: DAY_WIDTH }}
                        >
                          {/* Day name */}
                          <span className={cn(
                            'text-[10px] font-medium leading-tight',
                            todayCol ? 'text-primary' : weekend ? 'text-orange-500' : 'text-muted-foreground',
                          )}>
                            {format(date, 'EEE')}
                          </span>

                          {/* Day number */}
                          <span className={cn(
                            'text-xs font-bold leading-tight',
                            todayCol && 'text-primary',
                          )}>
                            {format(date, 'd')}
                          </span>

                          {/* Today label */}
                          {todayCol && (
                            <span className="text-[8px] font-bold text-primary uppercase tracking-wider leading-tight">
                              Today
                            </span>
                          )}

                          {/* Arrival / Departure indicators */}
                          <div className="flex items-center gap-0.5 mt-0.5 h-3">
                            {hasArrivals && (
                              <div className="flex items-center gap-0.5" title={`${dayStats!.arrivals} arrival(s)`}>
                                <span className="size-1.5 rounded-full bg-green-500" />
                                {dayStats!.arrivals > 1 && (
                                  <span className="text-[8px] font-bold text-green-600 dark:text-green-400 leading-none">
                                    {dayStats!.arrivals}
                                  </span>
                                )}
                              </div>
                            )}
                            {hasDepartures && (
                              <div className="flex items-center gap-0.5" title={`${dayStats!.departures} departure(s)`}>
                                <span className="size-1.5 rounded-full bg-orange-500" />
                                {dayStats!.departures > 1 && (
                                  <span className="text-[8px] font-bold text-orange-600 dark:text-orange-400 leading-none">
                                    {dayStats!.departures}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ─── Room Rows ──────────────────────────────────────── */}
                <div className="relative">
                  {/* Today column highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-primary/5 pointer-events-none z-0"
                    style={{
                      left: ROOM_LABEL_WIDTH,
                      width: DAY_WIDTH,
                      ...(function() {
                        const todayIdx = dates.findIndex((d) => isToday(d))
                        if (todayIdx >= 0) return { transform: `translateX(${todayIdx * DAY_WIDTH}px)` }
                        return { display: 'none' }
                      })(),
                    }}
                  />

                  {/* Grid lines */}
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    {dates.map((date, idx) => {
                      const weekend = isWeekend(date)
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'absolute top-0 bottom-0 border-r border-border/30',
                            weekend && 'bg-muted/10',
                          )}
                          style={{
                            left: ROOM_LABEL_WIDTH + idx * DAY_WIDTH,
                            width: DAY_WIDTH,
                          }}
                        />
                      )
                    })}
                  </div>

                  {rooms.map((room, roomIdx) => {
                    const roomBlocks = reservationBlocks.get(room.id) || []
                    const rowBg = getRoomRowBg(room.status)
                    const stripeBg = ROOM_STATUS_STRIPE[room.status]

                    return (
                      <div
                        key={room.id}
                        className="flex border-b relative z-10"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Room Label */}
                        <div
                          className={cn(
                            'flex-shrink-0 border-r flex items-center gap-2 px-2.5 sticky left-0 z-10',
                            rowBg,
                          )}
                          style={{
                            width: ROOM_LABEL_WIDTH,
                            background: stripeBg || undefined,
                          }}
                        >
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="text-xs font-bold truncate">{room.number}</span>
                            <span className="text-[9px] text-muted-foreground truncate">
                              {room.type?.code || ''} · F{room.floor}
                            </span>
                          </div>
                        </div>

                        {/* Day Cells */}
                        <div className="relative flex-shrink-0" style={{ width: NUM_DAYS * DAY_WIDTH }}>
                          {/* Room status background for day cells */}
                          <div
                            className={cn('absolute inset-0', rowBg)}
                            style={{ background: stripeBg || undefined }}
                          />

                          {/* Reservation Blocks */}
                          {roomBlocks.map(({ reservation: res, left, width }) => {
                            const guestName = res.guest
                              ? truncate(`${res.guest.firstName} ${res.guest.lastName}`, width < 100 ? 6 : 12)
                              : '—'
                            const vip = isVip(res.guest)
                            const showConf = width > 140

                            return (
                              <Popover key={res.id}>
                                <PopoverTrigger asChild>
                                  <button
                                    className={cn(
                                      'absolute top-[5px] bottom-[5px] rounded-md text-white text-[10px] font-medium px-1.5 flex items-center gap-0.5 cursor-pointer transition-opacity hover:opacity-90 overflow-hidden whitespace-nowrap',
                                      getReservationBg(res.status),
                                    )}
                                    style={{
                                      left: ROOM_LABEL_WIDTH - ROOM_LABEL_WIDTH + left,
                                      width: Math.max(width - 2, 20),
                                    }}
                                    title={`${res.guest?.firstName} ${res.guest?.lastName} — ${formatDate(res.checkIn)} to ${formatDate(res.checkOut)}`}
                                  >
                                    {/* VIP gold left border */}
                                    {vip && (
                                      <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md bg-amber-400" />
                                    )}

                                    <span className="truncate z-10 pl-0.5">
                                      {guestName}
                                    </span>
                                    {showConf && (
                                      <span className="truncate z-10 opacity-70 text-[9px] ml-auto flex-shrink-0">
                                        {truncate(res.confirmationNo, 8)}
                                      </span>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <ReservationPopover reservation={res} />
                              </Popover>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* ─── Empty state for no reservations ──────────────── */}
                  {visibleReservations.length === 0 && (
                    <div className="flex items-center justify-center py-6">
                      <p className="text-xs text-muted-foreground/60">
                        No reservations in this date range
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Footer Stats ───────────────────────────────────────────── */}
      {!isLoading && rooms.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-4">
            <span>{rooms.length} rooms</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-green-500" />
              {reservations.filter((r) => {
                const ci = format(startOfDay(parseISO(r.checkIn)), 'yyyy-MM-dd')
                return ci >= format(startDate, 'yyyy-MM-dd') && ci < format(addDays(startDate, NUM_DAYS), 'yyyy-MM-dd')
              }).length} arrivals
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-orange-500" />
              {reservations.filter((r) => {
                const co = format(startOfDay(parseISO(r.checkOut)), 'yyyy-MM-dd')
                return co >= format(startDate, 'yyyy-MM-dd') && co < format(addDays(startDate, NUM_DAYS), 'yyyy-MM-dd')
              }).length} departures
            </span>
          </div>
          <span>{visibleReservations.length} bookings visible</span>
        </div>
      )}
    </div>
  )
}
