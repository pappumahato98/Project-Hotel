'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  ArrowLeft, CalendarPlus, User, Users, Building2, Plane,
  BedDouble, CreditCard, FileText, Sparkles, ChevronDown,
  Search, X, Loader2, CheckCircle2, AlertCircle, Phone,
  Mail, Globe, MapPin, Clock, Hash, BadgePercent, Crown,
  Building, Briefcase, Hotel,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDate, formatCurrency, nightsBetween, getTodayString } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { StepIndicator, StepContent, StepNav, type StepConfig } from '@/components/shared/step-indicator'

// ─── Types ────────────────────────────────────────────────────────────────

interface NewReservationPageProps {
  onBack?: () => void
  onCreated?: (reservation: any) => void
}

interface RoomData {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  typeId: string
  type: {
    id: string
    name: string
    code: string
    baseOccupancy: number
    maxOccupancy: number
    bedConfig: string
    areaSqFt: number | null
    view: string | null
    amenities: string | null
  }
}

interface RoomTypeData {
  id: string
  name: string
  code: string
  description: string | null
  baseOccupancy: number
  maxOccupancy: number
  bedConfig: string
  ratePlans: Array<{
    id: string
    name: string
    code: string
    baseRate: number
    channel: string | null
  }>
  roomCount: number
}

interface GuestData {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  vipLevel: string
  gender?: string | null
  dateOfBirth?: string | null
  idType?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

const NATIONALITIES = [
  'Nepal', 'India', 'China', 'USA', 'UK', 'Japan', 'Australia', 'Germany',
  'France', 'Canada', 'South Korea', 'Thailand', 'Bangladesh', 'Sri Lanka',
  'Malaysia', 'Singapore', 'UAE', 'Saudi Arabia', 'Netherlands', 'Italy',
  'Spain', 'Switzerland', 'Russia', 'Brazil', 'Mexico', 'South Africa',
  'Other',
]

const COUNTRIES = [
  'Nepal', 'India', 'China', 'United States', 'United Kingdom', 'Japan',
  'Australia', 'Germany', 'France', 'Canada', 'South Korea', 'Thailand',
  'Bangladesh', 'Sri Lanka', 'Malaysia', 'Singapore', 'UAE', 'Saudi Arabia',
  'Netherlands', 'Italy', 'Spain', 'Switzerland', 'Russia', 'Brazil', 'Other',
]

const ID_TYPES = ['Passport', 'National ID', 'Driver\'s License']

const VIP_LEVELS = [
  { value: 'none', label: 'None', color: 'bg-slate-100 text-slate-700' },
  { value: 'silver', label: 'Silver', color: 'bg-gray-100 text-gray-700' },
  { value: 'gold', label: 'Gold', color: 'bg-amber-50 text-amber-700' },
  { value: 'platinum', label: 'Platinum', color: 'bg-slate-50 text-slate-700 border border-slate-300' },
]

const RESERVATION_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'day_use', label: 'Day Use' },
]

const SOURCES = [
  { value: 'direct', label: 'Direct' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'travel_agent', label: 'Travel Agent' },
]

const VACANT_STATUSES = ['vacant_clean', 'vacant_dirty', 'inspected']

const STATUS_LABELS: Record<string, string> = {
  vacant_clean: 'Vacant Clean',
  vacant_dirty: 'Vacant Dirty',
  inspected: 'Inspected',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  out_of_order: 'Out of Order',
  on_change: 'Change Over',
}

const STATUS_COLORS: Record<string, string> = {
  vacant_clean: 'bg-emerald-500',
  vacant_dirty: 'bg-amber-500',
  inspected: 'bg-teal-500',
  occupied: 'bg-rose-500',
  cleaning: 'bg-yellow-500',
  out_of_order: 'bg-red-500',
  on_change: 'bg-orange-500',
}

const STEPS: StepConfig[] = [
  { label: 'Booking Contact', icon: Briefcase, optional: true },
  { label: 'Guest Information', icon: User },
  { label: 'Stay Details', icon: BedDouble },
  { label: 'Review & Confirm', icon: CheckCircle2 },
]

// ─── Helper ────────────────────────────────────────────────────────────────

function generatePreviewConfirmation(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'MRD-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── Component ────────────────────────────────────────────────────────────

export function NewReservationPage({ onBack, onCreated }: NewReservationPageProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // ── Wizard State ──
  const [currentStep, setCurrentStep] = useState(1)

  // ── Preview confirmation number ──
  const [previewConf, setPreviewConf] = useState(generatePreviewConfirmation)

  // ── Booking Contact State ──
  const [bookingContactType, setBookingContactType] = useState<'person' | 'company' | 'travel_agent'>('person')
  const [bookingContact, setBookingContact] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    companyName: '',
    companyAddress: '',
    city: '',
    country: '',
    taxId: '',
    website: '',
    contactPersonName: '',
    agentName: '',
    agencyName: '',
    iataNumber: '',
  })

  // ── Guest State ──
  const [guestSearchQuery, setGuestSearchQuery] = useState('')
  const [guestSearchOpen, setGuestSearchOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<GuestData | null>(null)
  const [createNewGuest, setCreateNewGuest] = useState(false)
  const [guestFields, setGuestFields] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    gender: '',
    idType: '',
    idNumber: '',
    address: '',
    city: '',
    country: '',
    vipLevel: 'none',
  })

  // ── Stay Details State ──
  const [reservationType, setReservationType] = useState('individual')
  const [source, setSource] = useState('direct')
  const [checkInDate, setCheckInDate] = useState<string>(getTodayString())
  const [checkOutDate, setCheckOutDate] = useState<string>('')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [roomSearchInput, setRoomSearchInput] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedRatePlanId, setSelectedRatePlanId] = useState('')
  const [roomRate, setRoomRate] = useState<number>(0)
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false)

  // ── Additional Info State ──
  const [specialRequests, setSpecialRequests] = useState('')
  const [addCompany, setAddCompany] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [guaranteed, setGuaranteed] = useState(false)
  const [notes, setNotes] = useState('')

  // ── Validation State ──
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Refs ──
  const roomDropdownRef = useRef<HTMLDivElement>(null)
  const guestSearchRef = useRef<HTMLDivElement>(null)

  // ── Data Fetching ──
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-for-reservation'],
    queryFn: () => apiFetch('/api/rooms'),
  })

  const { data: guestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ['guests-search', guestSearchQuery],
    queryFn: async () => {
      if (!guestSearchQuery.trim() || guestSearchQuery.trim().length < 2) return { guests: [] }
      return apiFetch(`/api/guests?search=${encodeURIComponent(guestSearchQuery.trim())}`)
    },
    enabled: guestSearchQuery.trim().length >= 2,
  })

  // ── Derived Data ──
  const rooms: RoomData[] = useMemo(() => roomsData?.rooms || [], [roomsData])
  const roomTypes: RoomTypeData[] = useMemo(() => roomsData?.roomTypes || [], [roomsData])

  const availableRooms = useMemo(() => {
    return rooms.filter((r) => VACANT_STATUSES.includes(r.status))
  }, [rooms])

  const filteredRooms = useMemo(() => {
    if (!roomSearchInput.trim()) return availableRooms
    const q = roomSearchInput.trim().toLowerCase()
    return availableRooms.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.type.name.toLowerCase().includes(q) ||
        r.floor.toString().includes(q)
    )
  }, [availableRooms, roomSearchInput])

  const guestSearchResults: GuestData[] = useMemo(() => guestsData?.guests || [], [guestsData])

  // ── Rate Plans for selected room type ──
  const ratePlansForType = useMemo(() => {
    if (!selectedRoomTypeId) return []
    const rt = roomTypes.find((t) => t.id === selectedRoomTypeId)
    return rt?.ratePlans || []
  }, [roomTypes, selectedRoomTypeId])

  // ── Calculated Nights ──
  const nights = useMemo(() => {
    if (checkInDate && checkOutDate) {
      return nightsBetween(checkInDate, checkOutDate)
    }
    return 0
  }, [checkInDate, checkOutDate])

  // ── Financial Calculations ──
  const taxRate = 13
  const subtotal = nights * roomRate
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  // ── Set default check-out date when check-in changes ──
  const handleCheckInChange = useCallback((date: string) => {
    setCheckInDate(date)
    if (date) {
      const tomorrow = new Date(date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      setCheckOutDate(tomorrow.toISOString().split('T')[0])
    }
  }, [])

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(e.target as Node)) {
        setRoomDropdownOpen(false)
      }
      if (guestSearchRef.current && !guestSearchRef.current.contains(e.target as Node)) {
        setGuestSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── When a room is selected, auto-populate room type and rate ──
  const handleRoomSelect = useCallback((room: RoomData) => {
    setSelectedRoom(room)
    setRoomSearchInput(room.number)
    setRoomDropdownOpen(false)
    setSelectedRoomTypeId(room.typeId)

    // Find first rate plan for this room type and set rate
    const rt = roomTypes.find((t) => t.id === room.typeId)
    if (rt && rt.ratePlans.length > 0) {
      setSelectedRatePlanId(rt.ratePlans[0].id)
      setRoomRate(rt.ratePlans[0].baseRate)
    }
  }, [roomTypes])

  // ── When rate plan changes, update rate ──
  const handleRatePlanChange = useCallback((ratePlanId: string) => {
    setSelectedRatePlanId(ratePlanId)
    const plan = ratePlansForType.find((p) => p.id === ratePlanId)
    if (plan) {
      setRoomRate(plan.baseRate)
    }
  }, [ratePlansForType])

  // ── When guest is selected, auto-fill ──
  const handleGuestSelect = useCallback((guest: GuestData) => {
    setSelectedGuest(guest)
    setCreateNewGuest(false)
    setGuestSearchOpen(false)
    setGuestSearchQuery(`${guest.firstName} ${guest.lastName}`)
    setGuestFields({
      title: '',
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || '',
      phone: guest.phone || '',
      nationality: guest.nationality || '',
      dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth).toISOString().split('T')[0] : '',
      gender: guest.gender || '',
      idType: guest.idType || '',
      idNumber: guest.idNumber || '',
      address: guest.address || '',
      city: guest.city || '',
      country: guest.country || '',
      vipLevel: guest.vipLevel || 'none',
    })
  }, [])

  // ── Reset guest fields when switching to new guest ──
  const handleCreateNewGuestToggle = useCallback(() => {
    setCreateNewGuest(true)
    setSelectedGuest(null)
    setGuestSearchQuery('')
    setGuestFields({
      title: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      dateOfBirth: '',
      gender: '',
      idType: '',
      idNumber: '',
      address: '',
      city: '',
      country: '',
      vipLevel: 'none',
    })
  }, [])

  // ── Clear selected guest ──
  const handleClearGuest = useCallback(() => {
    setSelectedGuest(null)
    setGuestSearchQuery('')
    setCreateNewGuest(false)
    setGuestFields({
      title: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      dateOfBirth: '',
      gender: '',
      idType: '',
      idNumber: '',
      address: '',
      city: '',
      country: '',
      vipLevel: 'none',
    })
  }, [])

  // ── Create Reservation Mutation ──
  const createReservation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return apiFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (data) => {
      toast.success('Reservation Created', {
        description: `Confirmation #${data.reservation.confirmationNo} has been created successfully.`,
      })
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-for-reservation'] })
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      onCreated?.(data.reservation)
      setPreviewConf(generatePreviewConfirmation())
    },
    onError: (err: Error) => {
      toast.error('Creation Failed', {
        description: err.message,
      })
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  // ── Validation ──
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}

    if (!guestFields.firstName.trim()) errs.guestFirstName = 'First name is required'
    if (!guestFields.lastName.trim()) errs.guestLastName = 'Last name is required'

    if (!checkInDate) errs.checkIn = 'Check-in date is required'
    if (!checkOutDate) errs.checkOut = 'Check-out date is required'
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      errs.checkOut = 'Check-out must be after check-in'
    }

    if (!selectedRoom && !selectedRoomTypeId) errs.room = 'Room or room type is required'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [guestFields.firstName, guestFields.lastName, checkInDate, checkOutDate, selectedRoom, selectedRoomTypeId])

  // ── Per-step validation for wizard navigation ──
  const validateStep = useCallback((step: number): boolean => {
    const errs: Record<string, string> = {}

    if (step === 2) {
      if (!guestFields.firstName.trim()) errs.guestFirstName = 'First name is required'
      if (!guestFields.lastName.trim()) errs.guestLastName = 'Last name is required'
    }

    if (step === 3) {
      if (!checkInDate) errs.checkIn = 'Check-in date is required'
      if (!checkOutDate) errs.checkOut = 'Check-out date is required'
      if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
        errs.checkOut = 'Check-out must be after check-in'
      }
      if (!selectedRoom && !selectedRoomTypeId) errs.room = 'Room or room type is required'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [guestFields.firstName, guestFields.lastName, checkInDate, checkOutDate, selectedRoom, selectedRoomTypeId])

  // ── Wizard Navigation ──
  const handleStepClick = useCallback((step: number) => {
    // Allow clicking only on completed or current steps
    if (step < currentStep) {
      setErrors({})
      setCurrentStep(step)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
    // Validate current step before advancing
    if (validateStep(currentStep)) {
      setErrors({})
      setCurrentStep((s) => Math.min(s + 1, 4))
    } else {
      toast.error('Validation Error', { description: 'Please fill in all required fields before continuing.' })
    }
  }, [currentStep, validateStep])

  const handleBack = useCallback(() => {
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
  }, [])

  // ── Submit Handler ──
  const handleSubmit = useCallback(() => {
    if (!validate()) {
      toast.error('Validation Error', { description: 'Please fill in all required fields.' })
      return
    }
    setIsSubmitting(true)

    // Build booking contact object
    const bookingContactPayload: Record<string, unknown> = {
      contactType: bookingContactType,
    }
    if (bookingContactType === 'person') {
      bookingContactPayload.salutation = bookingContact.salutation || null
      bookingContactPayload.firstName = bookingContact.firstName || null
      bookingContactPayload.lastName = bookingContact.lastName || null
      bookingContactPayload.email = bookingContact.email || null
      bookingContactPayload.phone = bookingContact.phone || null
      bookingContactPayload.mobile = bookingContact.mobile || null
    } else if (bookingContactType === 'company') {
      bookingContactPayload.companyName = bookingContact.companyName || null
      bookingContactPayload.companyAddress = bookingContact.companyAddress || null
      bookingContactPayload.city = bookingContact.city || null
      bookingContactPayload.country = bookingContact.country || null
      bookingContactPayload.firstName = bookingContact.contactPersonName || null
      bookingContactPayload.email = bookingContact.email || null
      bookingContactPayload.phone = bookingContact.phone || null
      bookingContactPayload.taxId = bookingContact.taxId || null
      bookingContactPayload.website = bookingContact.website || null
    } else if (bookingContactType === 'travel_agent') {
      bookingContactPayload.firstName = bookingContact.agentName || null
      bookingContactPayload.companyName = bookingContact.agencyName || null
      bookingContactPayload.email = bookingContact.email || null
      bookingContactPayload.phone = bookingContact.phone || null
      bookingContactPayload.notes = bookingContact.iataNumber || null
    }

    createReservation.mutate({
      guestId: selectedGuest?.id || null,
      roomId: selectedRoom?.id || null,
      roomTypeId: selectedRoomTypeId || null,
      ratePlanId: selectedRatePlanId || null,
      reservationType,
      source,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults,
      children,
      roomRate,
      specialRequests: specialRequests || null,
      company: addCompany || null,
      poNumber: poNumber || null,
      guaranteed,
      notes: notes || null,
      bookedBy: user ? `${user.firstName} ${user.lastName}` : 'System',
      bookingContact: bookingContactPayload,
    })
  }, [
    validate, selectedGuest, selectedRoom, selectedRoomTypeId, selectedRatePlanId,
    reservationType, source, checkInDate, checkOutDate, adults, children, roomRate,
    specialRequests, addCompany, poNumber, guaranteed, notes, user,
    bookingContactType, bookingContact, createReservation,
  ])

  // ── Update guest field helper ──
  const updateGuestField = useCallback((field: string, value: string) => {
    setGuestFields((prev) => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[`guest${field}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`guest${field}`]
        return next
      })
    }
  }, [errors])

  // ──────────────────────────────────────────────────────────────────────
  //  REVIEW HELPERS
  // ──────────────────────────────────────────────────────────────────────

  const bookingContactLabel = useMemo(() => {
    if (bookingContactType === 'person') {
      const parts = [bookingContact.salutation, bookingContact.firstName, bookingContact.lastName].filter(Boolean)
      return parts.length > 0 ? parts.join(' ') : '—'
    }
    if (bookingContactType === 'company') {
      return bookingContact.companyName || '—'
    }
    if (bookingContactType === 'travel_agent') {
      const parts = [bookingContact.agentName, bookingContact.agencyName].filter(Boolean)
      return parts.length > 0 ? parts.join(' — ') : '—'
    }
    return '—'
  }, [bookingContactType, bookingContact])

  const selectedRatePlan = useMemo(() => {
    if (!selectedRatePlanId) return null
    const rt = roomTypes.find((t) => t.id === selectedRoomTypeId)
    return rt?.ratePlans.find((p) => p.id === selectedRatePlanId) || null
  }, [selectedRatePlanId, selectedRoomTypeId, roomTypes])

  const selectedRoomType = useMemo(() => {
    if (selectedRoom) return selectedRoom.type.name
    if (selectedRoomTypeId) {
      const rt = roomTypes.find((t) => t.id === selectedRoomTypeId)
      return rt?.name || '—'
    }
    return '—'
  }, [selectedRoom, selectedRoomTypeId, roomTypes])

  const reservationTypeLabel = RESERVATION_TYPES.find((t) => t.value === reservationType)?.label || reservationType
  const sourceLabel = SOURCES.find((s) => s.value === source)?.label || source

  // ──────────────────────────────────────────────────────────────────────
  //  STEP RENDERERS
  // ──────────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <StepContent
      title="Booking Contact"
      description="Who is making this reservation? (Optional)"
      icon={Briefcase}
    >
      <Tabs value={bookingContactType} onValueChange={(v) => setBookingContactType(v as typeof bookingContactType)}>
        <TabsList className="h-8">
          <TabsTrigger value="person" className="text-xs px-3 h-7">
            <User className="h-3 w-3 mr-1" /> Person
          </TabsTrigger>
          <TabsTrigger value="company" className="text-xs px-3 h-7">
            <Building2 className="h-3 w-3 mr-1" /> Company
          </TabsTrigger>
          <TabsTrigger value="travel_agent" className="text-xs px-3 h-7">
            <Plane className="h-3 w-3 mr-1" /> Travel Agent
          </TabsTrigger>
        </TabsList>

        {/* Person Tab */}
        <TabsContent value="person" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Salutation</Label>
              <Select
                value={bookingContact.salutation}
                onValueChange={(v) => setBookingContact((p) => ({ ...p, salutation: v }))}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">First Name</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.firstName}
                onChange={(e) => setBookingContact((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.lastName}
                onChange={(e) => setBookingContact((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={bookingContact.email}
                onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.phone}
                onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+977-1-..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Mobile
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.mobile}
                onChange={(e) => setBookingContact((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="+977-98..."
              />
            </div>
          </div>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.companyName}
                onChange={(e) => setBookingContact((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company Address</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.companyAddress}
                onChange={(e) => setBookingContact((p) => ({ ...p, companyAddress: e.target.value }))}
                placeholder="123 Business St"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.city}
                onChange={(e) => setBookingContact((p) => ({ ...p, city: e.target.value }))}
                placeholder="Kathmandu"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Country</Label>
              <Select
                value={bookingContact.country}
                onValueChange={(v) => setBookingContact((p) => ({ ...p, country: v }))}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Person Name</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.contactPersonName}
                onChange={(e) => setBookingContact((p) => ({ ...p, contactPersonName: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={bookingContact.email}
                onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.phone}
                onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+977-1-..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="h-3 w-3" /> Tax ID (VAT/PAN)
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.taxId}
                onChange={(e) => setBookingContact((p) => ({ ...p, taxId: e.target.value }))}
                placeholder="123456789"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.website}
                onChange={(e) => setBookingContact((p) => ({ ...p, website: e.target.value }))}
                placeholder="www.company.com"
              />
            </div>
          </div>
        </TabsContent>

        {/* Travel Agent Tab */}
        <TabsContent value="travel_agent" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Agent Name</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.agentName}
                onChange={(e) => setBookingContact((p) => ({ ...p, agentName: e.target.value }))}
                placeholder="Agent full name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Agency Name</Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.agencyName}
                onChange={(e) => setBookingContact((p) => ({ ...p, agencyName: e.target.value }))}
                placeholder="Travel Agency Inc."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={bookingContact.email}
                onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="agent@agency.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.phone}
                onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+977-..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="h-3 w-3" /> IATA Number
              </Label>
              <Input
                className="h-8 text-xs"
                value={bookingContact.iataNumber}
                onChange={(e) => setBookingContact((p) => ({ ...p, iataNumber: e.target.value }))}
                placeholder="IATA-XXXXX"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </StepContent>
  )

  const renderStep2 = () => (
    <StepContent
      title="Guest Information"
      description="Search for an existing guest or create a new profile"
      icon={User}
    >
      <div className="space-y-4">
        {/* Guest Search */}
        <div className="relative" ref={guestSearchRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-xs pl-8 pr-8"
                placeholder="Search guest by name, email, or phone..."
                value={selectedGuest && !createNewGuest ? guestSearchQuery : guestSearchQuery}
                onChange={(e) => {
                  setGuestSearchQuery(e.target.value)
                  setGuestSearchOpen(true)
                  if (selectedGuest) setSelectedGuest(null)
                }}
                onFocus={() => setGuestSearchOpen(true)}
                disabled={createNewGuest}
              />
              {(guestSearchQuery || selectedGuest) && !createNewGuest && (
                <button
                  onClick={handleClearGuest}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!createNewGuest && (
              <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={handleCreateNewGuestToggle}>
                <User className="h-3 w-3 mr-1" /> New Guest
              </Button>
            )}
            {createNewGuest && (
              <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={handleClearGuest}>
                <Search className="h-3 w-3 mr-1" /> Search Existing
              </Button>
            )}
          </div>

          {/* Guest Search Dropdown */}
          {guestSearchOpen && !createNewGuest && guestSearchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
              {guestSearchResults.map((guest) => (
                <button
                  key={guest.id}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-left text-xs border-b last:border-0"
                  onClick={() => handleGuestSelect(guest)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {guest.firstName} {guest.lastName}
                    </span>
                    {guest.email && (
                      <span className="text-muted-foreground truncate">{guest.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {guest.phone && <span className="text-muted-foreground">{guest.phone}</span>}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {guest.vipLevel}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
          {guestSearchOpen && !createNewGuest && guestSearchQuery.length >= 2 && guestsLoading && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs text-muted-foreground">Searching...</span>
            </div>
          )}
          {guestSearchOpen && !createNewGuest && guestSearchQuery.length >= 2 && !guestsLoading && guestSearchResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-center">
              <p className="text-xs text-muted-foreground">No guests found. Click &quot;New Guest&quot; to create one.</p>
            </div>
          )}
        </div>

        {/* Selected Guest Indicator */}
        {selectedGuest && !createNewGuest && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs text-emerald-700">
              Guest selected: <strong>{selectedGuest.firstName} {selectedGuest.lastName}</strong>
              {selectedGuest.vipLevel !== 'none' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                  {selectedGuest.vipLevel}
                </Badge>
              )}
            </span>
          </div>
        )}

        {createNewGuest && (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <span className="text-xs text-amber-700">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Creating new guest profile
            </span>
          </div>
        )}

        <Separator />

        {/* Guest Details Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Select value={guestFields.title} onValueChange={(v) => updateGuestField('title', v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr">Mr</SelectItem>
                <SelectItem value="Ms">Ms</SelectItem>
                <SelectItem value="Mrs">Mrs</SelectItem>
                <SelectItem value="Dr">Dr</SelectItem>
                <SelectItem value="Prof">Prof</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-8 text-xs", errors.guestFirstName && "border-red-500")}
              value={guestFields.firstName}
              onChange={(e) => updateGuestField('firstName', e.target.value)}
              placeholder="Rajesh"
            />
            {errors.guestFirstName && (
              <p className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.guestFirstName}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-8 text-xs", errors.guestLastName && "border-red-500")}
              value={guestFields.lastName}
              onChange={(e) => updateGuestField('lastName', e.target.value)}
              placeholder="Sharma"
            />
            {errors.guestLastName && (
              <p className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.guestLastName}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              className="h-8 text-xs"
              type="email"
              value={guestFields.email}
              onChange={(e) => updateGuestField('email', e.target.value)}
              placeholder="guest@email.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone
            </Label>
            <Input
              className="h-8 text-xs"
              value={guestFields.phone}
              onChange={(e) => updateGuestField('phone', e.target.value)}
              placeholder="+977-98..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" /> Nationality
            </Label>
            <Select value={guestFields.nationality} onValueChange={(v) => updateGuestField('nationality', v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {NATIONALITIES.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date of Birth</Label>
            <Input
              className="h-8 text-xs"
              type="date"
              value={guestFields.dateOfBirth}
              onChange={(e) => updateGuestField('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gender</Label>
            <Select value={guestFields.gender} onValueChange={(v) => updateGuestField('gender', v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID Type</Label>
            <Select value={guestFields.idType} onValueChange={(v) => updateGuestField('idType', v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID Number</Label>
            <Input
              className="h-8 text-xs"
              value={guestFields.idNumber}
              onChange={(e) => updateGuestField('idNumber', e.target.value)}
              placeholder="ID number"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Address
            </Label>
            <Input
              className="h-8 text-xs"
              value={guestFields.address}
              onChange={(e) => updateGuestField('address', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input
              className="h-8 text-xs"
              value={guestFields.city}
              onChange={(e) => updateGuestField('city', e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Country</Label>
            <Select value={guestFields.country} onValueChange={(v) => updateGuestField('country', v)}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-1">
            <Label className="text-xs flex items-center gap-1">
              <Crown className="h-3 w-3" /> VIP Level
            </Label>
            <div className="flex gap-2 flex-wrap">
              {VIP_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => updateGuestField('vipLevel', lvl.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors",
                    guestFields.vipLevel === lvl.value
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StepContent>
  )

  const renderStep3 = () => (
    <StepContent
      title="Stay Details"
      description="Select dates, room, and rate plan"
      icon={BedDouble}
    >
      <div className="space-y-4">
        {/* Reservation Type & Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Reservation Type</Label>
            <Select value={reservationType} onValueChange={setReservationType}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESERVATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> Check-in Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 w-full justify-start text-xs font-normal",
                    !checkInDate && "text-muted-foreground",
                    errors.checkIn && "border-red-500"
                  )}
                >
                  {checkInDate ? formatDate(checkInDate) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate ? new Date(checkInDate) : undefined}
                  onSelect={(date) => date && handleCheckInChange(date.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.checkIn && (
              <p className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.checkIn}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> Check-out Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 w-full justify-start text-xs font-normal",
                    !checkOutDate && "text-muted-foreground",
                    errors.checkOut && "border-red-500"
                  )}
                >
                  {checkOutDate ? formatDate(checkOutDate) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOutDate ? new Date(checkOutDate) : undefined}
                  onSelect={(date) => date && setCheckOutDate(date.toISOString().split('T')[0])}
                  disabledDate={(date) => checkInDate ? date < new Date(checkInDate) : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.checkOut && (
              <p className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.checkOut}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nights</Label>
            <div className="h-8 flex items-center px-3 bg-muted rounded-md border">
              <span className={cn(
                "text-sm font-semibold",
                nights > 0 ? "text-amber-600" : "text-muted-foreground"
              )}>
                {nights || '—'}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {nights === 1 ? 'night' : nights > 1 ? 'nights' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Adults & Children */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Adults
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAdults((a) => Math.max(1, a - 1))}
              >
                -
              </Button>
              <Input
                className="h-8 w-16 text-center text-sm"
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAdults((a) => a + 1)}
              >
                +
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Children
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setChildren((c) => Math.max(0, c - 1))}
              >
                -
              </Button>
              <Input
                className="h-8 w-16 text-center text-sm"
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setChildren((c) => c + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Room Number with Autocomplete */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Hotel className="h-3 w-3" /> Room Number
          </Label>
          <div className="relative" ref={roomDropdownRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className={cn(
                  "h-8 text-xs pl-8 pr-8",
                  errors.room && !selectedRoom && "border-red-500"
                )}
                placeholder="Type room number to search (e.g., 201, 302)..."
                value={roomSearchInput}
                onChange={(e) => {
                  setRoomSearchInput(e.target.value)
                  setRoomDropdownOpen(true)
                  if (selectedRoom) {
                    setSelectedRoom(null)
                    setSelectedRoomTypeId('')
                    setSelectedRatePlanId('')
                    setRoomRate(0)
                  }
                }}
                onFocus={() => setRoomDropdownOpen(true)}
              />
              {selectedRoom && (
                <button
                  onClick={() => {
                    setSelectedRoom(null)
                    setRoomSearchInput('')
                    setSelectedRoomTypeId('')
                    setSelectedRatePlanId('')
                    setRoomRate(0)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Room Dropdown */}
            {roomDropdownOpen && !selectedRoom && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-64 overflow-y-auto">
                {roomsLoading ? (
                  <div className="p-3 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-xs text-muted-foreground">Loading rooms...</span>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">No available rooms found</p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/30">
                      {filteredRooms.length} available room{filteredRooms.length !== 1 ? 's' : ''}
                    </div>
                    {filteredRooms.map((room) => (
                      <button
                        key={room.id}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-xs border-b last:border-0"
                        onClick={() => handleRoomSelect(room)}
                      >
                        <span className={cn("shrink-0 h-2 w-2 rounded-full", STATUS_COLORS[room.status])} />
                        <span className="font-mono font-medium w-10">{room.number}</span>
                        <span className="text-muted-foreground truncate">
                          {room.type.name} &middot; Floor {room.floor}
                          {room.wing && <span> &middot; {room.wing} Wing</span>}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-auto shrink-0">
                          {STATUS_LABELS[room.status]}
                        </Badge>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selected Room Info */}
          {selectedRoom && (
            <div className="mt-1.5 flex items-start gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-700 space-y-0.5">
                <p>
                  <strong className="font-mono">{selectedRoom.number}</strong> — {selectedRoom.type.name}
                </p>
                <p className="text-emerald-600">
                  Room Type: {selectedRoom.type.name} | Floor: {selectedRoom.floor}
                  {selectedRoom.wing && ` | Wing: ${selectedRoom.wing}`}
                </p>
              </div>
            </div>
          )}
          {errors.room && !selectedRoom && (
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{errors.room}
            </p>
          )}
        </div>

        {/* Room Type & Rate Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Room Type</Label>
            <Select
              value={selectedRoomTypeId}
              onValueChange={(v) => {
                setSelectedRoomTypeId(v)
                // Clear room selection if manually changing type
                if (selectedRoom && selectedRoom.typeId !== v) {
                  setSelectedRoom(null)
                  setRoomSearchInput('')
                }
                // Auto-select first rate plan
                const rt = roomTypes.find((t) => t.id === v)
                if (rt && rt.ratePlans.length > 0) {
                  setSelectedRatePlanId(rt.ratePlans[0].id)
                  setRoomRate(rt.ratePlans[0].baseRate)
                } else {
                  setSelectedRatePlanId('')
                  setRoomRate(0)
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} ({rt.code}) — {rt.bedConfig} — {rt.roomCount} rooms
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <BadgePercent className="h-3 w-3" /> Rate Plan
            </Label>
            <Select
              value={selectedRatePlanId}
              onValueChange={handleRatePlanChange}
              disabled={ratePlansForType.length === 0}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder={ratePlansForType.length === 0 ? 'Select room type first' : 'Select rate plan'} />
              </SelectTrigger>
              <SelectContent>
                {ratePlansForType.map((rp) => (
                  <SelectItem key={rp.id} value={rp.id}>
                    {rp.name} — {formatCurrency(rp.baseRate)}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Room Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Room Rate (NPR)
            </Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={0}
              value={roomRate || ''}
              onChange={(e) => setRoomRate(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rate / Night</Label>
            <div className="h-8 flex items-center px-3 bg-muted rounded-md border">
              <span className="text-sm font-semibold text-amber-600">
                {roomRate > 0 ? formatCurrency(roomRate) : '—'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Cost Summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cost Summary
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {roomRate.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}
              </span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="text-amber-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </StepContent>
  )

  const renderStep4 = () => (
    <StepContent
      title="Review & Confirm"
      description="Verify all details before creating the reservation"
      icon={CheckCircle2}
    >
      <div className="space-y-4">

        {/* Preview Confirmation */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-50 border border-amber-200">
          <Hash className="h-4 w-4 text-amber-600" />
          <span className="text-xs text-amber-700">
            Preview Confirmation: <strong className="font-mono text-sm">{previewConf}</strong>
          </span>
        </div>

        {/* Booking Contact Summary */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <Briefcase className="h-3.5 w-3.5" />
              Booking Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium capitalize">{bookingContactType.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Name: </span>
                <span className="font-medium">{bookingContactLabel}</span>
              </div>
              {bookingContactType === 'person' && bookingContact.email && (
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span>{bookingContact.email}</span>
                </div>
              )}
              {bookingContactType === 'person' && bookingContact.phone && (
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span>{bookingContact.phone}</span>
                </div>
              )}
              {bookingContactType === 'company' && bookingContact.contactPersonName && (
                <div>
                  <span className="text-muted-foreground">Contact Person: </span>
                  <span>{bookingContact.contactPersonName}</span>
                </div>
              )}
              {bookingContactType === 'travel_agent' && bookingContact.iataNumber && (
                <div>
                  <span className="text-muted-foreground">IATA: </span>
                  <span className="font-mono">{bookingContact.iataNumber}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guest Information Summary */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <User className="h-3.5 w-3.5" />
              Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Name: </span>
                <span className="font-semibold">
                  {guestFields.title ? `${guestFields.title} ` : ''}{guestFields.firstName} {guestFields.lastName}
                </span>
                {selectedGuest && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1.5">
                    Existing Guest
                  </Badge>
                )}
                {createNewGuest && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 ml-1.5 bg-amber-100 text-amber-700 border-amber-200">
                    New Guest
                  </Badge>
                )}
              </div>
              {guestFields.email && (
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span>{guestFields.email}</span>
                </div>
              )}
              {guestFields.phone && (
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span>{guestFields.phone}</span>
                </div>
              )}
              {guestFields.nationality && (
                <div>
                  <span className="text-muted-foreground">Nationality: </span>
                  <span>{guestFields.nationality}</span>
                </div>
              )}
              {guestFields.gender && (
                <div>
                  <span className="text-muted-foreground">Gender: </span>
                  <span>{guestFields.gender}</span>
                </div>
              )}
              {guestFields.idType && guestFields.idNumber && (
                <div>
                  <span className="text-muted-foreground">ID: </span>
                  <span>{guestFields.idType} — {guestFields.idNumber}</span>
                </div>
              )}
              {guestFields.city && (
                <div>
                  <span className="text-muted-foreground">City: </span>
                  <span>{guestFields.city}{guestFields.country ? `, ${guestFields.country}` : ''}</span>
                </div>
              )}
              {guestFields.vipLevel && guestFields.vipLevel !== 'none' && (
                <div>
                  <span className="text-muted-foreground">VIP: </span>
                  <span className="capitalize font-medium">{guestFields.vipLevel}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stay & Room Summary */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <BedDouble className="h-3.5 w-3.5" />
              Stay & Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Reservation Type: </span>
                <span className="font-medium">{reservationTypeLabel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Source: </span>
                <span className="font-medium">{sourceLabel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Check-in: </span>
                <span className="font-medium">{checkInDate ? formatDate(checkInDate) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Check-out: </span>
                <span className="font-medium">{checkOutDate ? formatDate(checkOutDate) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-medium text-amber-600">{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Guests: </span>
                <span className="font-medium">{adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Room: </span>
                <span className="font-semibold">
                  {selectedRoom ? selectedRoom.number : '—'}
                  {selectedRoom ? ` (${selectedRoom.type.name})` : selectedRoomTypeId ? selectedRoomType : ''}
                </span>
              </div>
              {selectedRatePlan && (
                <div>
                  <span className="text-muted-foreground">Rate Plan: </span>
                  <span>{selectedRatePlan.name}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Room Rate: </span>
                <span className="font-semibold">{formatCurrency(roomRate)}/night</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Special Requests</Label>
              <Textarea
                className="text-xs min-h-[60px] resize-y"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Late check-in, extra pillows, high floor, etc."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Building className="h-3 w-3" /> Company (if not in booking contact)
                </Label>
                <Input
                  className="h-8 text-xs"
                  value={addCompany}
                  onChange={(e) => setAddCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Hash className="h-3 w-3" /> PO Number
                </Label>
                <Input
                  className="h-8 text-xs"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-XXXX"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="guaranteed"
                checked={guaranteed}
                onCheckedChange={(v) => setGuaranteed(v === true)}
              />
              <Label htmlFor="guaranteed" className="text-xs cursor-pointer">
                Guaranteed Booking
              </Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (Internal)</Label>
              <Textarea
                className="text-xs min-h-[60px] resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for staff..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <CreditCard className="h-3.5 w-3.5" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCurrency(roomRate)} × {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="text-amber-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.keys(errors).length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700">
              {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''} — please go back and fix the highlighted fields.
            </span>
          </div>
        )}
      </div>
    </StepContent>
  )

  // ──────────────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-amber-600" />
            New Reservation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview: <span className="font-mono font-medium text-amber-600">{previewConf}</span>
          </p>
        </div>
      </header>

      {/* ── Step Indicator ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-card">
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* ── Scrollable Content ─────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </ScrollArea>

      {/* ── Navigation Footer ──────────────────────────────────────── */}
      <StepNav
        currentStep={currentStep}
        totalSteps={4}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitLabel="Create Reservation"
        isSubmitting={isSubmitting}
        nextDisabled={false}
        submitDisabled={false}
      />
    </div>
  )
}