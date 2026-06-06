'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState, NoScheduleIllustration } from '@/components/shared/illustrations'
import { formatDate, formatCurrency, getTodayString, nightsBetween } from '@/lib/format'
import { adToBS, isNepaliHoliday, getNepaliMonthShortEnglish } from '@/lib/nepali-calendar'
import { usePreferencesStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigationStore } from '@/lib/store'
import { useSidebar } from '@/components/ui/sidebar'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Phone,
  Mail,
  BedDouble,
  Clock,
  CreditCard,
  CalendarDays,
  Eye,
  Pencil,
  LogIn,
  LogOut,
  XCircle,
  CheckCircle2,
  Info,
  Users,
  StickyNote,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Hotel,
  Sparkles,
  CalendarRange,
  ShieldCheck,
  TrendingUp,
  ArrowRightLeft,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────

interface CalendarRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  type: { name: string; code: string }
  status: string
}

interface CalendarGuest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  vipLevel: string
}

interface CalendarFolio {
  id: string
  balance: number
  status: string
}

interface CalendarReservation {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  specialRequests: string | null
  source: string | null
  guaranteed: boolean
  notes: string | null
  adults: number
  children: number
  paymentStatus: string
  guest: CalendarGuest | null
  room: { id: string; number: string; floor: number; wing: string | null; type: { name: string; code: string } } | null
  folios: CalendarFolio[]
}

interface CalendarSummary {
  totalRooms: number
  totalReservations: number
  arrivals: number
  departures: number
  inHouse: number
}

interface CalendarData {
  rooms: CalendarRoom[]
  reservations: CalendarReservation[]
  summary: CalendarSummary
}

interface NewReservationForm {
  guestId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  roomId: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  roomRate: number
  specialRequests: string
  source: string
  guaranteed: boolean
  notes: string
}

// ─── Constants ──────────────────────────────────────────────────────────

// Default/fallback constants (used when container size is unknown)
const DEFAULT_NUM_DAYS = 14
const DEFAULT_DAY_WIDTH = 100
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 44
const DEFAULT_ROOM_COL_WIDTH = 140

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'corporate', label: 'Corporate' },
]

// Reservation block color coding (as per spec)
const BLOCK_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-l-blue-500',
  arrival_today: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-l-emerald-500',
  checked_in: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-l-amber-500',
  departure_today: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-l-rose-500',
  tentative: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-l-slate-400',
}

const BLOCK_HOVER: Record<string, string> = {
  confirmed: 'hover:bg-blue-200 dark:hover:bg-blue-900/60',
  arrival_today: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/60',
  checked_in: 'hover:bg-amber-200 dark:hover:bg-amber-900/60',
  departure_today: 'hover:bg-rose-200 dark:hover:bg-rose-900/60',
  tentative: 'hover:bg-slate-200 dark:hover:bg-slate-800/60',
}

// Compact legend items for header row (small dots + labels)
const LEGEND_ITEMS = [
  { key: 'confirmed', label: 'Confirmed', dotClass: 'bg-blue-400 dark:bg-blue-500' },
  { key: 'arrival_today', label: 'Arrival', dotClass: 'bg-emerald-400 dark:bg-emerald-500' },
  { key: 'checked_in', label: 'Checked-In', dotClass: 'bg-amber-400 dark:bg-amber-500' },
  { key: 'departure_today', label: 'Departure', dotClass: 'bg-rose-400 dark:bg-rose-500' },
  { key: 'tentative', label: 'Tentative', dotClass: 'bg-slate-400 dark:bg-slate-500' },
]

// Move reason options
const MOVE_REASONS = [
  'Guest Request',
  'Room Upgrade',
  'Room Maintenance',
  'Overbooking Correction',
  'Management Decision',
  'Rate Adjustment',
  'Other',
]

// Room status dot colors
const ROOM_STATUS_DOT: Record<string, string> = {
  vacant_clean: 'bg-green-500',
  occupied: 'bg-blue-500',
  cleaning: 'bg-amber-500',
  cleaned: 'bg-amber-500',
  vacant_dirty: 'bg-yellow-500',
  out_of_order: 'bg-red-500',
  inspected: 'bg-purple-500',
  on_change: 'bg-amber-500',
}

const ROOM_STATUS_LABELS: Record<string, string> = {
  vacant_clean: 'VC',
  occupied: 'OCC',
  cleaning: 'CLN',
  cleaned: 'CLD',
  vacant_dirty: 'VD',
  out_of_order: 'OOO',
  inspected: 'INP',
  on_change: 'CHG',
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Saffron color for holiday highlighting
const HOLIDAY_HEADER_BG = 'bg-orange-900/30'
const HOLIDAY_CELL_BG = 'bg-orange-50/50 dark:bg-orange-950/20'

// ─── Date Helpers ────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateToKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Determine the display category for a reservation block
function getReservationCategory(res: CalendarReservation, todayStr: string): string {
  const checkInStr = dateToKey(toDateOnly(res.checkIn))
  const checkOutStr = dateToKey(toDateOnly(res.checkOut))

  if (res.status === 'tentative') return 'tentative'
  if (checkInStr === todayStr) return 'arrival_today'
  if (checkOutStr === todayStr && res.status === 'checked_in') return 'departure_today'
  if (res.status === 'checked_in') return 'checked_in'
  return 'confirmed'
}

// ─── New Reservation Form Defaults ─────────────────────────────────────

function getDefaultNewForm(roomId: string = '', checkIn: string = ''): NewReservationForm {
  const co = checkIn ? dateToKey(addDays(toDateOnly(checkIn), 1)) : ''
  return {
    guestId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    roomId,
    checkIn,
    checkOut: co,
    adults: 2,
    children: 0,
    roomRate: 0,
    specialRequests: '',
    source: 'direct',
    guaranteed: false,
    notes: '',
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export function CalendarView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { state: sidebarState, open: sidebarOpen, isMobile } = useSidebar()

  // ─── Responsive container sizing ────────────────────────────────────
  const [containerWidth, setContainerWidth] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'twoWeeks'>('twoWeeks')
  const { preferences } = usePreferencesStore()
  const showBSDates = preferences.nepaliStandards?.dualCalendar !== false
  const showHolidayAlerts = preferences.nepaliStandards?.holidayAlerts !== false

  // Observe container resize + react to sidebar state changes
  const recalcWidth = useCallback(() => {
    const container = containerRef.current
    if (container) {
      setContainerWidth(Math.floor(container.getBoundingClientRect().width))
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.floor(entry.contentRect.width))
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Re-measure when sidebar expands/collapses (add small delay for CSS transition)
  useEffect(() => {
    const timer = setTimeout(recalcWidth, 350)
    return () => clearTimeout(timer)
  }, [sidebarState, sidebarOpen, isMobile, recalcWidth])

  // Dynamically compute grid dimensions based on container width
  const numDays = viewMode === 'week' ? 7 : DEFAULT_NUM_DAYS
  const roomColWidth = containerWidth > 1024 ? 140 : containerWidth > 640 ? 110 : 90
  const dayWidth = containerWidth > 0
    ? Math.max(64, Math.floor((containerWidth - roomColWidth) / numDays))
    : DEFAULT_DAY_WIDTH
  // Use ceiling for actual width so grid fills container edge-to-edge
  const actualGridWidth = roomColWidth + numDays * Math.max(64, Math.ceil((containerWidth - roomColWidth) / numDays))
  const isCompact = containerWidth <= 768
  const isSmallScreen = containerWidth <= 480

  // ─── Date range state ────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = useMemo(() => dateToKey(today), [today])

  const [startDate, setStartDate] = useState(() => addDays(today, -3))
  const endDate = useMemo(() => addDays(startDate, numDays - 1), [startDate, numDays])

  const startDateStr = useMemo(() => dateToKey(startDate), [startDate])
  const endDateStr = useMemo(() => dateToKey(endDate), [endDate])

  // ─── Navigation ──────────────────────────────────────────────────────
  const goToPrevWeek = useCallback(() => setStartDate((d) => addDays(d, -7)), [])
  const goToNextWeek = useCallback(() => setStartDate((d) => addDays(d, 7)), [])
  const goToToday = useCallback(() => setStartDate(addDays(today, -3)), [today])

  // ─── Floor filter ────────────────────────────────────────────────────
  const [floorFilter, setFloorFilter] = useState<string>('all')

  // ─── Dialog state ─────────────────────────────────────────────────────
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservation | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [newForm, setNewForm] = useState<NewReservationForm>(getDefaultNewForm())

  // ─── Drag & Drop state ───────────────────────────────────────────────
  const [dragReservation, setDragReservation] = useState<CalendarReservation | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveData, setMoveData] = useState<{
    reservationId: string
    confirmationNo: string
    fromRoomId: string
    fromRoomNumber: string
    toRoomId: string
    toRoomNumber: string
    fromCheckIn: string
    fromCheckOut: string
    toCheckIn: string
    toCheckOut: string
    roomChanged: boolean
    datesChanged: boolean
  } | null>(null)
  const [moveReason, setMoveReason] = useState('')
  const [moveCustomReason, setMoveCustomReason] = useState('')

  // ─── Day headers ──────────────────────────────────────────────────────
  const dayHeaders = useMemo(
    () => Array.from({ length: numDays }, (_, i) => addDays(startDate, i)),
    [startDate, numDays],
  )

  // ─── Fetch rooms ─────────────────────────────────────────────────────
  const { data: roomsRaw, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      return res.json()
    },
  })

  // ─── Fetch reservations overlapping the date range ───────────────────
  const { data: reservationsRaw, isLoading: resLoading } = useQuery({
    queryKey: ['reservations', startDateStr, endDateStr],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('date', startDateStr)
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json()
    },
  })

  // ─── Fetch guests for new reservation dialog ──────────────────────────
  const { data: guestsRaw } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const res = await fetch('/api/guests')
      if (!res.ok) throw new Error('Failed to fetch guests')
      return res.json()
    },
  })

  // ─── Process data ────────────────────────────────────────────────────
  const rooms: CalendarRoom[] = useMemo(() => {
    const raw = roomsRaw?.rooms || []
    return raw.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      number: r.number as string,
      floor: r.floor as number,
      wing: (r.wing as string) || null,
      type: {
        name: ((r.type as Record<string, unknown>)?.name as string) || '',
        code: ((r.type as Record<string, unknown>)?.code as string) || '',
      },
      status: r.status as string,
    }))
  }, [roomsRaw])

  const reservations: CalendarReservation[] = useMemo(() => {
    const raw = reservationsRaw?.reservations || []
    return raw.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      confirmationNo: r.confirmationNo as string,
      status: r.status as string,
      checkIn: r.checkIn as string,
      checkOut: r.checkOut as string,
      roomRate: r.roomRate as number,
      totalAmount: r.totalAmount as number,
      specialRequests: (r.specialRequests as string) || null,
      source: (r.source as string) || null,
      guaranteed: (r.guaranteed as boolean) || false,
      notes: (r.notes as string) || null,
      adults: (r.adults as number) || 1,
      children: (r.children as number) || 0,
      paymentStatus: (r.paymentStatus as string) || 'unpaid',
      guest: r.guest
        ? {
            id: (r.guest as Record<string, unknown>).id as string,
            firstName: (r.guest as Record<string, unknown>).firstName as string,
            lastName: (r.guest as Record<string, unknown>).lastName as string,
            email: ((r.guest as Record<string, unknown>).email as string) || null,
            phone: ((r.guest as Record<string, unknown>).phone as string) || null,
            vipLevel: ((r.guest as Record<string, unknown>).vipLevel as string) || 'none',
          }
        : null,
      room: r.room
        ? {
            id: (r.room as Record<string, unknown>).id as string,
            number: (r.room as Record<string, unknown>).number as string,
            floor: (r.room as Record<string, unknown>).floor as number,
            wing: ((r.room as Record<string, unknown>).wing as string) || null,
            type: {
              name: (((r.room as Record<string, unknown>).type as Record<string, unknown>)?.name as string) || '',
              code: (((r.room as Record<string, unknown>).type as Record<string, unknown>)?.code as string) || '',
            },
          }
        : null,
      folios: (r.folios as CalendarFolio[]) || [],
    }))
  }, [reservationsRaw])

  const guests = useMemo(() => guestsRaw?.guests || [], [guestsRaw])

  // ─── Derived data ─────────────────────────────────────────────────────
  const uniqueFloors = useMemo(() => {
    const floors = new Set(rooms.map((r) => r.floor))
    return Array.from(floors).sort((a, b) => a - b)
  }, [rooms])

  const filteredRooms = useMemo(() => {
    if (floorFilter === 'all') return rooms
    return rooms.filter((r) => r.floor === parseInt(floorFilter))
  }, [rooms, floorFilter])

  // Active (non-cancelled, non-checked-out) reservations per room
  const activeReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.status !== 'cancelled' && r.status !== 'checked_out' && r.status !== 'no_show' && r.room,
      ),
    [reservations],
  )

  // Summary stats (kept for potential future use)
  const summary = useMemo<CalendarSummary>(() => {
    const activeInRange = activeReservations
    return {
      totalRooms: rooms.length,
      totalReservations: activeInRange.length,
      arrivals: activeInRange.filter((r) => dateToKey(toDateOnly(r.checkIn)) === todayStr).length,
      departures: activeInRange.filter(
        (r) =>
          dateToKey(toDateOnly(r.checkOut)) === todayStr &&
          (r.status === 'checked_in' || r.status === 'confirmed'),
      ).length,
      inHouse: activeInRange.filter((r) => r.status === 'checked_in').length,
    }
  }, [activeReservations, rooms.length, todayStr])

  // Estimated total for new reservation form
  const newFormNights = useMemo(() => {
    if (newForm.checkIn && newForm.checkOut) {
      return nightsBetween(newForm.checkIn, newForm.checkOut)
    }
    return 0
  }, [newForm.checkIn, newForm.checkOut])

  const newFormTotal = useMemo(() => newFormNights * newForm.roomRate, [newFormNights, newForm.roomRate])

  const isLoading = roomsLoading || resLoading

  // ─── Mutations ───────────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update reservation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
    onError: () => {
      toast.error('Failed to update reservation')
    },
  })

  const createReservationMutation = useMutation({
    mutationFn: async (formData: NewReservationForm) => {
      let guestId = formData.guestId
      if (!guestId && formData.firstName && formData.lastName) {
        const guestRes = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
          }),
        })
        if (guestRes.ok) {
          const guestData = await guestRes.json()
          guestId = guestData.guest?.id || guestData.id
        }
      }
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: guestId || undefined,
          roomId: formData.roomId || undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          adults: formData.adults,
          children: formData.children,
          roomRate: formData.roomRate || undefined,
          specialRequests: formData.specialRequests || undefined,
          source: formData.source,
          guaranteed: formData.guaranteed,
          notes: formData.notes || undefined,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create reservation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      setShowNewDialog(false)
      toast.success('Reservation created successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create reservation')
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setShowNoteDialog(false)
      setNoteText('')
      toast.success('Note added successfully')
    },
    onError: () => {
      toast.error('Failed to add note')
    },
  })

  // ─── Move Room Mutation (drag & drop) ────────────────────────────────
  const moveReservationMutation = useMutation({
    mutationFn: async (data: {
      reservationId: string
      toRoomId: string
      toCheckIn: string
      toCheckOut: string
      reason: string
    }) => {
      // 1. PATCH the reservation
      const patchBody: Record<string, string> = {}
      if (data.toRoomId) patchBody.roomId = data.toRoomId
      if (data.toCheckIn) patchBody.checkIn = data.toCheckIn
      if (data.toCheckOut) patchBody.checkOut = data.toCheckOut

      const res = await fetch(`/api/reservations/${data.reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to move reservation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Reservation moved successfully')
      setShowMoveDialog(false)
      setMoveData(null)
      setMoveReason('')
      setMoveCustomReason('')
      setDragReservation(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to move reservation')
    },
  })

  // ─── Log Room Move Mutation ──────────────────────────────────────────
  const logRoomMoveMutation = useMutation({
    mutationFn: async (data: {
      reservationId: string
      confirmationNo: string
      fromRoomId: string
      fromRoomNumber: string
      toRoomId: string
      toRoomNumber: string
      fromCheckIn: string
      fromCheckOut: string
      toCheckIn: string
      toCheckOut: string
      moveType: string
      reason: string
      changedByName: string
    }) => {
      const res = await fetch('/api/room-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to log room move')
      return res.json()
    },
    onError: () => {
      // Non-critical — don't block the move
    },
  })

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleReservationClick = useCallback((res: CalendarReservation) => {
    setSelectedReservation(res)
    setShowDetailDialog(true)
  }, [])

  const handleCellDoubleClick = useCallback(
    (roomId: string, date: Date) => {
      const dateStr = dateToKey(date)
      setNewForm(getDefaultNewForm(roomId, dateStr))
      setShowNewDialog(true)
    },
    [],
  )

  const handleCheckIn = useCallback(() => {
    if (!selectedReservation) return
    updateStatusMutation.mutate(
      { id: selectedReservation.id, status: 'checked_in' },
      {
        onSuccess: () => {
          toast.success(
            `Guest checked in — ${selectedReservation.guest?.firstName} ${selectedReservation.guest?.lastName}`,
          )
          setShowDetailDialog(false)
          setSelectedReservation(null)
        },
      },
    )
  }, [selectedReservation, updateStatusMutation])

  const handleCheckOut = useCallback(() => {
    if (!selectedReservation) return
    updateStatusMutation.mutate(
      { id: selectedReservation.id, status: 'checked_out' },
      {
        onSuccess: () => {
          toast.success(
            `Guest checked out — ${selectedReservation.guest?.firstName} ${selectedReservation.guest?.lastName}`,
          )
          setShowDetailDialog(false)
          setSelectedReservation(null)
        },
      },
    )
  }, [selectedReservation, updateStatusMutation])

  const handleCancelConfirm = useCallback(() => {
    if (!selectedReservation) return
    updateStatusMutation.mutate(
      { id: selectedReservation.id, status: 'cancelled' },
      {
        onSuccess: () => {
          toast.success('Reservation cancelled')
          setShowCancelDialog(false)
          setShowDetailDialog(false)
          setSelectedReservation(null)
        },
      },
    )
  }, [selectedReservation, updateStatusMutation])

  const handleConfirmReservation = useCallback(() => {
    if (!selectedReservation) return
    updateStatusMutation.mutate(
      { id: selectedReservation.id, status: 'confirmed' },
      {
        onSuccess: () => {
          toast.success('Reservation confirmed')
          setShowDetailDialog(false)
          setSelectedReservation(null)
        },
      },
    )
  }, [selectedReservation, updateStatusMutation])

  const handleOpenNoteDialog = useCallback(() => {
    if (!selectedReservation) return
    setNoteText('')
    setShowNoteDialog(true)
  }, [selectedReservation])

  const handleSaveNote = useCallback(() => {
    if (!selectedReservation || !noteText.trim()) return
    const existing = selectedReservation.notes ? selectedReservation.notes + '\n\n' : ''
    addNoteMutation.mutate({ id: selectedReservation.id, notes: existing + noteText.trim() })
  }, [selectedReservation, noteText, addNoteMutation])

  const handleViewFolio = useCallback(() => {
    if (selectedReservation) {
      setShowDetailDialog(false)
      navigateTo('front-desk', 'folio')
    }
  }, [selectedReservation, navigateTo])

  const handleCreateSubmit = useCallback(() => {
    if (!newForm.roomId || !newForm.checkIn || !newForm.checkOut) {
      toast.error('Please fill in room, check-in and check-out dates')
      return
    }
    if (!newForm.guestId && (!newForm.firstName || !newForm.lastName)) {
      toast.error('Please select or enter a guest name')
      return
    }
    createReservationMutation.mutate(newForm)
  }, [newForm, createReservationMutation])

  const handleExtendStay = useCallback(() => {
    if (!selectedReservation) return
    const newCheckout = dateToKey(addDays(toDateOnly(selectedReservation.checkOut), 1))
    fetch(`/api/reservations/${selectedReservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkOut: newCheckout }),
    })
      .then((res) => {
        if (res.ok) {
          toast.success('Stay extended by 1 night')
          queryClient.invalidateQueries({ queryKey: ['reservations'] })
          setShowDetailDialog(false)
          setSelectedReservation(null)
        }
      })
      .catch(() => toast.error('Failed to extend stay'))
  }, [selectedReservation, queryClient])

  // ─── Drag & Drop Handlers ────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, res: CalendarReservation) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      reservationId: res.id,
      fromRoomId: res.room?.id || '',
      fromRoomNumber: res.room?.number || '',
      fromCheckIn: res.checkIn,
      fromCheckOut: res.checkOut,
    }))
    e.dataTransfer.effectAllowed = 'move'
    setDragReservation(res)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetRoomId: string, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
      const { reservationId, fromRoomId, fromRoomNumber, fromCheckIn, fromCheckOut } = data

      if (!reservationId) return

      const roomChanged = targetRoomId !== fromRoomId
      const targetDateStr = dateToKey(targetDate)

      // Calculate new dates: shift by the difference between target date and original checkIn
      const origCI = toDateOnly(fromCheckIn)
      const origCO = toDateOnly(fromCheckOut)
      const nightCount = Math.max(1, Math.ceil((origCO.getTime() - origCI.getTime()) / 86400000))
      const newCheckIn = targetDateStr
      const newCheckOut = dateToKey(addDays(targetDate, nightCount))

      // Normalize original dates to YYYY-MM-DD for accurate comparison
      const origCIKey = dateToKey(origCI)
      const origCOKey = dateToKey(origCO)
      const datesChanged = newCheckIn !== origCIKey || newCheckOut !== origCOKey

      if (!roomChanged && !datesChanged) {
        setDragReservation(null)
        return
      }

      const targetRoom = rooms.find((r) => r.id === targetRoomId)

      setMoveData({
        reservationId,
        confirmationNo: '',
        fromRoomId,
        fromRoomNumber: fromRoomNumber || '—',
        toRoomId: targetRoomId,
        toRoomNumber: targetRoom?.number || '—',
        fromCheckIn: origCIKey,
        fromCheckOut: origCOKey,
        toCheckIn: newCheckIn,
        toCheckOut: newCheckOut,
        roomChanged,
        datesChanged,
      })
      setMoveReason('')
      setMoveCustomReason('')
      setShowMoveDialog(true)
      setDragReservation(null)
    } catch {
      setDragReservation(null)
    }
  }, [rooms])

  const handleDragEnd = useCallback(() => {
    setDragReservation(null)
  }, [])

  const handleMoveConfirm = useCallback(() => {
    if (!moveData || !moveReason) return

    const finalReason = moveReason === 'Other' ? moveCustomReason.trim() : moveReason
    if (!finalReason) return

    const roomChanged = moveData.roomChanged
    const datesChanged = moveData.datesChanged
    let moveType = 'date_change'
    if (roomChanged && datesChanged) moveType = 'room_and_date_change'
    else if (roomChanged) moveType = 'room_change'

    // Find the original reservation for confirmation number
    const originalRes = reservations.find((r) => r.id === moveData.reservationId)

    // PATCH reservation first
    moveReservationMutation.mutate(
      {
        reservationId: moveData.reservationId,
        toRoomId: roomChanged ? moveData.toRoomId : '',
        toCheckIn: datesChanged ? moveData.toCheckIn : '',
        toCheckOut: datesChanged ? moveData.toCheckOut : '',
        reason: finalReason,
      },
      {
        onSuccess: () => {
          // Log the move
          logRoomMoveMutation.mutate({
            reservationId: moveData.reservationId,
            confirmationNo: originalRes?.confirmationNo || moveData.confirmationNo,
            fromRoomId: moveData.fromRoomId,
            fromRoomNumber: moveData.fromRoomNumber,
            toRoomId: moveData.toRoomId,
            toRoomNumber: moveData.toRoomNumber,
            fromCheckIn: moveData.fromCheckIn,
            fromCheckOut: moveData.fromCheckOut,
            toCheckIn: moveData.toCheckIn,
            toCheckOut: moveData.toCheckOut,
            moveType,
            reason: finalReason,
            changedByName: 'Current User',
          })
        },
      },
    )
  }, [moveData, moveReason, moveCustomReason, reservations, moveReservationMutation, logRoomMoveMutation])

  // ─── Get reservations for a specific room in the visible range ─────────
  const getReservationsForRoom = useCallback(
    (roomId: string) =>
      activeReservations.filter((r) => r.room?.id === roomId),
    [activeReservations],
  )

  // ─── Get reservation block position ────────────────────────────────────
  const getReservationPosition = useCallback(
    (res: CalendarReservation) => {
      const ci = toDateOnly(res.checkIn)
      const co = toDateOnly(res.checkOut)
      const clampStart = ci < startDate ? startDate : ci
      const clampEnd = co > endDate ? endDate : co
      const dayDiffStart = Math.max(
        0,
        Math.floor((clampStart.getTime() - startDate.getTime()) / 86400000),
      )
      const dayDiffWidth = Math.max(
        1,
        Math.ceil((clampEnd.getTime() - clampStart.getTime()) / 86400000),
      )
      return {
        left: dayDiffStart * dayWidth,
        width: dayDiffWidth * dayWidth,
      }
    },
    [startDate, endDate, dayWidth],
  )

  // ─── Determine context-dependent action buttons ───────────────────────
  const getActionButtons = useCallback(
    (res: CalendarReservation) => {
      const category = getReservationCategory(res, todayStr)
      const buttons: React.ReactNode[] = []

      switch (category) {
        case 'arrival_today':
          buttons.push(
            <Button
              key="checkin"
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCheckIn}
              disabled={updateStatusMutation.isPending}
            >
              <LogIn className="size-3.5" />
              Check-In
            </Button>,
            <Button
              key="edit"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info('Edit functionality available')}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>,
            <Button
              key="cancel"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="size-3.5" />
              Cancel
            </Button>,
          )
          break
        case 'confirmed':
          buttons.push(
            <Button
              key="edit"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info('Edit functionality available')}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>,
            <Button
              key="checkin"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              onClick={handleCheckIn}
              disabled={updateStatusMutation.isPending}
            >
              <LogIn className="size-3.5" />
              Check-In
            </Button>,
            <Button
              key="cancel"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="size-3.5" />
              Cancel
            </Button>,
          )
          break
        case 'checked_in':
          buttons.push(
            <Button
              key="folio"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleViewFolio}
            >
              <FileText className="size-3.5" />
              View Folio
            </Button>,
            <Button
              key="note"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleOpenNoteDialog}
            >
              <StickyNote className="size-3.5" />
              Add Note
            </Button>,
            <Button
              key="checkout"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
              onClick={handleCheckOut}
              disabled={updateStatusMutation.isPending}
            >
              <LogOut className="size-3.5" />
              Early Checkout
            </Button>,
          )
          break
        case 'departure_today':
          buttons.push(
            <Button
              key="checkout"
              size="sm"
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleCheckOut}
              disabled={updateStatusMutation.isPending}
            >
              <LogOut className="size-3.5" />
              Check-Out
            </Button>,
            <Button
              key="extend"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleExtendStay}
            >
              <CalendarDays className="size-3.5" />
              Extend Stay
            </Button>,
          )
          break
        case 'tentative':
          buttons.push(
            <Button
              key="edit"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info('Edit functionality available')}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>,
            <Button
              key="confirm"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              onClick={handleConfirmReservation}
              disabled={updateStatusMutation.isPending}
            >
              <ShieldCheck className="size-3.5" />
              Confirm
            </Button>,
            <Button
              key="cancel"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="size-3.5" />
              Cancel
            </Button>,
          )
          break
      }
      return buttons
    },
    [todayStr, handleCheckIn, handleCheckOut, handleConfirmReservation, handleViewFolio, handleOpenNoteDialog, handleExtendStay, updateStatusMutation.isPending],
  )

  // ─── Auto-scroll to today's column on mount ──────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = dayHeaders.findIndex((d) => isSameDay(d, today))
      if (todayIndex > 1) {
        const scrollTarget = todayIndex * dayWidth - dayWidth
        scrollRef.current.scrollLeft = scrollTarget
      }
    }
  }, [dayHeaders, today, dayWidth])

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
        {/* ─── Header Toolbar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
          {/* Left side: Title + Search + Room Board */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <CalendarDays className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-sm font-bold tracking-tight leading-none">Reservation Calendar</h2>
                <p className="text-[10px] text-muted-foreground">Drag &amp; drop to move reservations</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground shrink-0"
              onClick={() => navigateTo('rooms', 'room-board')}
            >
              <BedDouble className="size-3.5" />
              <span className="hidden sm:inline">Room Board</span>
            </Button>
          </div>

          {/* Right side: Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Floor filter, view mode, navigation, new booking */}
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {uniqueFloors.map((f) => (
                  <SelectItem key={f} value={f.toString()}>
                    Floor {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className={cn('h-8 gap-1 text-xs', viewMode === 'week' ? 'bg-secondary' : '')} onClick={() => setViewMode('week')}>
              <CalendarDays className="size-3.5" />
              <span className="hidden md:inline">Week</span>
            </Button>
            <Button variant="outline" size="sm" className={cn('h-8 gap-1 text-xs', viewMode === 'twoWeeks' ? 'bg-secondary' : '')} onClick={() => setViewMode('twoWeeks')}>
              <CalendarRange className="size-3.5" />
              <span className="hidden md:inline">2W</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={goToPrevWeek}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={goToNextWeek}>
              <ChevronRight className="size-3.5" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showBSDates ? 'default' : 'outline'}
                  size="sm"
                  className={cn('h-8 gap-1 text-xs', showBSDates && 'bg-amber-600 hover:bg-amber-700 text-white')}
                  onClick={() => {
                    const updated = { ...preferences.nepaliStandards, dualCalendar: !showBSDates }
                    usePreferencesStore.getState().updatePreferences({ nepaliStandards: updated })
                  }}
                >
                  <span className="hidden sm:inline">BS</span>
                  <span className="sm:hidden">बि</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Toggle Bikram Sambat calendar</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setNewForm(getDefaultNewForm(filteredRooms[0]?.id || '', startDateStr))
                setShowNewDialog(true)
              }}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New </span>Booking
            </Button>
          </div>
        </div>

        {/* ─── Calendar Grid ────────────────────────────────────────────── */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : filteredRooms.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <EmptyState
                illustration={<NoScheduleIllustration className="w-32 h-auto" />}
                title="No rooms configured"
                description="Add rooms in Room Management to see them on the calendar."
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-lg flex-1 min-h-0 flex flex-col">
            <div
              ref={scrollRef}
              className="overflow-auto flex-1 min-h-0"
            >
              <div style={{ minWidth: actualGridWidth, width: '100%' }}>
                {/* ─── Day Column Headers (dark sticky) ──────────────────── */}
                <div className="flex sticky top-0 z-20 bg-slate-800 dark:bg-slate-950 border-b border-slate-700 dark:border-slate-800">
                  {/* Corner cell (Room header + day header intersection) */}
                  <div
                    className="sticky left-0 z-30 bg-slate-900 dark:bg-black border-r border-slate-700 dark:border-slate-800 shrink-0 flex items-center px-2 sm:px-3"
                    style={{ width: roomColWidth, height: HEADER_HEIGHT }}
                  >
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-300">Room</span>
                  </div>
                  {/* Date column headers */}
                  <div className="flex">
                    {dayHeaders.map((date, i) => {
                      const isToday = isSameDay(date, today)
                      const weekend = isWeekend(date)
                      const holidayInfo = showHolidayAlerts ? isNepaliHoliday(date) : { isHoliday: false }
                      const bs = showBSDates ? adToBS(date) : null
                      const isHoliday = holidayInfo.isHoliday
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex flex-col items-center justify-center border-r last:border-r-0 select-none bg-slate-800 dark:bg-slate-950',
                                isHoliday && HOLIDAY_HEADER_BG,
                              )}
                              style={{ width: dayWidth, height: HEADER_HEIGHT }}
                            >
                              <span
                                className={cn(
                                  'text-[9px] sm:text-[10px] font-medium leading-tight',
                                  isToday ? 'text-emerald-400' : isHoliday ? 'text-orange-400' : 'text-slate-400',
                                )}
                              >
                                {isCompact ? DAY_ABBR[date.getDay()].slice(0, 3) : DAY_ABBR[date.getDay()]}
                              </span>
                              <span
                                className={cn(
                                  'text-xs sm:text-sm font-bold leading-none mt-0.5',
                                  isToday ? 'text-emerald-300' : isHoliday ? 'text-orange-300' : weekend ? 'text-rose-400' : 'text-white',
                                )}
                              >
                                {String(date.getDate()).padStart(2, '0')}
                              </span>
                              {!isSmallScreen && (
                                <>
                                  <span
                                    className={cn(
                                      'text-[8px] sm:text-[9px] font-medium mt-0.5',
                                      isToday
                                        ? 'text-emerald-400'
                                        : isHoliday
                                          ? 'text-orange-400/70'
                                          : weekend
                                            ? 'text-rose-400/70'
                                            : 'text-slate-500',
                                    )}
                                  >
                                    {isToday
                                      ? 'Today'
                                      : `${date.toLocaleDateString('en-US', { month: 'short' })}`}
                                  </span>
                                  {bs && !isToday && (
                                    <span className={cn(
                                      'text-[7px] sm:text-[8px] font-medium leading-tight',
                                      isHoliday ? 'text-orange-400/60' : 'text-amber-500/50'
                                    )}>
                                      {bs.day} {getNepaliMonthShortEnglish(bs.month)}
                                    </span>
                                  )}
                                </>
                              )}
                              {isHoliday && (
                                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-orange-500" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                            <div className="space-y-0.5">
                              <p className="font-medium">{DAY_ABBR[date.getDay()]}, {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })} {date.getFullYear()}</p>
                              {bs && (
                                <p className="text-amber-500">BS: {bs.day} {getNepaliMonthShortEnglish(bs.month)} {bs.year}</p>
                              )}
                              {isHoliday && holidayInfo.nameEn && (
                                <p className="text-orange-500 font-medium">🎉 {holidayInfo.nameEn}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>

                {/* ─── Room Rows ──────────────────────────────────────────── */}
                <div className="relative">
                  {filteredRooms.map((room, roomIdx) => {
                    const roomRes = getReservationsForRoom(room.id)
                    return (
                      <div
                        key={room.id}
                        className={cn(
                          'flex border-b last:border-b-0',
                          roomIdx % 2 === 0 ? 'bg-background' : 'bg-muted/15',
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* ─── Room Label (dark sticky left) ──────────────── */}
                        <div
                          className={cn(
                            'sticky left-0 z-20 border-r border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3',
                            'bg-slate-800 dark:bg-slate-950',
                          )}
                          style={{ width: roomColWidth }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'size-2 rounded-full shrink-0',
                                  ROOM_STATUS_DOT[room.status] || 'bg-gray-400',
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              {ROOM_STATUS_LABELS[room.status] || room.status}
                            </TooltipContent>
                          </Tooltip>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] sm:text-xs font-bold truncate leading-tight text-white">#{room.number}</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight truncate">
                              {room.type.code}
                              {room.wing ? ` · ${room.wing}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* ─── Date Cells ────────────────────────────────── */}
                        <div className="relative flex">
                          {dayHeaders.map((date, dayIdx) => {
                            const isToday = isSameDay(date, today)
                            const weekend = isWeekend(date)
                            const cellHoliday = showHolidayAlerts ? isNepaliHoliday(date) : { isHoliday: false }

                            return (
                              <div
                                key={dayIdx}
                                className={cn(
                                  'relative border-r last:border-r-0 cursor-pointer group',
                                  isToday && 'bg-primary/[0.03]',
                                  weekend && !isToday && 'bg-muted/10',
                                  cellHoliday.isHoliday && !isToday && !weekend && HOLIDAY_CELL_BG,
                                  dragReservation && 'ring-0 ring-inset ring-primary/10',
                                )}
                                style={{ width: dayWidth, height: ROW_HEIGHT }}
                                onDoubleClick={() => handleCellDoubleClick(room.id, date)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, room.id, date)}
                              >
                                {/* Today vertical indicator */}
                                {isToday && (
                                  <div className="absolute inset-y-0 left-0 w-0.5 bg-primary/30 z-10" />
                                )}
                                {/* Empty cell hover indicator */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <Plus className="size-3 text-muted-foreground/30" />
                                </div>
                              </div>
                            )
                          })}

                          {/* ─── Reservation Blocks (draggable) ──────────── */}
                          {roomRes.map((res) => {
                            const pos = getReservationPosition(res)
                            const category = getReservationCategory(res, todayStr)
                            const colorClass = BLOCK_COLORS[category] || BLOCK_COLORS.confirmed
                            const hoverClass = BLOCK_HOVER[category] || ''
                            const guestName = res.guest
                              ? `${res.guest.firstName} ${res.guest.lastName}`
                              : res.confirmationNo
                            const isVip =
                              res.guest?.vipLevel && res.guest.vipLevel !== 'none'
                            const nights = nightsBetween(res.checkIn, res.checkOut)

                            return (
                              <Tooltip key={res.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, res)}
                                    onDragEnd={handleDragEnd}
                                    className={cn(
                                      'absolute top-[3px] rounded-md border-l-[3px] px-1.5 py-0.5 cursor-grab active:cursor-grabbing transition-all z-10',
                                      'text-[10px] sm:text-[11px] font-medium leading-tight overflow-hidden',
                                      'shadow-sm hover:shadow-md hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                      colorClass,
                                      hoverClass,
                                      'opacity-90 hover:opacity-100',
                                    )}
                                    style={{
                                      left: pos.left + 2,
                                      width: Math.max(pos.width - 4, dayWidth - 4),
                                      height: ROW_HEIGHT - 6,
                                    }}
                                    onClick={() => handleReservationClick(res)}
                                  >
                                    <div className="flex items-center gap-0.5 truncate">
                                      {isVip && (
                                        <Sparkles className="size-3 shrink-0 text-amber-500" />
                                      )}
                                      <span className="truncate font-semibold">{guestName}</span>
                                    </div>
                                    {pos.width >= dayWidth * 2 && (
                                      <div className={cn('text-[9px] opacity-70 truncate mt-px flex items-center gap-0.5', isCompact && 'text-[8px]')}>
                                        <Clock className="size-2.5 shrink-0" />
                                        <span className="truncate">
                                          {formatDate(res.checkIn).replace(/,?\s*\d{4}$/, '')} →{' '}
                                          {formatDate(res.checkOut).replace(/,?\s*\d{4}$/, '')}
                                        </span>
                                      </div>
                                    )}
                                    {pos.width >= dayWidth * 3 && res.roomRate > 0 && (
                                      <div className={cn('opacity-60 truncate', isCompact ? 'text-[8px]' : 'text-[9px]')}>
                                        {nights} night{nights > 1 ? 's' : ''} · {formatCurrency(res.roomRate)}/n
                                      </div>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[280px] text-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold">
                                      {guestName}
                                      {isVip && (
                                        <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                          VIP
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Room #{res.room?.number} · {res.room?.type.name}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {formatDate(res.checkIn)} → {formatDate(res.checkOut)} ({nights}N)
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={category === 'arrival_today' || category === 'departure_today' ? res.status : category} />
                                      <span className="text-muted-foreground">
                                        {formatCurrency(res.totalAmount)}
                                      </span>
                                    </div>
                                    {res.specialRequests && (
                                      <div className="text-amber-600 dark:text-amber-400">
                                        ★ {res.specialRequests}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Ensure grid takes full width for proper scrolling */}
                <div style={{ width: actualGridWidth, minWidth: '100%', height: 1 }} />
              </div>
            </div>

            {/* ─── Bottom Status Legend Bar ──────────────────────────── */}
            <div className="flex items-center gap-4 px-3 py-1.5 bg-muted/30 border-t text-xs shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
              {LEGEND_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <div className={cn('size-2.5 rounded-sm shrink-0', item.dotClass)} />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{item.label}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{filteredRooms.length} rooms</span>
                <span>·</span>
                <span>{summary.totalReservations} reservations</span>
                <span>·</span>
                <span>{summary.arrivals} arrivals</span>
                <span>·</span>
                <span>{summary.departures} departures</span>
              </div>
            </div>
          </Card>
        )}

        {/* ─── Reservation Detail Dialog ─────────────────────────────────── */}
        <Dialog
          open={showDetailDialog}
          onOpenChange={(open) => {
            setShowDetailDialog(open)
            if (!open) setSelectedReservation(null)
          }}
        >
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col">
            {selectedReservation && (
              <React.Fragment>
                {/* Dialog Header - fixed */}
                <div className="px-4 pt-4 pb-2 border-b shrink-0">
                  <DialogHeader className="gap-1">
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <CalendarDays className="size-4 text-primary" />
                      Reservation Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {selectedReservation.confirmationNo}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <StatusBadge status={getReservationCategory(selectedReservation, todayStr)} />
                  </div>
                </div>

                {/* Content - no scroll */}
                <div className="overflow-hidden flex-1 min-h-0 px-4 py-2">
                  <div className="space-y-2">
                    {/* Guest Info - compact */}
                    {selectedReservation.guest ? (
                      <div className="flex items-start gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <User className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold">
                              {selectedReservation.guest.firstName}{' '}
                              {selectedReservation.guest.lastName}
                            </span>
                            {selectedReservation.guest.vipLevel &&
                              selectedReservation.guest.vipLevel !== 'none' && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                >
                                  VIP
                                </Badge>
                              )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {selectedReservation.guest.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3" />
                                {selectedReservation.guest.phone}
                              </span>
                            )}
                            {selectedReservation.guest.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="size-3" />
                                <span className="truncate">{selectedReservation.guest.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No guest assigned</p>
                    )}

                    <Separator />

                    {/* Stay Details - compact grid */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BedDouble className="size-3" />
                        Stay Details
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Room</p>
                          <p className="font-semibold mt-0.5">
                            {selectedReservation.room
                              ? `#${selectedReservation.room.number}`
                              : '—'}
                          </p>
                          {selectedReservation.room && (
                            <p className="text-muted-foreground truncate">
                              {selectedReservation.room.type.name}
                            </p>
                          )}
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Check-in</p>
                          <p className="font-semibold mt-0.5">{formatDate(selectedReservation.checkIn)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Check-out</p>
                          <p className="font-semibold mt-0.5">{formatDate(selectedReservation.checkOut)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Nights</p>
                          <p className="font-semibold mt-0.5">
                            {nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Guests</p>
                          <p className="font-semibold mt-0.5">
                            <Users className="inline size-2.5 mr-0.5" />
                            {selectedReservation.adults}A
                            {selectedReservation.children > 0
                              ? `, ${selectedReservation.children}C`
                              : ''}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Source</p>
                          <p className="font-semibold mt-0.5 capitalize">
                            {selectedReservation.source?.replace('_', ' ') || 'Direct'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Financial - compact */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CreditCard className="size-3" />
                        Financial
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Rate/Night</p>
                          <p className="font-semibold mt-0.5">
                            {formatCurrency(selectedReservation.roomRate)}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold mt-0.5">
                            {formatCurrency(selectedReservation.totalAmount)}
                          </p>
                        </div>
                        {selectedReservation.folios && selectedReservation.folios.length > 0 ? (
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="text-muted-foreground">Balance</p>
                            <p
                              className={cn(
                                'font-semibold mt-0.5',
                                selectedReservation.folios[0].balance > 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-600',
                              )}
                            >
                              {formatCurrency(selectedReservation.folios[0].balance)}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="text-muted-foreground">Payment</p>
                            <p className="font-semibold mt-0.5 capitalize">
                              {selectedReservation.paymentStatus?.replace('_', ' ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes - compact */}
                    {(selectedReservation.specialRequests || selectedReservation.notes) && (
                      <React.Fragment>
                        <Separator />
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Info className="size-3" />
                            Notes
                          </h4>
                          {selectedReservation.specialRequests && (
                            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                              ★ {selectedReservation.specialRequests}
                            </div>
                          )}
                          {selectedReservation.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedReservation.notes}
                            </p>
                          )}
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                </div>

                {/* Actions Footer - fixed at bottom */}
                <div className="px-4 py-2.5 border-t shrink-0 bg-background">
                  <div className="flex flex-wrap gap-1.5">
                    {getActionButtons(selectedReservation)}
                  </div>
                </div>
              </React.Fragment>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── New Reservation Dialog ────────────────────────────────────── */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 border-b shrink-0">
              <DialogHeader className="gap-1">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Plus className="size-4" />
                  New Reservation
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {newForm.roomId
                    ? `Booking for Room #${filteredRooms.find((r) => r.id === newForm.roomId)?.number || ''} on ${newForm.checkIn}`
                    : 'Create a new guest reservation'}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Form content - no scroll */}
            <div className="overflow-hidden flex-1 min-h-0 px-4 py-2">
              <div className="space-y-3">
                {/* Guest Selection */}
                <div>
                  <Label className="text-xs font-medium">Guest</Label>
                  <Select
                    value={newForm.guestId}
                    onValueChange={(v) => {
                      const g = guests.find((x: Record<string, unknown>) => x.id === v)
                      if (g) {
                        setNewForm((p) => ({
                          ...p,
                          guestId: v,
                          firstName: (g as CalendarGuest).firstName,
                          lastName: (g as CalendarGuest).lastName,
                          phone: (g as CalendarGuest).phone || '',
                          email: (g as CalendarGuest).email || '',
                        }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select guest..." />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((g: Record<string, unknown>) => (
                        <SelectItem key={g.id as string} value={g.id as string}>
                          {(g as CalendarGuest).firstName} {(g as CalendarGuest).lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-center text-[10px] text-muted-foreground mt-1">— or enter new guest —</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">First Name</Label>
                      <Input
                        placeholder="First"
                        className="h-8 text-xs"
                        value={newForm.firstName}
                        onChange={(e) =>
                          setNewForm((p) => ({ ...p, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Last Name</Label>
                      <Input
                        placeholder="Last"
                        className="h-8 text-xs"
                        value={newForm.lastName}
                        onChange={(e) =>
                          setNewForm((p) => ({ ...p, lastName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Phone</Label>
                      <Input
                        placeholder="Phone"
                        className="h-8 text-xs"
                        value={newForm.phone}
                        onChange={(e) =>
                          setNewForm((p) => ({ ...p, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Email</Label>
                      <Input
                        placeholder="Email"
                        className="h-8 text-xs"
                        value={newForm.email}
                        onChange={(e) =>
                          setNewForm((p) => ({ ...p, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stay Details - compact */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Room</Label>
                    <Select
                      value={newForm.roomId}
                      onValueChange={(v) => setNewForm((p) => ({ ...p, roomId: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            #{r.number} — {r.type.code} (F{r.floor})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Source</Label>
                    <Select
                      value={newForm.source}
                      onValueChange={(v) => setNewForm((p) => ({ ...p, source: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  <div className="space-y-1">
                    <Label className="text-[10px]">Check-in</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={newForm.checkIn}
                      onChange={(e) =>
                        setNewForm((p) => ({ ...p, checkIn: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Check-out</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={newForm.checkOut}
                      onChange={(e) =>
                        setNewForm((p) => ({ ...p, checkOut: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Adults</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-xs"
                      value={newForm.adults}
                      onChange={(e) =>
                        setNewForm((p) => ({
                          ...p,
                          adults: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Children</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-xs"
                      value={newForm.children}
                      onChange={(e) =>
                        setNewForm((p) => ({
                          ...p,
                          children: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[10px]">Rate (NPR/night)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-xs"
                      value={newForm.roomRate || ''}
                      placeholder="e.g. 12000"
                      onChange={(e) =>
                        setNewForm((p) => ({
                          ...p,
                          roomRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                {newFormNights > 0 && newForm.roomRate > 0 && (
                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
                    {newFormNights} night{newFormNights > 1 ? 's' : ''} ×{' '}
                    {formatCurrency(newForm.roomRate)}/night ={' '}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(newFormTotal)}
                    </span>
                  </p>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px]">Special Requests</Label>
                  <Textarea
                    placeholder="Any special requests..."
                    className="text-xs"
                    value={newForm.specialRequests}
                    onChange={(e) =>
                      setNewForm((p) => ({ ...p, specialRequests: e.target.value }))
                    }
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guaranteed"
                    checked={newForm.guaranteed}
                    onCheckedChange={(checked) =>
                      setNewForm((p) => ({ ...p, guaranteed: !!checked }))
                    }
                  />
                  <Label htmlFor="guaranteed" className="text-xs">
                    Guaranteed reservation
                  </Label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t shrink-0 bg-background">
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateSubmit}
                  disabled={createReservationMutation.isPending}
                >
                  {createReservationMutation.isPending
                    ? 'Creating...'
                    : 'Create Reservation'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Add Note Dialog ───────────────────────────────────────────── */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 border-b shrink-0">
              <DialogHeader className="gap-1">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="size-4" />
                  Add Note
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Reservation {selectedReservation?.confirmationNo}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="overflow-hidden flex-1 min-h-0 px-4 py-2">
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter your note..."
                  className="text-xs"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
                {selectedReservation?.notes && (
                  <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2">
                    <p className="font-medium mb-1">Previous notes:</p>
                    <p className="whitespace-pre-wrap">{selectedReservation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t shrink-0 bg-background">
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNoteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Cancel Confirmation Dialog ─────────────────────────────────── */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel reservation{' '}
                {selectedReservation?.confirmationNo}? This action cannot be
                undone. The room will be released and the guest will be
                notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Cancel Reservation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Move Reason Dialog (Drag & Drop) ────────────────────────────── */}
        <Dialog open={showMoveDialog} onOpenChange={(open) => {
          setShowMoveDialog(open)
          if (!open) {
            setMoveData(null)
            setMoveReason('')
            setMoveCustomReason('')
          }
        }}>
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 border-b shrink-0">
              <DialogHeader className="gap-1">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="size-4" />
                  Confirm Room Move
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review the changes and provide a reason for this move.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="overflow-hidden flex-1 min-h-0 px-4 py-3">
              {moveData && (
                <div className="space-y-3">
                  {/* Change summary */}
                  <div className="space-y-2">
                    {moveData.roomChanged && (
                      <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                        <BedDouble className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Room:</span>
                        <span className="font-semibold">#{moveData.fromRoomNumber}</span>
                        <ArrowRightLeft className="size-3 text-muted-foreground" />
                        <span className="font-semibold text-primary">#{moveData.toRoomNumber}</span>
                      </div>
                    )}
                    {moveData.datesChanged && (
                      <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                        <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Dates:</span>
                        <span className="font-semibold">{formatDateShort(moveData.fromCheckIn)}</span>
                        <ArrowRightLeft className="size-3 text-muted-foreground" />
                        <span className="font-semibold text-primary">{formatDateShort(moveData.toCheckIn)}</span>
                        <span className="text-muted-foreground">→ {formatDateShort(moveData.toCheckOut)}</span>
                      </div>
                    )}
                  </div>

                  {/* Reason selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Move Reason <span className="text-rose-500">*</span></Label>
                    <Select value={moveReason} onValueChange={setMoveReason}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MOVE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom reason textarea (shown when "Other" is selected) */}
                  {moveReason === 'Other' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Custom Reason</Label>
                      <Textarea
                        placeholder="Enter the reason for this move..."
                        className="text-xs"
                        value={moveCustomReason}
                        onChange={(e) => setMoveCustomReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t shrink-0 bg-background">
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMoveDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleMoveConfirm}
                  disabled={
                    !moveReason ||
                    (moveReason === 'Other' && !moveCustomReason.trim()) ||
                    moveReservationMutation.isPending
                  }
                >
                  {moveReservationMutation.isPending ? 'Moving...' : 'Confirm Move'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
