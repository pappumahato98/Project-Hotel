'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-table'
import {
  Plus, Search, MoreHorizontal, Eye, LogIn, XCircle, UserX, CalendarRange,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/shared/status-badge'
import { useQuery as useTanQuery } from '@tanstack/react-query'
import { formatCurrency, formatDate, getTodayString, nightsBetween } from '@/lib/format'

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

// ─── Component ──────────────────────────────────────────────────────────

export function ReservationsView() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [newResOpen, setNewResOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // New reservation form state
  const [form, setForm] = useState<NewReservationForm>({
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
  })

  // Fetch reservations
  const { data, isLoading } = useTanQuery({
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
          roomRate: 5000,
          specialRequests: formData.specialRequests || undefined,
          source: formData.source,
          guaranteed: formData.guaranteed,
          notes: formData.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create reservation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setNewResOpen(false)
      setForm({
        guestId: '', newGuest: true, firstName: '', lastName: '',
        phone: '', email: '', roomTypeId: '', ratePlanId: '',
        checkIn: getTodayString(), checkOut: '', adults: 1, children: 0,
        specialRequests: '', source: 'direct', guaranteed: false, notes: '',
      })
    },
  })

  // Update reservation status mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, status, roomId }: { id: string; status: string; roomId?: string }) => {
      const body: Record<string, string> = { status }
      if (roomId) body.roomId = roomId
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

  const handleCheckIn = (reservation: Reservation) => {
    if (reservation.roomId) {
      updateMutation.mutate({ id: reservation.id, status: 'checked_in', roomId: reservation.roomId })
    } else {
      updateMutation.mutate({ id: reservation.id, status: 'checked_in' })
    }
  }

  const handleCancel = (reservation: Reservation) => {
    updateMutation.mutate({ id: reservation.id, status: 'cancelled' })
  }

  const handleNoShow = (reservation: Reservation) => {
    updateMutation.mutate({ id: reservation.id, status: 'no_show' })
  }

  const nights = useMemo(() => {
    if (form.checkIn && form.checkOut) {
      return nightsBetween(form.checkIn, form.checkOut)
    }
    return 0
  }, [form.checkIn, form.checkOut])

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
                    {nights} night{nights > 1 ? 's' : ''} • Estimated: {formatCurrency(nights * 5000)}
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
                          <span className="font-medium">{res.room.number}</span>
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
                            {res.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleCheckIn(res)}>
                                <LogIn className="size-4 mr-2" /> Check In
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleCancel(res)} className="text-red-600">
                              <XCircle className="size-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                            {res.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleNoShow(res)}>
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

      {/* Reservation Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReservation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Reservation {selectedReservation.confirmationNo}
                  <StatusBadge status={selectedReservation.status} />
                </DialogTitle>
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
    </div>
  )
}
