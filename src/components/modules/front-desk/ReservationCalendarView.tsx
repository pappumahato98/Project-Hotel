'use client'

import { apiFetch } from '@/lib/api'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidate } from '@/lib/queryKeys'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Star,
  Plus,
  X,
  GripHorizontal,
  BedDouble,
  Eye,
  DollarSign,
  Users,
  Tag,
  MessageSquare,
  Building2,
  Calendar,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/format'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { cn } from '@/lib/utils'
import { useEnterSubmit } from '@/hooks/use-enter-submit'
import { toast } from 'sonner'
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  differenceInDays,
  parseISO,
  isToday,
  isWeekend,
  startOfDay,
} from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────

interface RoomType {
  id: string
  name: string
  code: string
  baseOccupancy: number
  maxOccupancy: number
  bedConfig: string
  areaSqFt: number | null
  view: string | null
}

interface Room {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  typeId: string
  type: RoomType
}

interface ReservationGuest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  vipLevel: string
}

interface ReservationRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  type: { name: string; code: string }
}

interface Reservation {
  id: string
  confirmationNo: string
  status: string
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  specialRequests: string | null
  source: string | null
  guaranteed: boolean
  company: string | null
  notes: string | null
  createdAt: string
  guest: ReservationGuest | null
  room: ReservationRoom | null
  roomId?: string | null
  folios: { id: string; balance: number; status: string }[]
}

interface NewReservationForm {
  guestName: string
  roomId: string
  checkIn: string
  checkOut: string
  adults: number
  roomRate: number
  source: string
}

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_WIDTH = 60
const ROW_HEIGHT = 48
const VISIBLE_DAYS = 21

const RESERVATION_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: { bg: 'bg-teal-500/85', text: 'text-white', border: 'border-teal-600' },
  checked_in: { bg: 'bg-emerald-500/85', text: 'text-white', border: 'border-emerald-600' },
  checked_out: { bg: 'bg-gray-400/75', text: 'text-gray-700', border: 'border-gray-400' },
  cancelled: { bg: 'bg-red-400/75', text: 'text-white', border: 'border-red-500' },
  no_show: { bg: 'bg-orange-500/85', text: 'text-white', border: 'border-orange-600' },
}

const ROOM_STATUS_COLORS: Record<string, string> = {
  vacant_clean: 'bg-green-500',
  occupied: 'bg-blue-500',
  vacant_dirty: 'bg-yellow-500',
  cleaning: 'bg-orange-500',
  out_of_order: 'bg-red-500',
  inspected: 'bg-green-400',
  on_change: 'bg-yellow-400',
}

const ROOM_STATUS_LABELS: Record<string, string> = {
  vacant_clean: 'Vacant Clean',
  occupied: 'Occupied',
  vacant_dirty: 'Vacant Dirty',
  cleaning: 'Cleaning',
  out_of_order: 'Out of Order',
  inspected: 'Inspected',
  on_change: 'Change Over',
}

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'corporate', label: 'Corporate' },
]

// ─── Utility ────────────────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

function getStatusColor(status: string) {
  return RESERVATION_STATUS_COLORS[status] || RESERVATION_STATUS_COLORS.confirmed
}

function getRoomStatusColor(status: string) {
  return ROOM_STATUS_COLORS[status] || 'bg-gray-400'
}

// ─── Component ──────────────────────────────────────────────────────────

export function ReservationCalendarView() {
  const queryClient = useQueryClient()

  // Navigation state
  const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()))
  const gridRef = useRef<HTMLDivElement>(null)

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [newResOpen, setNewResOpen] = useState(false)
  const [newResForm, setNewResForm] = useState<NewReservationForm>({
    guestName: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    roomRate: 0,
    source: 'direct',
  })

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null)
  const dragRef = useRef<{ reservation: Reservation; startDate: Date } | null>(null)

  // ─── Date range computation ─────────────────────────────────────
  const startDate = useMemo(
    () => startOfWeek(baseDate, { weekStartsOn: 1 }),
    [baseDate],
  )
  const dates = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  )

  // ─── Data fetching ──────────────────────────────────────────────
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      return res.json() as Promise<{ rooms: Room[] }>
    },
    staleTime: 60_000,
  })

  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations-calendar', startDate.toISOString()],
    queryFn: async () => {
      // Fetch a wide range to cover visible days plus some buffer
      const from = format(addDays(startDate, -14), 'yyyy-MM-dd')
      const to = format(addDays(startDate, VISIBLE_DAYS + 14), 'yyyy-MM-dd')
      const params = new URLSearchParams({ checkInDate: from, checkOutDate: to })
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json() as Promise<{ reservations: Reservation[] }>
    },
    staleTime: 30_000,
  })

  // ─── Derived data ────────────────────────────────────────────────
  const rooms = useMemo(() => {
    if (!roomsData?.rooms) return []
    return [...roomsData.rooms].sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number))
  }, [roomsData])

  const reservations = useMemo(() => {
    if (!reservationsData?.reservations) return []
    return reservationsData.reservations
  }, [reservationsData])

  // Build reservation map: roomId -> reservation[]
  const roomReservations = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const res of reservations) {
      if (!res.roomId) continue
      const list = map.get(res.roomId) || []
      list.push(res)
      map.set(res.roomId, list)
    }
    return map
  }, [reservations])

  // Arrival / Departure day sets (for header dots)
  const arrivalDays = useMemo(() => {
    const set = new Set<string>()
    for (const res of reservations) {
      if (res.roomId) set.add(startOfDay(parseISO(res.checkIn)).toISOString())
    }
    return set
  }, [reservations])

  const departureDays = useMemo(() => {
    const set = new Set<string>()
    for (const res of reservations) {
      if (res.roomId) set.add(startOfDay(parseISO(res.checkOut)).toISOString())
    }
    return set
  }, [reservations])

  // ─── Navigation handlers ────────────────────────────────────────
  const goToToday = useCallback(() => setBaseDate(startOfDay(new Date())), [])

  const goBack = useCallback(() => {
    setBaseDate((prev) => addDays(prev, -7))
  }, [])

  const goForward = useCallback(() => {
    setBaseDate((prev) => addDays(prev, 7))
  }, [])

  // Scroll to today on mount
  useEffect(() => {
    if (gridRef.current) {
      const todayCol = gridRef.current.querySelector('[data-today]')
      if (todayCol) {
        todayCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [startDate])

  // ─── Drag & Drop handlers ──────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, reservation: Reservation) => {
      setDraggingId(reservation.id)
      dragRef.current = {
        reservation,
        startDate: parseISO(reservation.checkIn),
      }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', reservation.id)
      // Set a minimal drag image so the ghost doesn't block the drop target
      const ghost = document.createElement('div')
      ghost.style.opacity = '0'
      ghost.style.position = 'absolute'
      ghost.style.top = '-1000px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      setTimeout(() => document.body.removeChild(ghost), 0)
    },
    [],
  )

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDragOverRoomId(null)
    setDragOverDate(null)
    dragRef.current = null
  }, [])

  const handleCellDragOver = useCallback(
    (e: React.DragEvent, roomId: string, date: Date) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverRoomId(roomId)
      setDragOverDate(date)
    },
    [],
  )

  const handleCellDragLeave = useCallback(() => {
    setDragOverRoomId(null)
    setDragOverDate(null)
  }, [])

  // Update reservation dates mutation
  const updateDatesMutation = useMutation({
    mutationFn: async ({ id, checkIn, checkOut, totalAmount }: { id: string; checkIn: string; checkOut: string; totalAmount: number }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn, checkOut, totalAmount }),
      })
      if (!res.ok) throw new Error('Failed to update reservation')
      return res.json()
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] })
      toast.success('Reservation dates updated')
    },
    onError: () => {
      toast.error('Failed to update reservation dates')
    },
  })

  const handleCellDrop = useCallback(
    (e: React.DragEvent, roomId: string, date: Date) => {
      e.preventDefault()
      if (!dragRef.current) return

      const { reservation, startDate: origStart } = dragRef.current
      const stayLength = differenceInDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn))
      const newCheckIn = format(date, 'yyyy-MM-dd')
      const newCheckOut = format(addDays(date, stayLength), 'yyyy-MM-dd')
      const newTotal = stayLength * reservation.roomRate

      updateDatesMutation.mutate({
        id: reservation.id,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        totalAmount: newTotal,
      })

      setDraggingId(null)
      setDragOverRoomId(null)
      setDragOverDate(null)
      dragRef.current = null
    },
    [updateDatesMutation],
  )

  // ─── Double-click handler for new reservation ───────────────────
  const handleCellDoubleClick = useCallback((roomId: string, date: Date) => {
    const room = rooms.find((r) => r.id === roomId)
    setNewResForm({
      guestName: '',
      roomId,
      checkIn: format(date, 'yyyy-MM-dd'),
      checkOut: format(addDays(date, 1), 'yyyy-MM-dd'),
      adults: 1,
      roomRate: room?.type ? 5000 : 0,
      source: 'direct',
    })
    setNewResOpen(true)
  }, [rooms])

  // ─── Create reservation mutation ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (form: NewReservationForm) => {
      // First, create or find a guest by name
      let guestId: string | undefined
      if (form.guestName.trim()) {
        const nameParts = form.guestName.trim().split(/\s+/, 2)
        const guestRes = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: nameParts[0] || form.guestName,
            lastName: nameParts[1] || '',
            phone: '',
            email: '',
          }),
        })
        if (guestRes.ok) {
          const guestData = await guestRes.json()
          guestId = guestData.guest?.id
        }
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          roomId: form.roomId || undefined,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          adults: form.adults,
          roomRate: form.roomRate,
          source: form.source,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create reservation')
      }
      return res.json()
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] })
      setNewResOpen(false)
      toast.success('Reservation created successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create reservation')
    },
  })

  // ─── Enter-submit hook for new reservation ────────────────────
  const newResRef = useEnterSubmit({ onSubmit: () => createMutation.mutate(newResForm), disabled: !newResForm.guestName || !newResForm.checkOut || createMutation.isPending })

  // ─── Click handler for reservation detail ───────────────────────
  const handleBlockClick = useCallback((e: React.MouseEvent, reservation: Reservation) => {
    e.stopPropagation()
    setSelectedReservation(reservation)
    setDetailOpen(true)
  }, [])

  // ─── Render: Legend ────────────────────────────────────────────
  const renderLegend = () => (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {/* Booking Status */}
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-teal-500/85" />
        <span className="text-muted-foreground">Confirmed</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/85" />
        <span className="text-muted-foreground">In-House</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-gray-400/75" />
        <span className="text-muted-foreground">Checked Out</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-red-400/75" />
        <span className="text-muted-foreground">Cancelled</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-orange-500/85" />
        <span className="text-muted-foreground">No-Show</span>
      </div>
      <Separator orientation="vertical" className="h-4 mx-0" />
      {/* Date Types */}
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/25 border border-emerald-500/50" />
        <span className="text-muted-foreground">Arrival</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/25 border border-amber-500/50" />
        <span className="text-muted-foreground">Departure</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-primary/8 border border-primary/20" />
        <span className="text-muted-foreground">Today</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-muted/50" />
        <span className="text-muted-foreground">Weekend</span>
      </div>
      <Separator orientation="vertical" className="h-4 mx-0" />
      <div className="flex items-center gap-1.5">
        <Star className="size-3 text-amber-500 fill-amber-500" />
        <span className="text-muted-foreground">VIP</span>
      </div>
      <Separator orientation="vertical" className="h-4 mx-0" />
      {/* Room Status */}
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        <span className="text-muted-foreground">Clean</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-muted-foreground">Occupied</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-muted-foreground">Dirty</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
        <span className="text-muted-foreground">OOO</span>
      </div>
    </div>
  )

  // ─── Render: Date Header ──────────────────────────────────────
  const renderDateHeaders = () => (
    <div className="flex" style={{ marginLeft: 200 }}>
      {dates.map((date, i) => {
        const isTodayCol = isToday(date)
        const isWeekendCol = isWeekend(date)
        return (
          <div
            key={i}
            data-today={isTodayCol ? true : undefined}
            className={cn(
              'flex-shrink-0 flex flex-col items-center justify-center border-r border-border text-center select-none',
              isTodayCol && 'bg-primary/5',
              isWeekendCol && 'bg-muted/30',
            )}
            style={{ width: DAY_WIDTH, height: 56 }}
          >
            <span className={cn(
              'text-[10px] font-medium uppercase leading-none',
              isTodayCol ? 'text-primary' : 'text-muted-foreground',
            )}>
              {format(date, 'EEE')}
            </span>
            <span className={cn(
              'text-sm font-bold leading-tight',
              isTodayCol && 'text-primary',
            )}>
              {format(date, 'd')}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">
              {format(date, 'MMM')}
            </span>
            {/* Arrival / Departure dots */}
            <div className="flex items-center gap-0.5 mt-0.5">
              {arrivalDays.has(startOfDay(date).toISOString()) && (
                <span className="size-[5px] rounded-full bg-emerald-500" title="Arrivals" />
              )}
              {departureDays.has(startOfDay(date).toISOString()) && (
                <span className="size-[5px] rounded-full bg-amber-500" title="Departures" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ─── Render: Room Row ──────────────────────────────────────────
  const renderRoomRow = (room: Room) => {
    const roomRes = roomReservations.get(room.id) || []
    const statusColor = getRoomStatusColor(room.status)

    return (
      <div
        key={room.id}
        className="flex border-b border-border hover:bg-muted/20 transition-colors"
        style={{ height: ROW_HEIGHT }}
      >
        {/* Sticky room label */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-2 border-r border-border bg-background z-10"
          style={{ width: 200 }}
        >
          <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', statusColor)} />
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-xs font-semibold truncate leading-tight">{room.number}</span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight">
              {room.type.code} &middot; F{room.floor}
            </span>
          </div>
        </div>

        {/* Day cells */}
        <div className="flex relative">
          {dates.map((date, dayIdx) => {
            const isTodayCol = isToday(date)
            const isWeekendCol = isWeekend(date)
            const isDragOver =
              dragOverRoomId === room.id && dragOverDate && isSameDay(dragOverDate, date)

            // Check if any reservation covers this day
            const resForDay = roomRes.find((r) => {
              const ci = startOfDay(parseISO(r.checkIn))
              const co = startOfDay(parseISO(r.checkOut))
              return (date >= ci && date < co)
            })

            // Only render the reservation on its first day
            const isFirstDay = resForDay
              ? isSameDay(date, startOfDay(parseISO(resForDay.checkIn)))
              : false

            const stayLength = resForDay
              ? differenceInDays(parseISO(resForDay.checkOut), parseISO(resForDay.checkIn))
              : 0

            // Check if this is a check-in or check-out day for any reservation in this room
            const isCheckInDay = roomRes.some((r) => isSameDay(date, startOfDay(parseISO(r.checkIn))))
            const isCheckOutDay = roomRes.some((r) => isSameDay(date, startOfDay(parseISO(r.checkOut))))

            return (
              <div
                key={dayIdx}
                className={cn(
                  'flex-shrink-0 border-r border-border relative select-none',
                  isTodayCol && 'bg-primary/5',
                  isWeekendCol && !isTodayCol && 'bg-muted/30',
                  isDragOver && 'bg-primary/10 ring-1 ring-primary/30 ring-inset',
                  !resForDay && 'cursor-pointer',
                  !resForDay && 'hover:bg-primary/5',
                )}
                style={{ width: DAY_WIDTH, height: ROW_HEIGHT }}
                onDragOver={isFirstDay ? undefined : (e) => handleCellDragOver(e, room.id, date)}
                onDragLeave={!isFirstDay ? handleCellDragLeave : undefined}
                onDrop={!isFirstDay ? (e) => handleCellDrop(e, room.id, date) : undefined}
                onDoubleClick={!isFirstDay ? () => handleCellDoubleClick(room.id, date) : undefined}
              >
                {/* Today vertical line indicator */}
                {isTodayCol && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                )}

                {/* Arrival marker – left half of check-in day */}
                {isCheckInDay && (
                  <div
                    className="absolute left-[2px] top-[6px] bottom-[6px] rounded-l-sm bg-emerald-500/20 border-l-[3px] border-l-emerald-400/70 z-[5] flex items-center justify-center"
                    style={{ width: DAY_WIDTH / 2 - 4 }}
                    title="Arrival"
                  >
                    <span className="text-[7px] font-extrabold text-emerald-600/80 uppercase leading-none select-none">
                      In
                    </span>
                  </div>
                )}

                {/* Departure marker – right half of check-out day */}
                {isCheckOutDay && (
                  <div
                    className="absolute right-[2px] top-[6px] bottom-[6px] rounded-r-sm bg-amber-500/20 border-r-[3px] border-r-amber-400/70 z-[5] flex items-center justify-center"
                    style={{ width: DAY_WIDTH / 2 - 4 }}
                    title="Departure"
                  >
                    <span className="text-[7px] font-extrabold text-amber-600/80 uppercase leading-none select-none">
                      Out
                    </span>
                  </div>
                )}

                {/* Reservation block – half-day positioning: starts from center of check-in day, ends at center of check-out day */}
                {isFirstDay && (
                  <div
                    className={cn(
                      'absolute top-[3px] bottom-[3px] rounded-md cursor-grab active:cursor-grabbing z-10 transition-opacity flex items-center px-1 overflow-hidden gap-1 group',
                      getStatusColor(resForDay.status).bg,
                      getStatusColor(resForDay.status).text,
                      getStatusColor(resForDay.status).border,
                      'border',
                      draggingId === resForDay.id && 'opacity-50',
                    )}
                    style={{
                      left: DAY_WIDTH / 2,
                      width: Math.max(stayLength * DAY_WIDTH - 1, DAY_WIDTH - 1),
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, resForDay)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleBlockClick(e, resForDay)}
                    title={`${resForDay.guest?.firstName || ''} ${resForDay.guest?.lastName || ''} — ${format(parseISO(resForDay.checkIn), 'MMM d')} → ${format(parseISO(resForDay.checkOut), 'MMM d')} (${stayLength} nights)`}
                  >
                    {/* Left edge arrival accent */}
                    <div className="w-[3px] self-stretch bg-white/40 rounded-l-full flex-shrink-0" />
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      {resForDay.guest && (
                        <>
                          <span className="text-[11px] font-semibold truncate leading-tight">
                            {truncate(`${resForDay.guest.firstName} ${resForDay.guest.lastName}`, stayLength <= 1 ? 8 : 18)}
                          </span>
                          {resForDay.guest.vipLevel && resForDay.guest.vipLevel !== 'none' && (
                            <Star className="size-3 text-amber-300 fill-amber-300 flex-shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                    {stayLength >= 2 && (
                      <span className="text-[9px] opacity-70 truncate font-mono flex-shrink-0">
                        {truncate(resForDay.confirmationNo, 8)}
                      </span>
                    )}
                    {/* Right edge departure accent */}
                    <div className="w-[3px] self-stretch bg-white/40 rounded-r-full flex-shrink-0" />
                    <GripHorizontal className="size-3 opacity-0 group-hover:opacity-60 flex-shrink-0 ml-auto transition-opacity" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Render: Mobile Day View ────────────────────────────────────
  const renderMobileDayView = () => {
    const today = new Date()
    const todayReservations = reservations.filter((r) => {
      const ci = startOfDay(parseISO(r.checkIn))
      const co = startOfDay(parseISO(r.checkOut))
      return today >= ci && today < co
    })

    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {format(today, 'EEEE, MMM d, yyyy')}
          </h3>
          <Badge variant="outline">{todayReservations.length} bookings</Badge>
        </div>

        {todayReservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reservations for today</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayReservations.map((res) => (
              <Card
                key={res.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedReservation(res)
                  setDetailOpen(true)
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('w-1 h-10 rounded-full', getStatusColor(res.status).bg)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Walk-in'}
                      </span>
                      {res.guest?.vipLevel && res.guest.vipLevel !== 'none' && (
                        <Star className="size-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Room {res.room?.number || '—'}</span>
                      <span>&middot;</span>
                      <span className="font-mono">{res.confirmationNo.slice(0, 8)}</span>
                      <span>&middot;</span>
                      <span className="capitalize">{res.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold">{formatCurrency(res.roomRate)}</span>
                    <p className="text-[10px] text-muted-foreground">/night</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Room status list for mobile */}
        <Separator className="my-2" />
        <h3 className="text-sm font-semibold">Room Status</h3>
        <div className="flex flex-col gap-1.5">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
              <span className={cn('w-2 h-2 rounded-full', getRoomStatusColor(room.status))} />
              <span className="text-xs font-medium flex-1">{room.number}</span>
              <span className="text-[10px] text-muted-foreground">{room.type.code}</span>
              <span className="text-[10px] text-muted-foreground">F{room.floor}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Loading State ──────────────────────────────────────────────
  if (roomsLoading || reservationsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-full" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Reservation Calendar
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag & drop reservations to change dates. Double-click empty cells to book.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="size-4 mr-1" />
            Today
          </Button>
          <Button variant="outline" size="icon" className="size-9" onClick={goBack}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-9" onClick={goForward}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Date range label & Legend */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="font-mono">
                {format(dates[0], 'MMM d')} — {format(dates[dates.length - 1], 'MMM d, yyyy')}
              </Badge>
              <span className="text-muted-foreground">
                {rooms.length} rooms &middot; {reservations.length} bookings
              </span>
            </div>
            {renderLegend()}
          </div>
        </CardContent>
      </Card>

      {/* ─── Calendar Grid (Desktop) ─── */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-background">
        {/* Corner + Date Headers */}
        <div className="sticky top-0 z-30 bg-background border-b-2 border-border">
          {/* Corner cell */}
          <div className="flex">
            <div
              className="flex-shrink-0 flex items-center justify-center border-r border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ width: 200, height: 56 }}
            >
              <BedDouble className="size-4 mr-1" />
              Rooms
            </div>
            {renderDateHeaders()}
          </div>
        </div>

        {/* Scrollable grid */}
        <div
          ref={gridRef}
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 300 }}
        >
          {rooms.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <CalendarDays className="size-8 opacity-50" />
                <span>No rooms configured</span>
              </div>
            </div>
          ) : (
            rooms.map((room) => renderRoomRow(room))
          )}
        </div>
      </div>

      {/* ─── Mobile View ─── */}
      <div className="md:hidden">
        <Card>{renderMobileDayView()}</Card>
      </div>

      {/* ─── Reservation Detail Dialog ──────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReservation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span>Reservation Details</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      selectedReservation.status === 'confirmed' && 'bg-teal-100 text-teal-800',
                      selectedReservation.status === 'checked_in' && 'bg-emerald-100 text-emerald-800',
                      selectedReservation.status === 'checked_out' && 'bg-gray-100 text-gray-800',
                      selectedReservation.status === 'cancelled' && 'bg-red-100 text-red-800',
                      selectedReservation.status === 'no_show' && 'bg-orange-100 text-orange-800',
                    )}
                  >
                    {selectedReservation.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Full details for reservation {selectedReservation.confirmationNo}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Guest */}
                <div className="grid gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="size-4 text-muted-foreground" />
                    Guest Information
                  </h4>
                  {selectedReservation.guest ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium">
                          {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                        </span>
                        {selectedReservation.guest.vipLevel !== 'none' && (
                          <Star className="inline size-3.5 text-amber-500 fill-amber-500 ml-1 -mt-0.5" />
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        <span>{selectedReservation.guest.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <span>{selectedReservation.guest.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VIP: </span>
                        <span className="capitalize">{selectedReservation.guest.vipLevel}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No guest assigned</p>
                  )}
                </div>

                <Separator />

                {/* Stay */}
                <div className="grid gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="size-4 text-muted-foreground" />
                    Stay Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Room: </span>
                      <span className="font-medium">
                        {selectedReservation.room?.number || 'Unassigned'}
                      </span>
                      {selectedReservation.room && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <RoomTypeBedBadge typeName={selectedReservation.room.type.name} bedConfig={selectedReservation.room.type.bedConfig} typeCode={selectedReservation.room.type.code} pax={selectedReservation.adults + selectedReservation.children} inline />
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confirmation #: </span>
                      <span className="font-mono text-xs">{selectedReservation.confirmationNo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-in: </span>
                      <span>{formatDate(selectedReservation.checkIn)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out: </span>
                      <span>{formatDate(selectedReservation.checkOut)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nights: </span>
                      <span className="font-medium">
                        {differenceInDays(
                          parseISO(selectedReservation.checkOut),
                          parseISO(selectedReservation.checkIn),
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Adults/Children: </span>
                      <span>
                        {selectedReservation.adults} / {selectedReservation.children}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Financial */}
                <div className="grid gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="size-4 text-muted-foreground" />
                    Financial
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Rate / Night: </span>
                      <span className="font-medium">{formatCurrency(selectedReservation.roomRate)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-bold text-base">{formatCurrency(selectedReservation.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Booking */}
                <div className="grid gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Tag className="size-4 text-muted-foreground" />
                    Booking Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Source: </span>
                      <span className="capitalize">
                        {(selectedReservation.source || 'direct').replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guaranteed: </span>
                      <span>{selectedReservation.guaranteed ? 'Yes' : 'No'}</span>
                    </div>
                    {selectedReservation.company && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Company: </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {selectedReservation.company}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {selectedReservation.specialRequests && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <MessageSquare className="size-4 text-muted-foreground" />
                        Special Requests
                      </h4>
                      <p className="text-sm bg-muted/50 rounded-md p-3">
                        {selectedReservation.specialRequests}
                      </p>
                    </div>
                  </>
                )}

                {selectedReservation.notes && (
                  <div className="grid gap-1">
                    <h4 className="text-xs font-semibold text-muted-foreground">Internal Notes</h4>
                    <p className="text-xs bg-muted/30 rounded-md p-2">{selectedReservation.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── New Reservation Dialog ──────────────────────────────── */}
      <Dialog open={newResOpen} onOpenChange={setNewResOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Quick Reservation
            </DialogTitle>
            <DialogDescription>
              Create a new reservation. Room and check-in date are pre-filled.
            </DialogDescription>
          </DialogHeader>

          <div ref={newResRef} className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Guest Name *</Label>
              <Input
                placeholder="Guest full name"
                value={newResForm.guestName}
                autoFocus
                onChange={(e) => setNewResForm({ ...newResForm, guestName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Check-in</Label>
                <Input type="date" value={newResForm.checkIn} disabled />
              </div>
              <div className="space-y-1">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={newResForm.checkOut}
                  onChange={(e) => setNewResForm({ ...newResForm, checkOut: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Room</Label>
                <Select value={newResForm.roomId} onValueChange={(v) => setNewResForm({ ...newResForm, roomId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.number} — {r.type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Adults</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={newResForm.adults}
                  onChange={(e) => setNewResForm({ ...newResForm, adults: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rate / Night</Label>
                <Input
                  type="number"
                  min={0}
                  value={newResForm.roomRate}
                  onChange={(e) => setNewResForm({ ...newResForm, roomRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Source</Label>
                <Select value={newResForm.source} onValueChange={(v) => setNewResForm({ ...newResForm, source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimated total */}
            {newResForm.checkIn && newResForm.checkOut && newResForm.roomRate > 0 && (
              <div className="bg-muted/50 rounded-md p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Total</span>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    differenceInDays(
                      parseISO(newResForm.checkOut),
                      parseISO(newResForm.checkIn),
                    ) * newResForm.roomRate,
                  )}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewResOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newResForm)}
              disabled={!newResForm.guestName || !newResForm.checkOut || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-1.5" />
                  Create Reservation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
