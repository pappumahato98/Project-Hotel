'use client'

import { apiFetch } from '@/lib/api'
import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, BedDouble, Shield, CreditCard,
  Check, Loader2, Search, User, Mail, Phone, Building, CalendarDays,
  AlertCircle, BadgeCheck, KeyRound, ArrowRight, Plus, Trash2,
  PartyPopper, Star, Sparkles, DoorOpen,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/shared/status-badge'
import { StepIndicator, StepContent, StepNav, type StepConfig } from '@/components/shared/step-indicator'
import { formatDate, formatCurrency, nightsBetween, getTodayString } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore, useSettingsStore } from '@/lib/store'
import { RoomRatePostingDialog } from './RoomRatePostingDialog'

// ─── Constants ──────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'visa', label: 'Visa' },
]

const COUNTRIES = [
  'Nepal', 'India', 'China', 'USA', 'UK', 'Japan', 'South Korea',
  'Germany', 'France', 'Australia', 'Canada', 'Singapore', 'Malaysia',
  'Thailand', 'Sri Lanka', 'Bangladesh', 'Pakistan', 'UAE', 'Saudi Arabia',
  'Netherlands', 'Italy', 'Spain', 'Brazil', 'Russia', 'Other',
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
]

const STEPS: StepConfig[] = [
  { label: 'Reservation', description: 'Find or create', icon: FileText },
  { label: 'Room & Rate', description: 'Assign & price', icon: BedDouble },
  { label: 'Documents', description: 'ID verification', icon: Shield, optional: true },
  { label: 'Payment', description: 'Advance & confirm', icon: CreditCard },
]

// ─── Types ──────────────────────────────────────────────────────────────

interface CheckInWizardProps {
  onBack?: () => void
  onOpenRatePosting?: (reservationId: string) => void
  prefillReservationId?: string
}

interface ReservationData {
  id: string
  confirmationNo: string
  status: string
  reservationType: string | null
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  specialRequests: string | null
  source: string | null
  company: string | null
  guaranteed: boolean
  roomTypeId: string | null
  ratePlanId: string | null
  guest: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    nationality: string | null
    vipLevel: string
    idType: string | null
    idNumber: string | null
  } | null
  room: {
    id: string
    number: string
    floor: number
    wing: string | null
    status: string
    type: {
      id: string
      name: string
      code: string
      bedConfig: string
      areaSqFt: number | null
      view: string | null
      amenities: string | null
      baseOccupancy: number
      maxOccupancy: number
    }
  } | null
}

interface RoomData {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  type: {
    id: string
    name: string
    code: string
    bedConfig: string
    areaSqFt: number | null
    view: string | null
    amenities: string | null
    baseOccupancy: number
    maxOccupancy: number
  }
}

interface RatePlanData {
  id: string
  name: string
  code: string
  baseRate: number
  channel: string | null
}

interface GuestDocument {
  id: string
  docType: string
  docNumber: string
  issueCountry: string
  issueDate: string
  expiryDate: string
  placeOfIssue: string
}

interface CheckInResult {
  reservation: ReservationData
  message: string
}

// ─── Component ──────────────────────────────────────────────────────────

export function CheckInWizard({ onBack, onOpenRatePosting, prefillReservationId }: CheckInWizardProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const today = getTodayString()

  // ─── Step state ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1)

  // ─── Reservation lookup ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedReservationId, setSearchedReservationId] = useState<string | null>(null)
  const [confirmedReservationId, setConfirmedReservationId] = useState<string | null>(null)
  const [isDirectWalkIn, setIsDirectWalkIn] = useState(false)

  // ─── Walk-in fields ────────────────────────────────────────────
  const [walkInDate, setWalkInDate] = useState(today)
  const [walkInCheckOut, setWalkInCheckOut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [walkInAdults, setWalkInAdults] = useState(2)
  const [walkInChildren, setWalkInChildren] = useState(0)

  // ─── Walk-in guest fields ──────────────────────────────────────
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestNationality, setGuestNationality] = useState('')
  const [guestIdType, setGuestIdType] = useState('')
  const [guestIdNumber, setGuestIdNumber] = useState('')

  // ─── Room & Rate ───────────────────────────────────────────────
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [roomSearchFilter, setRoomSearchFilter] = useState('')
  const [selectedRatePlanId, setSelectedRatePlanId] = useState<string>('')
  const [roomRate, setRoomRate] = useState<number>(0)
  const [checkInDate, setCheckInDate] = useState(today)
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)

  // ─── Documents ────────────────────────────────────────────────
  const [collectDocuments, setCollectDocuments] = useState(false)
  const [documents, setDocuments] = useState<GuestDocument[]>([])
  const [editingDoc, setEditingDoc] = useState<Partial<GuestDocument>>({})

  // ─── Payment ───────────────────────────────────────────────────
  const [advanceAmount, setAdvanceAmount] = useState<string>('')
  const [advanceMethod, setAdvanceMethod] = useState<string>('')
  const [advanceReference, setAdvanceReference] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  // ─── Success ──────────────────────────────────────────────────
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [keyCardIssued, setKeyCardIssued] = useState(false)
  const [showRatePosting, setShowRatePosting] = useState(false)

  // ─── Data queries ────────────────────────────────────────────

  // Reservation prefilled or searched
  const activeReservationId = prefillReservationId || searchedReservationId
  const {
    data: reservationData,
    isLoading: reservationLoading,
    error: reservationError,
  } = useQuery({
    queryKey: ['reservation', activeReservationId],
    queryFn: async () => {
      if (!activeReservationId) return null
      const data = await apiFetch(`/api/reservations/${activeReservationId}`) as { reservation: ReservationData }
      return data.reservation
    },
    enabled: !!activeReservationId,
  })

  // Rooms list
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      return apiFetch('/api/rooms?status=vacant_clean,inspected') as Promise<{
        rooms: RoomData[]
        roomTypes: Array<{
          id: string; name: string; code: string; baseOccupancy: number
          maxOccupancy: number; bedConfig: string; areaSqFt: number | null
          view: string | null; amenities: string | null
          ratePlans: RatePlanData[]
        }>
      }>
    },
  })

  // Reservation search by confirmation number
  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useQuery({
    queryKey: ['reservation-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null
      const data = await apiFetch(`/api/reservations?search=${encodeURIComponent(searchQuery)}&status=confirmed,tentative`)
      return (data.reservations || []) as ReservationData[]
    },
    enabled: searchQuery.length >= 2,
  })

  // ─── Check-in mutation ────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return apiFetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as Promise<CheckInResult>
    },
    onSuccess: (data) => {
      setCheckInResult(data)
      setCurrentStep(5)
      toast.success('Guest checked in successfully!')
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['front-desk-dashboard'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Check-in failed')
    },
  })

  // ─── Derived values ────────────────────────────────────────────

  const nights = useMemo(() => nightsBetween(checkInDate, checkOutDate), [checkInDate, checkOutDate])
  const taxRate = settings?.taxRate ?? 13
  const serviceCharge = settings?.serviceCharge ?? 10
  const subtotal = roomRate * nights
  const taxAmount = subtotal * (taxRate / 100)
  const serviceChargeAmount = subtotal * (serviceCharge / 100)
  const grandTotal = subtotal + taxAmount + serviceChargeAmount
  const advanceNum = parseFloat(advanceAmount) || 0
  const balanceDue = grandTotal - advanceNum

  const selectedRoom = useMemo(() => {
    if (!roomsData || !selectedRoomId) return null
    return roomsData.rooms.find(r => r.id === selectedRoomId) || null
  }, [roomsData, selectedRoomId])

  const selectedRoomType = useMemo(() => {
    if (!roomsData || !selectedRoom) return null
    return roomsData.roomTypes.find(rt => rt.id === selectedRoom.type.id) || null
  }, [roomsData, selectedRoom])

  const ratePlans = useMemo(() => {
    if (!selectedRoomType) return []
    return selectedRoomType.ratePlans || []
  }, [selectedRoomType])

  const selectedRatePlan = useMemo(() => {
    return ratePlans.find(rp => rp.id === selectedRatePlanId) || null
  }, [ratePlans, selectedRatePlanId])

  const filteredRooms = useMemo(() => {
    if (!roomsData) return []
    const available = roomsData.rooms.filter(
      r => r.status === 'vacant_clean' || r.status === 'inspected'
    )
    if (!roomSearchFilter) return available
    const f = roomSearchFilter.toLowerCase()
    return available.filter(r =>
      r.number.toLowerCase().includes(f) ||
      r.type.name.toLowerCase().includes(f) ||
      r.type.code.toLowerCase().includes(f) ||
      String(r.floor).includes(f) ||
      (r.wing && r.wing.toLowerCase().includes(f))
    )
  }, [roomsData, roomSearchFilter])

  // ─── Handlers ─────────────────────────────────────────────────

  const handleUseReservation = useCallback(() => {
    if (reservationData) {
      setConfirmedReservationId(reservationData.id)
      // Auto-fill dates
      if (reservationData.checkIn) {
        setCheckInDate(reservationData.checkIn.split('T')[0])
      }
      if (reservationData.checkOut) {
        setCheckOutDate(reservationData.checkOut.split('T')[0])
      }
      setAdults(reservationData.adults || 2)
      setChildren(reservationData.children || 0)
      setRoomRate(reservationData.roomRate || 0)
      // Pre-select room if assigned
      if (reservationData.room) {
        setSelectedRoomId(reservationData.room.id)
      }
      if (reservationData.ratePlanId) {
        setSelectedRatePlanId(reservationData.ratePlanId)
      }
      toast.success('Reservation confirmed! Data auto-filled.')
      setCurrentStep(2)
    }
  }, [reservationData])

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId)
    const room = roomsData?.rooms.find(r => r.id === roomId)
    if (room) {
      setRoomRate(room.type.baseOccupancy ? room.type.baseOccupancy : 0)
      // Get the base rate from rate plans
      const rt = roomsData?.roomTypes.find(r => r.id === room.type.id)
      if (rt?.ratePlans && rt.ratePlans.length > 0) {
        setSelectedRatePlanId(rt.ratePlans[0].id)
        setRoomRate(rt.ratePlans[0].baseRate)
      }
    }
  }, [roomsData])

  const handleRatePlanChange = useCallback((rpId: string) => {
    setSelectedRatePlanId(rpId)
    const rp = ratePlans.find(r => r.id === rpId)
    if (rp) {
      setRoomRate(rp.baseRate)
    }
  }, [ratePlans])

  const handleAddDocument = useCallback(() => {
    if (!editingDoc.docType) {
      toast.error('Please select a document type')
      return
    }
    const newDoc: GuestDocument = {
      id: crypto.randomUUID(),
      docType: editingDoc.docType || '',
      docNumber: editingDoc.docNumber || '',
      issueCountry: editingDoc.issueCountry || '',
      issueDate: editingDoc.issueDate || '',
      expiryDate: editingDoc.expiryDate || '',
      placeOfIssue: editingDoc.placeOfIssue || '',
    }
    setDocuments(prev => [...prev, newDoc])
    setEditingDoc({})
  }, [editingDoc])

  const handleRemoveDocument = useCallback((docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }, [])

  const handleCompleteCheckIn = useCallback(() => {
    if (!selectedRoomId) {
      toast.error('Please select a room')
      return
    }
    if (!confirmChecked) {
      toast.error('Please confirm all details are correct')
      return
    }

    const payload: Record<string, unknown> = {
      source: confirmedReservationId ? 'reservation' : 'direct',
      roomId: selectedRoomId,
      roomTypeId: selectedRoom?.type.id,
      ratePlanId: selectedRatePlanId || undefined,
      adults,
      children,
      roomRate,
      advanceAmount: advanceNum > 0 ? advanceNum : undefined,
      advancePaymentMethod: advanceNum > 0 ? (advanceMethod || 'cash') : undefined,
      advanceReference: advanceNum > 0 ? advanceReference : undefined,
      documents: collectDocuments && documents.length > 0
        ? documents.map(d => ({
            docType: d.docType,
            docNumber: d.docNumber || undefined,
            issueCountry: d.issueCountry || undefined,
            issueDate: d.issueDate || undefined,
            expiryDate: d.expiryDate || undefined,
            placeOfIssue: d.placeOfIssue || undefined,
          }))
        : undefined,
      checkedInBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'System',
    }

    if (confirmedReservationId) {
      payload.reservationId = confirmedReservationId
    } else {
      // Direct walk-in
      payload.guest = {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail || undefined,
        phone: guestPhone || undefined,
        nationality: guestNationality || undefined,
        idType: guestIdType || undefined,
        idNumber: guestIdNumber || undefined,
      }
      payload.checkIn = checkInDate
      payload.checkOut = checkOutDate
    }

    checkInMutation.mutate(payload)
  }, [
    confirmedReservationId, selectedRoomId, selectedRoom, selectedRatePlanId,
    adults, children, roomRate, advanceNum, advanceMethod, advanceReference,
    collectDocuments, documents, user, guestFirstName, guestLastName,
    guestEmail, guestPhone, guestNationality, guestIdType, guestIdNumber,
    checkInDate, checkOutDate, confirmChecked, checkInMutation,
  ])

  const handleStepClick = useCallback((step: number) => {
    // Can only jump to completed steps or current
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      // Validate: need either confirmed reservation or direct walk-in
      if (!confirmedReservationId && !isDirectWalkIn) {
        toast.error('Please select a reservation or choose direct walk-in')
        return
      }
      if (isDirectWalkIn && (!guestFirstName || !guestLastName)) {
        toast.error('Please enter guest name for walk-in')
        return
      }
    }
    if (currentStep === 2) {
      if (!selectedRoomId) {
        toast.error('Please select a room')
        return
      }
      if (roomRate <= 0) {
        toast.error('Please set a valid room rate')
        return
      }
      // Auto-fill dates for direct walk-in if not set
      if (isDirectWalkIn && checkInDate === today) {
        // already default
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }, [currentStep, confirmedReservationId, isDirectWalkIn, guestFirstName, guestLastName, selectedRoomId, roomRate, checkInDate, today])

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      onBack?.()
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1))
    }
  }, [currentStep, onBack])

  const handleProceedRatePosting = useCallback(() => {
    if (checkInResult?.reservation?.id && onOpenRatePosting) {
      onOpenRatePosting(checkInResult.reservation.id)
    } else {
      setShowRatePosting(true)
    }
  }, [checkInResult, onOpenRatePosting])

  const handleQuickAdvance = useCallback((percent: number | 'none' | 'full') => {
    if (percent === 'none') {
      setAdvanceAmount('0')
    } else if (percent === 'full') {
      setAdvanceAmount(String(Math.round(grandTotal)))
    } else {
      setAdvanceAmount(String(Math.round(grandTotal * (percent / 100))))
    }
  }, [grandTotal])

  // ─── Amenities display helper ────────────────────────────────
  const parseAmenities = (amenities: string | null) => {
    if (!amenities) return []
    try { return JSON.parse(amenities) } catch { return [] }
  }

  // ─── Format document type label ───────────────────────────────
  const formatDocType = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type
  }

  // ─── Step 1: Reservation Details ──────────────────────────────
  const renderStep1 = () => (
    <StepContent title="Reservation Details" description="Search for an existing reservation or process a direct walk-in" icon={FileText}>
      {prefillReservationId ? (
        // Prefilled reservation mode
        <>
          {reservationLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {reservationError && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Reservation Not Found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The reservation could not be found. Please search or use direct walk-in.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSearchedReservationId(null)
                    setIsDirectWalkIn(true)
                  }}
                >
                  Use Direct Walk-in Instead
                </Button>
              </CardContent>
            </Card>
          )}
          {reservationData && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <BadgeCheck className="w-3 h-3 mr-1" />
                  Reservation Found
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Data will be auto-filled in subsequent steps.
              </p>
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Reservation No.</span>
                    <p className="text-sm font-semibold">{reservationData.confirmationNo}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <StatusBadge status={reservationData.status} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <p className="text-sm">{reservationData.reservationType || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Guest Name</span>
                    <p className="text-sm font-medium">
                      {reservationData.guest
                        ? `${reservationData.guest.firstName} ${reservationData.guest.lastName}`
                        : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {reservationData.guest?.email || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {reservationData.guest?.phone || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Check-in</span>
                    <p className="text-sm flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      {formatDate(reservationData.checkIn)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Check-out</span>
                    <p className="text-sm flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      {formatDate(reservationData.checkOut)}
                    </p>
                  </div>
                  {reservationData.room && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Room</span>
                      <p className="text-sm">
                        {reservationData.room.number} — {reservationData.room.type.name}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Source</span>
                    <p className="text-sm">{reservationData.source || '—'}</p>
                  </div>
                  {reservationData.company && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Company</span>
                      <p className="text-sm flex items-center gap-1">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        {reservationData.company}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
              <Button onClick={handleUseReservation} className="w-full sm:w-auto">
                <Check className="w-4 h-4 mr-2" />
                Use This Reservation
              </Button>
            </>
          )}
        </>
      ) : confirmedReservationId ? (
        // Already confirmed
        <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Reservation Confirmed
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Data has been auto-filled. Proceed to next steps.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        // Search mode
        <>
          {!isDirectWalkIn ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by confirmation number, guest name, or room..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {searchLoading && (
                <div className="flex items-center gap-2 py-3 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map(res => (
                    <Card
                      key={res.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSearchedReservationId(res.id)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{res.confirmationNo}</span>
                            <StatusBadge status={res.status} />
                          </div>
                          <p className="text-xs">
                            {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Guest unknown'}
                            {res.room && ` — Room ${res.room.number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(res.checkIn)} → {formatDate(res.checkOut)} · {formatCurrency(res.roomRate)}/night
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {searchResults && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reservations found matching &quot;{searchQuery}&quot;
                </p>
              )}

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsDirectWalkIn(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Direct Walk-in (No Reservation)
              </Button>
            </div>
          ) : (
            // Direct walk-in form
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  <User className="w-3 h-3 mr-1" />
                  Direct Walk-in
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDirectWalkIn(false)
                    setSearchQuery('')
                  }}
                >
                  ← Search Reservation Instead
                </Button>
              </div>

              <Card className="p-4">
                <CardTitle className="text-sm mb-3">Guest Information</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      value={guestFirstName}
                      onChange={e => setGuestFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      value={guestLastName}
                      onChange={e => setGuestLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="guest@email.com"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      placeholder="+977-98XXXXXXXX"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nationality</Label>
                    <Select value={guestNationality} onValueChange={setGuestNationality}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <CardTitle className="text-sm mb-3">Stay Details</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Check-in Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 text-sm w-full justify-start font-normal">
                          <CalendarDays className="mr-2 h-3.5 w-3.5" />
                          {formatDate(walkInDate)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(walkInDate)}
                          onSelect={d => d && setWalkInDate(d.toISOString().split('T')[0])}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expected Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 text-sm w-full justify-start font-normal">
                          <CalendarDays className="mr-2 h-3.5 w-3.5" />
                          {formatDate(walkInCheckOut)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(walkInCheckOut)}
                          onSelect={d => d && setWalkInCheckOut(d.toISOString().split('T')[0])}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adults</Label>
                    <Select value={String(walkInAdults)} onValueChange={v => { setWalkInAdults(Number(v)); setAdults(Number(v)) }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Children</Label>
                    <Select value={String(walkInChildren)} onValueChange={v => { setWalkInChildren(Number(v)); setChildren(Number(v)) }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className="text-xs">
                    Source: Walk-in
                  </Badge>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </StepContent>
  )

  // ─── Step 2: Room & Rate ──────────────────────────────────────
  const renderStep2 = () => (
    <StepContent title="Room & Rate" description="Select a room and set the rate plan" icon={BedDouble}>
      {/* Room Selection */}
      <Card className="p-4">
        <CardTitle className="text-sm mb-3">Room Selection</CardTitle>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms by number, type, floor, or wing..."
            value={roomSearchFilter}
            onChange={e => setRoomSearchFilter(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1.5">
          {filteredRooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No available rooms found</p>
          )}
          {filteredRooms.map(room => (
            <button
              key={room.id}
              type="button"
              onClick={() => handleSelectRoom(room.id)}
              className={cn(
                'w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all',
                selectedRoomId === room.id
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold',
                    room.status === 'vacant_clean'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  )}
                >
                  {room.number}
                </div>
                <div>
                  <p className="text-sm font-medium">{room.type.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Floor {room.floor} {room.wing ? `· ${room.wing} Wing` : ''}
                  </p>
                </div>
              </div>
              <StatusBadge status={room.status} />
            </button>
          ))}
        </div>
      </Card>

      {/* Room Details Card */}
      {selectedRoom && (
        <Card className="p-4">
          <CardTitle className="text-sm mb-3">Room Details</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Room Number</span>
              <p className="text-sm font-semibold">{selectedRoom.number}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Type</span>
              <p className="text-sm">{selectedRoom.type.name}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Bed Config</span>
              <p className="text-sm">{selectedRoom.type.bedConfig}</p>
            </div>
            {selectedRoom.type.areaSqFt && (
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">Area</span>
                <p className="text-sm">{Math.round(selectedRoom.type.areaSqFt)} sq ft</p>
              </div>
            )}
            {selectedRoom.type.view && (
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">View</span>
                <p className="text-sm">{selectedRoom.type.view}</p>
              </div>
            )}
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusBadge status={selectedRoom.status} />
            </div>
          </div>
          {selectedRoom.type.amenities && parseAmenities(selectedRoom.type.amenities).length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">Amenities</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {parseAmenities(selectedRoom.type.amenities).map((a: string) => (
                  <Badge key={a} variant="secondary" className="text-[10px] px-2 py-0.5">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Rate Selection */}
      {selectedRoom && (
        <Card className="p-4">
          <CardTitle className="text-sm mb-3">Rate Selection</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Rate Plan</Label>
              <Select value={selectedRatePlanId} onValueChange={handleRatePlanChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select rate plan" />
                </SelectTrigger>
                <SelectContent>
                  {ratePlans.map(rp => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.name} — {formatCurrency(rp.baseRate)}/night
                    </SelectItem>
                  ))}
                  {ratePlans.length === 0 && (
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Room Rate (NPR/night)</Label>
              <Input
                type="number"
                value={roomRate || ''}
                onChange={e => setRoomRate(parseFloat(e.target.value) || 0)}
                placeholder="Enter room rate"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 text-sm w-full justify-start font-normal">
                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                    {formatDate(checkInDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(checkInDate)}
                    onSelect={d => d && setCheckInDate(d.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 text-sm w-full justify-start font-normal">
                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                    {formatDate(checkOutDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(checkOutDate)}
                    onSelect={d => d && setCheckOutDate(d.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Nights:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{nights}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">Room Total:</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
        </Card>
      )}

      {/* Occupancy */}
      {selectedRoom && (
        <Card className="p-4">
          <CardTitle className="text-sm mb-3">Occupancy</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Adults</Label>
              <Select value={String(adults)} onValueChange={v => setAdults(Number(v))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Children</Label>
              <Select value={String(children)} onValueChange={v => setChildren(Number(v))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
    </StepContent>
  )

  // ─── Step 3: Guest Documents ─────────────────────────────────
  const renderStep3 = () => {
    const resGuest = confirmedReservationId && reservationData?.guest ? reservationData.guest : null
    const walkInGuest = isDirectWalkIn && guestFirstName ? {
      firstName: guestFirstName,
      lastName: guestLastName,
      nationality: guestNationality || null,
      idType: guestIdType || null,
      idNumber: guestIdNumber || null,
    } : null
    const displayGuest = resGuest || walkInGuest

    return (
      <StepContent title="Guest Documents" description="Collect guest identification documents" icon={Shield}>
        <Card className="p-3 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <p className="text-xs text-muted-foreground">
            Document collection is optional and can be completed later if needed.
          </p>
        </Card>

        <div className="flex items-center gap-2">
          <Checkbox
            id="collect-docs"
            checked={collectDocuments}
            onCheckedChange={v => setCollectDocuments(!!v)}
          />
          <Label htmlFor="collect-docs" className="text-sm cursor-pointer">
            Collect documents now
          </Label>
        </div>

        {/* Guest Info Preview */}
        {displayGuest && (
          <Card className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Guest Information (from reservation)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{displayGuest.firstName} {displayGuest.lastName}</p>
              </div>
              {displayGuest.nationality && (
                <div>
                  <span className="text-muted-foreground">Nationality</span>
                  <p className="font-medium">{displayGuest.nationality}</p>
                </div>
              )}
              {displayGuest.idType && (
                <div>
                  <span className="text-muted-foreground">ID Type</span>
                  <p className="font-medium capitalize">{displayGuest.idType.replace('_', ' ')}</p>
                </div>
              )}
              {displayGuest.idNumber && (
                <div>
                  <span className="text-muted-foreground">ID Number</span>
                  <p className="font-medium">{displayGuest.idNumber}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {collectDocuments && (
          <>
            {/* Document Entry Form */}
            <Card className="p-4">
              <CardTitle className="text-sm mb-3">Add Document</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Document Type *</Label>
                  <Select
                    value={editingDoc.docType || ''}
                    onValueChange={v => setEditingDoc(prev => ({ ...prev, docType: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document Number</Label>
                  <Input
                    value={editingDoc.docNumber || ''}
                    onChange={e => setEditingDoc(prev => ({ ...prev, docNumber: e.target.value }))}
                    placeholder="Enter document number"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Issue Country</Label>
                  <Select
                    value={editingDoc.issueCountry || ''}
                    onValueChange={v => setEditingDoc(prev => ({ ...prev, issueCountry: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Place of Issue</Label>
                  <Input
                    value={editingDoc.placeOfIssue || ''}
                    onChange={e => setEditingDoc(prev => ({ ...prev, placeOfIssue: e.target.value }))}
                    placeholder="City or authority"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Issue Date</Label>
                  <Input
                    type="date"
                    value={editingDoc.issueDate || ''}
                    onChange={e => setEditingDoc(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={editingDoc.expiryDate || ''}
                    onChange={e => setEditingDoc(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleAddDocument}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Document
              </Button>
            </Card>

            {/* Documents List */}
            {documents.length > 0 && (
              <Card className="p-4">
                <CardTitle className="text-sm mb-3">
                  Added Documents ({documents.length})
                </CardTitle>
                <div className="space-y-2">
                  {documents.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs shrink-0">
                          #{idx + 1}
                        </Badge>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium">{formatDocType(doc.docType)}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            {doc.docNumber && <span>{doc.docNumber}</span>}
                            {doc.issueCountry && <span>{doc.issueCountry}</span>}
                            {doc.expiryDate && <span>Exp: {formatDate(doc.expiryDate)}</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleRemoveDocument(doc.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </StepContent>
    )
  }

  // ─── Step 4: Advance Payment ─────────────────────────────────
  const renderStep4 = () => (
    <StepContent title="Advance Payment" description="Review charges and process advance payment" icon={CreditCard}>
      {/* Payment Summary */}
      <Card className="p-4">
        <CardTitle className="text-sm mb-3">Payment Summary</CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Room: {selectedRoom?.number || '—'} — {selectedRoom?.type.name || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Check-in: {formatDate(checkInDate)} | Check-out: {formatDate(checkOutDate)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Nights: {nights} | Rate: {formatCurrency(roomRate)}/night
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <span>{formatCurrency(Math.round(taxAmount))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Charge ({serviceCharge}%)</span>
            <span>{formatCurrency(Math.round(serviceChargeAmount))}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Grand Total</span>
            <span className="text-primary">{formatCurrency(Math.round(grandTotal))}</span>
          </div>
        </div>
      </Card>

      {/* Advance Amount */}
      <Card className="p-4">
        <CardTitle className="text-sm mb-3">Advance Payment Amount</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Amount (NPR)</Label>
            <Input
              type="number"
              value={advanceAmount}
              onChange={e => setAdvanceAmount(e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method</Label>
            <Select value={advanceMethod} onValueChange={setAdvanceMethod}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(pm => (
                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('none')}>
              No Advance
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance(25)}>
              25%
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance(50)}>
              50%
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('full')}>
              Full Payment
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs">Reference Number</Label>
          <Input
            value={advanceReference}
            onChange={e => setAdvanceReference(e.target.value)}
            placeholder="Optional reference"
            className="h-8 text-sm"
          />
        </div>
      </Card>

      {/* Balance Display */}
      <Card className={cn(
        'p-4',
        balanceDue > 0
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
      )}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {advanceNum > 0 ? `Paid: ${formatCurrency(advanceNum)}` : 'No advance payment'}
          </span>
          <span className={cn(
            'text-sm font-semibold',
            balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          )}>
            Balance Due: {formatCurrency(Math.round(balanceDue))}
          </span>
        </div>
      </Card>

      {/* Confirmation */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="confirm-details"
          checked={confirmChecked}
          onCheckedChange={v => setConfirmChecked(!!v)}
        />
        <Label htmlFor="confirm-details" className="text-sm cursor-pointer">
          I confirm all details are correct
        </Label>
      </div>
    </StepContent>
  )

  // ─── Step 5: Success Screen ──────────────────────────────────
  const renderSuccess = () => (
    <div className="flex flex-col items-center py-6 sm:py-10 px-4">
      {/* Decorative confetti elements */}
      <div className="relative mb-8">
        {/* Background glow */}
        <div className="absolute inset-0 -m-6 rounded-full bg-emerald-500/10 blur-2xl" />

        {/* Animated checkmark circle */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/60 dark:to-emerald-950/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-inner">
            <Check className="w-9 h-9 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Floating decorative icons */}
        <div className="absolute -top-3 -left-4 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '2s' }}>
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shadow-sm">
            <Star className="w-4 h-4 text-amber-500" fill="currentColor" />
          </div>
        </div>
        <div className="absolute -top-2 -right-3 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '2.5s' }}>
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
        </div>
        <div className="absolute -bottom-2 -left-5 animate-bounce" style={{ animationDelay: '600ms', animationDuration: '2.2s' }}>
          <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center shadow-sm">
            <PartyPopper className="w-3.5 h-3.5 text-sky-500" />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-4 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.8s' }}>
          <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
        Check-In Successful!
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
        The guest has been successfully checked in. Please issue the room key card below.
      </p>

      {/* Room Key Card Section */}
      <div className={cn(
        'w-full max-w-md rounded-2xl p-5 mb-6 border-2 transition-all',
        keyCardIssued
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background'
          : 'border-dashed border-amber-300 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/20 dark:to-background'
      )}>
        {/* Key card visual */}
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            keyCardIssued
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25'
              : 'bg-amber-500/10'
          )}>
            {keyCardIssued ? (
              <DoorOpen className="w-7 h-7 text-white" />
            ) : (
              <KeyRound className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-bold transition-colors',
              keyCardIssued ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}>
              {keyCardIssued ? 'Key Card Issued ✓' : 'Room Key Card'}
            </p>
            {checkInResult?.reservation?.room && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Room {checkInResult.reservation.room.number} · {checkInResult.reservation.room.type.name}
              </p>
            )}
          </div>
        </div>

        {/* Guest & reservation details */}
        <div className="space-y-2.5 bg-background/60 dark:bg-background/30 rounded-xl p-3.5">
          {checkInResult?.reservation?.guest && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Guest</p>
                <p className="text-sm font-semibold truncate">
                  {checkInResult.reservation.guest.firstName} {checkInResult.reservation.guest.lastName}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Confirmation No.</p>
              <p className="text-sm font-semibold font-mono">
                {checkInResult?.reservation?.confirmationNo}
              </p>
            </div>
          </div>
        </div>

        {/* Key card checkbox */}
        <div className="mt-4 flex items-center gap-2.5">
          <Checkbox
            id="key-card"
            checked={keyCardIssued}
            onCheckedChange={v => setKeyCardIssued(!!v)}
            className={cn(
              'transition-colors',
              keyCardIssued && 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500'
            )}
          />
          <Label htmlFor="key-card" className="text-sm cursor-pointer flex items-center gap-1.5 select-none">
            <KeyRound className="w-3.5 h-3.5" />
            I have issued the room key card
          </Label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <Button
          className="flex-1 h-11 text-sm font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          onClick={handleProceedRatePosting}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Proceed to Room Rate Posting
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 text-sm font-medium"
          onClick={onBack}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Back to Front Desk
        </Button>
      </div>
    </div>
  )

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Step Indicator */}
      <div className="shrink-0 border-b bg-card">
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderSuccess()}
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      {currentStep < 5 && (
        <StepNav
          currentStep={currentStep}
          totalSteps={4}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleCompleteCheckIn}
          submitLabel="Complete Check-In"
          isSubmitting={checkInMutation.isPending}
          submitDisabled={!confirmChecked || checkInMutation.isPending}
        />
      )}

      {/* Room Rate Posting Dialog */}
      {showRatePosting && checkInResult?.reservation && (
        <RoomRatePostingDialog
          open={showRatePosting}
          onOpenChange={setShowRatePosting}
          reservationId={checkInResult.reservation.id}
          roomNumber={checkInResult.reservation.room?.number || ''}
          roomTypeName={checkInResult.reservation.room?.type.name || ''}
          roomRate={checkInResult.reservation.roomRate || 0}
          checkIn={checkInResult.reservation.checkIn}
          checkOut={checkInResult.reservation.checkOut}
          reservationConfirmationNo={checkInResult.reservation.confirmationNo}
        />
      )}
    </div>
  )
}