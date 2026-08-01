'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import {
  LogIn, BedDouble, Bell, Clock, Star, AlertTriangle, Users, CheckCircle2,
  UserCheck, Crown, Footprints, KeyRound, Mail, Sparkles, BookOpen, Wand2,
  ArrowLeft, Shield, Phone,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { formatDate, formatCurrency, getTodayString, nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore, useNavigationStore, useFrontDeskContextStore, useGuestLedgerContextStore } from '@/lib/store'

// ─── Constants ──────────────────────────────────────────────────────────

const ROOM_TYPES = [
  { id: 'rt-1', name: 'Deluxe Room', code: 'DLX', baseRate: 8000 },
  { id: 'rt-2', name: 'Standard Room', code: 'STD', baseRate: 5000 },
  { id: 'rt-3', name: 'Suite', code: 'STE', baseRate: 15000 },
  { id: 'rt-4', name: 'Superior Room', code: 'SPR', baseRate: 6500 },
  { id: 'rt-5', name: 'Premium Suite', code: 'PRS', baseRate: 25000 },
  { id: 'rt-6', name: 'Twin Room', code: 'TWN', baseRate: 5500 },
]

const NATIONALITIES = [
  'Nepal', 'India', 'China', 'USA', 'UK', 'Japan', 'South Korea',
  'Germany', 'France', 'Australia', 'Canada', 'Singapore', 'Malaysia',
  'Thailand', 'Sri Lanka', 'Bangladesh', 'Pakistan', 'UAE', 'Saudi Arabia',
  'Other',
]

const ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
]

const CHECKOUT_TIME_OPTIONS = [
  { value: '12:00', label: 'Default (12:00 PM)' },
  { value: '14:00', label: 'Late (2:00 PM)' },
  { value: '16:00', label: 'Late (4:00 PM)' },
]

const ROOM_PREFERENCES = [
  { value: 'high_floor', label: 'High Floor' },
  { value: 'low_floor', label: 'Low Floor' },
  { value: 'quiet', label: 'Quiet Room' },
  { value: 'away_elevator', label: 'Away from Elevator' },
  { value: 'city_view', label: 'City View' },
  { value: 'garden_view', label: 'Garden View' },
]

const PILLOW_TYPES = [
  { value: 'soft', label: 'Soft' },
  { value: 'firm', label: 'Firm' },
  { value: 'hypoallergenic', label: 'Hypoallergenic' },
]

// ─── Types ──────────────────────────────────────────────────────────────

interface ArrivalGuest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  vipLevel: string
}

interface ArrivalRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  type: { name: string; code: string; bedConfig?: string | null }
}

interface Arrival {
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
  guest: ArrivalGuest | null
  room: ArrivalRoom | null
}

interface AvailableRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  type: { name: string; code: string; bedConfig?: string | null }
}

interface WalkInForm {
  firstName: string
  lastName: string
  phone: string
  email: string
  nationality: string
  idType: string
  idNumber: string
  roomTypeId: string
  roomRate: number
  checkOutDate: Date | undefined
  adults: number
  children: number
}

const initialWalkInForm: WalkInForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  nationality: '',
  idType: 'passport',
  idNumber: '',
  roomTypeId: '',
  roomRate: 0,
  checkOutDate: undefined,
  adults: 1,
  children: 0,
}

// ─── Component ──────────────────────────────────────────────────────────

export function ArrivalsView() {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const { navigateTo } = useNavigationStore()
  const today = getTodayString()

  // Dialog states
  const [roomPickerOpen, setRoomPickerOpen] = useState(false)
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false)
  const [keyCardDialogOpen, setKeyCardDialogOpen] = useState(false)

  // Selection states
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  // Check-in form states
  const [earlyCheckIn, setEarlyCheckIn] = useState(false)
  const [checkOutTime, setCheckOutTime] = useState(settings.defaultCheckOut)
  const [roomPreference, setRoomPreference] = useState('')
  const [pillowType, setPillowType] = useState('')
  const [wakeupCall, setWakeupCall] = useState('')

  // Key card states
  const [keyCardRoomNumber, setKeyCardRoomNumber] = useState('')
  const [keyCardIssued, setKeyCardIssued] = useState(false)
  const [keyCardProcessed, setKeyCardProcessed] = useState(false)

  // Mobile detail view state
  const [mobileShowDetail, setMobileShowDetail] = useState(false)

  // Walk-in form state
  const [walkInForm, setWalkInForm] = useState<WalkInForm>(initialWalkInForm)
  const [walkInCheckOutOpen, setWalkInCheckOutOpen] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['arrivals', today],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'confirmed', checkInDate: today })
      return apiFetch(`/api/reservations?${params.toString()}`)
    },
    refetchInterval: 60000,
  })

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', 'vacant'],
    queryFn: () => apiFetch('/api/rooms'),
  })

  const arrivals: Arrival[] = data?.reservations || []
  const allRooms: AvailableRoom[] = roomsData?.rooms || []
  const availableRooms = allRooms.filter(
    (r) => r.number && r.type && (r.status === 'vacant_clean' || r.status === 'inspected')
  )

  // ─── VIP Priority Sorting ───────────────────────────────────────────

  const sortedArrivals = useMemo(() => {
    return [...arrivals].sort((a, b) => {
      const aVip = a.guest?.vipLevel && a.guest.vipLevel !== 'none'
      const bVip = b.guest?.vipLevel && b.guest.vipLevel !== 'none'
      if (aVip && !bVip) return -1
      if (!aVip && bVip) return 1
      return 0
    })
  }, [arrivals])

  // ─── Stats ──────────────────────────────────────────────────────────

  const totalArrivals = arrivals.length
  const vipArrivals = arrivals.filter((a) => a.guest?.vipLevel && a.guest.vipLevel !== 'none').length
  const unassignedArrivals = arrivals.filter((a) => !a.room).length
  const pendingArrivals = arrivals.filter((a) => a.status === 'confirmed').length

  // ─── Mutations ──────────────────────────────────────────────────────

  const assignRoomMutation = useMutation({
    mutationFn: async ({ reservationId, roomId, specialRequests }: { reservationId: string; roomId: string; specialRequests?: string }) => {
      const payload: Record<string, unknown> = { roomId, status: 'checked_in' }
      if (specialRequests !== undefined) {
        payload.specialRequests = specialRequests
      }
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_data, variables) => {
      invalidate.afterReservationChange(queryClient)
      setRoomPickerOpen(false)
      setCheckInDialogOpen(false)

      // Find the room number for key card dialog
      const room = availableRooms.find((r) => r.id === variables.roomId)
      const roomNumber = room?.number || selectedArrival?.room?.number || ''
      openKeyCardDialog(roomNumber)
    },
  })

  const checkInMutation = useMutation({
    mutationFn: async ({ reservationId, specialRequests }: { reservationId: string; specialRequests?: string }) => {
      const payload: Record<string, unknown> = { status: 'checked_in' }
      if (specialRequests !== undefined) {
        payload.specialRequests = specialRequests
      }
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_data, variables) => {
      invalidate.afterCheckIn(queryClient)
      setCheckInDialogOpen(false)

      const roomNumber = selectedArrival?.room?.number || ''
      openKeyCardDialog(roomNumber)
    },
  })

  const walkInMutation = useMutation({
    mutationFn: async (form: WalkInForm) => {
      // 1. Create guest
      const guestData = await apiFetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          email: form.email || null,
          nationality: form.nationality || null,
          idType: form.idType || null,
          idNumber: form.idNumber || null,
        }),
      })
      const guestId = guestData.guest.id

      // 2. Find a vacant room
      const vacantRoom = availableRooms[0]
      if (!vacantRoom) throw new Error('No available rooms')

      // 3. Create reservation as checked_in (walk-in)
      const checkOutDate = form.checkOutDate || (() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      })()

      const resData = await apiFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          roomId: vacantRoom.id,
          adults: form.adults,
          children: form.children,
          checkIn: new Date().toISOString(),
          checkOut: checkOutDate.toISOString(),
          roomRate: form.roomRate,
          source: 'walk_in',
          reservationType: 'walk_in',
          guaranteed: false,
        }),
      })
      return { roomNumber: vacantRoom.number, reservation: resData.reservation }
    },
    onSuccess: (result) => {
      invalidate.afterCheckIn(queryClient)
      setWalkInDialogOpen(false)
      setWalkInForm(initialWalkInForm)

      // Open key card dialog
      openKeyCardDialog(result.roomNumber)
    },
    onError: (error) => {
      toast.error('Walk-in check-in failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleAssignRoom = (arrival: Arrival) => {
    setSelectedArrival(arrival)
    setRoomPickerOpen(true)
  }

  const handleQuickCheckIn = (arrival: Arrival) => {
    if (!arrival.room) {
      setSelectedArrival(arrival)
      setRoomPickerOpen(true)
      return
    }
    setSelectedArrival(arrival)
    resetCheckInForm()
    setCheckInDialogOpen(true)
  }

  const handleOpenWalkIn = () => {
    setWalkInForm(initialWalkInForm)
    setWalkInDialogOpen(true)
  }

  const handleNavigateToCheckIn = (arrival: Arrival) => {
    useFrontDeskContextStore.getState().setPrefillReservationId(arrival.id)
    navigateTo('front-desk', 'check-in')
  }

  const handleViewLedger = (arrival: Arrival) => {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({
      guestId: arrival.guest?.id || '',
      guestName: `${arrival.guest?.firstName || ''} ${arrival.guest?.lastName || ''}`.trim(),
    })
    navigateTo('front-desk', 'guest-ledger')
  }

  const buildSpecialRequests = (arrival: Arrival): string => {
    const parts: string[] = []

    // Preserve existing requests
    if (arrival.specialRequests) {
      parts.push(arrival.specialRequests)
    }

    // Early check-in note
    if (earlyCheckIn) {
      parts.push(`[EARLY CHECK-IN] Checked in before ${settings.defaultCheckIn}`)
    }

    // Check-out time override
    if (checkOutTime !== settings.defaultCheckOut) {
      parts.push(`[CHECK-OUT OVERRIDE] Preferred check-out: ${checkOutTime}`)
    }

    // Room preference
    if (roomPreference) {
      const prefLabel = ROOM_PREFERENCES.find((p) => p.value === roomPreference)?.label || roomPreference
      parts.push(`[PREFERENCE] Room: ${prefLabel}`)
    }

    // Pillow type
    if (pillowType) {
      const pillowLabel = PILLOW_TYPES.find((p) => p.value === pillowType)?.label || pillowType
      parts.push(`[PREFERENCE] Pillow: ${pillowLabel}`)
    }

    // Wake-up call
    if (wakeupCall) {
      parts.push(`[SERVICE] Wake-up call requested at ${wakeupCall}`)
    }

    return parts.join(' | ')
  }

  const confirmCheckIn = () => {
    if (!selectedArrival) return

    const updatedRequests = buildSpecialRequests(selectedArrival)

    if (selectedRoomId) {
      assignRoomMutation.mutate({
        reservationId: selectedArrival.id,
        roomId: selectedRoomId,
        specialRequests: updatedRequests,
      })
    } else if (selectedArrival.room) {
      checkInMutation.mutate({
        reservationId: selectedArrival.id,
        specialRequests: updatedRequests,
      })
    }
  }

  const openKeyCardDialog = (roomNumber: string) => {
    setKeyCardRoomNumber(roomNumber)
    setKeyCardIssued(false)
    setKeyCardProcessed(false)
    setKeyCardDialogOpen(true)
  }

  const handleKeyCardConfirm = () => {
    setKeyCardProcessed(true)
    setKeyCardDialogOpen(false)
    toast.success(`Check-in complete! Welcome letter sent to Room ${keyCardRoomNumber}`, {
      duration: 5000,
      icon: <Mail className="size-4" />,
    })
    setSelectedArrival(null)
    setSelectedRoomId('')
  }

  const resetCheckInForm = () => {
    setEarlyCheckIn(false)
    setCheckOutTime(settings.defaultCheckOut)
    setRoomPreference('')
    setPillowType('')
    setWakeupCall('')
  }

  const handleWalkInRoomTypeChange = (roomTypeId: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.id === roomTypeId)
    setWalkInForm((prev) => ({
      ...prev,
      roomTypeId,
      roomRate: roomType?.baseRate || 0,
    }))
  }

  const handleSelectArrival = (arrival: Arrival) => {
    setSelectedArrival(arrival)
    setSelectedRoomId('')
    setMobileShowDetail(true)
  }

  const handleBackToList = () => {
    setMobileShowDetail(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today&apos;s Arrivals</h2>
          <p className="text-xs text-muted-foreground">
            Guest check-ins scheduled for {formatDate(today)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {totalArrivals} expected
          </Badge>
          {vipArrivals > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
              <Crown className="size-3 mr-0.5" />
              {vipArrivals} VIP
            </Badge>
          )}
          {unassignedArrivals > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3 mr-0.5" />
              {unassignedArrivals} unassigned
            </Badge>
          )}
          <Button onClick={handleOpenWalkIn} size="sm" className="gap-1.5">
            <Footprints className="size-3.5" />
            <span className="hidden sm:inline">Walk-in</span>
          </Button>
        </div>
      </div>

      {/* ─── Split Screen Body ─── */}
      <div className="h-[calc(100vh-14rem)] min-h-[400px] flex flex-col lg:flex-row gap-3 overflow-hidden">

        {/* ─── Left Panel: Arrivals List ─── */}
        <div className={cn(
          'flex flex-col min-h-0 border rounded-lg bg-card overflow-hidden',
          'w-full lg:w-[42%] xl:w-[38%]',
          mobileShowDetail && selectedArrival && 'hidden lg:flex',
        )}>
          {/* List header */}
          <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between bg-muted/30">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Expected Arrivals
            </span>
            <span className="text-[10px] text-muted-foreground">{sortedArrivals.length} guests</span>
          </div>
          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-2 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : sortedArrivals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LogIn className="size-8 mb-2 opacity-50" />
                <p className="text-sm">No arrivals scheduled for today</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedArrivals.map((arrival) => {
                  const isUnassigned = !arrival.room
                  const isVip = arrival.guest?.vipLevel && arrival.guest.vipLevel !== 'none'
                  const isSelected = selectedArrival?.id === arrival.id
                  return (
                    <button
                      key={arrival.id}
                      type="button"
                      onClick={() => handleSelectArrival(arrival)}
                      className={cn(
                        'w-full text-left p-2.5 transition-colors hover:bg-muted/50',
                        isSelected && 'bg-muted/80',
                        isUnassigned && 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
                        isVip && !isUnassigned && 'border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10',
                        isVip && isUnassigned && 'border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30',
                      )}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {arrival.guest ? `${arrival.guest.firstName} ${arrival.guest.lastName}` : 'Unknown Guest'}
                        </span>
                        {isVip && (
                          <Badge className="text-[9px] px-1 py-0 gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            <Star className="size-2.5 fill-amber-500 text-amber-500" />
                            VIP
                          </Badge>
                        )}
                        {isUnassigned && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-2.5 mr-0.5" />
                            Unassigned
                          </Badge>
                        )}
                        {isSelected && <CheckCircle2 className="size-4 text-teal-600 ml-auto shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{arrival.confirmationNo}</span>
                        <span>·</span>
                        <span>Room {arrival.room?.number || '---'}</span>
                        <span>·</span>
                        <span>{arrival.adults}A{arrival.children > 0 ? ` ${arrival.children}Ch` : ''}</span>
                      </div>
                      {arrival.specialRequests && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          📋 {arrival.specialRequests}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Arrival Detail ─── */}
        <div className={cn(
          'flex flex-col min-h-0 border rounded-lg bg-card',
          'w-full lg:flex-1',
          (!selectedArrival || !mobileShowDetail) && 'hidden lg:flex',
        )}>
          {selectedArrival ? (
            <>
              {/* Mobile back button */}
              <div className="lg:hidden border-b px-3 py-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Arrivals</span>
                </button>
              </div>

              {/* Scrollable detail content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Guest & Room Header */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-semibold">
                      {selectedArrival.guest ? `${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName}` : 'Unknown Guest'}
                    </span>
                    {selectedArrival.guest?.vipLevel && selectedArrival.guest.vipLevel !== 'none' && (
                      <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                        <Crown className="size-3" />
                        {selectedArrival.guest.vipLevel.toUpperCase()}
                      </Badge>
                    )}
                    {selectedArrival.guaranteed && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                        <Shield className="size-3 mr-0.5" />
                        Guaranteed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{selectedArrival.confirmationNo}</span>
                    <span>·</span>
                    <span className="capitalize">{selectedArrival.source?.replace('_', ' ') || 'Direct'}</span>
                    <span>·</span>
                    <StatusBadge status={selectedArrival.status} />
                  </div>
                </div>

                <Separator />

                {/* Room & Rate Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Room</span>
                    <p className="text-sm font-medium mt-0.5">
                      {selectedArrival.room ? (
                        <>
                          {selectedArrival.room.number}
                          <RoomTypeBedBadge typeName={selectedArrival.room.type.name} bedConfig={selectedArrival.room.type.bedConfig} typeCode={selectedArrival.room.type.code} pax={selectedArrival.adults + selectedArrival.children} inline className="ml-1" />
                        </>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                      )}
                    </p>
                    {selectedArrival.room && (
                      <p className="text-xs text-muted-foreground">
                        Floor {selectedArrival.room.floor}{selectedArrival.room.wing ? ` · Wing ${selectedArrival.room.wing}` : ''}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rate</span>
                    <p className="text-sm font-medium mt-0.5">{formatCurrency(selectedArrival.roomRate)}<span className="text-xs text-muted-foreground">/night</span></p>
                    <p className="text-xs text-muted-foreground">
                      {nightsBetween(selectedArrival.checkIn, selectedArrival.checkOut)} nights · Total: {formatCurrency(selectedArrival.totalAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Stay Dates */}
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stay Duration</span>
                  <p className="text-sm mt-0.5 font-medium">
                    {formatDate(selectedArrival.checkIn)} → {formatDate(selectedArrival.checkOut)}
                  </p>
                </div>

                {/* Guest Contact */}
                {selectedArrival.guest && (selectedArrival.guest.email || selectedArrival.guest.phone) && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</span>
                    <div className="mt-1 space-y-0.5 text-sm">
                      {selectedArrival.guest.email && (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3 shrink-0" />
                          {selectedArrival.guest.email}
                        </p>
                      )}
                      {selectedArrival.guest.phone && (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3 shrink-0" />
                          {selectedArrival.guest.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Occupancy */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-foreground shrink-0" />
                  <span>{selectedArrival.adults} adults</span>
                  {selectedArrival.children > 0 && <span>· {selectedArrival.children} children</span>}
                </div>

                {/* Special Requests */}
                {selectedArrival.specialRequests && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Special Requests</span>
                    <p className="text-sm mt-0.5 bg-muted/50 rounded-md p-2.5">{selectedArrival.specialRequests}</p>
                  </div>
                )}
              </div>

              {/* ─── Sticky Action Bar ─── */}
              <div className="shrink-0 border-t bg-background p-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleNavigateToCheckIn(selectedArrival)}
                    className="flex-1 min-w-[130px]"
                  >
                    <Wand2 className="size-4 mr-1.5" />
                    Go Check-in
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCheckInForm()
                      setCheckInDialogOpen(true)
                    }}
                  >
                    <UserCheck className="size-3.5 mr-1.5" />
                    Quick Check-In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAssignRoom(selectedArrival)}
                  >
                    <BedDouble className="size-3.5 mr-1.5" />
                    Room
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleViewLedger(selectedArrival)}
                  >
                    <BookOpen className="size-3.5 mr-1.5" />
                    Ledger
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    title="Wake-up call / Service bell"
                  >
                    <Bell className="size-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
              <LogIn className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No arrival selected</p>
              <p className="text-xs mt-1 text-center max-w-[200px]">Click an arrival from the list to view details and process check-in</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Room Picker Dialog ──────────────────────────────────────── */}
      <Dialog open={roomPickerOpen} onOpenChange={setRoomPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Room — {selectedArrival?.guest ? `${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName}` : 'Guest'}
            </DialogTitle>
            <DialogDescription>Select a vacant room to assign and check in this guest.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto">
            <div className="space-y-1">
              {availableRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No available rooms</p>
              ) : (
                availableRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                      selectedRoomId === room.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <BedDouble className="size-4 shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">Room {room.number}</span>
                      <RoomTypeBedBadge typeName={room.type.name} bedConfig={room.type.bedConfig} typeCode={room.type.code} inline className="ml-1.5" />
                    </div>
                    <span className="text-xs opacity-70">Floor {room.floor}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomPickerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setRoomPickerOpen(false)
                resetCheckInForm()
                setCheckInDialogOpen(true)
              }}
              disabled={!selectedRoomId || assignRoomMutation.isPending}
            >
              {assignRoomMutation.isPending ? 'Assigning...' : 'Assign & Check In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Check-in Confirmation Dialog ──────────────────────────── */}
      <Dialog open={checkInDialogOpen} onOpenChange={(open) => {
        if (!open) setCheckInDialogOpen(false)
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Check-In</DialogTitle>
            <DialogDescription>Review guest details and capture preferences before check-in.</DialogDescription>
          </DialogHeader>
          {selectedArrival && (
            <div className="space-y-4">
              {/* Guest & Room Summary */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">
                  {selectedArrival.guest ? `${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName}` : 'Guest'}
                </p>
                <p className="text-muted-foreground">
                  <span className="flex items-center gap-1">Room {selectedArrival.room?.number || selectedRoomId ? selectedArrival.room?.number : 'To be assigned'} {selectedArrival.room && <RoomTypeBedBadge typeName={selectedArrival.room.type.name} bedConfig={selectedArrival.room.type.bedConfig} typeCode={selectedArrival.room.type.code} pax={selectedArrival.adults + selectedArrival.children} inline />}</span>
                </p>
                <p className="text-muted-foreground">
                  {formatDate(selectedArrival.checkIn)} → {formatDate(selectedArrival.checkOut)}
                </p>
                {selectedArrival.specialRequests && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Existing requests: {selectedArrival.specialRequests}
                  </p>
                )}
              </div>

              <Separator />

              {/* Early Check-in Option */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="early-checkin"
                  checked={earlyCheckIn}
                  onCheckedChange={(checked) => setEarlyCheckIn(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor="early-checkin" className="text-sm font-medium cursor-pointer">
                    Early Check-in
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Check-in before 2:00 PM — will be noted on the reservation
                  </p>
                </div>
              </div>

              {/* Check-out Time Override */}
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Check-out Time</Label>
                <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select check-out time" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECKOUT_TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Guest Preferences */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-muted-foreground" />
                  Guest Preferences
                </p>
                <div className="grid gap-3">
                  {/* Room Preference */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Room Preference</Label>
                    <Select value={roomPreference} onValueChange={setRoomPreference}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select preference (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {ROOM_PREFERENCES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pillow Type */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Pillow Type</Label>
                    <Select value={pillowType} onValueChange={setPillowType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select pillow type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {PILLOW_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wake-up Call */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Wake-up Call Time</Label>
                    <Input
                      type="time"
                      value={wakeupCall}
                      onChange={(e) => setWakeupCall(e.target.value)}
                      placeholder="e.g. 07:00"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">
                This will change the reservation status to <strong>Checked In</strong> and update the room status to <strong>Occupied</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmCheckIn}
              disabled={checkInMutation.isPending || assignRoomMutation.isPending}
            >
              <UserCheck className="size-4 mr-1.5" />
              {(checkInMutation.isPending || assignRoomMutation.isPending) ? 'Checking in...' : 'Confirm Check-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Walk-in Quick Registration Dialog ──────────────────────── */}
      <Dialog open={walkInDialogOpen} onOpenChange={setWalkInDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Footprints className="size-5" />
              Walk-in Quick Registration
            </DialogTitle>
            <DialogDescription>
              Register a walk-in guest and complete check-in immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Guest Information */}
            <div>
              <p className="text-sm font-medium mb-3">Guest Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="wi-firstName" className="text-xs">First Name *</Label>
                  <Input
                    id="wi-firstName"
                    value={walkInForm.firstName}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="wi-lastName" className="text-xs">Last Name *</Label>
                  <Input
                    id="wi-lastName"
                    value={walkInForm.lastName}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="wi-phone" className="text-xs">Phone</Label>
                  <Input
                    id="wi-phone"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+977-98XX-XXXXXX"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="wi-email" className="text-xs">Email</Label>
                  <Input
                    id="wi-email"
                    type="email"
                    value={walkInForm.email}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="guest@email.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Nationality</Label>
                  <Select
                    value={walkInForm.nationality}
                    onValueChange={(v) => setWalkInForm((p) => ({ ...p, nationality: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {NATIONALITIES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">ID Type</Label>
                  <Select
                    value={walkInForm.idType}
                    onValueChange={(v) => setWalkInForm((p) => ({ ...p, idType: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="wi-idNumber" className="text-xs">ID Number</Label>
                  <Input
                    id="wi-idNumber"
                    value={walkInForm.idNumber}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, idNumber: e.target.value }))}
                    placeholder="ID / Passport number"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Stay Details */}
            <div>
              <p className="text-sm font-medium mb-3">Stay Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Room Type */}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Room Type *</Label>
                  <Select
                    value={walkInForm.roomTypeId}
                    onValueChange={handleWalkInRoomTypeChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>{rt.name}</span>
                            <span className="text-xs opacity-60">{formatCurrency(rt.baseRate)}/night</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate (auto-filled) */}
                <div className="grid gap-1.5">
                  <Label htmlFor="wi-rate" className="text-xs">Rate per Night (NPR)</Label>
                  <Input
                    id="wi-rate"
                    type="number"
                    value={walkInForm.roomRate || ''}
                    onChange={(e) => setWalkInForm((p) => ({ ...p, roomRate: Number(e.target.value) }))}
                    placeholder="Auto-filled from room type"
                  />
                </div>

                {/* Check-in (today, readonly) */}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Check-in</Label>
                  <Input
                    value={format(new Date(), 'MMM dd, yyyy')}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                {/* Check-out date picker */}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Check-out *</Label>
                  <Popover open={walkInCheckOutOpen} onOpenChange={setWalkInCheckOutOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !walkInForm.checkOutDate && 'text-muted-foreground'
                        )}
                      >
                        <Clock className="size-3.5 mr-2" />
                        {walkInForm.checkOutDate
                          ? format(walkInForm.checkOutDate, 'MMM dd, yyyy')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={walkInForm.checkOutDate}
                        onSelect={(date) => {
                          setWalkInForm((p) => ({ ...p, checkOutDate: date || undefined }))
                          setWalkInCheckOutOpen(false)
                        }}
                        disabled={(date) => date <= new Date(new Date().setHours(0, 0, 0, 0))}
                        defaultMonth={(() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 1)
                          return d
                        })()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Adults */}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Adults</Label>
                  <Select
                    value={String(walkInForm.adults)}
                    onValueChange={(v) => setWalkInForm((p) => ({ ...p, adults: Number(v) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Children */}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Children</Label>
                  <Select
                    value={String(walkInForm.children)}
                    onValueChange={(v) => setWalkInForm((p) => ({ ...p, children: Number(v) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Available Rooms Info */}
              <div className="mt-3 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <BedDouble className="size-3" />
                  {availableRooms.length > 0
                    ? `${availableRooms.length} vacant room(s) available — a room will be auto-assigned upon check-in.`
                    : '⚠️ No vacant rooms currently available!'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => walkInMutation.mutate(walkInForm)}
              disabled={
                walkInMutation.isPending ||
                !walkInForm.firstName.trim() ||
                !walkInForm.lastName.trim() ||
                !walkInForm.roomTypeId ||
                !walkInForm.checkOutDate
              }
            >
              <Footprints className="size-4 mr-1.5" />
              {walkInMutation.isPending ? 'Registering...' : 'Register & Check In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Key Card Issuance Dialog ────────────────────────────────── */}
      <Dialog open={keyCardDialogOpen} onOpenChange={setKeyCardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" />
              Key Card Issuance
            </DialogTitle>
            <DialogDescription>
              Issue a key card for the guest&apos;s room.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Room Number Prominent Display */}
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 border border-primary/20 p-6">
              <p className="text-xs text-muted-foreground mb-1">Room</p>
              <p className="text-4xl font-bold tracking-wider text-primary">{keyCardRoomNumber}</p>
            </div>

            {/* Key Card Issued Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Checkbox
                id="key-card-issued"
                checked={keyCardIssued}
                onCheckedChange={(checked) => setKeyCardIssued(checked === true)}
                className="mt-0.5"
              />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor="key-card-issued" className="text-sm font-medium cursor-pointer">
                  Key Card Issued
                </Label>
                <p className="text-xs text-muted-foreground">
                  Confirm that the physical key card has been programmed and handed to the guest.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleKeyCardConfirm}
              disabled={keyCardProcessed}
              className="gap-2"
            >
              <KeyRound className="size-4" />
              {keyCardProcessed ? 'Done' : 'Complete Check-in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
