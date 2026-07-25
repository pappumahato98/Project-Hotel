'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  UserCheck, BedDouble, AlertTriangle, Crown, KeyRound, CreditCard,
  User, Mail, Phone, Globe, MapPin, Clock, Star, FileText,
  ChevronLeft, ChevronRight, Check, Loader2, Hotel, Shield,
  Sparkles, Pill, Eye, AlarmClock, Banknote, Wallet,
  Building, Layers, ArrowRight, Search, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { formatDate, formatCurrency, formatTime, getTodayString } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/lib/store'
import { invalidate } from '@/lib/queryKeys'

// ─── Constants ──────────────────────────────────────────────────────────

const TITLE_OPTIONS = [
  { value: 'mr', label: 'Mr.' },
  { value: 'mrs', label: 'Mrs.' },
  { value: 'ms', label: 'Ms.' },
  { value: 'dr', label: 'Dr.' },
  { value: 'prof', label: 'Prof.' },
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

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
]

const STEP_LABELS = [
  'Select Arrival',
  'Verify Guest',
  'Assign Room',
  'Preferences & Registration',
  'Billing',
  'Key Card',
]

// ─── Types ──────────────────────────────────────────────────────────────

interface GuestInfo {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  vipLevel: string
  nationality: string | null
  idType: string | null
  idNumber: string | null
  address: string | null
  city: string | null
  country: string | null
  loyaltyTier: string
  totalStays: number
  totalRevenue: number
}

interface RoomInfo {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  type: { id: string; name: string; code: string; bedConfig: string | null }
}

interface ReservationInfo {
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
  roomTypeId: string | null
  guest: GuestInfo | null
  room: RoomInfo | null
}

interface RoomTypeData {
  id: string
  name: string
  code: string
  baseRate: number
}

// ─── Component ──────────────────────────────────────────────────────────

interface CheckInViewProps {
  reservationId?: string
  onComplete?: () => void
}

export function CheckInView({ reservationId, onComplete }: CheckInViewProps) {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const today = getTodayString()

  // ─── Step state ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)

  // ─── Selection states ────────────────────────────────────────
  const [selectedReservationId, setSelectedReservationId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [roomSearchFilter, setRoomSearchFilter] = useState('')

  // ─── Registration card form ────────────────────────────────────
  const [regTitle, setRegTitle] = useState('')
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regContactNo, setRegContactNo] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regNationality, setRegNationality] = useState('')
  const [regIdType, setRegIdType] = useState('passport')
  const [regIdNumber, setRegIdNumber] = useState('')
  const [regCity, setRegCity] = useState('')
  const [regCountry, setRegCountry] = useState('')

  // ─── Stay preferences ─────────────────────────────────────────
  const [earlyCheckIn, setEarlyCheckIn] = useState(false)
  const [checkOutTime, setCheckOutTime] = useState(settings.defaultCheckOut)
  const [pillowType, setPillowType] = useState('')
  const [roomPreference, setRoomPreference] = useState('')
  const [wakeupCall, setWakeupCall] = useState('')

  // ─── Billing ──────────────────────────────────────────────────
  const [depositAmount, setDepositAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [billingNotes, setBillingNotes] = useState('')

  // ─── Key card dialog ───────────────────────────────────────────
  const [keyCardDialogOpen, setKeyCardDialogOpen] = useState(false)
  const [keyCardIssued, setKeyCardIssued] = useState(false)
  const [keyCardRoomNumber, setKeyCardRoomNumber] = useState('')
  const [keyCardGuestName, setKeyCardGuestName] = useState('')
  const [keyCardCheckOut, setKeyCardCheckOut] = useState('')

  // ─── Queries ─────────────────────────────────────────────────

  // Fetch specific reservation by ID (if prop provided)
  const { data: specificResData, isLoading: loadingSpecific } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => apiFetch(`/api/reservations/${reservationId}`),
    enabled: !!reservationId,
  })

  // Fetch today's confirmed arrivals
  const { data: arrivalsData, isLoading: loadingArrivals } = useQuery({
    queryKey: ['arrivals', today],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'confirmed', checkInDate: today })
      return apiFetch(`/api/reservations?${params.toString()}`)
    },
    enabled: !reservationId,
  })

  // Fetch all rooms with types
  const { data: roomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms', 'all'],
    queryFn: () => apiFetch('/api/rooms'),
  })

  // ─── Derived data ──────────────────────────────────────────────

  const specificReservation: ReservationInfo | null = specificResData?.reservation || null
  const arrivals: ReservationInfo[] = arrivalsData?.reservations || []

  // The reservation we're working with
  const activeReservation: ReservationInfo | null = reservationId
    ? specificReservation
    : arrivals.find((a) => a.id === selectedReservationId) || null

  // Room type data from API (not hardcoded)
  const roomTypes: RoomTypeData[] = useMemo(() => {
    if (!roomsData?.roomTypes) return []
    return roomsData.roomTypes.map((rt: { id: string; name: string; code: string; ratePlans: Array<{ baseRate: number }> }) => ({
      id: rt.id,
      name: rt.name,
      code: rt.code,
      baseRate: rt.ratePlans?.[0]?.baseRate || 0,
    }))
  }, [roomsData])

  // Available rooms (vacant_clean or inspected)
  const allRooms: RoomInfo[] = roomsData?.rooms || []
  const availableRooms = allRooms.filter(
    (r: RoomInfo) => r.status === 'vacant_clean' || r.status === 'inspected'
  )

  // Filter available rooms by search
  const filteredAvailableRooms = useMemo(() => {
    let filtered = availableRooms
    if (roomSearchFilter.trim()) {
      const q = roomSearchFilter.toLowerCase()
      filtered = filtered.filter(
        (r: RoomInfo) =>
          r.number.toLowerCase().includes(q) ||
          r.type.name.toLowerCase().includes(q) ||
          String(r.floor).includes(q) ||
          (r.wing && r.wing.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [availableRooms, roomSearchFilter])

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const grouped = new Map<number, RoomInfo[]>()
    for (const room of filteredAvailableRooms) {
      const floor = room.floor
      if (!grouped.has(floor)) grouped.set(floor, [])
      grouped.get(floor)!.push(room)
    }
    return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]))
  }, [filteredAvailableRooms])

  // Get room type name by ID
  const getRoomTypeName = (typeId: string) => {
    const rt = roomTypes.find((t) => t.id === typeId)
    return rt?.name || 'Unknown'
  }

  // Get room rate by type ID
  const getRoomTypeRate = (typeId: string) => {
    const rt = roomTypes.find((t) => t.id === typeId)
    return rt?.baseRate || 0
  }

  // ─── Initialize form when reservation loads ───────────────────

  React.useEffect(() => {
    if (specificReservation && reservationId) {
      setSelectedReservationId(specificReservation.id)
      if (specificReservation.room?.id) {
        setSelectedRoomId(specificReservation.room.id)
      }
      setCurrentStep(specificReservation.guest ? 1 : 0)
    }
  }, [specificReservation, reservationId])

  // Pre-fill registration fields when guest is selected
  React.useEffect(() => {
    if (activeReservation?.guest) {
      const g = activeReservation.guest
      setRegTitle('')
      setRegFirstName(g.firstName || '')
      setRegLastName(g.lastName || '')
      setRegContactNo(g.phone || '')
      setRegEmail(g.email || '')
      setRegNationality(g.nationality || '')
      setRegIdType(g.idType || 'passport')
      setRegIdNumber(g.idNumber || '')
      setRegAddress(g.address || '')
      setRegCity(g.city || '')
      setRegCountry(g.country || '')
    }
  }, [activeReservation?.guest])

  // Auto-set deposit when room is selected
  React.useEffect(() => {
    if (activeReservation?.roomRate && !depositAmount) {
      setDepositAmount(String(activeReservation.roomRate))
    }
  }, [activeReservation?.roomRate, depositAmount])

  // ─── Mutations ────────────────────────────────────────────────

  const checkInMutation = useMutation({
    mutationFn: async ({
      reservationId: resId,
      roomId,
      specialRequests,
    }: {
      reservationId: string
      roomId: string
      specialRequests: string
    }) => {
      return apiFetch(`/api/reservations/${resId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          status: 'checked_in',
          specialRequests,
        }),
      })
    },
    onSuccess: () => {
      invalidate.afterCheckIn(queryClient)
      queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] })
      toast.success('Guest checked in successfully!')
    },
    onError: (error) => {
      toast.error('Check-in failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  // ─── Special Requests Builder ─────────────────────────────────

  const buildSpecialRequests = (): string => {
    const parts: string[] = []

    if (activeReservation?.specialRequests) {
      parts.push(activeReservation.specialRequests)
    }
    if (earlyCheckIn) {
      parts.push(`[EARLY CHECK-IN] Checked in before ${settings.defaultCheckIn}`)
    }
    if (checkOutTime !== settings.defaultCheckOut) {
      parts.push(`[CHECK-OUT OVERRIDE] Preferred check-out: ${checkOutTime}`)
    }
    if (roomPreference) {
      const label = ROOM_PREFERENCES.find((p) => p.value === roomPreference)?.label || roomPreference
      parts.push(`[PREFERENCE] Room: ${label}`)
    }
    if (pillowType) {
      const label = PILLOW_TYPES.find((p) => p.value === pillowType)?.label || pillowType
      parts.push(`[PREFERENCE] Pillow: ${label}`)
    }
    if (wakeupCall) {
      parts.push(`[SERVICE] Wake-up call requested at ${wakeupCall}`)
    }
    if (billingNotes) {
      parts.push(`[BILLING] ${billingNotes}`)
    }
    if (paymentMethod) {
      parts.push(`[PAYMENT] Method: ${paymentMethod}`)
    }
    if (depositAmount && parseFloat(depositAmount) > 0) {
      parts.push(`[DEPOSIT] ${formatCurrency(parseFloat(depositAmount))}`)
    }

    return parts.join(' | ')
  }

  // ─── Step Navigation ──────────────────────────────────────────

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0: return !!activeReservation
      case 1: return true // Guest verification is info-only
      case 2: return !!selectedRoomId
      case 3: return true // Preferences are optional
      case 4: return true // Billing is optional
      case 5: return keyCardIssued
      default: return false
    }
  }

  const handleNext = () => {
    if (currentStep === 5) {
      onComplete?.()
      return
    }

    // On step 4 → 5, execute check-in
    if (currentStep === 4 && activeReservation && selectedRoomId) {
      const requests = buildSpecialRequests()
      checkInMutation.mutate(
        {
          reservationId: activeReservation.id,
          roomId: selectedRoomId,
          specialRequests: requests,
        },
        {
          onSuccess: () => {
            // Find the selected room number for key card
            const room = availableRooms.find((r: RoomInfo) => r.id === selectedRoomId)
            const roomNumber = room?.number || activeReservation?.room?.number || ''
            const guestName = activeReservation.guest
              ? `${activeReservation.guest.firstName} ${activeReservation.guest.lastName}`
              : 'Guest'

            setKeyCardRoomNumber(roomNumber)
            setKeyCardGuestName(guestName)
            setKeyCardCheckOut(formatDate(activeReservation.checkOut))
            setKeyCardIssued(false)
            setKeyCardDialogOpen(true)
            setCurrentStep(5)
          },
        }
      )
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  // ─── Render: Step Indicator ────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="mb-4">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {STEP_LABELS.map((label, idx) => (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors',
                  idx < currentStep && 'border-green-500 bg-green-500 text-white',
                  idx === currentStep && 'border-primary bg-primary text-primary-foreground',
                  idx > currentStep && 'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {idx < currentStep ? <Check className="size-4" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium whitespace-nowrap',
                  idx === currentStep ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 min-w-[12px] max-w-[40px] transition-colors',
                  idx < currentStep ? 'bg-green-500' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  // ─── Render: Step 0 - Select Arrival ─────────────────────────

  const renderSelectArrival = () => {
    if (loadingArrivals) {
      return (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )
    }

    if (arrivals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UserCheck className="size-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No arrivals scheduled for today</p>
          <p className="text-xs mt-1">Check-in date: {formatDate(today)}</p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Search className="size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {arrivals.length} confirmed arrival{arrivals.length !== 1 ? 's' : ''} for today
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {arrivals.map((arrival) => {
            const isVip = arrival.guest?.vipLevel && arrival.guest.vipLevel !== 'none'
            const isUnassigned = !arrival.room
            const isSelected = arrival.id === selectedReservationId

            return (
              <button
                key={arrival.id}
                onClick={() => {
                  setSelectedReservationId(arrival.id)
                  // Pre-fill room if already assigned
                  if (arrival.room?.id) {
                    setSelectedRoomId(arrival.room.id)
                  }
                  setCurrentStep(1)
                }}
                className={cn(
                  'w-full text-left rounded-lg border p-3 sm:p-4 transition-all',
                  isSelected && 'ring-2 ring-primary',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                  isUnassigned && 'border-l-4 border-l-amber-400'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className={cn(
                      'text-xs font-bold',
                      isVip && arrival.guest?.vipLevel === 'platinum' && 'bg-purple-100 text-purple-700',
                      isVip && arrival.guest?.vipLevel === 'gold' && 'bg-amber-100 text-amber-700',
                      isVip && arrival.guest?.vipLevel === 'silver' && 'bg-gray-100 text-gray-700',
                      !isVip && 'bg-muted text-muted-foreground'
                    )}>
                      {arrival.guest
                        ? `${arrival.guest.firstName[0]}${arrival.guest.lastName[0]}`
                        : '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {arrival.guest
                          ? `${arrival.guest.firstName} ${arrival.guest.lastName}`
                          : 'Unknown Guest'}
                      </span>
                      {isVip && (
                        <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                          <Star className="size-2.5 fill-amber-500 text-amber-500" />
                          <Crown className="size-2.5" />
                          {arrival.guest?.vipLevel?.toUpperCase()}
                        </Badge>
                      )}
                      {isUnassigned && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-2.5 mr-0.5" />
                          No Room
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{arrival.confirmationNo}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <BedDouble className="size-3" />
                        {arrival.room
                          ? <>Room {arrival.room.number} (<RoomTypeBedBadge typeName={arrival.room.type.name} bedConfig={arrival.room.type.bedConfig} inline />)</>
                          : 'Room to be assigned'}
                      </span>
                      <span>·</span>
                      <span>{formatDate(arrival.checkIn)} → {formatDate(arrival.checkOut)}</span>
                    </div>
                    {arrival.specialRequests && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic truncate">
                        📋 {arrival.specialRequests}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Render: Step 1 - Guest Verification ───────────────────────

  const renderGuestVerification = () => {
    if (!activeReservation) return null

    const guest = activeReservation.guest

    return (
      <div className="space-y-4">
        {/* Guest Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="size-3.5" />
              Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Photo Placeholder */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Avatar className="size-20">
                  <AvatarFallback className={cn(
                    'text-lg font-bold',
                    guest?.vipLevel === 'platinum' && 'bg-purple-100 text-purple-700',
                    guest?.vipLevel === 'gold' && 'bg-amber-100 text-amber-700',
                    guest?.vipLevel === 'silver' && 'bg-gray-200 text-gray-600',
                    (!guest?.vipLevel || guest?.vipLevel === 'none') && 'bg-muted text-muted-foreground'
                  )}>
                    {guest
                      ? `${guest.firstName[0]}${guest.lastName[0]}`
                      : '?'}
                  </AvatarFallback>
                </Avatar>
                {guest?.vipLevel && guest.vipLevel !== 'none' && (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                    <Star className="size-2.5 fill-amber-500 text-amber-500" />
                    <Crown className="size-2.5" />
                    {guest.vipLevel.toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* Guest Details */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                  <p className="font-semibold">
                    {guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Nationality</p>
                  <p className="font-medium flex items-center gap-1">
                    {guest?.nationality ? (
                      <>
                        <Globe className="size-3" />
                        {guest.nationality}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not specified</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">ID Type / Number</p>
                  <p className="font-medium flex items-center gap-1">
                    <Shield className="size-3" />
                    {guest?.idType && guest?.idNumber
                      ? `${guest.idType.replace('_', ' ')}: ${guest.idNumber}`
                      : <span className="text-muted-foreground">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="size-3" />
                    {guest?.email || <span className="text-muted-foreground">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="size-3" />
                    {guest?.phone || <span className="text-muted-foreground">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Loyalty Tier</p>
                  <p className="font-medium flex items-center gap-1">
                    <BadgeCheck className="size-3" />
                    {guest?.loyaltyTier && guest.loyaltyTier !== 'none'
                      ? guest.loyaltyTier.charAt(0).toUpperCase() + guest.loyaltyTier.slice(1)
                      : <span className="text-muted-foreground">Standard</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total Stays</p>
                  <p className="font-semibold">{guest?.totalStays || 0} stay{(guest?.totalStays || 0) !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total Revenue</p>
                  <p className="font-semibold">{formatCurrency(guest?.totalRevenue || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="size-3.5" />
              Reservation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Confirmation #</p>
                <p className="font-mono font-semibold">{activeReservation.confirmationNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Check-in Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(activeReservation.checkIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Check-out Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(activeReservation.checkOut)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Room Type</p>
                <p className="font-medium flex items-center gap-1">
                  <BedDouble className="size-3" />
                  {activeReservation.room
                    ? <RoomTypeBedBadge typeName={activeReservation.room.type.name} bedConfig={activeReservation.room.type.bedConfig} typeCode={activeReservation.room.type.code} pax={activeReservation.adults + (activeReservation.children || 0)} />
                    : activeReservation.roomTypeId
                      ? getRoomTypeName(activeReservation.roomTypeId)
                      : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Rate per Night</p>
                <p className="font-semibold">{formatCurrency(activeReservation.roomRate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
                <p className="font-bold text-lg">{formatCurrency(activeReservation.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Source</p>
                <p className="font-medium capitalize">{activeReservation.source?.replace('_', ' ') || 'Direct'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Guests</p>
                <p className="font-medium">
                  {activeReservation.adults} adult{activeReservation.adults !== 1 ? 's' : ''}
                  {activeReservation.children > 0 && `, ${activeReservation.children} child${activeReservation.children !== 1 ? 'ren' : ''}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <StatusBadge status={activeReservation.status} />
              </div>
            </div>

            {activeReservation.specialRequests && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Special Requests</p>
                <p className="text-sm italic bg-muted/50 rounded-md p-2">{activeReservation.specialRequests}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render: Step 2 - Room Assignment ─────────────────────────

  const renderRoomAssignment = () => {
    return (
      <div className="space-y-4">
        {/* Warning if no room assigned */}
        {!selectedRoomId && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Room assignment is required
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You must assign a room before the guest can be checked in.
              </p>
            </div>
          </div>
        )}

        {/* Currently assigned room (if any) */}
        {activeReservation?.room && activeReservation.room.id === selectedRoomId && (
          <Card className="border-green-300 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <Check className="size-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1 flex-wrap">
                  Room {activeReservation.room.number} — <RoomTypeBedBadge typeName={activeReservation.room.type.name} bedConfig={activeReservation.room.type.bedConfig} inline />
                </p>
                <p className="text-xs text-muted-foreground">
                  Floor {activeReservation.room.floor}
                  {activeReservation.room.wing ? ` · ${activeReservation.room.wing} Wing` : ''}
                </p>
              </div>
              <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-300">
                Assigned
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Search filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms by number, type, floor, or wing..."
            value={roomSearchFilter}
            onChange={(e) => setRoomSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Room list grouped by floor */}
        {loadingRooms ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredAvailableRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BedDouble className="size-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No available rooms found</p>
            <p className="text-xs mt-1">
              {roomSearchFilter ? 'Try adjusting your search filter' : 'All rooms are currently occupied or out of service'}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4">
            {[...roomsByFloor.entries()].map(([floor, rooms]) => (
              <div key={floor}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Building className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Floor {floor}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({rooms.length} room{rooms.length !== 1 ? 's' : ''} available)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {rooms.map((room) => {
                    const isSelected = room.id === selectedRoomId
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-md',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          {isSelected ? <Check className="size-4" /> : <BedDouble className="size-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">Room {room.number}</p>
                          <RoomTypeBedBadge typeName={room.type.name} bedConfig={room.type.bedConfig} typeCode={room.type.code} className="mt-0.5" />
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              <Layers className="size-2.5 mr-0.5" />
                              {floor}
                            </Badge>
                            {room.wing && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {room.wing}
                              </Badge>
                            )}
                            <StatusBadge status={room.status} className="text-[9px]" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Step 3 - Preferences & Registration ──────────────

  const renderPreferencesAndRegistration = () => {
    return (
      <div className="space-y-6">
        {/* Guest Registration Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4" />
              Guest Registration
            </CardTitle>
            <CardDescription className="text-xs">
              Capture or update guest identification details as required by local regulations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* Header Row */}
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800/60">
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-[40px] whitespace-nowrap">SN</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-[70px] whitespace-nowrap">Title</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] whitespace-nowrap">
                      First Name
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[130px] whitespace-nowrap">Last Name</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] whitespace-nowrap">Nationality</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[160px] whitespace-nowrap">Email</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[160px] whitespace-nowrap">Address</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[130px] whitespace-nowrap">Contact No</th>
                  </tr>
                </thead>
                {/* Data Row */}
                <tbody>
                  <tr>
                    {/* SN */}
                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                      <span className="text-xs font-medium text-gray-500">1</span>
                    </td>
                    {/* Title dropdown */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <Select value={regTitle} onValueChange={setRegTitle}>
                        <SelectTrigger className="h-8 w-full border-gray-300 dark:border-gray-600 text-xs rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {TITLE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* First Name with search icon */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          placeholder="First name"
                          className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 pr-7 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                          title="Search guest"
                        >
                          <Search className="size-3" />
                        </button>
                      </div>
                    </td>
                    {/* Last Name */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <input
                        type="text"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Last name"
                        className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                      />
                    </td>
                    {/* Nationality dropdown */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <Select value={regNationality} onValueChange={setRegNationality}>
                        <SelectTrigger className="h-8 w-full border-gray-300 dark:border-gray-600 text-xs rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48 overflow-y-auto">
                          {NATIONALITIES.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Email */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Email address"
                        className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                      />
                    </td>
                    {/* Address */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <input
                        type="text"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        placeholder="Street address"
                        className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                      />
                    </td>
                    {/* Contact No */}
                    <td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
                      <input
                        type="text"
                        value={regContactNo}
                        onChange={(e) => setRegContactNo(e.target.value)}
                        placeholder="Phone number"
                        className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ID Verification Row */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3" />
              ID Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">ID Type</Label>
                <Select value={regIdType} onValueChange={setRegIdType}>
                  <SelectTrigger className="w-full h-8 border-gray-300 dark:border-gray-600 text-xs rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30">
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
                <Label className="text-xs">ID Number</Label>
                <input
                  type="text"
                  value={regIdNumber}
                  onChange={(e) => setRegIdNumber(e.target.value)}
                  placeholder="Enter ID or passport number"
                  className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">City</Label>
                <input
                  type="text"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  placeholder="City"
                  className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Country</Label>
                <input
                  type="text"
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                  placeholder="Country"
                  className="h-8 w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 text-xs bg-white dark:bg-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Stay Preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-3.5" />
              Stay Preferences
            </CardTitle>
            <CardDescription className="text-xs">
              Optional preferences to enhance the guest experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Early Check-in */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="early-checkin"
                  checked={earlyCheckIn}
                  onCheckedChange={(checked) => setEarlyCheckIn(checked === true)}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor="early-checkin" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Early Check-in
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Check-in before 2:00 PM — will be noted on the reservation
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Check-out Time */}
                <div className="grid gap-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="size-3" />
                    Check-out Time
                  </Label>
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

                {/* Pillow Type */}
                <div className="grid gap-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Pill className="size-3" />
                    Pillow Type
                  </Label>
                  <Select value={pillowType} onValueChange={setPillowType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pillow type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      {PILLOW_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room Preference */}
                <div className="grid gap-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Eye className="size-3" />
                    Room Preference
                  </Label>
                  <Select value={roomPreference} onValueChange={setRoomPreference}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select preference (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      {ROOM_PREFERENCES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Wake-up Call */}
                <div className="grid gap-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <AlarmClock className="size-3" />
                    Wake-up Call Time
                  </Label>
                  <Input
                    type="time"
                    value={wakeupCall}
                    onChange={(e) => setWakeupCall(e.target.value)}
                    placeholder="e.g. 07:00"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render: Step 4 - Billing Setup ────────────────────────────

  const renderBillingSetup = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="size-3.5" />
              Billing Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Set up the guest&apos;s deposit and payment method for the stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Amount summary */}
              <div className="rounded-lg bg-muted/50 p-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Room Rate</span>
                  <span className="font-medium">{formatCurrency(activeReservation?.roomRate || 0)}/night</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold">{formatCurrency(activeReservation?.totalAmount || 0)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Selected Room</span>
                  <span className="font-mono">
                    {selectedRoomId
                      ? (() => {
                          const room = availableRooms.find((r: RoomInfo) => r.id === selectedRoomId) || activeReservation?.room
                          return room ? `Room ${room.number}` : '—'
                        })()
                      : 'Not assigned'}
                  </span>
                </div>
              </div>

              {/* Deposit Amount */}
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Banknote className="size-3" />
                  Deposit Amount
                </Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter deposit amount (NPR)"
                  min={0}
                />
                <p className="text-[10px] text-muted-foreground">
                  Recommended: At least one night&apos;s rate ({formatCurrency(activeReservation?.roomRate || 0)})
                </p>
              </div>

              {/* Payment Method */}
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <CreditCard className="size-3" />
                  Payment Method
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Billing Notes */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Special Billing Notes</Label>
                <Textarea
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="Any special billing instructions or notes..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation summary */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-2.5">
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <Hotel className="size-3.5 text-primary" />
              Check-In Summary
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">
                  {activeReservation?.guest
                    ? `${activeReservation.guest.firstName} ${activeReservation.guest.lastName}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">
                  {selectedRoomId
                    ? (() => {
                        const room = availableRooms.find((r: RoomInfo) => r.id === selectedRoomId) || activeReservation?.room
                        return room ? `Room ${room.number}` : '—'
                      })()
                    : (
                      <span className="text-red-500 font-semibold">⚠ Not assigned</span>
                    )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{activeReservation ? formatDate(activeReservation.checkIn) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium">{activeReservation ? formatDate(activeReservation.checkOut) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium">{formatCurrency(activeReservation?.roomRate || 0)}/night</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span className="font-medium">
                  {depositAmount ? formatCurrency(parseFloat(depositAmount) || 0) : '—'}
                </span>
              </div>
            </div>
            {!selectedRoomId && (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  A room must be assigned before proceeding with check-in.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render: Step 5 - Key Card ──────────────────────────────────

  const renderKeyCardStep = () => {
    if (!keyCardIssued) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <KeyRound className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            Key card will be issued after confirming check-in.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please go back to step 4 to complete the check-in process.
          </p>
          <Button variant="outline" onClick={() => setCurrentStep(4)} className="mt-4">
            <ChevronLeft className="size-4 mr-1" />
            Go to Billing
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950 mb-4">
          <Check className="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-bold">Check-In Complete!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Guest has been checked in and key card has been issued.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Room {keyCardRoomNumber} · {keyCardGuestName}
        </p>
      </div>
    )
  }

  // ─── Render: Step Content ──────────────────────────────────────

  const renderStepContent = () => {
    if (loadingSpecific && reservationId && currentStep === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading reservation...</p>
        </div>
      )
    }

    switch (currentStep) {
      case 0: return renderSelectArrival()
      case 1: return renderGuestVerification()
      case 2: return renderRoomAssignment()
      case 3: return renderPreferencesAndRegistration()
      case 4: return renderBillingSetup()
      case 5: return renderKeyCardStep()
      default: return null
    }
  }

  // ─── Main Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Guest Check-In</h2>
          <p className="text-xs text-muted-foreground">
            {reservationId
              ? 'Process a check-in for the selected reservation'
              : `Step-by-step check-in for arrivals on ${formatDate(today)}`}
          </p>
        </div>
      </div>

      {renderStepIndicator()}

      {/* Step Content */}
      <Card>
        <CardContent className="p-2 md:p-4">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || checkInMutation.isPending}
          >
            <ChevronLeft className="size-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              !canGoNext() ||
              (currentStep === 2 && !selectedRoomId) ||
              checkInMutation.isPending
            }
          >
            {checkInMutation.isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Checking In...
              </>
            ) : currentStep === 5 ? (
              <>
                Done
                <Check className="size-4 ml-1" />
              </>
            ) : currentStep === 4 ? (
              <>
                Confirm & Check In
                <UserCheck className="size-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="size-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* ─── Key Card Dialog ─────────────────────────────────── */}
      <Dialog open={keyCardDialogOpen} onOpenChange={setKeyCardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" />
              Issue Key Card
            </DialogTitle>
            <DialogDescription>
              Issue a room key card for the checked-in guest.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            {/* Key Card Visual */}
            <div className="relative mx-auto w-full max-w-[280px] rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-white shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-medium tracking-wider opacity-70">MERIDIAN HOTEL</div>
                <KeyRound className="size-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold tracking-wide">{keyCardRoomNumber}</p>
                <p className="text-xs opacity-80">{keyCardGuestName}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[10px] opacity-60">
                <span>Check-out: {keyCardCheckOut}</span>
                <span className="font-mono">{keyCardRoomNumber}</span>
              </div>
            </div>

            {/* Guest details */}
            <div className="text-sm space-y-1 text-center">
              <p className="font-semibold">{keyCardGuestName}</p>
              <p className="text-muted-foreground">Room {keyCardRoomNumber}</p>
              <p className="text-muted-foreground">Check-out: {keyCardCheckOut}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKeyCardDialogOpen(false)}
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                setKeyCardIssued(true)
                setKeyCardDialogOpen(false)
                setCurrentStep(5)
                toast.success(`Key card issued for Room ${keyCardRoomNumber}`, {
                  description: 'Guest has been notified via welcome letter.',
                  icon: <Mail className="size-4" />,
                  duration: 5000,
                })
              }}
            >
              <KeyRound className="size-4 mr-1.5" />
              Issue Key Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
