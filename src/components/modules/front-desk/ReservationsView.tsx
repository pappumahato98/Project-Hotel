'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Plus, Search, MoreHorizontal, Eye, LogIn, XCircle, UserX, CalendarRange,
  Edit, Copy, FileText, Printer, Trash2, StickyNote, BedDouble,
  Users, ArrowDownToLine, ArrowUpFromLine, DollarSign, Hotel,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
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
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, getTodayString, nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigationStore, useSettingsStore } from '@/lib/store'

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
  type: { name: string; code: string }
}

interface ReservationFolio {
  id: string
  balance: number
  status: string
}

interface Reservation {
  id: string
  confirmationNo: string
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

// ─── Component ──────────────────────────────────────────────────────────

export function ReservationsView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const { settings } = useSettingsStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [newResOpen, setNewResOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

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
    queryKey: ['reservations', statusFilter, searchQuery, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('checkInDate', dateFrom)
      if (dateTo) params.set('checkOutDate', dateTo)
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json()
    },
  })

  const reservations: Reservation[] = data?.reservations || []

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

  // Create reservation mutation
  const createMutation = useMutation({
    mutationFn: async (formData: NewReservationForm) => {
      let guestId = formData.guestId
      if (formData.newGuest) {
        const guestRes = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
          }),
        })
        if (guestRes.ok) {
          const guestData = await guestRes.json()
          guestId = guestData.guest.id
        }
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
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create reservation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setNewResOpen(false)
      setForm({ ...INITIAL_FORM, checkIn: getTodayString() })
      toast.success('Reservation created successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create reservation')
    },
  })

  // Update reservation status mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status?: string; roomId?: string }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update reservation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
  })

  // Edit reservation mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditReservationForm> & { totalAmount: number } }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update reservation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setEditOpen(false)
      toast.success('Reservation updated successfully')
    },
    onError: () => {
      toast.error('Failed to update reservation')
    },
  })

  // Add note mutation
  const noteMutation = useMutation({
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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete reservation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setDeleteOpen(false)
      setSelectedReservation(null)
      toast.success('Reservation deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete reservation')
    },
  })

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleCheckIn = (reservation: Reservation) => {
    if (reservation.roomId) {
      updateMutation.mutate({ id: reservation.id, status: 'checked_in', roomId: reservation.roomId })
    } else {
      updateMutation.mutate({ id: reservation.id, status: 'checked_in' })
    }
    toast.success(`Guest checked in — ${reservation.guest?.firstName} ${reservation.guest?.lastName}`)
  }

  const handleCancel = (reservation: Reservation) => {
    updateMutation.mutate({ id: reservation.id, status: 'cancelled' })
    toast.success('Reservation cancelled')
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
    <div className="flex flex-col gap-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reservations</h2>
          <p className="text-sm text-muted-foreground">
            Manage all guest reservations and bookings
          </p>
        </div>
        <Dialog open={newResOpen} onOpenChange={setNewResOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-1.5" />
              New Reservation
            </Button>
          </DialogTrigger>
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
                    <Input
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Check-out *</Label>
                    <Input
                      type="date"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    />
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
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Reservations</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
              <ArrowDownToLine className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Today&apos;s Check-ins</p>
              <p className="text-xl font-bold">{stats.todayCheckIns}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <ArrowUpFromLine className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Today&apos;s Check-outs</p>
              <p className="text-xl font-bold">{stats.todayCheckOuts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Revenue Total</p>
              <p className="text-xl font-bold">{formatCurrency(stats.revenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, confirmation #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-[150px]"
              placeholder="Check-in from"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-[150px]"
              placeholder="Check-in to"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Confirmation #</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[80px]">Room</TableHead>
                  <TableHead className="w-[100px]">Check-in</TableHead>
                  <TableHead className="w-[100px]">Check-out</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[90px]">Source</TableHead>
                  <TableHead className="w-[100px] text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
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
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedReservation(res)
                        setDetailOpen(true)
                      }}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {res.confirmationNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {res.guest ? (
                            <>
                              <span className="font-medium">{res.guest.firstName} {res.guest.lastName}</span>
                              {res.guest.vipLevel !== 'none' && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
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
                            {res.room.number}
                          </Button>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(res.checkIn)}</TableCell>
                      <TableCell className="text-xs">{formatDate(res.checkOut)}</TableCell>
                      <TableCell>
                        <StatusBadge status={res.status} />
                      </TableCell>
                      <TableCell className="text-xs capitalize">{res.source?.replace('_', ' ')}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleCancel(res)} variant="destructive">
                              <XCircle className="size-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                            {res.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleNoShow(res)}>
                                <UserX className="size-4 mr-2" /> Mark No-Show
                              </DropdownMenuItem>
                            )}
                            {(res.status === 'cancelled' || res.status === 'draft') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(res)} variant="destructive">
                                  <Trash2 className="size-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
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

      {/* ─── Reservation Detail Dialog ──────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReservation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Reservation {selectedReservation.confirmationNo}
                  <StatusBadge status={selectedReservation.status} />
                </DialogTitle>
                <DialogDescription>Detailed reservation information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Guest Info */}
                <div className="grid gap-3">
                  <h4 className="text-sm font-semibold">Guest Information</h4>
                  {selectedReservation.guest ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</span>
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
                        <span>{selectedReservation.guest.vipLevel !== 'none' ? selectedReservation.guest.vipLevel.toUpperCase() : '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No guest assigned</p>
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
                      <span className={selectedReservation.folios[0]?.balance > selectedReservation.creditLimit ? 'text-red-600 font-bold' : 'font-medium'}>
                        {formatCurrency(selectedReservation.folios[0]?.balance || 0)}
                      </span>
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
                      <span className="text-muted-foreground ml-2">({selectedReservation.room.type.name} — {selectedReservation.room.type.code})</span>
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
                  <Input
                    type="date"
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Check-out</Label>
                  <Input
                    type="date"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                  />
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
                  <Input
                    type="date"
                    value={duplicateForm.checkIn}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, checkIn: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Check-out *</Label>
                  <Input
                    type="date"
                    value={duplicateForm.checkOut}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, checkOut: e.target.value })}
                  />
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
                    <p className="font-mono font-bold">{selectedReservation.confirmationNo}</p>
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
                        ? `${selectedReservation.room.number} (${selectedReservation.room.type.name})`
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
