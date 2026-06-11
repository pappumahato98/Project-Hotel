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
  ArrowRight,
  ArrowRightLeft,
  X,
  GripVertical,
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
const DEFAULT_NUM_DAYS = 10
const DEFAULT_DAY_WIDTH = 100
const ROW_HEIGHT = 48
const HEADER_HEIGHT = 64
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

// Reservation block color coding — Google Calendar-inspired soft tones
const BLOCK_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-50 border-l-blue-400 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-l-blue-500',
  arrival_today: 'bg-emerald-50 border-l-emerald-400 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-l-emerald-500',
  checked_in: 'bg-amber-50 border-l-amber-400 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:border-l-amber-500',
  departure_today: 'bg-rose-50 border-l-rose-400 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-l-rose-500',
  tentative: 'bg-gray-100 border-l-gray-300 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400 dark:border-l-gray-500',
}

const BLOCK_HOVER: Record<string, string> = {
  confirmed: 'hover:bg-blue-100 dark:hover:bg-blue-950/50',
  arrival_today: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/50',
  checked_in: 'hover:bg-amber-100 dark:hover:bg-amber-950/50',
  departure_today: 'hover:bg-rose-100 dark:hover:bg-rose-950/50',
  tentative: 'hover:bg-gray-200 dark:hover:bg-gray-800/50',
}

// Legend items — clean pill-style dots
const LEGEND_ITEMS = [
  { key: 'confirmed', label: 'Confirmed', dotClass: 'bg-blue-400 dark:bg-blue-500' },
  { key: 'arrival_today', label: 'Arrival', dotClass: 'bg-emerald-400 dark:bg-emerald-500' },
  { key: 'checked_in', label: 'Checked-In', dotClass: 'bg-amber-400 dark:bg-amber-500' },
  { key: 'departure_today', label: 'Departure', dotClass: 'bg-rose-400 dark:bg-rose-500' },
  { key: 'tentative', label: 'Tentative', dotClass: 'bg-gray-400 dark:bg-gray-500' },
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
const DAY_ABBR_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_ABBR_THREE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Light holiday highlighting
const HOLIDAY_HEADER_BG = 'bg-orange-50/60 dark:bg-orange-950/20'
const HOLIDAY_CELL_BG = 'bg-orange-50/30 dark:bg-orange-950/10'

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
  const [viewMode, setViewMode] = useState<'7days' | '10days'>('7days')
  const { preferences } = usePreferencesStore()
  const showBSDates = preferences.nepaliStandards?.dualCalendar === true
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

  // Re-measure when sidebar expands/collapses (add delay for CSS transition)
  useEffect(() => {
    // Measure at multiple intervals to catch sidebar CSS transition completion
    const timers = [
      setTimeout(recalcWidth, 100),
      setTimeout(recalcWidth, 300),
      setTimeout(recalcWidth, 500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [sidebarState, sidebarOpen, isMobile, recalcWidth])

  // Dynamically compute grid dimensions based on container width
  const numDays = viewMode === '7days' ? 7 : DEFAULT_NUM_DAYS
  const prevOffset = numDays // Navigate by the full view range
  const roomColWidth = containerWidth > 1024 ? 140 : containerWidth > 640 ? 110 : 90
  const dayWidth = containerWidth > 0
    ? Math.max(64, Math.floor((containerWidth - roomColWidth) / numDays))
    : DEFAULT_DAY_WIDTH
  // Match dayWidth exactly to prevent grid from exceeding container width
  const actualGridWidth = roomColWidth + numDays * dayWidth
  const isCompact = containerWidth <= 768
  const isSmallScreen = containerWidth <= 480

  // ─── Date range state ────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = useMemo(() => dateToKey(today), [today])

  const [startDate, setStartDate] = useState(() => addDays(today, -2))
  const hasAutoScrolledRef = useRef(false)
  const endDate = useMemo(() => addDays(startDate, numDays - 1), [startDate, numDays])

  const startDateStr = useMemo(() => dateToKey(startDate), [startDate])
  // Add a 7-day buffer beyond the visible range so extended stays are still fetched
  const endDateStr = useMemo(() => dateToKey(addDays(endDate, 7)), [endDate])

  // ─── Navigation ──────────────────────────────────────────────────────
  const goToPrevWeek = useCallback(() => setStartDate((d) => addDays(d, -prevOffset)), [prevOffset])
  const goToNextWeek = useCallback(() => setStartDate((d) => addDays(d, prevOffset)), [prevOffset])
  const goToToday = useCallback(() => {
    setStartDate(addDays(today, -2))
    hasAutoScrolledRef.current = false // Re-enable auto-scroll for today
  }, [today])

  // ─── Floor filter ────────────────────────────────────────────────────
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const clearFloorFilter = useCallback(() => setFloorFilter('all'), [])

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
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null)
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

  // ─── Fetch reservations overlapping the full date range ──────────────
  const { data: reservationsRaw, isLoading: resLoading } = useQuery({
    queryKey: ['reservations', startDateStr, endDateStr],
    queryFn: async () => {
      const params = new URLSearchParams()
      // Use dateFrom/dateTo to fetch ALL reservations overlapping the visible range
      // This ensures moved reservations remain visible after drag-drop
      params.set('dateFrom', startDateStr)
      params.set('dateTo', endDateStr)
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json()
    },
    staleTime: 15_000,
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
      // Real-time impact on other modules
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['departures'] })
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['guests'] })
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
      // Real-time impact on other modules
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['guests'] })
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
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
      // Real-time impact on other modules
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['departures'] })
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      queryClient.invalidateQueries({ queryKey: ['room-moves'] })
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
          queryClient.invalidateQueries({ queryKey: ['calendar'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['arrivals'] })
          queryClient.invalidateQueries({ queryKey: ['in-house'] })
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
      confirmationNo: res.confirmationNo,
      fromRoomId: res.room?.id || '',
      fromRoomNumber: res.room?.number || '',
      fromCheckIn: res.checkIn,
      fromCheckOut: res.checkOut,
      guestName: res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Unknown',
    }))
    e.dataTransfer.effectAllowed = 'move'
    setDragReservation(res)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, roomId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverRoomId(roomId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverRoomId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetRoomId: string, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
      const { reservationId, fromRoomId, fromRoomNumber, fromCheckIn, fromCheckOut, confirmationNo: confNo } = data

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
        confirmationNo: confNo || '',
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
    setDragOverRoomId(null)
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

  // ─── Auto-scroll to today's column on mount and navigation (NOT on resize) ──
  useEffect(() => {
    if (!scrollRef.current || hasAutoScrolledRef.current) return
    const todayIndex = dayHeaders.findIndex((d) => isSameDay(d, today))
    if (todayIndex > 0) {
      // Use requestAnimationFrame to ensure layout is settled before scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const scrollTarget = todayIndex * dayWidth - dayWidth * 0.5
          scrollRef.current.scrollLeft = Math.max(0, scrollTarget)
          hasAutoScrolledRef.current = true
        }
      })
    } else {
      hasAutoScrolledRef.current = true
    }
  }, [dayHeaders, today, viewMode]) // Re-scroll when viewMode changes, but NOT on resize

  // ─── Track month boundaries for month labels ─────────────────────────
  const monthBoundaries = useMemo(() => {
    const boundaries: number[] = []
    for (let i = 0; i < dayHeaders.length; i++) {
      if (dayHeaders[i].getDate() <= 7 && (i === 0 || dayHeaders[i].getMonth() !== dayHeaders[i - 1].getMonth())) {
        boundaries.push(i)
      }
    }
    return boundaries
  }, [dayHeaders])

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ─── Header Toolbar (Google Calendar-style) ────────────────── */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 shrink-0 flex-wrap bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          {/* Left side: Title */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Reservation Calendar</h2>
          </div>

          {/* Center: Navigation pills + View toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* < Today > pill navigation */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-full p-0.5">
              <button
                onClick={goToPrevWeek}
                className="flex items-center justify-center size-6 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                onClick={goToToday}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToNextWeek}
                className="flex items-center justify-center size-6 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Segmented view toggle: 7 Days | 10 Days */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-full p-0.5">
              <button
                onClick={() => {
                  setViewMode('7days')
                  hasAutoScrolledRef.current = false
                }}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                  viewMode === '7days'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                7D
              </button>
              <button
                onClick={() => {
                  setViewMode('10days')
                  hasAutoScrolledRef.current = false
                }}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                  viewMode === '10days'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                10D
              </button>
            </div>
          </div>

          {/* Right side: Floor filter, BS/AD, New Booking */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Floor filter — with clear button */}
            {floorFilter !== 'all' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={clearFloorFilter}
                    className="inline-flex items-center gap-1 h-7 pl-2 pr-1.5 text-[11px] font-medium rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <span>Floor {floorFilter}</span>
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                      <X className="size-2.5" strokeWidth={2.5} />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Clear floor filter</TooltipContent>
              </Tooltip>
            ) : (
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="w-[90px] h-7 text-[11px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full">
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
            )}

            {/* BS/AD toggle — with clear X when BS active */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 text-[11px] font-medium rounded-full gap-1',
                    showBSDates
                      ? 'pl-2.5 pr-1.5 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800'
                      : 'px-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                  onClick={() => {
                    const updated = { ...preferences.nepaliStandards, dualCalendar: !showBSDates }
                    usePreferencesStore.getState().updatePreferences({ nepaliStandards: updated })
                  }}
                >
                  <span>{showBSDates ? 'बि.सं' : 'AD'}</span>
                  {showBSDates && (
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                      <X className="size-2.5" strokeWidth={2.5} />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{showBSDates ? 'Switch to AD dates' : 'Switch to BS dates'}</TooltipContent>
            </Tooltip>

            {/* New Booking — Google-blue primary */}
            <Button
              size="sm"
              className="h-7 gap-1 text-[11px] font-medium rounded-full px-3 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                setNewForm(getDefaultNewForm(filteredRooms[0]?.id || '', startDateStr))
                setShowNewDialog(true)
              }}
            >
              <Plus className="size-3" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* ─── Calendar Grid ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 min-h-0 bg-white dark:bg-gray-950">
            <div className="flex">
              {/* Skeleton room labels */}
              <div className="shrink-0 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800" style={{ width: roomColWidth }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3" style={{ height: ROW_HEIGHT }}>
                    <Skeleton className="size-2.5 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-10 rounded" />
                      <Skeleton className="h-2 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Skeleton day columns */}
              <div className="flex-1 flex">
                {Array.from({ length: numDays }).map((_, i) => (
                  <div key={i} className="flex-1">
                    <div className="flex flex-col items-center justify-center border-r border-gray-100 last:border-r-0" style={{ height: HEADER_HEIGHT }}>
                      <Skeleton className="h-3 w-5 rounded mb-1" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div
                        key={j}
                        className="border-r border-gray-100 last:border-r-0"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <Skeleton className="mx-1 mt-2 h-5 w-[90%] rounded" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="flex-1 min-h-0">
            <CardContent className="py-16">
              <EmptyState
                illustration={<NoScheduleIllustration className="w-32 h-auto" />}
                title="No rooms configured"
                description="Add rooms in Room Management to see them on the calendar."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-950">
            <div
              ref={scrollRef}
              className="overflow-auto h-full"
            >
              <div style={{ width: '100%' }}>
                {/* ─── Day Column Headers (white, clean) ──────────────────── */}
                <div className="flex sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                  {/* Corner cell — always fixed at top-left corner */}
                  <div
                    className="sticky left-0 z-40 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 shrink-0 flex items-center justify-center"
                    style={{ width: roomColWidth, height: HEADER_HEIGHT }}
                  >
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Room</span>
                  </div>
                  {/* Date column headers */}
                  <div className="flex">
                    {dayHeaders.map((date, i) => {
                      const isTodayCol = isSameDay(date, today)
                      const weekend = isWeekend(date)
                      const holidayInfo = showHolidayAlerts ? isNepaliHoliday(date) : { isHoliday: false }
                      const bs = showBSDates ? adToBS(date) : null
                      const isHoliday = holidayInfo.isHoliday
                      const isFirstOfMonth = monthBoundaries.includes(i)
                      const monthLabel = isFirstOfMonth
                        ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : null
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'relative flex flex-col items-center justify-center border-r last:border-r-0 select-none shrink-0',
                                'bg-white dark:bg-gray-950',
                                !isTodayCol && weekend && 'bg-gray-50/80 dark:bg-gray-900/40',
                                !isTodayCol && isHoliday && HOLIDAY_HEADER_BG,
                              )}
                              style={{ width: dayWidth, height: HEADER_HEIGHT }}
                            >
                              {/* Day abbreviation */}
                              <span
                                className={cn(
                                  'text-[10px] sm:text-xs font-medium leading-none',
                                  isTodayCol ? 'text-blue-500 dark:text-blue-400' : weekend ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400',
                                )}
                              >
                                {isCompact ? DAY_ABBR_SHORT[date.getDay()] : DAY_ABBR_THREE[date.getDay()]}
                              </span>
                              {/* Date number — in circle for today */}
                              {isTodayCol ? (
                                <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs sm:text-sm font-semibold mt-1">
                                  {showBSDates && bs ? bs.day : date.getDate()}
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'text-xs sm:text-sm font-medium mt-1',
                                    isHoliday ? 'text-orange-600 dark:text-orange-400' : weekend ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300',
                                  )}
                                >
                                  {showBSDates && bs ? bs.day : date.getDate()}
                                </span>
                              )}
                              {/* BS date or month label shown below */}
                              {showBSDates && bs && !isTodayCol ? (
                                <span className="text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
                                  {date.getDate()}
                                </span>
                              ) : !showBSDates && monthLabel && !isTodayCol ? (
                                <span className="text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium leading-none">
                                  {monthLabel}
                                </span>
                              ) : null}
                              {/* Holiday dot indicator */}
                              {isHoliday && (
                                <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-orange-400" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                            <div className="space-y-0.5">
                              {showBSDates && bs ? (
                                <p className="font-medium">{DAY_ABBR[date.getDay()]}, {bs.day} {getNepaliMonthShortEnglish(bs.month)} {bs.year} (BS)</p>
                              ) : (
                                <p className="font-medium">{DAY_ABBR[date.getDay()]}, {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })} {date.getFullYear()}</p>
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
                          'flex border-b border-gray-100 dark:border-gray-800 last:border-b-0 shrink-0',
                          roomIdx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/20',
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* ─── Room Label (sticky left, below header) ──────────────── */}
                        <div
                          className={cn(
                            'sticky left-0 z-10 border-r border-gray-200 dark:border-gray-800 shrink-0 flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3',
                            roomIdx % 2 === 0
                              ? 'bg-white dark:bg-gray-950'
                              : 'bg-gray-50 dark:bg-gray-900/50',
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
                            <p className="text-[10px] sm:text-xs font-bold truncate leading-tight text-gray-800 dark:text-gray-200">#{room.number}</p>
                            <p className="text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-500 leading-tight truncate">
                              {room.type.code}{room.wing ? ` · ${room.wing}` : ''} · F{room.floor}
                            </p>
                          </div>
                        </div>

                        {/* ─── Date Cells ────────────────────────────────── */}
                        <div
                          className={cn(
                            'relative flex shrink-0 overflow-hidden',
                            dragReservation && dragOverRoomId === room.id && 'ring-2 ring-blue-300/60 dark:ring-blue-600/40 ring-inset',
                          )}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            // Calculate which date cell the mouse is over
                            const rect = e.currentTarget.getBoundingClientRect()
                            const roomLabelWidth = roomColWidth
                            const mouseX = e.clientX - rect.left - roomLabelWidth
                            if (mouseX >= 0) {
                              const dayIndex = Math.min(Math.floor(mouseX / dayWidth), numDays - 1)
                              setDragOverRoomId(room.id)
                            }
                          }}
                          onDragLeave={(e) => {
                            // Only clear if actually leaving the room row (not entering a child)
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              setDragOverRoomId(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const roomLabelWidth = roomColWidth
                              const mouseX = e.clientX - rect.left - roomLabelWidth
                              const dayIndex = Math.max(0, Math.min(Math.floor(mouseX / dayWidth), numDays - 1))
                              const targetDate = dayHeaders[dayIndex]
                              if (targetDate) {
                                handleDrop(e, room.id, targetDate)
                              }
                            } catch {
                              setDragReservation(null)
                            }
                          }}
                        >
                          {dayHeaders.map((date, dayIdx) => {
                            const isTodayCell = isSameDay(date, today)
                            const weekend = isWeekend(date)
                            const cellHoliday = showHolidayAlerts ? isNepaliHoliday(date) : { isHoliday: false }

                            return (
                              <div
                                key={dayIdx}
                                className={cn(
                                  'relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 cursor-pointer group shrink-0',
                                  isTodayCell && 'bg-blue-50/40 dark:bg-blue-950/20',
                                  !isTodayCell && weekend && 'bg-gray-100/30 dark:bg-gray-900/30',
                                  cellHoliday.isHoliday && !isTodayCell && !weekend && HOLIDAY_CELL_BG,
                                  !isTodayCell && !weekend && !cellHoliday.isHoliday && roomIdx % 2 !== 0 && 'bg-gray-50/30 dark:bg-gray-900/15',
                                  dragReservation && dragOverRoomId === room.id && 'bg-blue-50/30 dark:bg-blue-950/10',
                                )}
                                style={{ width: dayWidth, height: ROW_HEIGHT }}
                                onDoubleClick={() => handleCellDoubleClick(room.id, date)}
                              >
                                {/* Today vertical indicator */}
                                {isTodayCell && (
                                  <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-400/50 z-10" />
                                )}
                                {/* Empty cell hover "+" indicator */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <Plus className="size-3 text-gray-300 dark:text-gray-600" />
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
                                      'absolute top-[3px] rounded-lg border-l-[3px] px-1 sm:px-2 py-0.5 sm:py-1 cursor-grab active:cursor-grabbing transition-all z-10',
                                      dragReservation && dragReservation.id !== res.id && 'pointer-events-none',
                                      'text-[10px] sm:text-xs font-medium leading-tight overflow-hidden whitespace-nowrap',
                                      'shadow-sm hover:shadow-md hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                      colorClass,
                                      hoverClass,
                                      dragReservation?.id === res.id ? 'opacity-40 scale-95' : 'opacity-90 hover:opacity-100',
                                    )}
                                    style={{
                                      left: pos.left + 2,
                                      width: Math.max(pos.width - 4, dayWidth - 4),
                                      height: ROW_HEIGHT - 6,
                                    }}
                                    onClick={() => handleReservationClick(res)}
                                  >
                                    <div className="flex items-center gap-0.5 truncate group min-w-0">
                                      {pos.width >= dayWidth * 1.5 && (
                                        <GripVertical className="size-2.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                                      )}
                                      {isVip && (
                                        <Sparkles className="size-3 shrink-0 text-amber-500" />
                                      )}
                                      <span className="truncate font-semibold text-ellipsis">{guestName}</span>
                                    </div>
                                    {pos.width >= dayWidth * 2 && (
                                      <div className={cn('text-[8px] sm:text-[9px] opacity-70 truncate mt-0 flex items-center gap-0.5', isCompact && 'text-[7px] sm:text-[8px]')}>
                                        <Clock className="size-2.5 shrink-0" />
                                        <span className="truncate">
                                          {formatDate(res.checkIn).replace(/,?\s*\d{4}$/, '')} →{' '}
                                          {formatDate(res.checkOut).replace(/,?\s*\d{4}$/, '')}
                                        </span>
                                      </div>
                                    )}
                                    {pos.width >= dayWidth * 3 && res.roomRate > 0 && (
                                      <div className={cn('opacity-60 truncate hidden sm:block', isCompact ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[9px]')}>
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

                {/* Grid width is handled by CSS flex — no spacer needed */}

                {/* ─── Bottom Legend Bar (clean, light) ────────────────── */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 text-[10px] shrink-0 sticky bottom-0 z-10">
                  <div className="flex items-center gap-2">
                    {LEGEND_ITEMS.map((item) => (
                      <div key={item.key} className="flex items-center gap-1">
                        <div className={cn('size-2 rounded-full shrink-0', item.dotClass)} />
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="text-gray-400 dark:text-gray-500 font-medium">{filteredRooms.length} rooms · {summary.totalReservations} bookings · {summary.arrivals} arr · {summary.departures} dep</span>
                </div>
              </div>
            </div>
          </div>
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
          <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl">
            {/* Header with clean style */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 pt-5 pb-4 shrink-0">
              <DialogHeader className="gap-1">
                <DialogTitle className="flex items-center gap-2.5 text-lg text-white">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Plus className="size-4.5 text-white" />
                  </div>
                  New Booking
                </DialogTitle>
                <DialogDescription className="text-xs ml-[46px] text-white/70">
                  {newForm.roomId
                    ? (() => {
                        const rm = filteredRooms.find((r) => r.id === newForm.roomId)
                        return rm ? `Room #${rm.number} · ${rm.type.name} (F${rm.floor}) · ${newForm.checkIn} → ${newForm.checkOut}` : 'Fill in details to create a new reservation'
                      })()
                    : 'Fill in details to create a new reservation'}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Form content */}
            <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4">
              <div className="space-y-4">
                {/* Guest Section */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <User className="size-3" />
                    </div>
                    Guest Information
                  </Label>
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
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select existing guest..." />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((g: Record<string, unknown>) => (
                        <SelectItem key={g.id as string} value={g.id as string}>
                          {(g as CalendarGuest).firstName} {(g as CalendarGuest).lastName}
                          {(g as CalendarGuest).phone ? ` · ${(g as CalendarGuest).phone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-center text-[10px] text-muted-foreground">— or create new guest —</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px]">First Name</Label>
                      <Input placeholder="First" className="h-9 text-sm" value={newForm.firstName} onChange={(e) => setNewForm((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Last Name</Label>
                      <Input placeholder="Last" className="h-9 text-sm" value={newForm.lastName} onChange={(e) => setNewForm((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Phone</Label>
                      <Input placeholder="+977-" className="h-9 text-sm" value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Email</Label>
                      <Input placeholder="email@example.com" className="h-9 text-sm" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stay Details */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <BedDouble className="size-3" />
                    </div>
                    Stay Details
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Room</Label>
                      <Select value={newForm.roomId} onValueChange={(v) => setNewForm((p) => ({ ...p, roomId: v }))}>
                        <SelectTrigger className="h-9 text-sm">
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
                    {newForm.roomId && (() => {
                      const rm = filteredRooms.find((r) => r.id === newForm.roomId)
                      if (!rm) return null
                      return (
                        <div className="col-span-2 rounded-lg bg-muted/50 border p-2.5 flex items-center gap-3">
                          <div className={cn('size-2 rounded-full shrink-0', ROOM_STATUS_DOT[rm.status] || 'bg-gray-400')} />
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium">#{rm.number} — {rm.type.name} <span className="text-muted-foreground">({rm.type.code})</span></p>
                            <p className="text-muted-foreground">Floor {rm.floor}{rm.wing ? ` · Wing ${rm.wing}` : ''} · {ROOM_STATUS_LABELS[rm.status] || rm.status}</p>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="space-y-1">
                      <Label className="text-[11px]">Source</Label>
                      <Select value={newForm.source} onValueChange={(v) => setNewForm((p) => ({ ...p, source: v }))}>
                        <SelectTrigger className="h-9 text-sm">
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
                      <Label className="text-[11px]">Check-in</Label>
                      <Input type="date" className="h-9 text-sm" value={newForm.checkIn} onChange={(e) => setNewForm((p) => ({ ...p, checkIn: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Check-out</Label>
                      <Input type="date" className="h-9 text-sm" value={newForm.checkOut} onChange={(e) => setNewForm((p) => ({ ...p, checkOut: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Guests</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 rounded-md border bg-background px-3 h-9">
                          <Users className="size-3.5 text-muted-foreground shrink-0" />
                          <Input type="number" min={1} className="h-auto p-0 border-0 text-sm" value={newForm.adults} onChange={(e) => setNewForm((p) => ({ ...p, adults: parseInt(e.target.value) || 1 }))} />
                          <span className="text-[11px] text-muted-foreground shrink-0">Adults</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 rounded-md border bg-background px-3 h-9">
                          <span className="text-[11px] text-muted-foreground shrink-0">Ch:</span>
                          <Input type="number" min={0} className="h-auto p-0 border-0 text-sm" value={newForm.children} onChange={(e) => setNewForm((p) => ({ ...p, children: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[11px]">Rate (NPR/night)</Label>
                      <Input type="number" min={0} className="h-9 text-sm" value={newForm.roomRate || ''} placeholder="e.g. 12000" onChange={(e) => setNewForm((p) => ({ ...p, roomRate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  {newFormNights > 0 && newForm.roomRate > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{newFormNights} night{newFormNights > 1 ? 's' : ''} × {formatCurrency(newForm.roomRate)}/night</span>
                      <span className="font-bold text-blue-700 dark:text-blue-300">= {formatCurrency(newFormTotal)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Extra Details */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <StickyNote className="size-3" />
                    </div>
                    Additional
                  </Label>
                  <Textarea placeholder="Special requests..." className="text-sm" value={newForm.specialRequests} onChange={(e) => setNewForm((p) => ({ ...p, specialRequests: e.target.value }))} rows={2} />
                  <div className="flex items-center gap-2">
                    <Checkbox id="guaranteed" checked={newForm.guaranteed} onCheckedChange={(checked) => setNewForm((p) => ({ ...p, guaranteed: !!checked }))} />
                    <Label htmlFor="guaranteed" className="text-xs">Guaranteed reservation</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t shrink-0 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                {newFormNights > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {newFormNights} night{newFormNights > 1 ? 's' : ''}
                    {newForm.roomRate > 0 && <> · {formatCurrency(newFormTotal)} estimated</>}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {!newForm.guestId && newForm.firstName && newForm.lastName && 'New guest will be created'}
                </span>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowNewDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 gap-1.5 text-white rounded-full px-4" onClick={handleCreateSubmit} disabled={createReservationMutation.isPending}>
                  <Plus className="size-3.5" />
                  {createReservationMutation.isPending ? 'Creating...' : 'Create Booking'}
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
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Room Change</p>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono">#{moveData.fromRoomNumber}</span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span className="rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-mono">#{moveData.toRoomNumber}</span>
                        </div>
                      </div>
                    )}
                    {moveData.datesChanged && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Date Change</p>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono">{moveData.fromCheckIn} → {moveData.fromCheckOut}</span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span className="rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-mono">{moveData.toCheckIn} → {moveData.toCheckOut}</span>
                        </div>
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
