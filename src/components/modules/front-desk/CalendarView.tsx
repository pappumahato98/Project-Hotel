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
  BedDouble,
  Filter,
  X,
  CheckCircle2,
  Home,
  Eye,
} from 'lucide-react'
import {
  format,
  addDays,
  startOfDay,
  isToday,
  isSameDay,
  isWeekend,
  parseISO,
  differenceInDays,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'
import { toast } from 'sonner'

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_WIDTH = 72
const ROW_HEIGHT = 44
const ROOM_LABEL_WIDTH = 140
const NUM_DAYS = 10

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
  confirmed: 'bg-teal-500/80 hover:bg-teal-500',
  checked_in: 'bg-emerald-500/80 hover:bg-emerald-500',
  checked_out: 'bg-gray-400/80 hover:bg-gray-400',
}

const ROOM_STATUS_BG_MAP: Record<string, string> = {
  vacant_clean: 'bg-green-50 dark:bg-green-950/30',
  occupied: 'bg-teal-50 dark:bg-teal-950/30',
  vacant_dirty: 'bg-red-50 dark:bg-red-950/20',
  cleaning: 'bg-amber-50 dark:bg-amber-950/20',
  inspected: 'bg-purple-50 dark:bg-purple-950/20',
  out_of_order: 'bg-gray-100 dark:bg-gray-800/50',
  on_change: 'bg-gray-100 dark:bg-gray-800/50',
}

const ROOM_STATUS_STRIPE: Record<string, string> = {
  out_of_order:
    'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)',
}

const ROOM_STATUS_FRIENDLY: Record<string, string> = {
  vacant_clean: 'Vacant',
  vacant_dirty: 'Dirty',
  cleaning: 'Cleaning',
  inspected: 'Inspected',
  occupied: 'Occupied',
  out_of_order: 'Out of Order',
  on_change: 'Changing',
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
    case 'platinum':
      return 'Platinum'
    case 'gold':
      return 'Gold'
    case 'silver':
      return 'Silver'
    default:
      return ''
  }
}

function getOccupancyBarColor(pct: number): string {
  if (pct < 50) return 'bg-emerald-500'
  if (pct <= 80) return 'bg-amber-500'
  return 'bg-red-500'
}

// ─── Legend Component ────────────────────────────────────────────────────

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      <Separator orientation="vertical" className="h-4 hidden sm:block" />
      {/* Booking Status */}
      <span className="font-semibold text-foreground">Booking:</span>
      <div className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-teal-500/80" />
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
        <span className="inline-block size-2.5 rounded-sm bg-teal-50 border border-teal-200 dark:bg-teal-950/40" />
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
  const { navigateTo } = useNavigationStore()
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
                <span className="text-muted-foreground">
                  {' '}
                  ({reservation.room.type.code})
                </span>
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
              <p className="font-medium capitalize">
                {reservation.source.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[11px] gap-1"
            onClick={() => navigateTo('front-desk', 'reservations')}
          >
            <Eye className="size-3" />
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[11px] gap-1"
            onClick={() => navigateTo('rooms', 'room-board')}
          >
            <BedDouble className="size-3" />
            View Room
          </Button>
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
            <Skeleton
              key={i}
              className="h-10 flex-shrink-0"
              style={{ width: DAY_WIDTH }}
            />
          ))}
        </div>
      </div>
      {/* Room row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-0">
          <Skeleton
            className="flex-shrink-0"
            style={{ width: ROOM_LABEL_WIDTH, height: ROW_HEIGHT }}
          />
          <div className="flex gap-0">
            {Array.from({ length: NUM_DAYS }).map((_, j) => (
              <Skeleton
                key={j}
                className="flex-shrink-0"
                style={{ width: DAY_WIDTH, height: ROW_HEIGHT }}
              />
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
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { navigateTo } = useNavigationStore()

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
    () =>
      allReservations.filter(
        (r: Reservation) => relevantStatuses.has(r.status) && r.roomId,
      ),
    [allReservations],
  )

  const dates = useMemo(() => getDates(startDate, NUM_DAYS), [startDate])

  // ─── Unique floors & room types ──────────────────────────────────────
  const uniqueFloors = useMemo(() => {
    const floors = new Set(rooms.map((r) => r.floor))
    return Array.from(floors).sort((a, b) => a - b)
  }, [rooms])

  const uniqueRoomTypes = useMemo(() => {
    const types = new Map<string, string>()
    for (const r of rooms) {
      if (r.type && !types.has(r.typeId)) {
        types.set(r.typeId, r.type.name)
      }
    }
    return Array.from(types.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }))
  }, [rooms])

  // ─── Filtered rooms ─────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (floorFilter !== 'all' && room.floor !== Number(floorFilter))
        return false
      if (typeFilter !== 'all' && room.typeId !== typeFilter) return false
      if (statusFilter !== 'all' && room.status !== statusFilter) return false
      return true
    })
  }, [rooms, floorFilter, typeFilter, statusFilter])

  // ─── Clear filters ────────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setFloorFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
  }, [])

  const hasActiveFilters =
    floorFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'

  // ─── Summary stats ────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const todayKey = format(today, 'yyyy-MM-dd')
    const occupiedSet = new Set<string>()
    for (const r of reservations) {
      if (r.status !== 'checked_in') continue
      const ci = format(startOfDay(parseISO(r.checkIn)), 'yyyy-MM-dd')
      const co = format(startOfDay(parseISO(r.checkOut)), 'yyyy-MM-dd')
      if (ci <= todayKey && co > todayKey) {
        occupiedSet.add(r.roomId)
      }
    }
    const totalRooms = rooms.length
    const occupiedCount = occupiedSet.size
    const availableCount = rooms.filter(
      (r) => r.status === 'vacant_clean' && !occupiedSet.has(r.id),
    ).length
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0

    return { totalRooms, occupiedCount, availableCount, occupancyRate }
  }, [rooms, reservations, today])

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

  // ─── Daily occupancy rates for the occupancy bar ──────────────────────
  const dailyOccupancy = useMemo(() => {
    const occupancyMap: Map<string, number> = new Map()
    for (const date of dates) {
      const dayKey = format(date, 'yyyy-MM-dd')
      const occupiedRoomIds = new Set<string>()
      for (const r of reservations) {
        if (r.status !== 'checked_in') continue
        const ciKey = format(startOfDay(parseISO(r.checkIn)), 'yyyy-MM-dd')
        const coKey = format(startOfDay(parseISO(r.checkOut)), 'yyyy-MM-dd')
        if (ciKey <= dayKey && coKey > dayKey) {
          occupiedRoomIds.add(r.roomId)
        }
      }
      const totalRooms = rooms.length
      const pct = totalRooms > 0 ? (occupiedRoomIds.size / totalRooms) * 100 : 0
      occupancyMap.set(dayKey, pct)
    }
    return occupancyMap
  }, [reservations, dates, rooms])

  // ─── Build reservation blocks per room ──────────────────────────────
  const reservationBlocks = useMemo(() => {
    const blocks: Map<
      string,
      Array<{ reservation: Reservation; left: number; width: number }>
    > = new Map()

    for (const r of reservations) {
      const ciDay = startOfDay(parseISO(r.checkIn))
      const coDay = startOfDay(parseISO(r.checkOut))

      // Compute column positions
      const startCol = differenceInDays(ciDay, startDate)
      const endCol = differenceInDays(coDay, startDate)

      // Only render if at least partially visible
      if (endCol <= 0 || startCol >= NUM_DAYS) continue

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
        width = endCol * DAY_WIDTH - 1
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

  // ─── Pre-compute occupied day sets per room for empty-cell detection ─
  const roomOccupiedDays = useMemo(() => {
    const map: Map<string, Set<number>> = new Map()
    for (const [roomId, blocks] of reservationBlocks) {
      const set = new Set<number>()
      for (const { reservation } of blocks) {
        const ci = startOfDay(parseISO(reservation.checkIn))
        const co = startOfDay(parseISO(reservation.checkOut))
        const startCol = differenceInDays(ci, startDate)
        const endCol = differenceInDays(co, startDate)
        for (let d = Math.max(0, startCol); d < Math.min(NUM_DAYS, endCol); d++) {
          set.add(d)
        }
      }
      map.set(roomId, set)
    }
    return map
  }, [reservationBlocks, startDate])

  // ─── Handlers ────────────────────────────────────────────────────────
  const goToday = useCallback(() => setStartDateOffset(0), [])
  const goPrev = useCallback(
    () => setStartDateOffset((prev) => prev - 5),
    [],
  )
  const goNext = useCallback(
    () => setStartDateOffset((prev) => prev + 5),
    [],
  )

  // ─── Empty cell click handler ────────────────────────────────────────
  const handleEmptyCellClick = useCallback(
    (roomNumber: string, date: Date) => {
      toast.info(
        `Click "New Reservation" to book Room ${roomNumber} for ${format(date, 'MMM d')}`,
      )
    },
    [],
  )

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
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={goPrev}
            >
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
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={goNext}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground min-w-[180px] text-center">
            {dateRangeLabel}
          </span>
        </div>
      </div>

      {/* ─── Summary Stats Cards ─────────────────────────────────────── */}
      {!isLoading && rooms.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="py-0">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <BedDouble className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Total Rooms
                </p>
                <p className="text-lg font-bold leading-tight">
                  {summaryStats.totalRooms}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Occupied
                </p>
                <p className="text-lg font-bold leading-tight">
                  {summaryStats.occupiedCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-green-100 dark:bg-green-950/40">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Available
                </p>
                <p className="text-lg font-bold leading-tight">
                  {summaryStats.availableCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <Home className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Occupancy Rate
                </p>
                <p className="text-lg font-bold leading-tight">
                  {summaryStats.occupancyRate}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Legend ───────────────────────────────────────────────────── */}
      <Card className="py-2 px-4">
        <CardContent className="p-0">
          <CalendarLegend />
        </CardContent>
      </Card>

      {/* ─── Filter Bar ───────────────────────────────────────────────── */}
      {!isLoading && rooms.length > 0 && (
        <Card className="py-2 px-4">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="size-3.5" />
                Filters
              </div>

              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Floor Filter */}
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {uniqueFloors.map((floor) => (
                      <SelectItem key={floor} value={String(floor)}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Room Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueRoomTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="vacant_clean">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="vacant_dirty">Dirty</SelectItem>
                    <SelectItem value="out_of_order">Out of Order</SelectItem>
                  </SelectContent>
                </Select>

                {/* Room count */}
                <span className="text-xs text-muted-foreground">
                  Showing{' '}
                  <span className="font-semibold text-foreground">
                    {filteredRooms.length}
                  </span>{' '}
                  of {rooms.length} rooms
                </span>
              </div>

              {/* Clear button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-xs">
                Rooms need to be set up to display the calendar.
              </p>
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
                      const occPct = dailyOccupancy.get(format(date, 'yyyy-MM-dd')) ?? 0

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
                          <span
                            className={cn(
                              'text-[10px] font-medium leading-tight',
                              todayCol
                                ? 'text-primary'
                                : weekend
                                  ? 'text-orange-500'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {format(date, 'EEE')}
                          </span>

                          {/* Day number */}
                          <span
                            className={cn(
                              'text-xs font-bold leading-tight',
                              todayCol && 'text-primary',
                            )}
                          >
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
                              <div
                                className="flex items-center gap-0.5"
                                title={`${dayStats!.arrivals} arrival(s)`}
                              >
                                <span className="size-1.5 rounded-full bg-green-500" />
                                {dayStats!.arrivals > 1 && (
                                  <span className="text-[8px] font-bold text-green-600 dark:text-green-400 leading-none">
                                    {dayStats!.arrivals}
                                  </span>
                                )}
                              </div>
                            )}
                            {hasDepartures && (
                              <div
                                className="flex items-center gap-0.5"
                                title={`${dayStats!.departures} departure(s)`}
                              >
                                <span className="size-1.5 rounded-full bg-orange-500" />
                                {dayStats!.departures > 1 && (
                                  <span className="text-[8px] font-bold text-orange-600 dark:text-orange-400 leading-none">
                                    {dayStats!.departures}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ─── Occupancy bar at bottom of header ──── */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30"
                            title={`${Math.round(occPct)}% occupied`}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                getOccupancyBarColor(occPct),
                              )}
                              style={{ width: `${Math.min(occPct, 100)}%` }}
                            />
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
                      ...(function () {
                        const todayIdx = dates.findIndex((d) => isToday(d))
                        if (todayIdx >= 0)
                          return {
                            transform: `translateX(${todayIdx * DAY_WIDTH}px)`,
                          }
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

                  {filteredRooms.map((room, roomIdx) => {
                    const roomBlocks =
                      reservationBlocks.get(room.id) || []
                    const rowBg = getRoomRowBg(room.status)
                    const stripeBg = ROOM_STATUS_STRIPE[room.status]
                    const occupiedDaySet = roomOccupiedDays.get(room.id) || new Set()

                    return (
                      <div
                        key={room.id}
                        className="flex border-b relative z-10"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Room Label — clickable to navigate to Room Management */}
                        <button
                          className={cn(
                            'flex-shrink-0 border-r flex items-center gap-2 px-2.5 sticky left-0 z-10 cursor-pointer transition-colors hover:bg-accent/60 text-left',
                          )}
                          style={{
                            width: ROOM_LABEL_WIDTH,
                            background: stripeBg || undefined,
                          }}
                          onClick={() => navigateTo('rooms', 'room-board')}
                          title={`Go to Room ${room.number} management`}
                        >
                          <div
                            className={cn(
                              'absolute inset-0 z-[-1]',
                              rowBg,
                            )}
                          />
                          <div className="flex flex-col leading-tight min-w-0 relative z-10">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold truncate">
                                {room.number}
                              </span>
                              <BedDouble className="size-2.5 text-muted-foreground flex-shrink-0" />
                            </div>
                            <span className="text-[9px] text-muted-foreground truncate">
                              {room.type?.code || ''} · F{room.floor}
                              {room.status && (
                                <span className="ml-1 text-[8px]">
                                  · {ROOM_STATUS_FRIENDLY[room.status] || room.status}
                                </span>
                              )}
                            </span>
                          </div>
                        </button>

                        {/* Day Cells */}
                        <div
                          className="relative flex-shrink-0"
                          style={{ width: NUM_DAYS * DAY_WIDTH }}
                        >
                          {/* Room status background for day cells */}
                          <div
                            className={cn('absolute inset-0', rowBg)}
                            style={{ background: stripeBg || undefined }}
                          />

                          {/* Empty cell click zones */}
                          {dates.map((date, dayIdx) => {
                            if (occupiedDaySet.has(dayIdx)) return null
                            return (
                              <button
                                key={`empty-${room.id}-${dayIdx}`}
                                className="absolute top-0 bottom-0 z-[5] cursor-pointer hover:bg-primary/5 transition-colors"
                                style={{
                                  left: ROOM_LABEL_WIDTH - ROOM_LABEL_WIDTH + dayIdx * DAY_WIDTH,
                                  width: DAY_WIDTH,
                                }}
                                onClick={() =>
                                  handleEmptyCellClick(
                                    room.number,
                                    date,
                                  )
                                }
                                title={`Book Room ${room.number} for ${format(date, 'MMM d')}`}
                              />
                            )
                          })}

                          {/* Reservation Blocks */}
                          {roomBlocks.map(
                            ({ reservation: res, left, width }) => {
                              const guestName = res.guest
                                ? truncate(
                                    `${res.guest.firstName} ${res.guest.lastName}`,
                                    width < 100 ? 6 : 12,
                                  )
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
                                        left:
                                          ROOM_LABEL_WIDTH -
                                          ROOM_LABEL_WIDTH +
                                          left,
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
                                          {truncate(
                                            res.confirmationNo,
                                            8,
                                          )}
                                        </span>
                                      )}
                                    </button>
                                  </PopoverTrigger>
                                  <ReservationPopover reservation={res} />
                                </Popover>
                              )
                            },
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* ─── Empty state for no reservations or filtered results ──────── */}
                  {visibleReservations.length === 0 && filteredRooms.length > 0 && (
                    <div className="flex items-center justify-center py-6">
                      <p className="text-xs text-muted-foreground/60">
                        No reservations in this date range
                      </p>
                    </div>
                  )}

                  {filteredRooms.length === 0 && rooms.length > 0 && (
                    <div className="flex items-center justify-center py-6">
                      <p className="text-xs text-muted-foreground/60">
                        No rooms match the selected filters
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
                const ci = format(
                  startOfDay(parseISO(r.checkIn)),
                  'yyyy-MM-dd',
                )
                return (
                  ci >= format(startDate, 'yyyy-MM-dd') &&
                  ci < format(addDays(startDate, NUM_DAYS), 'yyyy-MM-dd')
                )
              }).length}{' '}
              arrivals
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-orange-500" />
              {reservations.filter((r) => {
                const co = format(
                  startOfDay(parseISO(r.checkOut)),
                  'yyyy-MM-dd',
                )
                return (
                  co >= format(startDate, 'yyyy-MM-dd') &&
                  co < format(addDays(startDate, NUM_DAYS), 'yyyy-MM-dd')
                )
              }).length}{' '}
              departures
            </span>
          </div>
          <span>{visibleReservations.length} bookings visible</span>
        </div>
      )}
    </div>
  )
}
