'use client'

import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, LogIn, XCircle, UserX, CalendarRange,
  Edit, Copy, FileText, Printer, StickyNote, BedDouble, AlertTriangle, Hotel,
  CalendarIcon, X, LayoutGrid, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency, formatDate, getTodayString, nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigationStore, useSettingsStore, useFrontDeskContextStore, useFolioContextStore, useGuestLedgerContextStore } from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────

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
  type: { name: string; code: string; bedConfig?: string | null }
}

interface ReservationFolio {
  id: string
  balance: number
  status: string
}

interface Reservation {
  id: string
  confirmationNo: string
  reservationNumber: string | null
  status: string
  reservationType: string
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  paidAmount: number
  creditLimit: number
  specialRequests: string | null
  source: string | null
  guaranteed: boolean
  company: string | null
  poNumber: string | null
  notes: string | null
  createdAt: string
  guest: ReservationGuest | null
  room: ReservationRoom | null
  folios: ReservationFolio[]
  roomId?: string
}

interface NewReservationForm {
  guestId: string
  newGuest: boolean
  firstName: string
  lastName: string
  phone: string
  email: string
  roomTypeId: string
  ratePlanId: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  specialRequests: string
  source: string
  guaranteed: boolean
  notes: string
}

interface EditReservationForm {
  checkIn: string
  checkOut: string
  adults: number
  children: number
  specialRequests: string
  notes: string
  source: string
  guaranteed: boolean
  roomRate: number
}

// ─── Constants ──────────────────────────────────────────────────────────

const ROOM_TYPES = [
  { id: 'rt-1', name: 'Deluxe Room', code: 'DLX', baseRate: 8000 },
  { id: 'rt-2', name: 'Standard Room', code: 'STD', baseRate: 5000 },
  { id: 'rt-3', name: 'Suite', code: 'STE', baseRate: 15000 },
  { id: 'rt-4', name: 'Superior Room', code: 'SPR', baseRate: 6500 },
  { id: 'rt-5', name: 'Premium Suite', code: 'PRS', baseRate: 25000 },
  { id: 'rt-6', name: 'Twin Room', code: 'TWN', baseRate: 5500 },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
]

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'corporate', label: 'Corporate' },
]

const INITIAL_FORM: NewReservationForm = {
  guestId: '',
  newGuest: true,
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  roomTypeId: '',
  ratePlanId: '',
  checkIn: getTodayString(),
  checkOut: '',
  adults: 1,
  children: 0,
  specialRequests: '',
  source: 'direct',
  guaranteed: false,
  notes: '',
}

// ─── Debounce hook ────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Date range presets ──────────────────────────────────────────────
function getDatePreset(preset: string): { from: Date; to: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'this-week': {
      const from = new Date(today)
      from.setDate(today.getDate() - today.getDay() + 1) // Monday
      const to = new Date(from)
      to.setDate(from.getDate() + 6) // Sunday
      return { from, to }
    }
    case 'this-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from, to }
    }
    case 'next-7': {
      const to = new Date(today)
      to.setDate(today.getDate() + 6)
      return { from: today, to }
    }
    case 'next-14': {
      const to = new Date(today)
      to.setDate(today.getDate() + 13)
      return { from: today, to }
    }
    case 'next-30': {
      const to = new Date(today)
      to.setDate(today.getDate() + 29)
      return { from: today, to }
    }
    default:
      return { from: today, to: today }
  }
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────

export function ReservationsView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const { settings } = useSettingsStore()
  const { setPrefillReservationId, setShowNewReservation } = useFrontDeskContextStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [newResOpen, setNewResOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === reservations.length && reservations.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reservations.map((r) => r.id)))
    }
  }

  // Conflict dialog state
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)

  // Bulk cancel mutation
  const bulkCancelMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = []
      for (const id of ids) {
        const r = await apiFetch(`/api/reservations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        })
        results.push(r)
      }
      return results
    },
    onSuccess: (_data, ids) => {
      invalidate.afterReservationChange(queryClient)
      setSelectedIds(new Set())
      toast.success(`${ids.length} reservation(s) cancelled`)
    },
    onError: () => toast.error('Bulk cancel failed'),
  })

  // Debounced search for realtime filtering
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditReservationForm>({
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    specialRequests: '',
    notes: '',
    source: 'direct',
    guaranteed: false,
    roomRate: 5000,
  })

  // Duplicate dialog state
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [duplicateForm, setDuplicateForm] = useState<NewReservationForm>({ ...INITIAL_FORM })

  // Add Note dialog state
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Print Confirmation dialog state
  const [printOpen, setPrintOpen] = useState(false)

  // Delete confirmation dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)

  // New reservation form state
  const [form, setForm] = useState<NewReservationForm>({ ...INITIAL_FORM })

  // Selected room type rate for new reservation
  const selectedRoomType = useMemo(
    () => ROOM_TYPES.find((rt) => rt.id === form.roomTypeId),
    [form.roomTypeId],
  )

  // Edit form derived rate
  const editNights = useMemo(() => {
    if (editForm.checkIn && editForm.checkOut) {
      return nightsBetween(editForm.checkIn, editForm.checkOut)
    }
    return 0
  }, [editForm.checkIn, editForm.checkOut])

  const editTotal = useMemo(() => editNights * editForm.roomRate, [editNights, editForm.roomRate])

  // ─── Fetch reservations ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['reservations', statusFilter, debouncedSearch, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      return apiFetch(`/api/reservations?${params.toString()}`)
    },
  })

  const rawReservations: Reservation[] = data?.reservations || []

  // Sort by reservationNumber descending (highest first), nulls last
  const reservations = rawReservations.length > 0
    ? [...rawReservations].sort((a, b) => {
        const na = a.reservationNumber || ''
        const nb = b.reservationNumber || ''
        if (na && nb) return nb.localeCompare(na)
        if (na) return -1
        if (nb) return 1
        return 0
      })
    : rawReservations

  // ─── Summary Stats ──────────────────────────────────────────────────
  const todayStr = getTodayString()

  const stats = useMemo(() => {
    const total = reservations.length
    const todayCheckIns = reservations.filter(
      (r) => r.checkIn === todayStr && r.status !== 'cancelled' && r.status !== 'no_show',
    ).length
    const todayCheckOuts = reservations.filter(
      (r) => r.checkOut === todayStr && (r.status === 'checked_in' || r.status === 'checked_out'),
    ).length
    const revenue = reservations.reduce((sum, r) => sum + r.totalAmount, 0)
    return { total, todayCheckIns, todayCheckOuts, revenue }
  }, [reservations, todayStr])

  // ─── New form nights / rate ──────────────────────────────────────────
  const nights = useMemo(() => {
    if (form.checkIn && form.checkOut) {
      return nightsBetween(form.checkIn, form.checkOut)
    }
    return 0
  }, [form.checkIn, form.checkOut])

  const currentRate = selectedRoomType?.baseRate ?? 5000
  const estimatedTotal = nights * currentRate

  // ─── Mutations ───────────────────────────────────────────────────────

  // Create reservation mutation (raw fetch for conflict capture)
  const createMutation = useMutation({
    mutationFn: async (formData: NewReservationForm) => {
      let guestId = formData.guestId
      if (formData.newGuest) {
        const gd = await apiFetch<{ guest: { id: string } }>('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
          }),
        })
        guestId = gd.guest.id
      }
      const roomType = ROOM_TYPES.find((rt) => rt.id === formData.roomTypeId)
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          roomTypeId: formData.roomTypeId || undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          adults: formData.adults,
          children: formData.children,
          roomRate: roomType?.baseRate ?? 5000,
          specialRequests: formData.specialRequests || undefined,
          source: formData.source,
          guaranteed: formData.guaranteed,
          notes: formData.notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'CONFLICT' && data.conflict) {
          const err: any = new Error('CONFLICT')
          err.conflict = data.conflict
          throw err
        }
        throw new Error(data.error || `Request failed (HTTP ${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      setNewResOpen(false)
      setDuplicateOpen(false)
      setForm({ ...INITIAL_FORM, checkIn: getTodayString() })
      toast.success('Reservation created successfully')
    },
    onError: (err: any) => {
      if (err.message === 'CONFLICT' && err.conflict) {
        setConflictData(err.conflict)
        setConflictOpen(true)
        return
      }
      toast.error(err.message || 'Failed to create reservation')
    },
  })

  // Update reservation status mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; roomId?: string }) =>
      apiFetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
    },
  })

  // Edit reservation mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditReservationForm> & { totalAmount: number } }) =>
      apiFetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      setEditOpen(false)
      toast.success('Reservation updated successfully')
    },
    onError: () => {
      toast.error('Failed to update reservation')
    },
  })

  // Add note mutation
  const noteMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiFetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      }),
    
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      setNoteOpen(false)
      setNoteText('')
      toast.success('Note added successfully')
    },
    onError: () => {
      toast.error('Failed to add note')
    },
  })

  // Delete reservation mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/reservations/${id}`, { method: 'DELETE' }),
    
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      setDeleteOpen(false)
      setSelectedReservation(null)
      toast.success('Reservation deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete reservation')
    },
  })

  // ─── Date range handler ────────────────────────────────────────────
  const handleDateSelect = useCallback((day: Date | undefined) => {
    if (!day) return
    const dayStr = toDateString(day)
    if (!dateFrom || (dateFrom && dateTo)) {
      // Start new range
      setDateFrom(dayStr)
      setDateTo('')
    } else {
      // Complete the range
      if (day >= new Date(dateFrom + 'T00:00:00')) {
        setDateTo(dayStr)
      } else {
        setDateFrom(dayStr)
        setDateTo('')
      }
    }
  }, [dateFrom, dateTo])

  const handlePreset = useCallback((preset: string) => {
    const { from, to } = getDatePreset(preset)
    setDateFrom(toDateString(from))
    setDateTo(toDateString(to))
    setCalendarMonth(from)
    setDatePopoverOpen(false)
  }, [])

  const clearDateRange = useCallback(() => {
    setDateFrom('')
    setDateTo('')
  }, [])

  const isSearching = searchQuery !== debouncedSearch

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleCheckIn = (reservation: Reservation) => {
    // Navigate to the 4-step Check-In Wizard with prefill
    setPrefillReservationId(reservation.id)
    navigateTo('front-desk', 'check-in')
  }

  const handleViewFolio = (res: any) => {
    useFolioContextStore.getState().setFolioContext({
      reservationId: res.id,
      guestId: res.guest?.id || res.guestId,
      guestName: `${res.guest?.firstName || ''} ${res.guest?.lastName || ''}`.trim() || 'Guest',
      roomNumber: res.room?.number || res.roomNumber || '',
      confirmationNo: res.confirmationNo,
    })
    navigateTo('front-desk', 'folio')
  }

  const handleViewLedger = (res: any) => {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({
      guestId: res.guest?.id || res.guestId,
      guestName: `${res.guest?.firstName || ''} ${res.guest?.lastName || ''}`.trim() || 'Guest',
    })
    navigateTo('front-desk', 'guest-ledger')
  }

  const canCancel = (status: string) => !['cancelled', 'checked_out', 'checked_in'].includes(status)

  const handleCancel = (reservation: Reservation) => {
    if (!canCancel(reservation.status)) return
    updateMutation.mutate({ id: reservation.id, status: 'cancelled' }, {
      onSuccess: () => toast.success('Booking cancelled'),
    })
  }

  const handleNoShow = (reservation: Reservation) => {
    updateMutation.mutate({ id: reservation.id, status: 'no_show' })
    toast.success('Reservation marked as no-show')
  }

  const openEditDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setEditForm({
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      adults: reservation.adults,
      children: reservation.children,
      specialRequests: reservation.specialRequests || '',
      notes: reservation.notes || '',
      source: reservation.source || 'direct',
      guaranteed: reservation.guaranteed,
      roomRate: reservation.roomRate,
    })
    setEditOpen(true)
  }

  const handleEditSave = () => {
    if (!selectedReservation) return
    editMutation.mutate({
      id: selectedReservation.id,
      data: {
        ...editForm,
        specialRequests: editForm.specialRequests || undefined,
        notes: editForm.notes || undefined,
        totalAmount: editTotal,
      },
    })
  }

  const openDuplicateDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    const roomType = ROOM_TYPES.find(
      (rt) => rt.code === reservation.room?.type.code,
    )
    setDuplicateForm({
      guestId: reservation.guest?.id || '',
      newGuest: !reservation.guest,
      firstName: reservation.guest?.firstName || '',
      lastName: reservation.guest?.lastName || '',
      phone: reservation.guest?.phone || '',
      email: reservation.guest?.email || '',
      roomTypeId: roomType?.id || '',
      ratePlanId: reservation.ratePlanId || '',
      checkIn: getTodayString(),
      checkOut: reservation.checkOut,
      adults: reservation.adults,
      children: reservation.children,
      specialRequests: reservation.specialRequests || '',
      source: reservation.source || 'direct',
      guaranteed: reservation.guaranteed,
      notes: reservation.notes || '',
    })
    setDuplicateOpen(true)
  }

  const handleDuplicate = () => {
    createMutation.mutate(duplicateForm)
    setDuplicateOpen(false)
  }

  const openNoteDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setNoteText('')
    setNoteOpen(true)
  }

  const handleAddNote = () => {
    if (!selectedReservation) return
    const existing = selectedReservation.notes ? selectedReservation.notes + '\n\n' : ''
    noteMutation.mutate({
      id: selectedReservation.id,
      notes: existing + noteText,
    })
  }

  const openPrintDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setPrintOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const openDeleteDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!selectedReservation) return
    deleteMutation.mutate(selectedReservation.id)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* New Reservation Dialog */}
      <Dialog open={newResOpen} onOpenChange={setNewResOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Reservation</DialogTitle>
              <DialogDescription>Fill in the details below to create a new guest reservation.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Guest Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Guest Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First Name *</Label>
                    <Input
                      placeholder="First name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name *</Label>
                    <Input
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      placeholder="Phone number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stay Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Stay Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Room Type</Label>
                    <Select
                      value={form.roomTypeId}
                      onValueChange={(v) => setForm({ ...form, roomTypeId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPES.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name} ({rt.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Rate / Night</Label>
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                      {formatCurrency(currentRate)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Check-in *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.checkIn ? format(new Date(form.checkIn), 'dd MMM yyyy') : 'Check-in'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.checkIn ? new Date(form.checkIn) : undefined}
                          onSelect={(d) => { if (d) setForm({ ...form, checkIn: d.toISOString().split('T')[0] }) }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label>Check-out *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.checkOut ? format(new Date(form.checkOut), 'dd MMM yyyy') : 'Check-out'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.checkOut ? new Date(form.checkOut) : undefined}
                          onSelect={(d) => { if (d) setForm({ ...form, checkOut: d.toISOString().split('T')[0] }) }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {nights > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {nights} night{nights > 1 ? 's' : ''} &bull; Rate: {formatCurrency(currentRate)}/night &bull; Estimated Total: {formatCurrency(estimatedTotal)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Adults</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={form.adults}
                      onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Children</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={form.children}
                      onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Booking Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Booking Details</h4>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Special Requests</Label>
                  <Textarea
                    placeholder="Any special requests..."
                    value={form.specialRequests}
                    onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Internal notes..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guaranteed"
                    checked={form.guaranteed}
                    onCheckedChange={(checked) => setForm({ ...form, guaranteed: !!checked })}
                  />
                  <Label htmlFor="guaranteed" className="text-sm">Guaranteed reservation</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewResOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.firstName || !form.lastName || !form.checkOut || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Reservation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Filters — sticky */}
      <div className="sticky top-0 z-20 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50 border-b shadow-sm">
        <div className="py-1.5 px-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
            {/* Search — wide with bold circle X clear */}
            <div className="relative flex-1 sm:max-w-[360px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search guest, conf #, room, source, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "h-7 pl-8 text-xs",
                  searchQuery ? "pr-8" : "pr-3",
                  isSearching && "ring-1 ring-primary/30"
                )}
              />
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="size-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Status filter with inline bold circle X clear */}
            <div className="relative">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(
                  "w-full sm:w-[140px] data-[size=default]:h-7 h-7 text-xs",
                  statusFilter !== 'all' && "pr-8"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); setStatusFilter('all') }}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            {/* Calendar Date Range Picker */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center h-7 text-xs gap-1.5 w-full sm:w-auto sm:min-w-[170px] font-normal px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                    !dateFrom && !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-3.5 shrink-0" />
                  {dateFrom && dateTo ? (
                    <span>{formatShortDate(dateFrom)} — {formatShortDate(dateTo)}</span>
                  ) : dateFrom ? (
                    <span>{formatShortDate(dateFrom)} — ...</span>
                  ) : (
                    <span>Check-in date range</span>
                  )}
                  {(dateFrom || dateTo) && (
                    <span
                      className="flex size-4 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); clearDateRange() }}
                    >
                      <X className="size-2.5" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  {/* Quick presets */}
                  <div className="flex flex-col gap-0.5 p-2 border-r bg-muted/30 min-w-[100px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 pb-1">Quick</p>
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'this-week', label: 'This Week' },
                      { key: 'this-month', label: 'This Month' },
                      { key: 'next-7', label: 'Next 7 Days' },
                      { key: 'next-14', label: 'Next 14 Days' },
                      { key: 'next-30', label: 'Next 30 Days' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        className="text-[11px] text-left px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => handlePreset(p.key)}
                      >
                        {p.label}
                      </button>
                    ))}
                    {(dateFrom || dateTo) && (
                      <>
                        <div className="my-1 border-t" />
                        <button
                          type="button"
                          className="text-[11px] text-left px-2 py-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => { clearDateRange(); setDatePopoverOpen(false) }}
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                  {/* Calendar */}
                  <div className="p-2">
                    <Calendar
                      mode="single"
                      defaultMonth={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={handleDateSelect}
                    />
                    <div className="mt-2 px-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="size-2 rounded-sm bg-primary/20 border border-primary/40" />
                      <span>{dateFrom && dateTo ? `${formatShortDate(dateFrom)} — ${formatShortDate(dateTo)}` : 'Click to select start, then end date'}</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Spacer to push right-side buttons */}
            <div className="hidden sm:block flex-1" />
            {/* New Reservation button */}
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1 shrink-0"
              onClick={() => setShowNewReservation(true)}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Reservation</span>
              <span className="sm:hidden">New</span>
            </Button>
            {/* Room Board button — far right */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 shrink-0"
              onClick={() => navigateTo('rooms', 'room-board')}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Room Board</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={reservations.length > 0 && selectedIds.size === reservations.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[140px]">Reservation #</TableHead>
                  <TableHead className="min-w-[180px]">Guest</TableHead>
                  <TableHead className="w-[80px]">Room</TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell">Check-in</TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell">Check-out</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[90px] hidden lg:table-cell">Source</TableHead>
                  <TableHead className="w-[100px] text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarRange className="size-8 text-muted-foreground/50" />
                        <span>No reservations found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((res) => (
                    <TableRow
                      key={res.id}
                      className={cn("cursor-pointer hover:bg-muted/50", selectedIds.has(res.id) && "bg-primary/5")}
                      onClick={() => {
                        setSelectedReservation(res)
                        setDetailOpen(true)
                      }}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(res.id)}
                          onCheckedChange={() => toggleSelect(res.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {res.reservationNumber || res.confirmationNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {res.guest ? (
                            <>
                              <Avatar className="size-7 shrink-0">
                                <AvatarFallback className={cn(
                                  'text-[10px] font-semibold',
                                  res.guest.vipLevel === 'platinum' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                                  res.guest.vipLevel === 'gold' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                                  res.guest.vipLevel === 'silver' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                                  (!res.guest.vipLevel || res.guest.vipLevel === 'none') && 'bg-muted text-muted-foreground'
                                )}>
                                  {(res.guest.firstName || '').charAt(0)}{(res.guest.lastName || '').charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">{res.guest.firstName} {res.guest.lastName}</span>
                              {res.guest.vipLevel !== 'none' && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                  VIP
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">No guest</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.room ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 font-medium text-xs"
                            onClick={(e) => { e.stopPropagation(); navigateTo('rooms', 'room-board') }}
                          >
                            <span className="flex items-center gap-1">
                              {res.room.number}
                              <RoomTypeBedBadge typeName={res.room.type.name} bedConfig={res.room.type.bedConfig} typeCode={res.room.type.code} pax={res.adults + res.children} inline />
                            </span>
                          </Button>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{formatDate(res.checkIn)}</TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{formatDate(res.checkOut)}</TableCell>
                      <TableCell>
                        <StatusBadge status={res.status} />
                      </TableCell>
                      <TableCell className="text-xs capitalize hidden lg:table-cell">{res.source?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(res.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => {
                              setSelectedReservation(res)
                              setDetailOpen(true)
                            }}>
                              <Eye className="size-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(res)}>
                              <Edit className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDuplicateDialog(res)}>
                              <Copy className="size-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openNoteDialog(res)}>
                              <StickyNote className="size-4 mr-2" /> Add Note
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPrintDialog(res)}>
                              <Printer className="size-4 mr-2" /> Print Confirmation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {res.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleCheckIn(res)}>
                                <LogIn className="size-4 mr-2" /> Check In
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleViewFolio(res)}>
                              <FileText className="size-4 mr-2" /> View Folio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewLedger(res)}>
                              <BookOpen className="size-4 mr-2" /> View Guest Ledger
                            </DropdownMenuItem>
                            {canCancel(res.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCancel(res) }} className="text-red-600 focus:text-red-600">
                                  <XCircle className="size-4 mr-2" /> Cancel Booking
                                </DropdownMenuItem>
                              </>
                            )}
                            {res.status === 'confirmed' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleNoShow(res) }}>
                                <UserX className="size-4 mr-2" /> Mark No-Show
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Bulk Action Bar ───────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border bg-background p-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => {
                const cancellable = Array.from(selectedIds).filter((id) => {
                  const r = reservations.find((res) => res.id === id)
                  return r && canCancel(r.status)
                })
                if (cancellable.length === 0) {
                  toast.info('No cancellable reservations selected')
                  return
                }
                bulkCancelMutation.mutate(cancellable)
              }}
              disabled={bulkCancelMutation.isPending}
            >
              <XCircle className="size-3.5 mr-1.5" />
              {bulkCancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedIds(new Set())}>
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* ─── Reservation Detail Dialog ──────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReservation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Reservation {selectedReservation.reservationNumber || selectedReservation.confirmationNo}
                  <StatusBadge status={selectedReservation.status} />
                </DialogTitle>
                <DialogDescription>Detailed reservation information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Guest Info */}
                <div className="grid gap-3">
                  <h4 className="text-sm font-semibold">Guest Information</h4>
                  {selectedReservation.guest ? (
                    <div className="flex items-start gap-3">
                      <Avatar className="size-12 shrink-0">
                        <AvatarFallback className={cn(
                          'text-sm font-bold',
                          selectedReservation.guest.vipLevel === 'platinum' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                          selectedReservation.guest.vipLevel === 'gold' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                          selectedReservation.guest.vipLevel === 'silver' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                          (!selectedReservation.guest.vipLevel || selectedReservation.guest.vipLevel === 'none') && 'bg-muted text-muted-foreground'
                        )}>
                          {(selectedReservation.guest.firstName || '').charAt(0)}{(selectedReservation.guest.lastName || '').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid grid-cols-1 gap-1.5 text-sm flex-1 min-w-0">
                        <div>
                          <span className="font-medium">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</span>
                          {selectedReservation.guest.vipLevel !== 'none' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 ml-2">
                              {selectedReservation.guest.vipLevel.toUpperCase()}
                            </Badge>
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
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No guest assigned</span>
                  )}
                </div>

                <Separator />

                {/* Stay Details */}
                <div className="grid gap-3">
                  <h4 className="text-sm font-semibold">Stay Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Room: </span>
                      <span className="font-medium">{selectedReservation.room?.number || 'Unassigned'}</span>
                      {selectedReservation.room && (
                        <span className="text-muted-foreground"> ({selectedReservation.room.type.name})</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rate: </span>
                      <span>{formatCurrency(selectedReservation.roomRate)}/night</span>
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
                      <span>{nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guests: </span>
                      <span>{selectedReservation.adults} adults, {selectedReservation.children} children</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Financial Summary */}
                <div className="grid gap-3">
                  <h4 className="text-sm font-semibold">Financial Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-bold">{formatCurrency(selectedReservation.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid: </span>
                      <span>{formatCurrency(selectedReservation.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Folio Balance: </span>
                      <button onClick={() => handleViewFolio(selectedReservation)} className={selectedReservation.folios[0]?.balance > selectedReservation.creditLimit ? 'text-red-600 font-bold' : 'text-emerald-600 hover:underline font-medium'}>
                        {formatCurrency(selectedReservation.folios[0]?.balance || 0)}
                      </button>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit Limit: </span>
                      <span>{formatCurrency(selectedReservation.creditLimit)}</span>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {selectedReservation.specialRequests && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <h4 className="text-sm font-semibold">Special Requests</h4>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{selectedReservation.specialRequests}</p>
                    </div>
                  </>
                )}

                {/* Notes */}
                {selectedReservation.notes && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <h4 className="text-sm font-semibold">Notes</h4>
                      <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{selectedReservation.notes}</p>
                    </div>
                  </>
                )}

                {/* Booking Info */}
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source: </span>
                    <span className="capitalize">{selectedReservation.source?.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Guaranteed: </span>
                    <span>{selectedReservation.guaranteed ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Booked: </span>
                    <span>{formatDate(selectedReservation.createdAt)}</span>
                  </div>
                  {selectedReservation.company && (
                    <div>
                      <span className="text-muted-foreground">Company: </span>
                      <span>{selectedReservation.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <DialogFooter>
                {selectedReservation.status === 'confirmed' && (
                  <Button onClick={() => handleCheckIn(selectedReservation)}>
                    <LogIn className="size-4 mr-1.5" /> Check In
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleViewFolio(selectedReservation)}>
                  <FileText className="h-4 w-4 mr-1" /> View Folio
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleViewLedger(selectedReservation)}>
                  <BookOpen className="h-4 w-4 mr-1" /> View Ledger
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Reservation Dialog ────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reservation — {selectedReservation?.confirmationNo}</DialogTitle>
            <DialogDescription>Modify the reservation details. The total amount will be recalculated automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Room info (read-only with room assignment shown) */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Room Assignment</h4>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <BedDouble className="size-5 text-muted-foreground" />
                <div className="text-sm">
                  {selectedReservation?.room ? (
                    <>
                      <span className="font-medium">{selectedReservation.room.number}</span>
                      <RoomTypeBedBadge typeName={selectedReservation.room.type.name} bedConfig={selectedReservation.room.type.bedConfig} typeCode={selectedReservation.room.type.code} pax={selectedReservation.adults + selectedReservation.children} className="ml-2" />
                    </>
                  ) : (
                    <span className="text-muted-foreground">No room assigned</span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Stay Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Stay Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Check-in</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.checkIn ? format(new Date(editForm.checkIn), 'dd MMM yyyy') : 'Check-in'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editForm.checkIn ? new Date(editForm.checkIn) : undefined}
                        onSelect={(d) => { if (d) setEditForm({ ...editForm, checkIn: d.toISOString().split('T')[0] }) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Check-out</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.checkOut ? format(new Date(editForm.checkOut), 'dd MMM yyyy') : 'Check-out'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editForm.checkOut ? new Date(editForm.checkOut) : undefined}
                        onSelect={(d) => { if (d) setEditForm({ ...editForm, checkOut: d.toISOString().split('T')[0] }) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {editNights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {editNights} night{editNights > 1 ? 's' : ''} &bull; {formatCurrency(editForm.roomRate)}/night &bull; Total: {formatCurrency(editTotal)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Adults</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.adults}
                    onChange={(e) => setEditForm({ ...editForm, adults: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={editForm.children}
                    onChange={(e) => setEditForm({ ...editForm, children: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Booking Details</h4>
              <div className="space-y-1">
                <Label>Source</Label>
                <Select value={editForm.source} onValueChange={(v) => setEditForm({ ...editForm, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Special Requests</Label>
                <Textarea
                  value={editForm.specialRequests}
                  onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-guaranteed"
                  checked={editForm.guaranteed}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, guaranteed: !!checked })}
                />
                <Label htmlFor="edit-guaranteed" className="text-sm">Guaranteed reservation</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEditSave}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Duplicate Reservation Dialog ────────────────────────────── */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Reservation</DialogTitle>
            <DialogDescription>Create a new reservation based on an existing one. Check-in is set to today.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Guest Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Guest Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input
                    value={duplicateForm.firstName}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Last Name *</Label>
                  <Input
                    value={duplicateForm.lastName}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={duplicateForm.phone}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={duplicateForm.email}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Stay Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Stay Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Room Type</Label>
                  <Select
                    value={duplicateForm.roomTypeId}
                    onValueChange={(v) => setDuplicateForm({ ...duplicateForm, roomTypeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name} ({rt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Rate / Night</Label>
                  <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                    {formatCurrency(ROOM_TYPES.find((rt) => rt.id === duplicateForm.roomTypeId)?.baseRate ?? 5000)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Check-in *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {duplicateForm.checkIn ? format(new Date(duplicateForm.checkIn), 'dd MMM yyyy') : 'Check-in'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={duplicateForm.checkIn ? new Date(duplicateForm.checkIn) : undefined}
                        onSelect={(d) => { if (d) setDuplicateForm({ ...duplicateForm, checkIn: d.toISOString().split('T')[0] }) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Check-out *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {duplicateForm.checkOut ? format(new Date(duplicateForm.checkOut), 'dd MMM yyyy') : 'Check-out'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={duplicateForm.checkOut ? new Date(duplicateForm.checkOut) : undefined}
                        onSelect={(d) => { if (d) setDuplicateForm({ ...duplicateForm, checkOut: d.toISOString().split('T')[0] }) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Adults</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={duplicateForm.adults}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, adults: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={duplicateForm.children}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, children: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Booking Details</h4>
              <div className="space-y-1">
                <Label>Source</Label>
                <Select value={duplicateForm.source} onValueChange={(v) => setDuplicateForm({ ...duplicateForm, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Special Requests</Label>
                <Textarea
                  value={duplicateForm.specialRequests}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, specialRequests: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={duplicateForm.notes}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dup-guaranteed"
                  checked={duplicateForm.guaranteed}
                  onCheckedChange={(checked) => setDuplicateForm({ ...duplicateForm, guaranteed: !!checked })}
                />
                <Label htmlFor="dup-guaranteed" className="text-sm">Guaranteed reservation</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateForm.firstName || !duplicateForm.lastName || !duplicateForm.checkOut || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Note Dialog ─────────────────────────────────────────── */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note — {selectedReservation?.confirmationNo}</DialogTitle>
            <DialogDescription>This note will be appended to the existing reservation notes.</DialogDescription>
          </DialogHeader>
          {selectedReservation?.notes && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Existing Notes</Label>
              <p className="text-xs bg-muted/50 rounded-md p-2 whitespace-pre-wrap max-h-20 overflow-y-auto">
                {selectedReservation.notes}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>New Note</Label>
            <Textarea
              placeholder="Enter your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim() || noteMutation.isPending}
            >
              {noteMutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Print Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservation Confirmation</DialogTitle>
            <DialogDescription>Review the confirmation details before printing.</DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="print-area">
              {/* Hotel Header */}
              <div className="text-center border-b pb-4 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Hotel className="size-6" />
                  <h3 className="text-xl font-bold tracking-wide">{settings.hotelName}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Luxury Hospitality &bull; Premium Experience</p>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Confirmation #</span>
                    <p className="font-mono font-bold">{selectedReservation.reservationNumber || selectedReservation.confirmationNo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Status</span>
                    <div className="mt-0.5">
                      <StatusBadge status={selectedReservation.status} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <span className="text-muted-foreground text-xs">Guest</span>
                  <p className="font-medium">
                    {selectedReservation.guest
                      ? `${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}`
                      : 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Check-in</span>
                    <p className="font-medium">{formatDate(selectedReservation.checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Check-out</span>
                    <p className="font-medium">{formatDate(selectedReservation.checkOut)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Room</span>
                    <p className="font-medium">
                      {selectedReservation.room
                        ? <span className="flex items-center gap-1.5">{selectedReservation.room.number} <RoomTypeBedBadge typeName={selectedReservation.room.type.name} bedConfig={selectedReservation.room.type.bedConfig} typeCode={selectedReservation.room.type.code} pax={selectedReservation.adults + selectedReservation.children} inline /></span>
                        : 'To be assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Guests</span>
                    <p className="font-medium">
                      {selectedReservation.adults} adults
                      {selectedReservation.children > 0 && `, ${selectedReservation.children} children`}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Rate / Night</span>
                    <p className="font-medium">{formatCurrency(selectedReservation.roomRate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Nights</span>
                    <p className="font-medium">{nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)}</p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedReservation.totalAmount)}</span>
                  </div>
                </div>

                {selectedReservation.specialRequests && (
                  <div>
                    <span className="text-muted-foreground text-xs">Special Requests</span>
                    <p className="bg-muted/50 rounded-md p-2 mt-1">{selectedReservation.specialRequests}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Source</span>
                    <p className="capitalize">{selectedReservation.source?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Guaranteed</span>
                    <p>{selectedReservation.guaranteed ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  Booked on {formatDate(selectedReservation.createdAt)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Thank you for choosing {settings.hotelName}. We look forward to your stay.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button onClick={handlePrint}>
              <Printer className="size-4 mr-1.5" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room/Date Conflict Dialog ──────────────────────────────── */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Reservation Conflict
            </DialogTitle>
            <DialogDescription>
              This room already has an active reservation for the selected dates.
            </DialogDescription>
          </DialogHeader>
          {conflictData && (
            <div className="space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reservation #</span>
                  <span className="font-mono font-medium">{conflictData.reservationNumber || conflictData.confirmationNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest</span>
                  <span className="font-medium">{conflictData.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room</span>
                  <span className="font-mono font-bold">{conflictData.roomNumber}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span>{formatDate(conflictData.checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span>{formatDate(conflictData.checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={conflictData.status} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Please choose a different room or adjust the dates to avoid this conflict.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setConflictOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Reservation Dialog ──────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete reservation{' '}
              <span className="font-semibold font-mono">{selectedReservation?.confirmationNo}</span>?
              {selectedReservation?.guest && (
                <> This belongs to <span className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</span>.</>
              )}
              <br />
              <br />
              <span className="text-destructive font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Reservation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
