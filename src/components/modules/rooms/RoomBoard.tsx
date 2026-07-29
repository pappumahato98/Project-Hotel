'use client'

import React, { useState, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useRealtimeSubscription } from '@/hooks/use-realtime'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomDetailDrawer } from './RoomDetailDrawer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  BedDouble,
  Users,
  AlertTriangle,
  CheckCircle2,
  Home,
  Sparkles,
  Ban,
  RefreshCw,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────
interface RoomGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
  phone: string | null
  nationality: string | null
}

interface RoomReservation {
  id: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number
  adults: number
  children: number
  source: string | null
}

interface RoomData {
  id: string
  number: string
  floor: number
  wing: string | null
  view: string | null
  status: string
  typeId: string
  type: {
    id: string
    name: string
    code: string
    baseOccupancy: number
    maxOccupancy: number
    bedConfig: string
    areaSqFt: number | null
    view: string | null
    amenities: string | null
  }
  guest: RoomGuest | null
  reservation: RoomReservation | null
}

interface RoomsApiResponse {
  rooms: RoomData[]
  statusBreakdown: Record<string, number>
  floors: number[]
  wings: string[]
  roomTypes: Array<{
    id: string
    name: string
    code: string
    description: string | null
    baseOccupancy: number
    maxOccupancy: number
    bedConfig: string
    areaSqFt: number | null
    view: string | null
    amenities: string | null
    sortOrder: number
    roomCount: number
    ratePlans: Array<{ id: string; name: string; code: string; baseRate: number; channel: string | null }>
  }>
  restrictions: Array<unknown>
  summary: {
    totalRooms: number
    occupied: number
    available: number
    outOfOrder: number
    dirty: number
    vacantClean: number
    inspected: number
    occupancyRate: number
  }
}

// ─── Status Config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; darkBg: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  vacant_clean: {
    label: 'Vacant Clean',
    bg: 'bg-green-50',
    border: 'border-l-green-500',
    darkBg: 'dark:bg-green-950/40',
    dot: 'bg-green-500',
    icon: CheckCircle2,
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    darkBg: 'dark:bg-blue-950/40',
    dot: 'bg-blue-500',
    icon: Users,
  },
  vacant_dirty: {
    label: 'Vacant Dirty',
    bg: 'bg-yellow-50',
    border: 'border-l-yellow-500',
    darkBg: 'dark:bg-yellow-950/40',
    dot: 'bg-yellow-500',
    icon: AlertTriangle,
  },
  cleaning: {
    label: 'Cleaning',
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    darkBg: 'dark:bg-amber-950/40',
    dot: 'bg-amber-500',
    icon: RefreshCw,
  },
  inspected: {
    label: 'Inspected',
    bg: 'bg-purple-50',
    border: 'border-l-purple-500',
    darkBg: 'dark:bg-purple-950/40',
    dot: 'bg-purple-500',
    icon: Eye,
  },
  out_of_order: {
    label: 'Out of Order',
    bg: 'bg-red-50',
    border: 'border-l-red-500',
    darkBg: 'dark:bg-red-950/40',
    dot: 'bg-red-500',
    icon: Ban,
  },
  on_change: {
    label: 'On Change',
    bg: 'bg-gray-100',
    border: 'border-l-gray-400',
    darkBg: 'dark:bg-gray-800/40',
    dot: 'bg-gray-400',
    icon: RefreshCw,
  },
}

const ALL_STATUSES = ['vacant_clean', 'occupied', 'vacant_dirty', 'cleaning', 'inspected', 'out_of_order', 'on_change']

// ─── Helpers ──────────────────────────────────────────────────
function formatNpr(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP')}`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// ─── VIP Badge ────────────────────────────────────────────────
function VipBadge({ level }: { level: string }) {
  if (level === 'none') return null

  const colors: Record<string, string> = {
    silver: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    gold: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    platinum: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  }

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 gap-0.5 font-semibold', colors[level] || colors.silver)}>
      <Sparkles className="size-2.5" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  )
}

// ─── Room Cell ────────────────────────────────────────────────
function RoomCell({ room, onClick }: { room: RoomData; onClick: () => void }) {
  const config = STATUS_CONFIG[room.status] || STATUS_CONFIG.vacant_clean
  const Icon = config.icon
  const isOccupied = room.status === 'occupied'
  const isTodayDeparture = room.reservation && isToday(room.reservation.checkOut)
  const isTodayArrival = room.reservation && isToday(room.reservation.checkIn)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-lg border border-l-[3px] p-3 text-left transition-all duration-150 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        config.bg,
        config.border,
        config.darkBg,
      )}
    >
      {/* Status dot */}
      <div className={cn('absolute top-2 right-2 size-2 rounded-full', config.dot)} />

      {/* Room number */}
      <span className="text-lg font-bold tracking-tight leading-none">{room.number}</span>

      {/* Room type */}
      <span className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">{room.type.code}</span>

      {/* Guest info */}
      {isOccupied && room.guest && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate max-w-full">{room.guest.firstName}</span>
            {room.guest.vipLevel !== 'none' && <VipBadge level={room.guest.vipLevel} />}
          </div>
        </div>
      )}

      {/* Departure/Arrival indicator */}
      {isTodayDeparture && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
          <span className="size-1 rounded-full bg-red-500 animate-pulse" />
          Dep {formatTime(room.reservation!.checkOut)}
        </div>
      )}
      {isTodayArrival && !isOccupied && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
          Arr {formatTime(room.reservation!.checkIn)}
        </div>
      )}

      {/* Quick status label at bottom */}
      <div className="mt-auto pt-1.5 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <Icon className="size-3" />
        <span className="text-[10px] font-medium">{config.label}</span>
      </div>
    </button>
  )
}

// ─── Legend Bar ────────────────────────────────────────────────
function LegendBar({ statusBreakdown }: { statusBreakdown: Record<string, number> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ALL_STATUSES.map((status) => {
        const config = STATUS_CONFIG[status]
        if (!config) return null
        const count = statusBreakdown[status] || 0
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('size-2.5 rounded-sm', config.dot)} />
            <span className="text-xs font-medium">{config.label}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
              {count}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

// ─── Summary Cards ───────────────────────────────────────────
function SummaryCards({ summary }: { summary: RoomsApiResponse['summary'] }) {
  const cards = [
    { label: 'Total Rooms', value: summary.totalRooms, icon: BedDouble, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    { label: 'Available', value: summary.available, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Occupied', value: summary.occupied, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Occupancy', value: `${summary.occupancyRate}%`, icon: Home, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Dirty / Cleaning', value: summary.dirty, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { label: 'Out of Order', value: summary.outOfOrder, icon: Ban, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-lg border bg-card p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground truncate">{card.label}</span>
              <div className={cn('size-6 rounded-md flex items-center justify-center shrink-0', card.bg)}>
                <Icon className={cn('size-3.5', card.color)} />
              </div>
            </div>
            <p className={cn('text-lg font-bold tracking-tight', card.color)}>{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────
function FilterBar({
  floors,
  wings,
  roomTypes,
  filters,
  onFilterChange,
  onReset,
}: {
  floors: number[]
  wings: string[]
  roomTypes: Array<{ id: string; name: string; code: string }>
  filters: { floor: string; wing: string; roomType: string; status: string }
  onFilterChange: (key: string, value: string) => void
  onReset: () => void
}) {
  const hasFilters = filters.floor !== 'all' || filters.wing !== 'all' || filters.roomType !== 'all' || filters.status !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Filter className="size-3" />
        Filters:
      </div>

      <Select value={filters.floor} onValueChange={(v) => onFilterChange('floor', v)}>
        <SelectTrigger size="sm" className="w-[110px] h-7 text-xs">
          <SelectValue placeholder="Floor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Floors</SelectItem>
          {floors.map((f) => (
            <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.wing} onValueChange={(v) => onFilterChange('wing', v)}>
        <SelectTrigger size="sm" className="w-[110px] h-7 text-xs">
          <SelectValue placeholder="Wing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Wings</SelectItem>
          {wings.map((w) => (
            <SelectItem key={w} value={w}>Wing {w}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.roomType} onValueChange={(v) => onFilterChange('roomType', v)}>
        <SelectTrigger size="sm" className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="Room Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {roomTypes.map((rt) => (
            <SelectItem key={rt.id} value={rt.code}>{rt.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
        <SelectTrigger size="sm" className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {ALL_STATUSES.map((s) => {
            const config = STATUS_CONFIG[s]
            return (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <div className={cn('size-2 rounded-sm', config.dot)} />
                  {config.label}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          title="Clear all filters"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Floor Section ────────────────────────────────────────────
function FloorSection({
  floor,
  rooms,
  expandedFloors,
  toggleFloor,
  onRoomClick,
}: {
  floor: number
  rooms: RoomData[]
  expandedFloors: Set<number>
  toggleFloor: (f: number) => void
  onRoomClick: (room: RoomData) => void
}) {
  const isExpanded = expandedFloors.has(floor)

  // Group rooms by wing
  const wings = [...new Set(rooms.map(r => r.wing || 'Main'))].sort()
  const roomsByWing = wings.reduce<Record<string, RoomData[]>>((acc, wing) => {
    acc[wing] = rooms.filter(r => (r.wing || 'Main') === wing)
    return acc
  }, {})

  // Status count per floor
  const floorStatusCounts = rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-2">
      {/* Floor header */}
      <button
        onClick={() => toggleFloor(floor)}
        className="flex items-center gap-3 w-full group"
      >
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 flex-1 hover:bg-accent/50 transition-colors">
          <span className="text-sm font-bold text-muted-foreground">F{floor}</span>
          <span className="text-sm font-semibold">Floor {floor}</span>
          <span className="text-xs text-muted-foreground">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </span>
          <div className="hidden sm:flex items-center gap-1 ml-2">
            {Object.entries(floorStatusCounts).map(([status, count]) => {
              const config = STATUS_CONFIG[status]
              return config ? (
                <div key={status} className="flex items-center gap-0.5">
                  <div className={cn('size-1.5 rounded-full', config.dot)} />
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </div>
              ) : null
            })}
          </div>
          <div className="ml-auto">
            {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {/* Room grid */}
      {isExpanded && (
        <div className="space-y-3 pl-0 sm:pl-2">
          {Object.entries(roomsByWing).map(([wing, wingRooms]) => (
            <div key={wing}>
              {wings.length > 1 && (
                <p className="text-[11px] font-medium text-muted-foreground mb-2 ml-1 uppercase tracking-wider">
                  {wing} Wing
                </p>
              )}
              {/* Desktop: Grid, Mobile: Scroll */}
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {wingRooms.map((room) => (
                  <RoomCell key={room.id} room={room} onClick={() => onRoomClick(room)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────
function RoomBoardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6 overflow-y-auto">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export function RoomBoard() {
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState({
    floor: 'all',
    wing: 'all',
    roomType: 'all',
    status: 'all',
  })

  // Fetch rooms data
  const { data, isLoading, error, refetch } = useQuery<RoomsApiResponse>({
    queryKey: ['rooms', 'board'],
    queryFn: () => apiFetch('/api/rooms'),
    staleTime: 30_000, // 30s stale time for near-real-time
    refetchInterval: 60_000, // Auto refresh every minute
  })

  // Subscribe to realtime room status changes — auto-refetch on update
  useRealtimeSubscription('Room', {
    onUpdate: () => { refetch() },
    onInsert: () => { refetch() },
  })

  // Filter rooms
  const filteredRooms = useMemo(() => {
    if (!data) return []
    let rooms = data.rooms
    if (filters.floor !== 'all') rooms = rooms.filter(r => String(r.floor) === filters.floor)
    if (filters.wing !== 'all') rooms = rooms.filter(r => r.wing === filters.wing)
    if (filters.roomType !== 'all') rooms = rooms.filter(r => r.type.code === filters.roomType)
    if (filters.status !== 'all') rooms = rooms.filter(r => r.status === filters.status)
    return rooms
  }, [data, filters])

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, RoomData[]>()
    for (const room of filteredRooms) {
      if (!map.has(room.floor)) map.set(room.floor, [])
      map.get(room.floor)!.push(room)
    }
    return map
  }, [filteredRooms])

  // Expand all floors by default
  React.useEffect(() => {
    if (data && expandedFloors.size === 0) {
      setExpandedFloors(new Set(data.floors))
    }
  }, [data])

  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev)
      if (next.has(floor)) next.delete(floor)
      else next.add(floor)
      return next
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({ floor: 'all', wing: 'all', roomType: 'all', status: 'all' })
  }

  const handleRoomClick = (room: RoomData) => {
    setSelectedRoom(room)
    setDrawerOpen(true)
  }

  if (isLoading) return <RoomBoardSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load room data</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-2">
          {/* Summary Stats */}
          <SummaryCards summary={data.summary} />

          {/* Legend Bar */}
          <div className="rounded-lg border bg-card p-2.5">
            <LegendBar statusBreakdown={data.statusBreakdown} />
          </div>

          {/* Filter Bar */}
          <FilterBar
            floors={data.floors}
            wings={data.wings}
            roomTypes={data.roomTypes}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={resetFilters}
          />

          <Separator />

          {/* Floor Sections */}
          <div className="space-y-2">
            {data.floors.map((floor) => {
              const floorRooms = roomsByFloor.get(floor)
              if (!floorRooms || floorRooms.length === 0) return null
              return (
                <FloorSection
                  key={floor}
                  floor={floor}
                  rooms={floorRooms}
                  expandedFloors={expandedFloors}
                  toggleFloor={toggleFloor}
                  onRoomClick={handleRoomClick}
                />
              )
            })}
          </div>

          {/* No results */}
          {filteredRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BedDouble className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No rooms match the current filters</p>
              <Button variant="link" size="sm" onClick={resetFilters} className="mt-1">
                Clear filters
              </Button>
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </ScrollArea>

      {/* Room Detail Drawer */}
      {selectedRoom && (
        <RoomDetailDrawer
          room={selectedRoom}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </div>
  )
}
