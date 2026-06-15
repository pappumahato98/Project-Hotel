'use client'

import { apiFetch } from '@/lib/api'
import React, { useState, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BedDouble, CreditCard, AlertTriangle, Crown, Receipt, ArrowRightLeft, Plus,
  CalendarPlus, LogOut, StickyNote, ChevronRight, ChevronDown, Filter, UtensilsCrossed,
  Wine, Shirt, Phone, Loader2, X, Maximize2, Bell, BellRing,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
// ScrollArea removed — nested scrolling contexts break row click events
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore, useSettingsStore, useFolioContextStore } from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────

interface InHouseGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface InHouseRoom {
  id: string
  number: string
  floor: number
  wing?: string
  type: { name: string; code: string }
}

interface InHouseFolio {
  id: string
  balance: number
  status: string
}

interface InHouseReservation {
  id: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  creditLimit: number
  status: string
  notes?: string | null
  guest: InHouseGuest
  room: InHouseRoom
  folios: InHouseFolio[]
}

interface VacantRoom {
  id: string
  number: string
  floor: number
  wing?: string
  type: { name: string; code: string }
}

// ─── Quick Charge Presets ───────────────────────────────────────────────

const QUICK_CHARGES = [
  { label: 'Room Service', amount: 500, type: 'f_and_b', description: 'Room Service', icon: UtensilsCrossed },
  { label: 'Minibar', amount: 300, type: 'minibar', description: 'Minibar consumption', icon: Wine },
  { label: 'Laundry', amount: 200, type: 'laundry', description: 'Laundry service', icon: Shirt },
  { label: 'Phone Call', amount: 50, type: 'phone', description: 'Phone call charge', icon: Phone },
]

// ─── Helper ──────────────────────────────────────────────────────────────

function nightsBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
}

function formatDateValue(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ─── Component ──────────────────────────────────────────────────────────

export function InHouseView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const { settings } = useSettingsStore()

  // ── Dialog states ──────────────────────────────────────────
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)

  const [selectedReservation, setSelectedReservation] = useState<InHouseReservation | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // ── Charge form state ──────────────────────────────────────
  const [chargeType, setChargeType] = useState('miscellaneous')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')

  // ── Transfer form state ────────────────────────────────────
  const [selectedNewRoomId, setSelectedNewRoomId] = useState('')

  // ── Extend stay form state ─────────────────────────────────
  const [newCheckOut, setNewCheckOut] = useState<Date | undefined>(undefined)

  // ── Early checkout form state ───────────────────────────────
  const [earlyCheckOutDate, setEarlyCheckOutDate] = useState<Date | undefined>(undefined)
  const [earlyCheckoutConfirmOpen, setEarlyCheckoutConfirmOpen] = useState(false)

  // ── Note form state ────────────────────────────────────────
  const [noteText, setNoteText] = useState('')

  // ── Wake-up call state ─────────────────────────────────
  const [wakeUpCalls, setWakeUpCalls] = useState<Record<string, { time: string; note: string; set: boolean }>>({})
  const [wakeUpDialogOpen, setWakeUpDialogOpen] = useState(false)
  const [wakeUpTime, setWakeUpTime] = useState('')
  const [wakeUpNote, setWakeUpNote] = useState('')

  // ── Filter state ────────────────────────────────────────────
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [vipOnlyFilter, setVipOnlyFilter] = useState(false)

  // ── Fetch in-house reservations ─────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['in-house'],
    queryFn: async () => {
      return apiFetch('/api/reservations?status=checked_in')
    },
    refetchInterval: 30000,
  })

  const reservations: InHouseReservation[] = (data?.reservations || []).filter((r: any) => r.room)

  // ── Fetch vacant clean rooms for transfer ──────────────────
  const { data: vacantRoomsData } = useQuery({
    queryKey: ['vacant-rooms'],
    queryFn: async () => {
      const json = await apiFetch('/api/rooms?status=vacant_clean') as { rooms?: VacantRoom[] }
      return (json.rooms || [])
    },
    enabled: transferDialogOpen,
  })

  // ── Compute unique floors for filter ────────────────────────
  const floors = useMemo(() => {
    const floorSet = new Set(reservations.map((r) => r.room?.floor).filter((f): f is number => f != null))
    return Array.from(floorSet).sort((a, b) => a - b)
  }, [reservations])

  // ── Filtered reservations ───────────────────────────────────
  const filteredReservations = useMemo(() => {
    let filtered = reservations
    if (floorFilter !== 'all') {
      filtered = filtered.filter((r) => r.room.floor === Number(floorFilter))
    }
    if (vipOnlyFilter) {
      filtered = filtered.filter((r) => r.guest.vipLevel && r.guest.vipLevel !== 'none')
    }
    return filtered
  }, [reservations, floorFilter, vipOnlyFilter])

  // ── Stats (computed from full list, not filtered) ──────────
  const totalGuests = reservations.length
  const vipCount = reservations.filter((r) => r.guest.vipLevel && r.guest.vipLevel !== 'none').length
  const creditWarnings = reservations.filter((r) => {
    const balance = r.folios[0]?.balance || 0
    return balance >= r.creditLimit * 0.8 && balance < r.creditLimit
  }).length
  const creditBreaches = reservations.filter((r) => {
    const balance = r.folios[0]?.balance || 0
    return balance >= r.creditLimit
  }).length
  const activeWakeUpCalls = Object.values(wakeUpCalls).filter((w) => w.set).length

  // ── Post charge mutation ───────────────────────────────────
  const postChargeMutation = useMutation({
    mutationFn: async ({
      folioId, transactionType, description, amount,
    }: {
      folioId: string; transactionType: string; description: string; amount: number
    }) => {
      const taxRate = settings.taxRate / 100
      const taxAmount = amount * taxRate
      const totalAmount = amount + taxAmount

      return apiFetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'charge',
          transactionType,
          description,
          amount,
          taxAmount,
          totalAmount,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setChargeDialogOpen(false)
      resetChargeForm()
      toast.success('Charge posted successfully')
    },
    onError: () => {
      toast.error('Failed to post charge')
    },
  })

  // ── Room transfer mutation ─────────────────────────────────
  const transferRoomMutation = useMutation({
    mutationFn: async ({ reservationId, newRoomId }: { reservationId: string; newRoomId: string }) => {
      // Step 1: Update reservation with new room
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: newRoomId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      queryClient.invalidateQueries({ queryKey: ['vacant-rooms'] })
      setTransferDialogOpen(false)
      setSelectedNewRoomId('')
      toast.success('Room transfer completed successfully')
    },
    onError: () => {
      toast.error('Failed to transfer room')
    },
  })

  // ── Extend stay mutation ───────────────────────────────────
  const extendStayMutation = useMutation({
    mutationFn: async ({
      reservationId, checkOut, totalAmount,
    }: { reservationId: string; checkOut: string; totalAmount: number }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkOut: new Date(checkOut).toISOString(), totalAmount }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setExtendDialogOpen(false)
      setNewCheckOut(undefined)
      toast.success('Stay extended successfully')
    },
    onError: () => {
      toast.error('Failed to extend stay')
    },
  })

  // ── Early checkout mutation ───────────────────────────────
  const earlyCheckoutMutation = useMutation({
    mutationFn: async ({ reservationId, checkOut }: { reservationId: string; checkOut: string }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkOut: new Date(checkOut).toISOString(),
          status: 'checked_out',
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setEarlyCheckoutOpen(false)
      setEarlyCheckoutConfirmOpen(false)
      setEarlyCheckOutDate(undefined)
      toast.success('Early checkout processed successfully')
    },
    onError: () => {
      toast.error('Failed to process early checkout')
    },
  })

  // ── Add note mutation ──────────────────────────────────────
  const addNoteMutation = useMutation({
    mutationFn: async ({ reservationId, notes }: { reservationId: string; notes: string }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setNoteDialogOpen(false)
      setNoteText('')
      toast.success('Note added successfully')
    },
    onError: () => {
      toast.error('Failed to add note')
    },
  })

  // ── Handlers ────────────────────────────────────────────────

  function resetChargeForm() {
    setChargeType('miscellaneous')
    setChargeDesc('')
    setChargeAmount('')
  }

  function handlePostCharge(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    resetChargeForm()
    setChargeDialogOpen(true)
  }

  function handleQuickCharge(preset: typeof QUICK_CHARGES[0]) {
    setChargeType(preset.type)
    setChargeDesc(preset.description)
    setChargeAmount(String(preset.amount))
  }

  // Auto-create folio if missing, then post charge
  const ensureFolioAndPostCharge = async (reservation: InHouseReservation) => {
    let folioId = reservation.folios[0]?.id
    if (!folioId) {
      // Auto-create folio for this reservation
      try {
        const data = await apiFetch('/api/folio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: reservation.id,
            guestId: reservation.guest.id,
            folioType: 'guest',
          }),
        })
        folioId = data.folio?.id
        if (!folioId) throw new Error('Folio creation failed')
        toast.info('Folio auto-created for this guest')
      } catch {
        toast.error('Failed to create folio for this guest')
        return
      }
    }
    postChargeMutation.mutate({
      folioId,
      transactionType: chargeType,
      description: chargeDesc,
      amount: parseFloat(chargeAmount),
    })
  }

  function submitCharge() {
    if (!selectedReservation || !chargeAmount || !chargeDesc) return
    const folio = selectedReservation.folios[0]
    if (!folio) {
      ensureFolioAndPostCharge(selectedReservation)
      return
    }
    postChargeMutation.mutate({
      folioId: folio.id,
      transactionType: chargeType,
      description: chargeDesc,
      amount: parseFloat(chargeAmount),
    })
  }

  function handleTransferRoom(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    setSelectedNewRoomId('')
    setTransferDialogOpen(true)
  }

  function submitTransfer() {
    if (!selectedReservation || !selectedNewRoomId) return
    transferRoomMutation.mutate({
      reservationId: selectedReservation.id,
      newRoomId: selectedNewRoomId,
    })
  }

  function handleExtendStay(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    setNewCheckOut(undefined)
    setExtendDialogOpen(true)
  }

  function submitExtendStay() {
    if (!selectedReservation || !newCheckOut) return
    const currentNights = nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)
    const newNights = nightsBetween(selectedReservation.checkIn, newCheckOut)
    const additionalNights = newNights - currentNights
    const newTotal = selectedReservation.totalAmount + (additionalNights * selectedReservation.roomRate)
    extendStayMutation.mutate({
      reservationId: selectedReservation.id,
      checkOut: formatDateValue(newCheckOut),
      totalAmount: newTotal,
    })
  }

  function handleEarlyCheckout(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    setEarlyCheckOutDate(undefined)
    setEarlyCheckoutOpen(true)
  }

  function handleEarlyCheckoutConfirm() {
    if (!selectedReservation || !earlyCheckOutDate) return
    earlyCheckoutMutation.mutate({
      reservationId: selectedReservation.id,
      checkOut: formatDateValue(earlyCheckOutDate),
    })
  }

  function handleAddNote(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    setNoteText('')
    setNoteDialogOpen(true)
  }

  function submitNote() {
    if (!selectedReservation || !noteText.trim()) return
    const existingNotes = selectedReservation.notes || ''
    const newNotes = existingNotes
      ? `${existingNotes}\n[${new Date().toLocaleString()}] ${noteText.trim()}`
      : `[${new Date().toLocaleString()}] ${noteText.trim()}`
    addNoteMutation.mutate({
      reservationId: selectedReservation.id,
      notes: newNotes,
    })
  }

  function handleViewFolio(reservation: InHouseReservation) {
    const { setFolioContext } = useFolioContextStore.getState()
    setFolioContext({
      reservationId: reservation.id,
      guestId: reservation.guest.id,
      guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      roomNumber: reservation.room.number,
      confirmationNo: reservation.confirmationNo,
      folioId: reservation.folios[0]?.id,
    })
    navigateTo('front-desk', 'folio')
  }

  function handleWakeUpCall(reservation: InHouseReservation) {
    setSelectedReservation(reservation)
    const existing = wakeUpCalls[reservation.id]
    if (existing?.set) {
      setWakeUpTime(existing.time)
      setWakeUpNote(existing.note)
    } else {
      setWakeUpTime('')
      setWakeUpNote('')
    }
    setWakeUpDialogOpen(true)
  }

  function submitWakeUpCall() {
    if (!selectedReservation || !wakeUpTime) return
    const existing = wakeUpCalls[selectedReservation.id]
    if (existing?.set) {
      setWakeUpCalls((prev) => {
        const next = { ...prev }
        delete next[selectedReservation.id]
        return next
      })
      toast.success(`Wake-up call cancelled for Room ${selectedReservation.room.number}`)
    } else {
      setWakeUpCalls((prev) => ({
        ...prev,
        [selectedReservation.id]: { time: wakeUpTime, note: wakeUpNote, set: true },
      }))
      toast.success(`Wake-up call set for ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName} at ${wakeUpTime}`, {
        description: `Room ${selectedReservation.room.number}`,
      })
    }
    setWakeUpDialogOpen(false)
  }

  // Toggle inline row expansion
  const handleRowClick = useCallback((reservation: InHouseReservation) => {
    setSelectedReservation(reservation)
    setExpandedRowId(prev => prev === reservation.id ? null : reservation.id)
  }, [])

  // Open full detail dialog
  const handleViewFullDetails = useCallback((reservation: InHouseReservation) => {
    setSelectedReservation(reservation)
    setDetailDialogOpen(true)
  }, [])

  // ── Computed values for dialogs ────────────────────────────

  const extendNightsDiff = useMemo(() => {
    if (!selectedReservation || !newCheckOut) return 0
    const currentNights = nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)
    const newNights = nightsBetween(selectedReservation.checkIn, newCheckOut)
    return newNights - currentNights
  }, [selectedReservation, newCheckOut])

  const extendAdditionalCharge = useMemo(() => {
    if (!selectedReservation || extendNightsDiff <= 0) return 0
    return extendNightsDiff * selectedReservation.roomRate
  }, [selectedReservation, extendNightsDiff])

  const earlyCheckoutRefund = useMemo(() => {
    if (!selectedReservation || !earlyCheckOutDate) return 0
    const currentNights = nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut)
    const newNights = nightsBetween(selectedReservation.checkIn, earlyCheckOutDate)
    const nightsRemoved = currentNights - newNights
    if (nightsRemoved <= 0) return 0
    return nightsRemoved * selectedReservation.roomRate
  }, [selectedReservation, earlyCheckOutDate])

  function getCreditStatus(reservation: InHouseReservation) {
    const balance = reservation.folios[0]?.balance || 0
    const pct = (balance / reservation.creditLimit) * 100
    if (pct >= 100) return { status: 'breach', pct, color: 'text-red-600' }
    if (pct >= 80) return { status: 'warning', pct, color: 'text-amber-600' }
    return { status: 'ok', pct, color: 'text-green-600' }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">In-House Guests</h2>
        <p className="text-xs text-muted-foreground">
          Currently checked-in guests and their folio status
        </p>
      </div>

      {/* Filter Row */}
      <Card className="py-0">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="size-3.5" />
              Filters
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="floor-filter" className="text-xs whitespace-nowrap">Floor:</Label>
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-[100px] h-7 text-xs data-[size=default]:h-7">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor} value={String(floor)}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="vip-filter" className="text-xs whitespace-nowrap">VIP Only:</Label>
                <Switch
                  id="vip-filter"
                  checked={vipOnlyFilter}
                  onCheckedChange={setVipOnlyFilter}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredReservations.length} of {reservations.length} guests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* In-House Table */}
      <Card className="py-0">
        <CardContent className="p-0 overflow-auto max-h-[calc(100vh-220px)]">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[70px]">Room</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[100px]">Check-in</TableHead>
                  <TableHead className="w-[100px]">Check-out</TableHead>
                  <TableHead className="w-[110px] text-right">Folio Balance</TableHead>
                  <TableHead className="w-[130px]">Credit Limit</TableHead>
                  <TableHead className="w-[50px]">VIP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      <BedDouble className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      No in-house guests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((res) => {
                    const credit = getCreditStatus(res)
                    const balance = res.folios[0]?.balance || 0
                    const isExpanded = expandedRowId === res.id

                    return (
                      <React.Fragment key={res.id}>
                        <TableRow
                          className={cn(
                            'cursor-pointer hover:bg-muted/50 transition-colors',
                            isExpanded && 'bg-muted/40 border-b-0',
                          )}
                          onClick={() => handleRowClick(res)}
                        >
                          <TableCell>
                            <div className={cn('transition-transform duration-200', isExpanded && 'rotate-90')}>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell className="font-bold font-mono">
                          <div className="flex items-center gap-1">
                            {res.room.number}
                            {wakeUpCalls[res.id]?.set && (
                              <span className="relative flex size-4 items-center justify-center">
                                <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping" />
                                <Bell className="size-3.5 text-amber-600" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{res.guest.firstName} {res.guest.lastName}</span>
                              {res.guest.vipLevel !== 'none' && (
                                <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  VIP
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(res.checkIn)}</TableCell>
                          <TableCell className="text-xs">{formatDate(res.checkOut)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn('font-medium', credit.color)}>
                              {formatCurrency(balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(credit.pct, 100)}
                                className={cn(
                                  'h-2 w-16',
                                  credit.status === 'breach' && '[&>div]:bg-red-500',
                                  credit.status === 'warning' && '[&>div]:bg-amber-500',
                                  credit.status === 'ok' && '[&>div]:bg-green-500',
                                )}
                              />
                              <span className={cn('text-xs font-medium', credit.color)}>
                                {Math.round(credit.pct)}%
                              </span>
                              {credit.status === 'breach' && (
                                <AlertTriangle className="size-3.5 text-red-500" />
                              )}
                              {credit.status === 'warning' && (
                                <AlertTriangle className="size-3.5 text-amber-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {res.guest.vipLevel !== 'none' ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <Crown className="size-3 mr-0.5" />
                                {res.guest.vipLevel.toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {/* ─── Expandable Detail Row ──────────────────── */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-4 py-3 space-y-3">
                                {/* Guest summary bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                                      <BedDouble className="size-3.5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold">{res.guest.firstName} {res.guest.lastName}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {res.confirmationNo} · {res.room.type.name} · Floor {res.room.floor}{res.room.wing ? ` · ${res.room.wing}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1 self-start"
                                    onClick={(e) => { e.stopPropagation(); handleViewFullDetails(res) }}
                                  >
                                    <Maximize2 className="size-3" />
                                    Full Details
                                  </Button>
                                </div>

                                {/* Details grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div className="rounded-md bg-background border p-2">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Check-in</p>
                                    <p className="text-xs font-medium mt-0.5">{formatDate(res.checkIn)}</p>
                                  </div>
                                  <div className="rounded-md bg-background border p-2">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Check-out</p>
                                    <p className="text-xs font-medium mt-0.5">{formatDate(res.checkOut)}</p>
                                  </div>
                                  <div className="rounded-md bg-background border p-2">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rate / Night</p>
                                    <p className="text-xs font-medium mt-0.5">{formatCurrency(res.roomRate)}</p>
                                  </div>
                                  <div className="rounded-md bg-background border p-2">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Amount</p>
                                    <p className="text-xs font-medium mt-0.5">{formatCurrency(res.totalAmount)}</p>
                                  </div>
                                </div>

                                {/* Folio & Credit bar */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <div className="flex-1 rounded-md border p-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Folio Balance</p>
                                      <StatusBadge status={res.folios[0]?.status || 'open'} />
                                    </div>
                                    <p className={cn('text-lg font-bold', credit.color)}>{formatCurrency(balance)}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <Progress
                                        value={Math.min(credit.pct, 100)}
                                        className={cn(
                                          'h-1.5 flex-1',
                                          credit.status === 'breach' && '[&>div]:bg-red-500',
                                          credit.status === 'warning' && '[&>div]:bg-amber-500',
                                          credit.status === 'ok' && '[&>div]:bg-green-500',
                                        )}
                                      />
                                      <span className={cn('text-[10px] font-semibold', credit.color)}>
                                        {Math.round(credit.pct)}%
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">of {formatCurrency(res.creditLimit)}</span>
                                    </div>
                                    {credit.status === 'breach' && (
                                      <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle className="size-3" /> Credit limit exceeded
                                      </p>
                                    )}
                                    {credit.status === 'warning' && (
                                      <p className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                                        <AlertTriangle className="size-3" /> Approaching credit limit
                                      </p>
                                    )}
                                  </div>
                                  {/* Notes preview */}
                                  <div className="flex-1 rounded-md border p-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                                    {res.notes ? (
                                      <p className="text-xs text-muted-foreground italic whitespace-pre-wrap line-clamp-3">
                                        {res.notes}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground/50 italic">No notes</p>
                                    )}
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handlePostCharge(res) }}
                                  >
                                    <Plus className="size-3" /> Post Charge
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleTransferRoom(res) }}
                                  >
                                    <ArrowRightLeft className="size-3" /> Transfer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleExtendStay(res) }}
                                  >
                                    <CalendarPlus className="size-3" /> Extend Stay
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleEarlyCheckout(res) }}
                                  >
                                    <LogOut className="size-3" /> Early Checkout
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleAddNote(res) }}
                                  >
                                    <StickyNote className="size-3" /> Add Note
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleWakeUpCall(res) }}
                                  >
                                    <Bell className="size-3" /> Wake-Up Call
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px] h-7 gap-1"
                                    onClick={(e) => { e.stopPropagation(); handleViewFolio(res) }}
                                  >
                                    <Receipt className="size-3" /> View Folio
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* ─── Guest Detail Dialog ────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReservation && (() => {
            const credit = getCreditStatus(selectedReservation)
            const balance = selectedReservation.folios[0]?.balance || 0
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BedDouble className="size-5 text-primary" />
                    <span>{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</span>
                    {selectedReservation.guest.vipLevel !== 'none' && (
                      <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700">
                        <Crown className="size-3 mr-0.5" />
                        {selectedReservation.guest.vipLevel.toUpperCase()}
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    Room {selectedReservation.room.number} — {selectedReservation.confirmationNo}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Reservation details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Confirmation</p>
                      <p className="font-mono font-medium text-xs">{selectedReservation.confirmationNo}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Room Type</p>
                      <p className="font-medium text-xs">{selectedReservation.room.type.name}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Floor / Wing</p>
                      <p className="font-medium text-xs">
                        Floor {selectedReservation.room.floor}
                        {selectedReservation.room.wing ? ` · ${selectedReservation.room.wing}` : ''}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Check-in</p>
                      <p className="font-medium text-xs">{formatDate(selectedReservation.checkIn)}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Check-out</p>
                      <p className="font-medium text-xs">{formatDate(selectedReservation.checkOut)}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Rate / Night</p>
                      <p className="font-medium text-xs">{formatCurrency(selectedReservation.roomRate)}</p>
                    </div>
                  </div>

                  {/* Folio & Credit */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Folio Balance</p>
                      <p className={cn('text-xl font-bold', credit.color)}>{formatCurrency(balance)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress
                          value={Math.min(credit.pct, 100)}
                          className={cn(
                            'h-1.5 flex-1',
                            credit.status === 'breach' && '[&>div]:bg-red-500',
                            credit.status === 'warning' && '[&>div]:bg-amber-500',
                            credit.status === 'ok' && '[&>div]:bg-green-500',
                          )}
                        />
                        <span className={cn('text-[10px] font-semibold', credit.color)}>{Math.round(credit.pct)}%</span>
                      </div>
                      {credit.status === 'breach' && (
                        <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="size-3" /> Credit limit exceeded
                        </p>
                      )}
                      {credit.status === 'warning' && (
                        <p className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="size-3" /> Approaching credit limit
                        </p>
                      )}
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Folio Status</p>
                      <div className="mt-0.5">
                        <StatusBadge status={selectedReservation.folios[0]?.status || 'open'} />
                      </div>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mt-2 mb-1">Credit Limit</p>
                      <p className="text-sm font-medium">{formatCurrency(selectedReservation.creditLimit)}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedReservation.notes && (
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-xs text-muted-foreground italic whitespace-pre-wrap line-clamp-4">
                        {selectedReservation.notes}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handlePostCharge(selectedReservation) }}
                    >
                      <Plus className="size-3.5 mr-1.5" /> Post Charge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handleTransferRoom(selectedReservation) }}
                    >
                      <ArrowRightLeft className="size-3.5 mr-1.5" /> Transfer Room
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handleExtendStay(selectedReservation) }}
                    >
                      <CalendarPlus className="size-3.5 mr-1.5" /> Extend Stay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handleEarlyCheckout(selectedReservation) }}
                    >
                      <LogOut className="size-3.5 mr-1.5" /> Early Checkout
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handleAddNote(selectedReservation) }}
                    >
                      <StickyNote className="size-3.5 mr-1.5" /> Add Note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 justify-start"
                      onClick={() => { setDetailDialogOpen(false); handleViewFolio(selectedReservation) }}
                    >
                      <Receipt className="size-3.5 mr-1.5" /> View Folio
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Post Charge Dialog ─────────────────────────────────── */}
      <Dialog open={chargeDialogOpen} onOpenChange={(open) => {
        setChargeDialogOpen(open)
        if (!open) resetChargeForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Charge</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">Room {selectedReservation.room.number} · {selectedReservation.confirmationNo}</p>
              </div>

              {/* Quick charge buttons */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Charges</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_CHARGES.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-9"
                      onClick={() => handleQuickCharge(preset)}
                    >
                      <preset.icon className="size-3.5 mr-1.5 text-muted-foreground" />
                      <span>{preset.label}</span>
                      <span className="ml-auto font-mono text-muted-foreground">{formatCurrency(preset.amount)}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Charge Type</Label>
                  <Select value={chargeType} onValueChange={setChargeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="f_and_b">Food & Beverage</SelectItem>
                      <SelectItem value="laundry">Laundry</SelectItem>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="minibar">Minibar</SelectItem>
                      <SelectItem value="business_center">Business Center</SelectItem>
                      <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description *</Label>
                  <Input
                    placeholder="Charge description"
                    value={chargeDesc}
                    onChange={(e) => setChargeDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount (NPR) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                  />
                  {chargeAmount && parseFloat(chargeAmount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tax ({settings.taxRate}%): {formatCurrency(parseFloat(chargeAmount) * (settings.taxRate / 100))} · Total: {formatCurrency(parseFloat(chargeAmount) * (1 + settings.taxRate / 100))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChargeDialogOpen(false); resetChargeForm() }}>Cancel</Button>
            <Button
              onClick={submitCharge}
              disabled={!chargeDesc || !chargeAmount || parseFloat(chargeAmount) <= 0 || postChargeMutation.isPending}
            >
              {postChargeMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {postChargeMutation.isPending ? 'Posting...' : 'Post Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room Transfer Dialog ──────────────────────────────── */}
      <Dialog open={transferDialogOpen} onOpenChange={(open) => {
        setTransferDialogOpen(open)
        if (!open) setSelectedNewRoomId('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Room</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">
                  Current Room: <span className="font-mono font-bold">{selectedReservation.room.number}</span>
                  {' · '}{selectedReservation.room.type.name}
                  {' · '}Floor {selectedReservation.room.floor}
                </p>
              </div>

              <div className="space-y-1">
                <Label>Select New Room</Label>
                <Select value={selectedNewRoomId} onValueChange={setSelectedNewRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder={vacantRoomsData?.length === 0 ? 'No available rooms' : 'Choose a room'} />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantRoomsData && vacantRoomsData.length > 0 ? (
                      vacantRoomsData.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.number} — {room.type.name} (Floor {room.floor}
                          {room.wing ? ` · ${room.wing}` : ''})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none" disabled>
                        No vacant clean rooms available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {vacantRoomsData && vacantRoomsData.length === 0 && (
                  <p className="text-xs text-amber-600">
                    There are no vacant clean rooms available for transfer.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitTransfer}
              disabled={!selectedNewRoomId || selectedNewRoomId === '_none' || transferRoomMutation.isPending}
            >
              {transferRoomMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {transferRoomMutation.isPending ? 'Transferring...' : 'Transfer Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Extend Stay Dialog ───────────────────────────────── */}
      <Dialog open={extendDialogOpen} onOpenChange={(open) => {
        setExtendDialogOpen(open)
        if (!open) setNewCheckOut(undefined)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Stay</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">Room {selectedReservation.room.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Current Check-out</p>
                  <p className="font-medium">{formatDate(selectedReservation.checkOut)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Room Rate</p>
                  <p className="font-medium">{formatCurrency(selectedReservation.roomRate)}/night</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>New Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      'w-full justify-start text-left font-normal',
                      !newCheckOut && 'text-muted-foreground',
                    )}>
                      {newCheckOut ? formatDate(newCheckOut) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newCheckOut}
                      onSelect={setNewCheckOut}
                      disabled={(date) => {
                        const currentCheckout = new Date(selectedReservation.checkOut)
                        currentCheckout.setHours(0, 0, 0, 0)
                        return date <= currentCheckout
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {extendNightsDiff > 0 && (
                <div className="rounded-md border p-3 text-sm space-y-1.5 bg-muted/30">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Nights</span>
                    <span className="font-medium">{extendNightsDiff} night{extendNightsDiff > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate per Night</span>
                    <span className="font-medium">{formatCurrency(selectedReservation.roomRate)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Additional Charge</span>
                    <span className="text-green-600">{formatCurrency(extendAdditionalCharge)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitExtendStay}
              disabled={!newCheckOut || extendNightsDiff <= 0 || extendStayMutation.isPending}
            >
              {extendStayMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {extendStayMutation.isPending ? 'Extending...' : 'Extend Stay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Early Checkout Dialog ────────────────────────────── */}
      <Dialog open={earlyCheckoutOpen} onOpenChange={(open) => {
        setEarlyCheckoutOpen(open)
        if (!open) { setEarlyCheckOutDate(undefined); setEarlyCheckoutConfirmOpen(false) }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Early Checkout</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">Room {selectedReservation.room.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Original Check-out</p>
                  <p className="font-medium">{formatDate(selectedReservation.checkOut)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Room Rate</p>
                  <p className="font-medium">{formatCurrency(selectedReservation.roomRate)}/night</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>New Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      'w-full justify-start text-left font-normal',
                      !earlyCheckOutDate && 'text-muted-foreground',
                    )}>
                      {earlyCheckOutDate ? formatDate(earlyCheckOutDate) : 'Pick an earlier date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={earlyCheckOutDate}
                      onSelect={setEarlyCheckOutDate}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const checkOut = new Date(selectedReservation.checkOut)
                        checkOut.setHours(0, 0, 0, 0)
                        return date < today || date >= checkOut
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {earlyCheckoutRefund > 0 && (
                <div className="rounded-md border p-3 text-sm space-y-1.5 bg-muted/30">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nights Being Removed</span>
                    <span className="font-medium">
                      {nightsBetween(selectedReservation.checkIn, selectedReservation.checkOut) -
                        nightsBetween(selectedReservation.checkIn, earlyCheckOutDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate per Night</span>
                    <span className="font-medium">{formatCurrency(selectedReservation.roomRate)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Room Adjustment</span>
                    <span className="text-red-600">-{formatCurrency(earlyCheckoutRefund)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Folio Balance</span>
                    <span className="font-medium">
                      {formatCurrency(selectedReservation.folios[0]?.balance || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarlyCheckoutOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (earlyCheckoutRefund > 0) {
                  setEarlyCheckoutConfirmOpen(true)
                } else {
                  handleEarlyCheckoutConfirm()
                }
              }}
              disabled={!earlyCheckOutDate || earlyCheckoutMutation.isPending}
            >
              {earlyCheckoutMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {earlyCheckoutMutation.isPending ? 'Processing...' : 'Process Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Early Checkout Confirmation Dialog ───────────────── */}
      <AlertDialog open={earlyCheckoutConfirmOpen} onOpenChange={setEarlyCheckoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Early Checkout</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to check out{' '}
                  <span className="font-semibold">{selectedReservation?.guest.firstName} {selectedReservation?.guest.lastName}</span>
                  {' '}from Room{' '}
                  <span className="font-semibold">{selectedReservation?.room.number}</span>.
                </p>
                <p>
                  The room will be set to <span className="font-medium">vacant/dirty</span> for housekeeping.
                  {earlyCheckoutRefund > 0 && (
                    <>
                      {' '}A room credit of{' '}
                      <span className="font-semibold text-red-600">{formatCurrency(earlyCheckoutRefund)}</span>
                      {' '}will be applied.
                    </>
                  )}
                </p>
                {selectedReservation && (
                  <div className="rounded-md bg-muted/50 p-3 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>Folio Balance:</span>
                      <span className="font-bold">{formatCurrency(selectedReservation.folios[0]?.balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Room Credit:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(earlyCheckoutRefund)}</span>
                    </div>
                    <Separator className="my-1.5" />
                    <div className="flex justify-between font-bold">
                      <span>Net Balance:</span>
                      <span>{formatCurrency((selectedReservation.folios[0]?.balance || 0) - earlyCheckoutRefund)}</span>
                    </div>
                  </div>
                )}
                <p className="font-medium text-foreground mt-2">Are you sure you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEarlyCheckoutConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Checkout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Add Note Dialog ───────────────────────────────────── */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => {
        setNoteDialogOpen(open)
        if (!open) setNoteText('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">Room {selectedReservation.room.number} · {selectedReservation.confirmationNo}</p>
              </div>

              {selectedReservation.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Existing Notes</Label>
                  <div className="rounded-md border p-2 text-xs text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {selectedReservation.notes}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="note-text">New Note *</Label>
                <Textarea
                  id="note-text"
                  placeholder="Enter note (e.g., extra pillows requested, late checkout approved...)"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Notes are timestamped automatically.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitNote}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
