'use client'

import { apiFetch } from '@/lib/api'
import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, BedDouble, Shield, CreditCard,
  Check, Loader2, Search, User, Mail, Phone, Building, CalendarDays,
  AlertCircle, BadgeCheck, KeyRound, ArrowRight, Plus, Trash2,
  ArrowLeft, Minus, Users, Clock,
  Wallet, Info, Star, Crown, Zap, CalendarRange, Eye, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { StepIndicator, StepContent, StepNav, type StepConfig } from '@/components/shared/step-indicator'
import { formatDate, formatCurrency, nightsBetween, getTodayString, formatDateShort, toDateOnly, fromDateOnly } from '@/lib/format'
import { invalidate } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import { useAuthStore, useSettingsStore, useFrontDeskContextStore, type CheckInSession } from '@/lib/store'
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

const PURPOSE_OF_VISIT = [
  { value: 'business', label: 'Business' },
  { value: 'leisure', label: 'Leisure' },
  { value: 'transit', label: 'Transit' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
]

const PHASE2_STEPS: StepConfig[] = [
  { label: 'Guest & Stay', icon: User },
  { label: 'Room & Rate', icon: BedDouble },
  { label: 'Payment', icon: CreditCard },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Types ──────────────────────────────────────────────────────────────

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

export function CheckInProcess({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const { checkInSession, clearCheckInSession } = useFrontDeskContextStore()
  const mainContentRef = useRef<HTMLDivElement>(null)

  const today = getTodayString()

  // ─── Step state ───────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(checkInSession?.startAtStep || 1)

  // ─── Reservation data ─────────────────────────────────────────
  const sessionReservation = checkInSession?.reservationData as unknown as ReservationData | null
  const [confirmedReservationId] = useState<string | null>(checkInSession?.reservationId || null)
  const isDirectWalkIn = checkInSession?.isDirectWalkIn || false

  // ─── Walk-in guest fields ──────────────────────────────────────
  const [guestFirstName, setGuestFirstName] = useState(checkInSession?.walkInGuest?.firstName || '')
  const [guestLastName, setGuestLastName] = useState(checkInSession?.walkInGuest?.lastName || '')
  const [guestEmail, setGuestEmail] = useState(checkInSession?.walkInGuest?.email || '')
  const [guestPhone, setGuestPhone] = useState(checkInSession?.walkInGuest?.phone || '')
  const [guestNationality, setGuestNationality] = useState(checkInSession?.walkInGuest?.nationality || '')
  const [guestIdType, setGuestIdType] = useState('')
  const [guestIdNumber, setGuestIdNumber] = useState('')

  // ─── Room & Rate ───────────────────────────────────────────────
  const [selectedRoomId, setSelectedRoomId] = useState<string>(sessionReservation?.room?.id || '')
  const [roomSearchFilter, setRoomSearchFilter] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('')
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('')
  const [selectedRatePlanId, setSelectedRatePlanId] = useState<string>(sessionReservation?.ratePlanId || '')
  const [roomRate, setRoomRate] = useState<number>(sessionReservation?.roomRate || 0)
  const [checkInDate, setCheckInDate] = useState(
    checkInSession?.walkInDates?.checkIn || sessionReservation?.checkIn?.split('T')[0] || today
  )
  const [checkOutDate, setCheckOutDate] = useState(
    checkInSession?.walkInDates?.checkOut || sessionReservation?.checkOut?.split('T')[0] || (() => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return toDateOnly(d)
    })()
  )
  const [adults, setAdults] = useState(
    checkInSession?.walkInDates?.adults || sessionReservation?.adults || 2
  )
  const [children, setChildren] = useState(
    checkInSession?.walkInDates?.children || sessionReservation?.children || 0
  )

  // ─── Guest & Stay extras (step 1) ──────────────────────────────
  const [specialRequests, setSpecialRequests] = useState(sessionReservation?.specialRequests || '')
  const [purposeOfVisit, setPurposeOfVisit] = useState('')
  const [guestInfoEditable, setGuestInfoEditable] = useState(false)
  const [guestNotes, setGuestNotes] = useState('')

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

  // ─── Data queries ──────────────────────────────────────────────

  const {
    data: reservationData,
    isLoading: reservationLoading,
  } = useQuery({
    queryKey: ['reservation', confirmedReservationId],
    queryFn: async () => {
      if (!confirmedReservationId) return null
      const data = await apiFetch(`/api/reservations/${confirmedReservationId}`) as { reservation: ReservationData }
      return data.reservation
    },
    enabled: !!confirmedReservationId,
  })

  // Guest stay history
  const { data: guestStayHistory } = useQuery({
    queryKey: ['guest-stays', reservationData?.guest?.id],
    queryFn: async () => {
      if (!reservationData?.guest?.id) return null
      try {
        return await apiFetch(`/api/guests/${reservationData.guest.id}/stays`) as Array<{ id: string; checkIn: string; checkOut: string; roomNumber: string; guestName?: string; status?: string }>
      } catch {
        return null
      }
    },
    enabled: !!reservationData?.guest?.id,
  })

  // Rooms list
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-available'],
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

  // ─── Check-in mutation ─────────────────────────────────────────
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
      setCurrentStep(4) // success screen marker
      toast.success('Guest checked in successfully!')
      invalidate.afterCheckIn(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Check-in failed')
    },
  })

  // ─── Derived values ─────────────────────────────────────────────

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

  // All available rooms of the selected room's type
  const sameTypeRooms = useMemo(() => {
    if (!roomsData || !selectedRoom) return []
    return roomsData.rooms.filter(
      r => r.type.id === selectedRoom.type.id && (r.status === 'vacant_clean' || r.status === 'inspected')
    )
  }, [roomsData, selectedRoom])

  // Filtered rooms
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

  // Room counts by type
  const roomCountsByType = useMemo(() => {
    if (!roomsData) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const r of roomsData.rooms) {
      if (r.status === 'vacant_clean' || r.status === 'inspected') {
        counts[r.type.id] = (counts[r.type.id] || 0) + 1
      }
    }
    return counts
  }, [roomsData])

  // Unique floors
  const uniqueFloors = useMemo(() => {
    if (!roomsData) return []
    const floors = new Set(roomsData.rooms.map(r => r.floor))
    return Array.from(floors).sort((a, b) => a - b)
  }, [roomsData])

  // Occupancy check
  const totalOccupancy = adults + children
  const maxOccupancy = selectedRoom?.type.maxOccupancy || 0
  const occupancyExceeded = maxOccupancy > 0 && totalOccupancy > maxOccupancy

  // Nights display
  const nightsDisplay = useMemo(() => {
    const ci = fromDateOnly(checkInDate)
    const co = fromDateOnly(checkOutDate)
    const ciDay = DAY_NAMES[ci.getDay()]
    const coDay = DAY_NAMES[co.getDay()]
    return `${nights} night${nights > 1 ? 's' : ''} (${ciDay} ${formatDateShort(checkInDate)} → ${coDay} ${formatDateShort(checkOutDate)})`
  }, [checkInDate, checkOutDate, nights])

  // Sidebar data
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
      return { email: reservationData.guest.email, phone: reservationData.guest.phone }
    }
    if (isDirectWalkIn) {
      return { email: guestEmail || null, phone: guestPhone || null }
    }
    return { email: null, phone: null }
  }, [reservationData, isDirectWalkIn, guestEmail, guestPhone])

  // ─── Handlers ──────────────────────────────────────────────────

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
    if (rp) setRoomRate(rp.baseRate)
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
    if (step < currentStep) setCurrentStep(step)
  }, [currentStep])

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
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
    setCurrentStep(prev => Math.min(prev + 1, 3))
  }, [currentStep, isDirectWalkIn, guestFirstName, guestLastName, selectedRoomId, roomRate])

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      // Go back to lookup page
      onBack()
      return
    }
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [currentStep, onBack])

  const handlePhaseBack = useCallback(() => {
    onBack()
  }, [onBack])

  const handleProceedRatePosting = useCallback(() => {
    if (checkInResult?.reservation?.id) {
      setShowRatePosting(true)
    }
  }, [checkInResult])

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

  // ─── Helpers ────────────────────────────────────────────────────
  const parseAmenities = (amenities: string | null): string[] => {
    if (!amenities) return []
    try { return JSON.parse(amenities) } catch { return [] }
  }

  const formatDocType = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type
  }

  // ─── Number Stepper (inline) ────────────────────────────────
  const NumberStepper = useCallback(({ label, value, min, max, onChange }: {
    label: string; value: number; min: number; max: number; onChange: (v: number) => void
  }) => (
    <div className="flex items-center h-10 rounded-lg border border-border bg-background px-3 gap-2 flex-1">
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-0 ml-auto">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  ), [])

  // ═══════════════════════════════════════════════════════════════
  // SIDEBAR
  // ═══════════════════════════════════════════════════════════════

  const renderSidebar = () => (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-2 lg:sticky lg:top-0 lg:self-start">
      {/* Guest Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-100">Guest</p>
        </div>
        <CardContent className="p-2.5 space-y-1.5">
          {sidebarGuestName ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{sidebarGuestName}</p>
                  {sidebarVipLevel && sidebarVipLevel !== 'none' && (
                    <Badge className="mt-0.5 h-4 text-[9px] px-1.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                      <Crown className="w-2.5 h-2.5 mr-0.5" /> VIP
                    </Badge>
                  )}
                </div>
              </div>
              {(sidebarGuestContact.email || sidebarGuestContact.phone) && (
                <div className="space-y-0.5">
                  {sidebarGuestContact.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{sidebarGuestContact.email}</span>
                    </p>
                  )}
                  {sidebarGuestContact.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
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
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Room</p>
        </div>
        <CardContent className="p-2.5 space-y-2">
          {selectedRoom ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
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
              {/* Amenity badges */}
              {selectedRoom.type.amenities && parseAmenities(selectedRoom.type.amenities).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {parseAmenities(selectedRoom.type.amenities).slice(0, 4).map((a, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1.5">{a}</Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No room assigned yet</p>
          )}
        </CardContent>
      </Card>

      {/* Stay Info */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Stay</p>
        </div>
        <CardContent className="p-2.5 space-y-2">
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
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 dark:from-emerald-800 dark:to-emerald-900 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Cost Summary</p>
        </div>
        <CardContent className="p-2.5 space-y-1.5">
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

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Guest & Stay Verification
  // ═══════════════════════════════════════════════════════════════

  const renderStep1 = () => {
    const isReservation = !!confirmedReservationId && reservationData
    const canEdit = isDirectWalkIn || guestInfoEditable

    return (
      <StepContent title="Guest & Stay Verification" description="Verify guest details and stay information" icon={User}>
        {/* Guest Profile Card (for reservations with guest) */}
        {isReservation && reservationData?.guest && (
          <Card className="p-2.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm">
                {reservationData.guest.firstName[0]}{reservationData.guest.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">{reservationData.guest.firstName} {reservationData.guest.lastName}</p>
                  {reservationData.guest.vipLevel && reservationData.guest.vipLevel !== 'none' && (
                    <Badge className="h-5 text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                      <Crown className="w-3 h-3 mr-0.5" /> VIP {reservationData.guest.vipLevel}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  {reservationData.guest.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{reservationData.guest.email}</span>
                  )}
                  {reservationData.guest.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{reservationData.guest.phone}</span>
                  )}
                  {reservationData.guest.nationality && (
                    <span className="flex items-center gap-1"><Building className="w-3 h-3" />{reservationData.guest.nationality}</span>
                  )}
                </div>
              </div>
            </div>
            {/* Guest stay history badges */}
            {guestStayHistory && guestStayHistory.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  <Star className="w-3 h-3 inline mr-1" />
                  Returning Guest — {guestStayHistory.length} previous stay{guestStayHistory.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {guestStayHistory.slice(0, 5).map((stay, i) => (
                    <Badge key={stay.id || i} variant="secondary" className="text-[10px] h-5">
                      Room {stay.roomNumber} · {formatDateShort(stay.checkIn)}
                    </Badge>
                  ))}
                  {guestStayHistory.length > 5 && (
                    <Badge variant="outline" className="text-[10px] h-5">+{guestStayHistory.length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Guest Information Card */}
        <Card className="p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-sm font-semibold">Guest Information</h4>
            </div>
            {isReservation && !isDirectWalkIn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setGuestInfoEditable(!guestInfoEditable)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                {guestInfoEditable ? 'Lock' : 'Edit'}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">First Name</Label>
              {canEdit ? (
                <Input value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)} className="h-9 text-sm" />
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-medium">
                  {reservationData?.guest?.firstName || '—'}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name</Label>
              {canEdit ? (
                <Input value={guestLastName} onChange={e => setGuestLastName(e.target.value)} className="h-9 text-sm" />
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-medium">
                  {reservationData?.guest?.lastName || '—'}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              {canEdit ? (
                <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="h-9 text-sm" />
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                  {reservationData?.guest?.email || '—'}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              {canEdit ? (
                <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-9 text-sm" />
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                  {reservationData?.guest?.phone || '—'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stay Dates Card */}
        <Card className="p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Stay Dates</h4>
          </div>
          {isReservation && !isDirectWalkIn ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                {formatDate(checkInDate)}
              </div>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                {formatDate(checkOutDate)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Check-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-sm w-full justify-start font-normal">
                      <CalendarDays className="mr-2 h-3.5 w-3.5" />
                      {formatDate(checkInDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDateOnly(checkInDate)} onSelect={d => d && setCheckInDate(toDateOnly(d))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-sm w-full justify-start font-normal">
                      <CalendarDays className="mr-2 h-3.5 w-3.5" />
                      {formatDate(checkOutDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDateOnly(checkOutDate)} onSelect={d => d && setCheckOutDate(toDateOnly(d))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Wide occupancy boxes with flex-1 */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <NumberStepper label="Adults" value={adults} min={1} max={10} onChange={setAdults} />
            <NumberStepper label="Children" value={children} min={0} max={10} onChange={setChildren} />
          </div>
          <div className="flex items-center h-10 rounded-lg border border-border bg-muted/40 px-3 mt-2">
            <span className="text-xs text-muted-foreground font-medium">Nights:</span>
            <span className="ml-auto text-sm font-semibold tabular-nums">{nightsDisplay}</span>
          </div>
        </Card>

        {/* Special Requests, Purpose, Guest Notes */}
        <Card className="p-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Purpose of Visit</Label>
              <Select value={purposeOfVisit} onValueChange={setPurposeOfVisit}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE_OF_VISIT.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Special Requests</Label>
              <Textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="Any special requests..."
                className="text-sm min-h-[36px] resize-none"
                rows={1}
              />
            </div>
          </div>
        </Card>

        {/* Guest Notes */}
        {(guestNotes || reservationData?.specialRequests) && (
          <Card className="p-2.5 bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Guest Notes</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {specialRequests || reservationData?.specialRequests || 'No notes available.'}
            </p>
          </Card>
        )}
      </StepContent>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Room & Rate
  // ═══════════════════════════════════════════════════════════════

  const renderStep2 = () => (
    <StepContent title="Room & Rate" description="Select a room and set the rate plan" icon={BedDouble}>
      {/* If reservation already has a room */}
      {confirmedReservationId && reservationData?.room && !selectedRoomId && (
        <Card className="p-2.5 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-sm font-bold text-white">{reservationData.room.number}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{reservationData.room.type.name}</p>
                <p className="text-xs text-muted-foreground">
                  Floor {reservationData.room.floor} · {reservationData.room.type.bedConfig}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleSelectRoom(reservationData.room!.id)}>
              Use Assigned Room
            </Button>
          </div>
        </Card>
      )}

      {/* Room Filter Bar */}
      <Card className="p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <BedDouble className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h4 className="text-sm font-semibold">Available Rooms</h4>
          {roomsData && (
            <Badge variant="secondary" className="text-[10px] h-4">{filteredRooms.length} rooms</Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} ({roomCountsByType[rt.id] || 0})
                  </SelectItem>
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
          {filteredRooms.map(room => {
            const rt = roomsData?.roomTypes.find(r => r.id === room.type.id)
            const baseRate = rt?.ratePlans?.[0]?.baseRate
            const amenities = parseAmenities(room.type.amenities)
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room.id)}
                className={cn(
                  'relative p-2.5 rounded-xl border text-left transition-all',
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
                <p className="text-[10px] text-muted-foreground">
                  Floor {room.floor}{room.wing ? ` · ${room.wing}` : ''} · {room.type.bedConfig}
                </p>
                {/* Amenity badges */}
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {amenities.slice(0, 3).map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[8px] h-3.5 px-1">{a}</Badge>
                    ))}
                    {amenities.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+{amenities.length - 3}</span>
                    )}
                  </div>
                )}
                {baseRate != null && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {formatCurrency(baseRate)}/n
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Room Type Comparison: show all rooms of the same type */}
      {selectedRoom && sameTypeRooms.length > 1 && (
        <Card className="p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <BedDouble className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">
              {selectedRoom.type.name} Rooms
            </h4>
            <Badge variant="secondary" className="text-[10px] h-4">{sameTypeRooms.length} available</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sameTypeRooms.map(room => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room.id)}
                className={cn(
                  'p-2.5 rounded-lg border text-left transition-all',
                  selectedRoomId === room.id
                    ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{room.number}</span>
                  {selectedRoomId === room.id && <Check className="w-3.5 h-3.5 text-teal-600 ml-auto" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Floor {room.floor}{room.wing ? ` · ${room.wing}` : ''}
                </p>
                {room.type.view && (
                  <p className="text-[10px] text-muted-foreground">{room.type.view}</p>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Rate Plan Selection & Comparison */}
      {selectedRoomType && (
        <Card className="p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Rate Plan</h4>
          </div>

          {/* Rate plan comparison cards */}
          {ratePlans.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {ratePlans.map(rp => {
                const rpSubtotal = rp.baseRate * nights
                const isSelected = selectedRatePlanId === rp.id
                return (
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => handleRatePlanChange(rp.id)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-teal-400 ring-2 ring-teal-400/20 bg-teal-50/50 dark:bg-teal-950/20'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{rp.name}</p>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                    </div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                      {formatCurrency(rp.baseRate)}/night
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {nights}n × {formatCurrency(rp.baseRate)} = <span className="font-medium">{formatCurrency(rpSubtotal)}</span>
                    </p>
                    {rp.channel && (
                      <Badge variant="secondary" className="text-[9px] h-4 mt-1">{rp.channel}</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Single rate plan dropdown */}
          {ratePlans.length <= 1 && ratePlans.length > 0 && (
            <Select value={selectedRatePlanId} onValueChange={handleRatePlanChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select rate plan" />
              </SelectTrigger>
              <SelectContent>
                {ratePlans.map(rp => (
                  <SelectItem key={rp.id} value={rp.id}>
                    {rp.name} — {formatCurrency(rp.baseRate)}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Inline subtotal */}
          {roomRate > 0 && (
            <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Subtotal ({nights} nights)</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
          )}
        </Card>
      )}

      {/* Occupancy Warning */}
      {occupancyExceeded && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Occupancy ({totalOccupancy}) exceeds room maximum ({maxOccupancy}). Extra guests may require additional charges.
          </p>
        </div>
      )}
    </StepContent>
  )

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Payment & Confirm
  // ═══════════════════════════════════════════════════════════════

  const renderStep3 = () => {
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
        <Card className="p-2.5">
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
          <Card className="p-2.5">
            <CardTitle className="text-sm mb-2">Payment Details</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder={String(Math.round(grandTotal))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
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
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Quick Amount</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('full')}>Full Amount</Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('50')}>50%</Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickAdvance('1night')}>1 Night Rate</Button>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <Label className="text-xs">Reference Number</Label>
              <Input value={advanceReference} onChange={e => setAdvanceReference(e.target.value)} placeholder="Optional reference" className="h-8 text-sm" />
            </div>
          </Card>
        )}

        {/* Document Collection */}
        <Card className="p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="collect-docs" className="text-sm cursor-pointer font-medium">
                Collect Guest Documents
              </Label>
            </div>
            <Switch id="collect-docs" checked={collectDocuments} onCheckedChange={v => setCollectDocuments(!!v)} />
          </div>
        </Card>

        {collectDocuments && (
          <Card className="p-2.5">
            <CardTitle className="text-sm mb-2">Add Document</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Document Type *</Label>
                <Select value={editingDoc.docType || ''} onValueChange={v => setEditingDoc(prev => ({ ...prev, docType: v }))}>
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
              <div className="space-y-1">
                <Label className="text-xs">Document Number</Label>
                <Input value={editingDoc.docNumber || ''} onChange={e => setEditingDoc(prev => ({ ...prev, docNumber: e.target.value }))} placeholder="Enter document number" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issue Country</Label>
                <Select value={editingDoc.issueCountry || ''} onValueChange={v => setEditingDoc(prev => ({ ...prev, issueCountry: v }))}>
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
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={editingDoc.expiryDate || ''} onChange={e => setEditingDoc(prev => ({ ...prev, expiryDate: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddDocument}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Document
            </Button>
            {documents.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {documents.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">#{idx + 1}</Badge>
                      <span className="text-xs font-medium">{formatDocType(doc.docType)}</span>
                      {doc.docNumber && <span className="text-xs text-muted-foreground truncate">{doc.docNumber}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleRemoveDocument(doc.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Stay Summary Card */}
        <Card className="p-2.5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-semibold">Stay Summary</h4>
          </div>
          <div className="space-y-2 text-xs">
            {displayGuest && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="font-medium">{displayGuest.firstName} {displayGuest.lastName}</span>
                {displayGuest.nationality && <span className="text-muted-foreground">· {displayGuest.nationality}</span>}
              </div>
            )}
            {selectedRoom && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <BedDouble className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="font-medium">{selectedRoom.number}</span>
                <RoomTypeBedBadge typeName={selectedRoom.type.name} bedConfig={selectedRoom.type.bedConfig} typeCode={selectedRoom.type.code} pax={adults + children} inline />
                <span className="text-muted-foreground text-xs">(Floor {selectedRoom.floor})</span>
              </div>
            )}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Stay</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatDate(checkInDate)}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{formatDate(checkOutDate)}</span>
                <Badge variant="secondary" className="h-4 text-[10px] font-semibold">{nights}n</Badge>
              </div>
            </div>

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

            {specialRequests && (
              <>
                <Separator />
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium mb-1">Special Requests</p>
                  <p className="text-xs">{specialRequests}</p>
                </div>
              </>
            )}
            {reservationData?.specialRequests && !specialRequests && (
              <>
                <Separator />
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium mb-1">Special Requests</p>
                  <p className="text-xs">{reservationData.specialRequests}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Confirmation Checkbox */}
        <Card className="p-2.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-details"
              checked={confirmChecked}
              onCheckedChange={v => setConfirmChecked(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-details" className="text-xs leading-relaxed cursor-pointer">
              I confirm all details are correct and the guest identity has been verified
            </Label>
          </div>
        </Card>
      </StepContent>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════

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
          keyCardIssued ? 'shadow-emerald-500/20' : 'shadow-slate-300/40 dark:shadow-slate-800/40'
        )}>
          <div className={cn(
            'px-5 pt-5 pb-3 transition-colors',
            keyCardIssued
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-slate-600 to-slate-800'
          )}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Room Key</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{roomNumber}</p>
            <p className="text-xs text-white/80 mt-0.5">{roomTypeName}</p>
          </div>
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
                  <KeyRound className="w-2.5 h-2.5" /> Room Key Issued
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 h-5 text-[10px] gap-1">
                  <KeyRound className="w-2.5 h-2.5" /> Pending Key
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

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  // Show loading if we need reservation data
  if (confirmedReservationId && reservationLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="shrink-0 border-b bg-card">
          <div className="flex items-center justify-between px-3 sm:px-6 py-2.5">
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Guest Check-In</h1>
            <div className="w-16" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading reservation data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b bg-card">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5">
          <button
            type="button"
            onClick={handlePhaseBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Guest Check-In</h1>
          <div className="w-16" /> {/* Spacer for symmetry */}
        </div>
        {/* Step Indicator */}
        <StepIndicator
          steps={PHASE2_STEPS}
          currentStep={Math.min(currentStep, 3)}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={mainContentRef}>
        {currentStep < 4 ? (
          <div className="flex flex-col lg:flex-row gap-2 p-3 sm:p-4 max-w-7xl mx-auto">
            {/* Main Form */}
            <main className="flex-1 min-w-0 space-y-2">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </main>
            {/* Sidebar */}
            {renderSidebar()}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-3 sm:p-4">
            {renderSuccess()}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      {currentStep < 4 && (
        <StepNav
          currentStep={currentStep}
          totalSteps={3}
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