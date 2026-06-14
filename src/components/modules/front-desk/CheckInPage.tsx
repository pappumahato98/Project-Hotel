'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Check, Loader2, User, FileText, BedDouble,
  CreditCard, CalendarDays, AlertCircle, BadgeCheck, Plus, Trash2,
  ChevronDown, Building2, Phone, Mail, Hash, Clock, Star, Shield,
  Search, Eye,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatDate, formatCurrency, getTodayString, nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore, useSettingsStore, useAuthStore } from '@/lib/store'
import { RoomRatePostingDialog } from './RoomRatePostingDialog'

// ─── Constants ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Reservation Details', icon: FileText },
  { label: 'Choose Room & Price', icon: BedDouble },
  { label: 'Guest Documents', icon: Shield },
  { label: 'Advance Payment', icon: CreditCard },
]

const DOC_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'visa', label: 'Visa' },
  { value: 'company_id', label: 'Company ID' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'voucher', label: 'Voucher' },
]

const RATE_PLANS = [
  { value: 'BAR', label: 'BAR - Best Available Rate' },
  { value: 'OTA_STD', label: 'OTA Standard' },
  { value: 'CORP', label: 'Corporate Rate' },
  { value: 'WEEKEND', label: 'Weekend Special' },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Types ──────────────────────────────────────────────────────────────

interface ReservationData {
  id: string
  confirmationNo: string
  status: string
  source: string | null
  reservationType: string
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  paidAmount: number
  advanceAmount: number
  specialRequests: string | null
  guaranteed: boolean
  roomTypeId: string | null
  ratePlanId: string | null
  roomId: string | null
  guestId: string | null
  guest: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    vipLevel: string
    nationality: string | null
  } | null
  room: {
    id: string
    number: string
    floor: number
    wing: string | null
    type: { id: string; name: string; code: string; baseOccupancy: number; maxOccupancy: number; bedConfig: string; areaSqFt: number; view: string | null; amenities: string | null }
  } | null
  folios: { id: string; balance: number; status: string }[]
}

interface RoomCardData {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  type: { id: string; name: string; code: string; baseRate?: number }
}

interface GuestDocumentData {
  id: string
  guestId: string
  reservationId: string | null
  docType: string
  docNumber: string | null
  docName: string | null
  issueDate: string | null
  expiryDate: string | null
  issuingCountry: string | null
  issuingAuthority: string | null
  verified: boolean
  notes: string | null
  createdAt: string
}

// ─── Component ──────────────────────────────────────────────────────────

export function CheckInPage() {
  const searchParams = useSearchParams()
  const { navigateTo, setActiveSubModule } = useNavigationStore()
  const { settings } = useSettingsStore()
  const { user } = useAuthStore()

  // ─── Step state ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // ─── Reservation data ──────────────────────────────────────────
  const [reservationId, setReservationId] = useState<string | null>(null)
  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [isWalkIn, setIsWalkIn] = useState(false)

  // ─── Step 1 state ──────────────────────────────────────────────
  const [detailsVerified, setDetailsVerified] = useState(false)

  // ─── Walk-in guest form ────────────────────────────────────────
  const [walkInGuest, setWalkInGuest] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  })
  const [guestSearchQuery, setGuestSearchQuery] = useState('')
  const [guestSearchResults, setGuestSearchResults] = useState<Array<{ id: string; firstName: string; lastName: string; phone: string | null; email: string | null; vipLevel: string }>>([])
  const [isSearchingGuest, setIsSearchingGuest] = useState(false)
  const [selectedExistingGuest, setSelectedExistingGuest] = useState<{ id: string; firstName: string; lastName: string; phone: string | null; email: string | null; vipLevel: string } | null>(null)

  // ─── Step 2 state ──────────────────────────────────────────────
  const [availableRooms, setAvailableRooms] = useState<RoomCardData[]>([])
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all')
  const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null)
  const [roomRate, setRoomRate] = useState<number>(0)
  const [ratePlan, setRatePlan] = useState<string>('BAR')
  const [checkInDate, setCheckInDate] = useState(getTodayString())
  const [checkOutDate, setCheckOutDate] = useState('')
  const [showRoomSelector, setShowRoomSelector] = useState(false)

  // ─── Step 3 state ──────────────────────────────────────────────
  const [existingDocuments, setExistingDocuments] = useState<GuestDocumentData[]>([])
  const [addedDocuments, setAddedDocuments] = useState<GuestDocumentData[]>([])
  const [docForm, setDocForm] = useState({
    docType: 'passport',
    docNumber: '',
    docName: '',
    issueDate: '',
    expiryDate: '',
    issuingCountry: '',
    issuingAuthority: '',
    notes: '',
  })
  const [isAddingDoc, setIsAddingDoc] = useState(false)
  const [docsOnFileSkipped, setDocsOnFileSkipped] = useState(false)
  const [docSkipped, setDocSkipped] = useState(false)

  // ─── Step 4 state ──────────────────────────────────────────────
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [noAdvance, setNoAdvance] = useState(false)

  // ─── Success / Dialog state ────────────────────────────────────
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showRatePostingDialog, setShowRatePostingDialog] = useState(false)
  const [checkedInReservation, setCheckedInReservation] = useState<ReservationData | null>(null)
  const [roomTypeOptions, setRoomTypeOptions] = useState<{ id: string; name: string; code: string }[]>([])

  // ─── Derived ───────────────────────────────────────────────────
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0
    return nightsBetween(checkInDate, checkOutDate)
  }, [checkInDate, checkOutDate])

  const subtotalAmount = useMemo(() => nights * roomRate, [nights, roomRate])
  const taxAmount = useMemo(() => subtotalAmount * (settings.taxRate / 100), [subtotalAmount, settings.taxRate])
  const serviceChargeAmount = useMemo(() => subtotalAmount * (settings.serviceCharge / 100), [subtotalAmount, settings.serviceCharge])
  const grandTotal = useMemo(() => subtotalAmount + taxAmount + serviceChargeAmount, [subtotalAmount, taxAmount, serviceChargeAmount])

  const effectiveAdvance = useMemo(() => {
    if (noAdvance) return 0
    return parseFloat(advanceAmount) || 0
  }, [advanceAmount, noAdvance])

  const balanceDue = useMemo(() => {
    const total = isWalkIn ? grandTotal : (reservation?.totalAmount || 0)
    const existingPaid = isWalkIn ? 0 : (reservation?.paidAmount || 0)
    return total - existingPaid - effectiveAdvance
  }, [isWalkIn, grandTotal, reservation, effectiveAdvance])

  const filteredRooms = useMemo(() => {
    if (roomTypeFilter === 'all') return availableRooms
    return availableRooms.filter(r => r.type.id === roomTypeFilter)
  }, [availableRooms, roomTypeFilter])

  // ─── Fetch initial data ────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setIsFetching(true)
      try {
        // Check for reservationId in URL
        const urlReservationId = searchParams.get('reservationId')

        // Also check history state
        const historyState = (window.history.state as { reservationId?: string } | null)
        const effectiveReservationId = urlReservationId || historyState?.reservationId || null

        if (effectiveReservationId) {
          setReservationId(effectiveReservationId)
          const res = await fetch(`/api/reservations/${effectiveReservationId}`)
          if (res.ok) {
            const data = await res.json()
            const r = data.reservation as ReservationData
            setReservation(r)
            setIsWalkIn(false)

            // Pre-fill step 2
            if (r.room) {
              setSelectedRoom({
                id: r.room.id,
                number: r.room.number,
                floor: r.room.floor,
                wing: r.room.wing,
                status: r.room.type ? 'vacant_clean' : 'unknown',
                type: r.room.type,
              })
              setRoomRate(r.roomRate || 0)
            }
            if (r.ratePlanId) setRatePlan(r.ratePlanId)
            if (r.checkIn) {
              const ci = new Date(r.checkIn)
              setCheckInDate(ci.toISOString().split('T')[0])
            }
            if (r.checkOut) {
              const co = new Date(r.checkOut)
              setCheckOutDate(co.toISOString().split('T')[0])
            }

            // Fetch existing docs
            if (r.guestId) {
              const docRes = await fetch(`/api/guest-documents?guestId=${r.guestId}`)
              if (docRes.ok) {
                const docData = await docRes.json()
                setExistingDocuments(docData.documents || [])
              }
            }
          } else {
            toast.error('Failed to load reservation')
            setIsWalkIn(true)
          }
        } else {
          setIsWalkIn(true)
        }

        // Fetch available rooms
        const roomsRes = await fetch('/api/rooms?status=vacant_clean')
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          const rooms: RoomCardData[] = (roomsData.rooms || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            number: r.number as string,
            floor: r.floor as number,
            wing: r.wing as string | null,
            status: r.status as string,
            type: r.type as RoomCardData['type'],
          }))
          setAvailableRooms(rooms)

          // Extract room type options
          const types = new Map<string, { id: string; name: string; code: string }>()
          rooms.forEach((r: RoomCardData) => {
            if (!types.has(r.type.id)) {
              types.set(r.type.id, { id: r.type.id, name: r.type.name, code: r.type.code })
            }
          })
          setRoomTypeOptions(Array.from(types.values()))
        }
      } catch (err) {
        console.error('Init error:', err)
        toast.error('Failed to initialize check-in')
      } finally {
        setIsFetching(false)
      }
    }
    init()
  }, [])

  // ─── Guest search for walk-in ──────────────────────────────────
  const searchGuests = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setGuestSearchResults([])
      return
    }
    setIsSearchingGuest(true)
    try {
      const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setGuestSearchResults(data.guests || [])
      }
    } catch {
      // Silently fail
    } finally {
      setIsSearchingGuest(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isWalkIn && guestSearchQuery) {
        searchGuests(guestSearchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [guestSearchQuery, isWalkIn, searchGuests])

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSelectExistingGuest = (guest: typeof guestSearchResults[0]) => {
    setSelectedExistingGuest(guest)
    setWalkInGuest({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone || '',
      email: guest.email || '',
    })
    setGuestSearchQuery('')
    setGuestSearchResults([])

    // Fetch their documents
    fetch(`/api/guest-documents?guestId=${guest.id}`)
      .then(res => res.ok ? res.json() : { documents: [] })
      .then(data => setExistingDocuments(data.documents || []))
      .catch(() => {})
  }

  const handleSelectRoom = (room: RoomCardData) => {
    setSelectedRoom(room)
    // Get base rate from room type or use default
    const typeRate = (room.type as Record<string, unknown>).baseRate as number | undefined
    if (typeRate && typeRate > 0) {
      setRoomRate(typeRate)
    }
  }

  const handleAddDocument = async () => {
    if (!docForm.docType) {
      toast.error('Please select a document type')
      return
    }

    const guestId = reservation?.guestId || selectedExistingGuest?.id
    if (!guestId) {
      toast.error('No guest associated. Please go back and select/create a guest.')
      return
    }

    setIsAddingDoc(true)
    try {
      const res = await fetch('/api/guest-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          reservationId: reservationId || undefined,
          docType: docForm.docType,
          docNumber: docForm.docNumber || undefined,
          docName: docForm.docName || undefined,
          issueDate: docForm.issueDate || undefined,
          expiryDate: docForm.expiryDate || undefined,
          issuingCountry: docForm.issuingCountry || undefined,
          issuingAuthority: docForm.issuingAuthority || undefined,
          notes: docForm.notes || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAddedDocuments(prev => [...prev, data.document])
        setDocForm({
          docType: 'passport',
          docNumber: '',
          docName: '',
          issueDate: '',
          expiryDate: '',
          issuingCountry: '',
          issuingAuthority: '',
          notes: '',
        })
        toast.success('Document added successfully')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add document')
      }
    } catch {
      toast.error('Failed to add document')
    } finally {
      setIsAddingDoc(false)
    }
  }

  const handleRemoveAddedDocument = (docId: string) => {
    setAddedDocuments(prev => prev.filter(d => d.id !== docId))
  }

  const handleNext = () => {
    if (currentStep === 0) {
      if (isWalkIn) {
        if (!walkInGuest.firstName || !walkInGuest.lastName) {
          toast.error('Please enter guest first and last name')
          return
        }
      } else {
        if (!detailsVerified) {
          toast.error('Please verify the reservation details before proceeding')
          return
        }
      }
    } else if (currentStep === 1) {
      if (!selectedRoom) {
        toast.error('Please select a room')
        return
      }
      if (!checkInDate || !checkOutDate) {
        toast.error('Please set check-in and check-out dates')
        return
      }
      if (nights < 1) {
        toast.error('Check-out must be at least 1 night after check-in')
        return
      }
      if (roomRate <= 0) {
        toast.error('Room rate must be greater than zero')
        return
      }
    } else if (currentStep === 2) {
      // Documents step is optional — can be skipped
      if (existingDocuments.length === 0 && addedDocuments.length === 0 && !docSkipped) {
        toast.error('Please add at least one document or check "Skip Documents for Now"')
        return
      }
    }

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleCompleteCheckIn = async () => {
    if (!reservationId) {
      toast.error('No reservation to check in. Walk-in check-in requires creating a reservation first.')
      return
    }

    if (!selectedRoom) {
      toast.error('No room assigned')
      return
    }

    setIsSubmitting(true)
    try {
      // Update reservation with room and dates if changed
      if (selectedRoom.id !== reservation?.roomId || checkInDate || checkOutDate) {
        const updateData: Record<string, unknown> = {}
        if (selectedRoom.id !== reservation?.roomId) updateData.roomId = selectedRoom.id
        if (checkInDate) updateData.checkIn = checkInDate
        if (checkOutDate) updateData.checkOut = checkOutDate
        if (roomRate !== (reservation?.roomRate || 0)) updateData.roomRate = roomRate
        updateData.totalAmount = grandTotal

        if (Object.keys(updateData).length > 0) {
          const patchRes = await fetch(`/api/reservations/${reservationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          })
          if (!patchRes.ok) {
            const err = await patchRes.json()
            toast.error(err.error || 'Failed to update reservation')
            setIsSubmitting(false)
            return
          }
        }
      }

      // Check in
      const checkInBody: Record<string, unknown> = {
        documentSkipped: docSkipped,
        checkedInBy: user?.id || null,
      }
      if (effectiveAdvance > 0) {
        checkInBody.advanceAmount = effectiveAdvance
      }

      const checkInRes = await fetch(`/api/reservations/${reservationId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInBody),
      })

      if (!checkInRes.ok) {
        const err = await checkInRes.json()
        toast.error(err.error || 'Check-in failed')
        setIsSubmitting(false)
        return
      }

      const checkInData = await checkInRes.json()
      setCheckedInReservation(checkInData.reservation)
      setShowSuccessDialog(true)
      toast.success('Check-in completed successfully!')
    } catch (err) {
      console.error('Check-in error:', err)
      toast.error('An error occurred during check-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    // Auto-open Room Rate Posting dialog
    if (checkedInReservation && selectedRoom) {
      setShowRatePostingDialog(true)
    } else {
      navigateTo('front-desk', 'in-house')
    }
  }

  const handleRatePostingClose = () => {
    setShowRatePostingDialog(false)
    navigateTo('front-desk', 'in-house')
  }

  // ─── Loading state ─────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-32">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('front-desk', 'arrivals')}
          className="shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isWalkIn ? 'Direct Walk-in Check-in' : 'Guest Check-in'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isWalkIn ? 'Create a new walk-in reservation and check in' : `Processing reservation ${reservation?.confirmationNo || ''}`}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 w-full overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          return (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    'flex items-center justify-center size-9 rounded-full border-2 text-sm font-semibold transition-all',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-muted-foreground/30 text-muted-foreground bg-background'
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : <StepIcon className="size-4" />}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:inline',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 min-w-[2rem] mx-2 transition-all',
                    index < currentStep ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {React.createElement(STEPS[currentStep].icon, { className: 'size-5 text-primary' })}
            {STEPS[currentStep].label}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 && (isWalkIn ? 'Enter guest details to create a walk-in reservation' : 'Review and verify the reservation information')}
            {currentStep === 1 && 'Select a room and configure pricing for the stay'}
            {currentStep === 2 && 'Collect or verify guest identification documents'}
            {currentStep === 3 && 'Record any advance payment for the reservation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ─── Step 1: Reservation Details ────────────────────── */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {isWalkIn ? (
                <>
                  {/* Walk-in guest search / create */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Label className="mb-1.5 block">Search Existing Guest</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, phone, or email..."
                          value={guestSearchQuery}
                          onChange={(e) => setGuestSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                        {isSearchingGuest && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {guestSearchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {guestSearchResults.map(guest => (
                            <button
                              key={guest.id}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                              onClick={() => handleSelectExistingGuest(guest)}
                            >
                              <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {guest.firstName[0]}{guest.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {guest.firstName} {guest.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {guest.phone || 'No phone'} {guest.email ? `| ${guest.email}` : ''}
                                </p>
                              </div>
                              {guest.vipLevel && guest.vipLevel !== 'none' && (
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  <Star className="size-3 mr-1" />{guest.vipLevel}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedExistingGuest && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <BadgeCheck className="size-5 text-emerald-600" />
                        <span className="text-sm font-medium">
                          {selectedExistingGuest.firstName} {selectedExistingGuest.lastName}
                        </span>
                        <Badge variant="secondary" className="text-xs">Existing Guest</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            setSelectedExistingGuest(null)
                            setWalkInGuest({ firstName: '', lastName: '', phone: '', email: '' })
                            setExistingDocuments([])
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>First Name *</Label>
                        <Input
                          placeholder="First name"
                          value={walkInGuest.firstName}
                          onChange={(e) => setWalkInGuest(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Last Name *</Label>
                        <Input
                          placeholder="Last name"
                          value={walkInGuest.lastName}
                          onChange={(e) => setWalkInGuest(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          placeholder="+977-98XXXXXXXX"
                          value={walkInGuest.phone}
                          onChange={(e) => setWalkInGuest(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="guest@email.com"
                          value={walkInGuest.email}
                          onChange={(e) => setWalkInGuest(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="outline" className="font-normal">
                        <Building2 className="size-3.5 mr-1" /> Walk-in
                      </Badge>
                      <span className="text-sm text-muted-foreground">Direct walk-in reservation will be created</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Reservation summary card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Hash className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Reservation No.</span>
                        <span className="text-sm font-semibold ml-auto">{reservation?.confirmationNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="ml-auto capitalize text-xs">
                          {reservation?.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Source</span>
                        <span className="text-sm font-medium ml-auto capitalize">{reservation?.source?.replace('_', ' ') || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Guest</span>
                        <span className="text-sm font-medium ml-auto">
                          {reservation?.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'N/A'}
                          {reservation?.guest?.vipLevel && reservation.guest.vipLevel !== 'none' && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              <Star className="size-3 mr-0.5" />{reservation.guest.vipLevel}
                            </Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <span className="text-sm font-medium ml-auto">{reservation?.guest?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium ml-auto truncate max-w-[200px]">{reservation?.guest?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BedDouble className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Room Type</span>
                        <span className="text-sm font-medium ml-auto">{reservation?.room?.type?.name || 'Not assigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BedDouble className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Room Number</span>
                        <span className="text-sm font-medium ml-auto">{reservation?.room?.number || 'Not assigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Adults / Children</span>
                        <span className="text-sm font-medium ml-auto">
                          {reservation?.adults || 0} / {reservation?.children || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Check-in</span>
                        <span className="text-sm font-medium ml-auto">{reservation?.checkIn ? formatDate(reservation.checkIn) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Check-out</span>
                        <span className="text-sm font-medium ml-auto">{reservation?.checkOut ? formatDate(reservation.checkOut) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Nights</span>
                        <span className="text-sm font-medium ml-auto">
                          {reservation?.checkIn && reservation?.checkOut
                            ? nightsBetween(reservation.checkIn, reservation.checkOut)
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Room Rate</span>
                      <span className="text-sm font-semibold ml-auto">{formatCurrency(reservation?.roomRate || 0)}/night</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                      <span className="text-sm font-semibold ml-auto">{formatCurrency(reservation?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Paid</span>
                      <span className="text-sm font-semibold ml-auto">{formatCurrency(reservation?.paidAmount || 0)}</span>
                    </div>
                  </div>

                  {reservation?.specialRequests && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Special Requests</p>
                      <p className="text-sm text-amber-900 dark:text-amber-100">{reservation.specialRequests}</p>
                    </div>
                  )}

                  {/* Verify checkbox */}
                  <div className="flex items-start gap-3 pt-3 border-t">
                    <Checkbox
                      id="verify-details"
                      checked={detailsVerified}
                      onCheckedChange={(checked) => setDetailsVerified(checked === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor="verify-details" className="cursor-pointer font-medium">
                        I confirm the reservation details are correct
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Verify all guest information, dates, room assignment, and rates before proceeding.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 2: Choose Room & Price ────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Currently assigned room */}
              {reservation?.room && !showRoomSelector && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Assigned Room</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRoomSelector(true)}
                    >
                      Change Room
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Room</p>
                      <p className="text-sm font-bold">{reservation.room.number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{reservation.room.type?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Floor</p>
                      <p className="text-sm font-medium">{reservation.room.floor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">View</p>
                      <p className="text-sm font-medium">{reservation.room.type?.view || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Room selector */}
              {(showRoomSelector || !reservation?.room) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Available Rooms</p>
                    <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="All Room Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Room Types</SelectItem>
                        {roomTypeOptions.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name} ({rt.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredRooms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BedDouble className="size-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No available rooms found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                      {filteredRooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => handleSelectRoom(room)}
                          className={cn(
                            'text-left p-3 border rounded-lg transition-all hover:shadow-md',
                            selectedRoom?.id === room.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:border-primary/40'
                          )}
                        >
                          <p className="text-lg font-bold">{room.number}</p>
                          <p className="text-xs text-muted-foreground">{room.type.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground">Floor {room.floor}</span>
                            {room.wing && (
                              <>
                                <span className="text-xs text-muted-foreground/40">|</span>
                                <span className="text-xs text-muted-foreground">{room.wing}</span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedRoom && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Selected Room</Label>
                      <p className="text-base font-bold text-primary">{selectedRoom.number}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Room Type</Label>
                      <p className="text-sm font-medium">{selectedRoom.type.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Floor</Label>
                      <p className="text-sm font-medium">Floor {selectedRoom.floor}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Wing</Label>
                      <p className="text-sm font-medium">{selectedRoom.wing || 'N/A'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Room Rate (per night)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">NPR</span>
                        <Input
                          type="number"
                          min={0}
                          value={roomRate || ''}
                          onChange={(e) => setRoomRate(parseFloat(e.target.value) || 0)}
                          className="pl-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rate Plan</Label>
                      <Select value={ratePlan} onValueChange={setRatePlan}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_PLANS.map(rp => (
                            <SelectItem key={rp.value} value={rp.value}>{rp.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check-in Date</Label>
                      <Input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check-out Date</Label>
                      <Input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        min={checkInDate}
                      />
                    </div>
                  </div>

                  {/* Total breakdown */}
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {nights} night{nights !== 1 ? 's' : ''} × {formatCurrency(roomRate)}
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(subtotalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tax ({settings.taxRate}%)</span>
                      <span className="text-sm font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Service Charge ({settings.serviceCharge}%)</span>
                      <span className="text-sm font-medium">{formatCurrency(serviceChargeAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold">Grand Total</span>
                      <span className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 3: Guest Documents ────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Existing documents on file */}
              {existingDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <BadgeCheck className="size-4 text-emerald-600" />
                    Documents on File ({existingDocuments.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {existingDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium capitalize">
                              {doc.docType.replace('_', ' ')}
                            </p>
                            {doc.verified && (
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Verified ✓
                              </Badge>
                            )}
                          </div>
                          {doc.docNumber && (
                            <p className="text-xs text-muted-foreground">No: {doc.docNumber}</p>
                          )}
                          {doc.docName && (
                            <p className="text-xs text-muted-foreground">Name: {doc.docName}</p>
                          )}
                          {doc.expiryDate && (
                            <p className="text-xs text-muted-foreground">Expires: {formatDate(doc.expiryDate)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="docs-on-file-skip"
                      checked={docsOnFileSkipped}
                      onCheckedChange={(checked) => setDocsOnFileSkipped(checked === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor="docs-on-file-skip" className="cursor-pointer font-medium text-sm">
                        Documents already on file — skip for this stay
                      </Label>
                    </div>
                  </div>
                  <Separator />
                </div>
              )}

              {/* Add new document form */}
              {!docsOnFileSkipped && (
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Plus className="size-4" />
                    {existingDocuments.length > 0 ? 'Add Additional Document' : 'Add Guest Document'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Document Type *</Label>
                      <Select value={docForm.docType} onValueChange={(v) => setDocForm(prev => ({ ...prev, docType: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map(dt => (
                            <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Document Number</Label>
                      <Input
                        placeholder="e.g., PA1234567"
                        value={docForm.docNumber}
                        onChange={(e) => setDocForm(prev => ({ ...prev, docNumber: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Name on Document</Label>
                      <Input
                        placeholder="Full name as on document"
                        value={docForm.docName}
                        onChange={(e) => setDocForm(prev => ({ ...prev, docName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Issuing Country</Label>
                      <Input
                        placeholder="e.g., Nepal"
                        value={docForm.issuingCountry}
                        onChange={(e) => setDocForm(prev => ({ ...prev, issuingCountry: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Issue Date</Label>
                      <Input
                        type="date"
                        value={docForm.issueDate}
                        onChange={(e) => setDocForm(prev => ({ ...prev, issueDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={docForm.expiryDate}
                        onChange={(e) => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Issuing Authority</Label>
                      <Input
                        placeholder="e.g., Ministry of Foreign Affairs"
                        value={docForm.issuingAuthority}
                        onChange={(e) => setDocForm(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Any additional notes..."
                        value={docForm.notes}
                        onChange={(e) => setDocForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddDocument} disabled={isAddingDoc} size="sm">
                    {isAddingDoc ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />}
                    Add Document
                  </Button>
                </div>
              )}

              {/* Added documents list */}
              {addedDocuments.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-sm font-medium">Documents Added This Session</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {addedDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium capitalize">{doc.docType.replace('_', ' ')}</p>
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          </div>
                          {doc.docNumber && <p className="text-xs text-muted-foreground">No: {doc.docNumber}</p>}
                          {doc.docName && <p className="text-xs text-muted-foreground">Name: {doc.docName}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAddedDocument(doc.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="doc-skipped"
                  checked={docSkipped}
                  onCheckedChange={(checked) => setDocSkipped(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="doc-skipped" className="cursor-pointer font-medium text-sm">
                    Skip Documents for Now
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Guest will be reminded to provide documents during their stay.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 4: Advance Payment ────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(isWalkIn ? grandTotal : (reservation?.totalAmount || 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Previously Paid</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(isWalkIn ? 0 : (reservation?.paidAmount || 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
                  <p className={cn(
                    'text-lg font-bold',
                    balanceDue > 0 ? 'text-destructive' : 'text-emerald-600'
                  )}>
                    {formatCurrency(Math.max(0, balanceDue))}
                  </p>
                </div>
              </div>

              <Separator />

              {!noAdvance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Advance Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">NPR</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        className="pl-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(pm => (
                          <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reference / Receipt No.</Label>
                    <Input
                      placeholder="e.g., RCP-001234"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Payment notes..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Quick amounts */}
              {!noAdvance && (
                <div className="flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000, 10000, 20000].map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAdvanceAmount(String(amount))}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
              )}

              <Separator />

              {/* Updated balance summary */}
              {!noAdvance && effectiveAdvance > 0 && (
                <div className="p-4 border rounded-lg bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total</span>
                    <span className="text-sm font-medium">{formatCurrency(isWalkIn ? grandTotal : (reservation?.totalAmount || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Previously Paid</span>
                    <span className="text-sm font-medium text-emerald-600">- {formatCurrency(isWalkIn ? 0 : (reservation?.paidAmount || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Advance Payment</span>
                    <span className="text-sm font-medium text-emerald-600">- {formatCurrency(effectiveAdvance)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Balance Due</span>
                    <span className={cn(
                      'text-sm font-bold',
                      balanceDue <= 0 ? 'text-emerald-600' : 'text-destructive'
                    )}>
                      {balanceDue <= 0 ? 'Fully Paid!' : formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="no-advance"
                  checked={noAdvance}
                  onCheckedChange={(checked) => setNoAdvance(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="no-advance" className="cursor-pointer font-medium text-sm">
                    No advance payment at this time
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The guest will be billed during or after their stay.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Footer Navigation ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t px-4 md:px-6 py-3 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ArrowLeft className="size-4 mr-1.5" />
            Back
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          {currentStep < 3 ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={handleCompleteCheckIn}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              Complete Check-in
            </Button>
          )}
        </div>
      </div>

      {/* ─── Success Dialog ───────────────────────────────────────── */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-4 flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Check className="size-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">Check-in Successful</DialogTitle>
            <DialogDescription className="text-center mt-2">
              The guest has been checked in successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Guest</span>
              <span className="text-sm font-medium">
                {reservation?.guest
                  ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
                  : `${walkInGuest.firstName} ${walkInGuest.lastName}`}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Room</span>
              <span className="text-sm font-bold text-primary">{selectedRoom?.number || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Confirmation</span>
              <span className="text-sm font-medium">{checkedInReservation?.confirmationNo || reservation?.confirmationNo || 'N/A'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSuccessDialogClose} className="w-full">
              Post Room Rates
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room Rate Posting Dialog ──────────────────────────────── */}
      <RoomRatePostingDialog
        open={showRatePostingDialog}
        onOpenChange={handleRatePostingClose}
        reservationId={reservationId || checkedInReservation?.id || ''}
        roomId={selectedRoom?.id || ''}
        roomNumber={selectedRoom?.number || ''}
        roomRate={roomRate}
        checkIn={checkInDate}
        checkOut={checkOutDate}
        guestId={reservation?.guestId || selectedExistingGuest?.id || ''}
        guestName={reservation?.guest
          ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
          : `${walkInGuest.firstName} ${walkInGuest.lastName}`
        }
        folioId={checkedInReservation?.folios?.[0]?.id}
      />
    </div>
  )
}