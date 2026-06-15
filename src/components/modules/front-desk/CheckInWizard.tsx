'use client'

import { apiFetch } from '@/lib/api'
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, BedDouble, Shield, CreditCard,
  Check, Loader2, Search, User, Mail, Phone, Building, CalendarDays,
  AlertCircle, BadgeCheck, KeyRound, ArrowRight, Plus, Trash2,
  ArrowLeft, ChevronDown, ChevronUp, Minus, Users, Clock,
  Wallet, Building2, Eye, EyeOff, Info, Star, Crown,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/shared/status-badge'
import { StepIndicator, StepContent, StepNav, type StepConfig } from '@/components/shared/step-indicator'
import { formatDate, formatCurrency, nightsBetween, getTodayString, formatDateShort } from '@/lib/format'
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
  { label: 'Payment', description: 'Review & confirm', icon: CreditCard },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  const mainContentRef = useRef<HTMLDivElement>(null)

  // ─── Step state ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1)
  const [expressMode, setExpressMode] = useState(false)

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
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('')
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('')
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
  const [collectAdvance, setCollectAdvance] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState<string>('')
  const [advanceMethod, setAdvanceMethod] = useState<string>('')
  const [advanceReference, setAdvanceReference] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  // ─── Success ──────────────────────────────────────────────────
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [keyCardIssued, setKeyCardIssued] = useState(false)
  const [showRatePosting, setShowRatePosting] = useState(false)

  // ─── Data queries ────────────────────────────────────────────

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

  // Today's expected arrivals
  const {
    data: arrivalsData,
    isLoading: arrivalsLoading,
  } = useQuery({
    queryKey: ['arrivals', today],
    queryFn: async () => {
      const data = await apiFetch(`/api/reservations?date=${today}&status=confirmed`) as { reservations: ReservationData[]; total: number }
      return data.reservations || []
    },
    enabled: !isDirectWalkIn && !prefillReservationId,
  })

  // Reservation search
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
  const serviceChargeRate = settings?.serviceCharge ?? 10
  const subtotal = roomRate * nights
  const taxAmount = subtotal * (taxRate / 100)
  const serviceChargeAmount = subtotal * (serviceChargeRate / 100)
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

  // Filtered rooms with type and floor filters
  const filteredRooms = useMemo(() => {
    if (!roomsData) return []
    let available = roomsData.rooms.filter(
      r => r.status === 'vacant_clean' || r.status === 'inspected'
    )
    if (roomTypeFilter) {
      available = available.filter(r => r.type.id === roomTypeFilter)
    }
    if (roomFloorFilter) {
      available = available.filter(r => String(r.floor) === roomFloorFilter)
    }
    if (!roomSearchFilter) return available
    const f = roomSearchFilter.toLowerCase()
    return available.filter(r =>
      r.number.toLowerCase().includes(f) ||
      r.type.name.toLowerCase().includes(f) ||
      r.type.code.toLowerCase().includes(f) ||
      (r.wing && r.wing.toLowerCase().includes(f))
    )
  }, [roomsData, roomSearchFilter, roomTypeFilter, roomFloorFilter])

  // Unique floors for filter
  const uniqueFloors = useMemo(() => {
    if (!roomsData) return []
    const floors = new Set(roomsData.rooms.map(r => r.floor))
    return Array.from(floors).sort((a, b) => a - b)
  }, [roomsData])

  // Occupancy check
  const totalOccupancy = adults + children
  const maxOccupancy = selectedRoom?.type.maxOccupancy || 0
  const occupancyExceeded = maxOccupancy > 0 && totalOccupancy > maxOccupancy

  // Nights display string
  const nightsDisplay = useMemo(() => {
    const ci = new Date(checkInDate)
    const co = new Date(checkOutDate)
    const ciDay = DAY_NAMES[ci.getDay()]
    const coDay = DAY_NAMES[co.getDay()]
    return `${nights} night${nights > 1 ? 's' : ''} (${ciDay} ${formatDateShort(checkInDate)} → ${coDay} ${formatDateShort(checkOutDate)})`
  }, [checkInDate, checkOutDate, nights])

  // ─── Sidebar data ──────────────────────────────────────────────
  const sidebarGuestName = useMemo(() => {
    if (reservationData?.guest) {
      return `${reservationData.guest.firstName} ${reservationData.guest.lastName}`
    }
    if (isDirectWalkIn && (guestFirstName || guestLastName)) {
      return `${guestFirstName} ${guestLastName}`.trim()
    }
    return null
  }, [reservationData, isDirectWalkIn, guestFirstName, guestLastName])

  const sidebarVipLevel = useMemo(() => {
    return reservationData?.guest?.vipLevel || null
  }, [reservationData])

  const sidebarGuestContact = useMemo(() => {
    if (reservationData?.guest) {
      return {
        email: reservationData.guest.email,
        phone: reservationData.guest.phone,
      }
    }
    if (isDirectWalkIn) {
      return { email: guestEmail || null, phone: guestPhone || null }
    }
    return { email: null, phone: null }
  }, [reservationData, isDirectWalkIn, guestEmail, guestPhone])

  // ─── Handlers ─────────────────────────────────────────────────

  const handleUseReservation = useCallback(() => {
    if (reservationData) {
      setConfirmedReservationId(reservationData.id)
      if (reservationData.checkIn) {
        setCheckInDate(reservationData.checkIn.split('T')[0])
      }
      if (reservationData.checkOut) {
        setCheckOutDate(reservationData.checkOut.split('T')[0])
      }
      setAdults(reservationData.adults || 2)
      setChildren(reservationData.children || 0)
      setRoomRate(reservationData.roomRate || 0)
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
      const rt = roomsData?.roomTypes.find(r => r.id === room.type.id)
      if (rt?.ratePlans && rt.ratePlans.length > 0) {
        setSelectedRatePlanId(rt.ratePlans[0].id)
        setRoomRate(rt.ratePlans[0].baseRate)
      } else {
        setRoomRate(0)
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
      advanceAmount: collectAdvance && advanceNum > 0 ? advanceNum : undefined,
      advanceMethod: collectAdvance && advanceNum > 0 ? (advanceMethod || 'cash') : undefined,
      advanceReference: collectAdvance && advanceNum > 0 ? advanceReference : undefined,
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
    adults, children, roomRate, collectAdvance, advanceNum, advanceMethod, advanceReference,
    collectDocuments, documents, user, guestFirstName, guestLastName,
    guestEmail, guestPhone, guestNationality, guestIdType, guestIdNumber,
    checkInDate, checkOutDate, confirmChecked, checkInMutation,
  ])

  const handleStepClick = useCallback((step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
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
    }
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }, [currentStep, confirmedReservationId, isDirectWalkIn, guestFirstName, guestLastName, selectedRoomId, roomRate])

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

  const handleQuickAdvance = useCallback((value: number | string) => {
    if (value === 'none') {
      setAdvanceAmount('0')
    } else if (value === 'full') {
      setAdvanceAmount(String(Math.round(grandTotal)))
    } else if (value === '1night') {
      setAdvanceAmount(String(Math.round(roomRate)))
    } else {
      setAdvanceAmount(String(Math.round(grandTotal * (Number(value) / 100))))
    }
  }, [grandTotal, roomRate])

  // ─── Helpers ────────────────────────────────────────────────
  const parseAmenities = (amenities: string | null) => {
    if (!amenities) return []
    try { return JSON.parse(amenities) } catch { return [] }
  }

  const formatDocType = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type
  }

  const sourceLabel = (source: string | null) => {
    switch (source) {
      case 'walk_in': return 'Walk-in'
      case 'online': return 'Online'
      case 'phone': return 'Phone'
      case 'travel_agent': return 'Travel Agent'
      case 'corporate': return 'Corporate'
      default: return source || 'Direct'
    }
  }

  // ─── Sidebar Component ────────────────────────────────────────

  const renderSidebar = () => (
    <aside className="w-full lg:w-[340px] xl:w-[380px] shrink-0 space-y-3 lg:sticky lg:top-0 lg:self-start">
      {/* Guest Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Guest</p>
        </div>
        <CardContent className="p-4 space-y-3">
          {sidebarGuestName ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{sidebarGuestName}</p>
                  {sidebarVipLevel && sidebarVipLevel !== 'none' && (
                    <Badge className="mt-0.5 h-4 text-[9px] px-1.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                      <Crown className="w-2.5 h-2.5 mr-0.5" />
                      VIP
                    </Badge>
                  )}
                </div>
              </div>
              {(sidebarGuestContact.email || sidebarGuestContact.phone) && (
                <div className="space-y-1">
                  {sidebarGuestContact.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{sidebarGuestContact.email}</span>
                    </p>
                  )}
                  {sidebarGuestContact.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      <span>{sidebarGuestContact.phone}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No guest selected yet</p>
          )}
        </CardContent>
      </Card>

      {/* Room Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Room</p>
        </div>
        <CardContent className="p-4 space-y-2">
          {selectedRoom ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-white">{selectedRoom.number}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{selectedRoom.type.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Floor {selectedRoom.floor}{selectedRoom.wing ? ` · ${selectedRoom.wing} Wing` : ''} · {selectedRoom.type.bedConfig}
                  </p>
                </div>
              </div>
              <StatusBadge status={selectedRoom.status} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No room assigned yet</p>
          )}
        </CardContent>
      </Card>

      {/* Stay Info */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Stay</p>
        </div>
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Check-in</span>
            <span className="font-medium">{formatDate(checkInDate)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Check-out</span>
            <span className="font-medium">{formatDate(checkOutDate)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nights</span>
            <Badge variant="secondary" className="h-5 text-[10px] font-semibold">{nights}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Rate/night</span>
            <span className="font-semibold tabular-nums">{formatCurrency(roomRate)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 dark:from-emerald-800 dark:to-emerald-900 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Cost Summary</p>
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Room ({nights}n × {formatCurrency(roomRate)})</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <span className="tabular-nums">{formatCurrency(Math.round(taxAmount))}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Service ({serviceChargeRate}%)</span>
            <span className="tabular-nums">{formatCurrency(Math.round(serviceChargeAmount))}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Total</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(Math.round(grandTotal))}
            </span>
          </div>
          {collectAdvance && advanceNum > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance Paid</span>
                <span className="tabular-nums text-teal-600 dark:text-teal-400 font-medium">-{formatCurrency(Math.round(advanceNum))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Balance Due</span>
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {formatCurrency(Math.round(balanceDue))}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </aside>
  )

  // ─── Step 1: Reservation Details ──────────────────────────────
  const renderStep1 = () => (
    <StepContent title="Reservation Details" description="Search for an existing reservation or process a direct walk-in" icon={FileText}>
      {prefillReservationId ? (
        /* Prefilled reservation mode */
        <>
          {reservationLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {reservationError && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Reservation Not Found</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <SidebarInfoItem label="Reservation No." value={reservationData.confirmationNo} />
                  <SidebarInfoItem label="Status">
                    <StatusBadge status={reservationData.status} />
                  </SidebarInfoItem>
                  <SidebarInfoItem label="Type" value={reservationData.reservationType || '—'} />
                  <SidebarInfoItem label="Guest Name" value={reservationData.guest ? `${reservationData.guest.firstName} ${reservationData.guest.lastName}` : '—'} />
                  <SidebarInfoItem label="Email" value={reservationData.guest?.email || '—'} icon={<Mail className="w-3 h-3" />} />
                  <SidebarInfoItem label="Phone" value={reservationData.guest?.phone || '—'} icon={<Phone className="w-3 h-3" />} />
                  <SidebarInfoItem label="Check-in" value={formatDate(reservationData.checkIn)} icon={<CalendarDays className="w-3 h-3" />} />
                  <SidebarInfoItem label="Check-out" value={formatDate(reservationData.checkOut)} icon={<CalendarDays className="w-3 h-3" />} />
                  {reservationData.room && (
                    <SidebarInfoItem label="Room" value={`${reservationData.room.number} — ${reservationData.room.type.name}`} />
                  )}
                  <SidebarInfoItem label="Source" value={sourceLabel(reservationData.source)} />
                  {reservationData.company && (
                    <SidebarInfoItem label="Company" value={reservationData.company} icon={<Building className="w-3 h-3" />} />
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
        /* Already confirmed */
        <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
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
        /* Search / Walk-in mode with toggle */
        <>
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted/60 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => setIsDirectWalkIn(false)}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all text-center',
                !isDirectWalkIn
                  ? 'bg-white dark:bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Search className="w-3.5 h-3.5 inline mr-1.5" />
              Find Reservation
            </button>
            <button
              type="button"
              onClick={() => setIsDirectWalkIn(true)}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all text-center',
                isDirectWalkIn
                  ? 'bg-white dark:bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <User className="w-3.5 h-3.5 inline mr-1.5" />
              Direct Walk-in
            </button>
          </div>

          {!isDirectWalkIn ? (
            /* ─── Find Reservation Mode ─── */
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by confirmation #, guest name, or room..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>

              {/* Search results */}
              {searchLoading && (
                <div className="flex items-center gap-2 py-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              )}
              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map(res => (
                    <Card
                      key={res.id}
                      className={cn(
                        'p-3 cursor-pointer transition-all border',
                        searchedReservationId === res.id
                          ? 'border-teal-400 ring-2 ring-teal-400/20 bg-teal-50/50 dark:bg-teal-950/20'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => setSearchedReservationId(res.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {res.confirmationNo}
                            </Badge>
                            {res.source && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                {sourceLabel(res.source)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">
                            {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Guest unknown'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {res.room && <span>Room {res.room.number}</span>}
                            <span>·</span>
                            <span>{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
                            <span>·</span>
                            <span className="font-medium">{formatCurrency(res.roomRate)}/night</span>
                          </div>
                        </div>
                        {searchedReservationId === res.id && (
                          <Check className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {searchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No reservations found matching &quot;{searchQuery}&quot;
                </p>
              )}

              {/* Today's Expected Arrivals */}
              {!searchQuery && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h4 className="text-sm font-semibold">Today&apos;s Expected Arrivals</h4>
                    {arrivalsData && arrivalsData.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4">{arrivalsData.length}</Badge>
                    )}
                  </div>
                  {arrivalsLoading && (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  )}
                  {arrivalsData && arrivalsData.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {arrivalsData.map(res => (
                        <Card
                          key={res.id}
                          className={cn(
                            'p-3 cursor-pointer transition-all border',
                            searchedReservationId === res.id
                              ? 'border-teal-400 ring-2 ring-teal-400/20 bg-teal-50/50 dark:bg-teal-950/20'
                              : 'hover:bg-muted/50'
                          )}
                          onClick={() => setSearchedReservationId(res.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                  {res.confirmationNo}
                                </Badge>
                                {res.source && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                    {sourceLabel(res.source)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium truncate">
                                {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Guest unknown'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {res.room && <span>Room {res.room.number}</span>}
                                <span>·</span>
                                <span>{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
                                <span>·</span>
                                <span className="font-medium">{formatCurrency(res.roomRate)}/night</span>
                              </div>
                            </div>
                            {searchedReservationId === res.id && (
                              <Check className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                  {arrivalsData && arrivalsData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
                      No expected arrivals for today
                    </p>
                  )}
                </div>
              )}

              {/* Selected reservation detail panel */}
              {searchedReservationId && reservationData && !confirmedReservationId && (
                <Card className="p-4 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-semibold">Reservation Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <SidebarInfoItem label="Guest" value={`${reservationData.guest?.firstName || ''} ${reservationData.guest?.lastName || ''}`} />
                    <SidebarInfoItem label="Reservation" value={reservationData.confirmationNo} />
                    {reservationData.room && <SidebarInfoItem label="Room" value={`${reservationData.room.number} — ${reservationData.room.type.name}`} />}
                    <SidebarInfoItem label="Stay" value={`${formatDate(reservationData.checkIn)} → ${formatDate(reservationData.checkOut)}`} />
                    <SidebarInfoItem label="Rate" value={`${formatCurrency(reservationData.roomRate)}/night`} />
                    {reservationData.specialRequests && (
                      <div className="col-span-full">
                        <SidebarInfoItem label="Special Requests" value={reservationData.specialRequests} />
                      </div>
                    )}
                  </div>
                  <Button onClick={handleUseReservation} className="mt-3 w-full sm:w-auto">
                    <Check className="w-4 h-4 mr-2" />
                    Use This Reservation
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            /* ─── Direct Walk-in Mode ─── */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <User className="w-3 h-3 mr-1" />
                  Direct Walk-in
                </Badge>
              </div>

              {/* Guest Info */}
              <Card className="p-4">
                <CardTitle className="text-sm mb-3">Guest Information</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={guestFirstName}
                      onChange={e => setGuestFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name <span className="text-red-500">*</span></Label>
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

              {/* Stay Details */}
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
                    <Label className="text-xs">Check-out Date</Label>
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
      {/* If reservation already has a room */}
      {confirmedReservationId && reservationData?.room && !selectedRoomId && (
        <Card className="p-4 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-sm font-bold text-white">{reservationData.room.number}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{reservationData.room.type.name}</p>
                <p className="text-xs text-muted-foreground">
                  Floor {reservationData.room.floor} · {reservationData.room.type.bedConfig}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectRoom(reservationData.room.id)}
            >
              Use Assigned Room
            </Button>
          </div>
        </Card>
      )}

      {/* Room Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BedDouble className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="text-sm font-semibold">Available Rooms</h4>
          {roomsData && (
            <Badge variant="secondary" className="text-[10px] h-4">{filteredRooms.length}</Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={roomSearchFilter}
              onChange={e => setRoomSearchFilter(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {roomsData && (
            <Select value={roomTypeFilter} onValueChange={v => setRoomTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {roomsData.roomTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {uniqueFloors.length > 0 && (
            <Select value={roomFloorFilter} onValueChange={v => setRoomFloorFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {uniqueFloors.map(f => (
                  <SelectItem key={String(f)} value={String(f)}>Floor {f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
          {filteredRooms.length === 0 && (
            <div className="col-span-full py-8 text-center">
              <BedDouble className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No available rooms found</p>
            </div>
          )}
          {filteredRooms.map(room => (
            <button
              key={room.id}
              type="button"
              onClick={() => handleSelectRoom(room.id)}
              className={cn(
                'relative p-3 rounded-xl border text-left transition-all',
                selectedRoomId === room.id
                  ? 'border-teal-400 ring-2 ring-teal-400/20 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm'
                  : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
              )}
            >
              {selectedRoomId === room.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <p className="text-lg font-bold tabular-nums">{room.number}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{room.type.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1">F{room.floor}</Badge>
                {room.wing && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{room.wing}</Badge>}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">{room.type.bedConfig}</span>
                {roomsData?.roomTypes.find(rt => rt.id === room.type.id)?.ratePlans?.[0] && (
                  <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                    {formatCurrency(roomsData.roomTypes.find(rt => rt.id === room.type.id)!.ratePlans[0].baseRate)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Room Detail Panel */}
      {selectedRoom && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{selectedRoom.number}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold">{selectedRoom.type.name}</h4>
              <p className="text-xs text-muted-foreground">
                Floor {selectedRoom.floor}{selectedRoom.wing ? ` · ${selectedRoom.wing} Wing` : ''} · {selectedRoom.type.bedConfig}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {selectedRoom.type.areaSqFt && (
              <SidebarInfoItem label="Area" value={`${Math.round(selectedRoom.type.areaSqFt)} sq ft`} />
            )}
            {selectedRoom.type.view && (
              <SidebarInfoItem label="View" value={selectedRoom.type.view} />
            )}
            <SidebarInfoItem label="Base Occupancy" value={String(selectedRoom.type.baseOccupancy)} />
            <SidebarInfoItem label="Max Occupancy" value={String(selectedRoom.type.maxOccupancy)} />
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

      {/* Rate Section */}
      {selectedRoom && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Rate Selection</h4>
          </div>
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
              <Label className="text-xs">Room Rate</Label>
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
          <div className="mt-3 p-3 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{nightsDisplay}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Occupancy */}
      {selectedRoom && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Occupancy</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Adults</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{adults}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setAdults(Math.min(10, adults + 1))}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Children</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setChildren(Math.max(0, children - 1))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{children}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setChildren(Math.min(10, children + 1))}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          {occupancyExceeded && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Occupancy ({totalOccupancy}) exceeds room maximum ({maxOccupancy}). Extra guests may require additional charges.
              </p>
            </div>
          )}
        </Card>
      )}
    </StepContent>
  )

  // ─── Step 3: Documents ────────────────────────────────────────
  const renderStep3 = () => (
    <StepContent title="Guest Documents" description="Collect guest identification documents" icon={Shield}>
      <Card className="p-3 border-slate-200 dark:border-slate-800 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="collect-docs" className="text-sm cursor-pointer font-medium">
              Collect guest documents
            </Label>
          </div>
          <Switch
            id="collect-docs"
            checked={collectDocuments}
            onCheckedChange={v => setCollectDocuments(!!v)}
          />
        </div>
      </Card>

      {!collectDocuments && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-dashed">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Documents will be collected at a later time. You can skip this step and proceed to payment.
          </p>
        </div>
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
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{idx + 1}
                      </Badge>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-medium">{formatDocType(doc.docType)}</p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {doc.docNumber && <span className="truncate">{doc.docNumber}</span>}
                          {doc.issueCountry && <span className="shrink-0">{doc.issueCountry}</span>}
                          {doc.expiryDate && <span className="shrink-0">Exp: {formatDate(doc.expiryDate)}</span>}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
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

  // ─── Step 4: Payment & Confirm ────────────────────────────────
  const renderStep4 = () => {
    const resGuest = confirmedReservationId && reservationData?.guest ? reservationData.guest : null
    const walkInGuest = isDirectWalkIn && guestFirstName ? {
      firstName: guestFirstName,
      lastName: guestLastName,
      nationality: guestNationality || null,
    } : null
    const displayGuest = resGuest || walkInGuest

    return (
      <StepContent title="Payment & Confirm" description="Review charges and complete check-in" icon={CreditCard}>
        {/* Advance Payment Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <Label htmlFor="collect-advance" className="text-sm cursor-pointer font-medium">
                Collect Advance Payment
              </Label>
            </div>
            <Switch
              id="collect-advance"
              checked={collectAdvance}
              onCheckedChange={v => {
                setCollectAdvance(!!v)
                if (!v) setAdvanceAmount('')
              }}
            />
          </div>
        </Card>

        {/* Payment Form */}
        {collectAdvance && (
          <Card className="p-4">
            <CardTitle className="text-sm mb-3">Payment Details</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  placeholder={String(Math.round(grandTotal))}
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
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Amount</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('full')}>
                  Full Amount
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('50')}>
                  50%
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('1night')}>
                  1 Night Rate
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
        )}

        {/* Stay Summary Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Stay Summary</h4>
          </div>
          <div className="space-y-3 text-xs">
            {/* Guest */}
            {displayGuest && (
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Guest</p>
                  <p className="font-medium mt-0.5">{displayGuest.firstName} {displayGuest.lastName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {displayGuest.nationality && <span className="text-muted-foreground">{displayGuest.nationality}</span>}
                    {(resGuest as typeof resGuest & { vipLevel?: string })?.vipLevel && (resGuest as typeof resGuest & { vipLevel?: string }).vipLevel !== 'none' && (
                      <Badge className="h-4 text-[9px] px-1 bg-amber-100 text-amber-700 border-amber-200">VIP</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Room */}
            {selectedRoom && (
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <BedDouble className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Room</p>
                  <p className="font-medium mt-0.5">{selectedRoom.number} — {selectedRoom.type.name} (Floor {selectedRoom.floor})</p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Stay</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatDate(checkInDate)}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{formatDate(checkOutDate)}</span>
                <Badge variant="secondary" className="h-4 text-[10px] font-semibold">{nights}n</Badge>
              </div>
            </div>

            {/* Rate */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Rate</span>
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{formatCurrency(roomRate)}/night</span>
                {selectedRatePlan && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{selectedRatePlan.name}</Badge>
                )}
              </div>
            </div>

            {/* Cost Breakdown */}
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Room charges</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="tabular-nums">{formatCurrency(Math.round(taxAmount))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service Charge ({serviceChargeRate}%)</span>
                <span className="tabular-nums">{formatCurrency(Math.round(serviceChargeAmount))}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">Total</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(Math.round(grandTotal))}
                </span>
              </div>
            </div>

            {/* Special Requests */}
            {reservationData?.specialRequests && (
              <>
                <Separator />
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium mb-1">Special Requests</p>
                  <p className="text-xs">{reservationData.specialRequests}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Confirmation Checkbox */}
        <Card className="p-3">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="confirm-details"
              checked={confirmChecked}
              onCheckedChange={v => setConfirmChecked(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-details" className="text-xs leading-relaxed cursor-pointer">
              I confirm the guest&apos;s identity has been verified and all details are correct
            </Label>
          </div>
        </Card>
      </StepContent>
    )
  }

  // ─── Step 5: Success Screen ──────────────────────────────────
  const renderSuccess = () => {
    const res = checkInResult?.reservation
    const guestName = res?.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'
    const roomNumber = res?.room?.number || '—'
    const roomTypeName = res?.room?.type?.name || '—'

    return (
      <div className="flex flex-col items-center py-6 sm:py-10 px-4">
        {/* Animated success icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 -m-6 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/60 dark:to-emerald-950/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-inner">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
          Guest Checked In Successfully
        </h2>
        <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
          The guest has been checked in. Room key card details are shown below.
        </p>

        {/* Room Key Card Visual */}
        <div className={cn(
          'w-full max-w-sm rounded-2xl overflow-hidden mb-8 shadow-lg transition-all',
          keyCardIssued
            ? 'shadow-emerald-500/20'
            : 'shadow-slate-300/40 dark:shadow-slate-800/40'
        )}>
          {/* Card Header */}
          <div className={cn(
            'px-5 pt-5 pb-3 transition-colors',
            keyCardIssued
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-slate-600 to-slate-800'
          )}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Meridian Hotel</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{roomNumber}</p>
            <p className="text-xs text-white/80 mt-0.5">{roomTypeName}</p>
          </div>
          {/* Card Body */}
          <div className="px-4 py-3 bg-white dark:bg-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Guest</p>
                <p className="text-sm font-semibold">{guestName}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Check-in</p>
                <p className="text-xs font-medium">{res?.checkIn ? formatDate(res.checkIn) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Check-out</p>
                <p className="text-xs font-medium">{res?.checkOut ? formatDate(res.checkOut) : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {keyCardIssued ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 h-5 text-[10px] gap-1">
                  <KeyRound className="w-2.5 h-2.5" />
                  Room Key Issued
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 h-5 text-[10px] gap-1">
                  <KeyRound className="w-2.5 h-2.5" />
                  Pending Key
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Key card checkbox */}
        <div className="flex items-center gap-2.5 mb-6">
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

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            className="flex-1 h-11 text-sm font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            onClick={handleProceedRatePosting}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Post Room Charges
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
  }

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Professional Page Header Bar */}
      <div className="shrink-0 border-b bg-card">
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Guest Check-In</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Express Mode</span>
            <Switch
              id="express-mode"
              checked={expressMode}
              onCheckedChange={setExpressMode}
              className="scale-90"
            />
          </div>
        </div>
        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Content Area: Two-Column Layout */}
      <div className="flex-1 overflow-y-auto" ref={mainContentRef}>
        {currentStep < 5 ? (
          <div className="flex flex-col lg:flex-row gap-3 p-3 sm:p-4 max-w-7xl mx-auto">
            {/* Main Form (Left ~65%) */}
            <main className="flex-1 min-w-0 space-y-3">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </main>
            {/* Sidebar (Right ~35%) */}
            {renderSidebar()}
          </div>
        ) : (
          /* Success Screen - centered */
          <div className="max-w-7xl mx-auto p-3 sm:p-4">
            {renderSuccess()}
          </div>
        )}
      </div>

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
          roomTypeName={checkInResult.reservation.room?.type?.name || ''}
          roomRate={checkInResult.reservation.roomRate || 0}
          checkIn={checkInResult.reservation.checkIn}
          checkOut={checkInResult.reservation.checkOut}
          reservationConfirmationNo={checkInResult.reservation.confirmationNo}
        />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function SidebarInfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium flex items-center gap-1">
        {icon}
        {value}
      </p>
    </div>
  )
}
