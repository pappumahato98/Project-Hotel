'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  ArrowLeft, CalendarPlus, User, Users, Building2, Plane,
  BedDouble, CreditCard, FileText, Sparkles, ChevronDown,
  Search, X, Loader2, CheckCircle2, AlertCircle, Phone,
  Mail, Globe, MapPin, Clock, Hash, BadgePercent, Crown,
  Building, Briefcase, Hotel, Minus, Plus, Save,
  ChevronRight, Pencil, Shield, Copy, Wifi, Car, Utensils,
  Tv, Dumbbell, Waves, Coffee, Eye, EyeOff, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
  'Spain', 'Switzerland', 'Russia', 'Brazil', 'Mexico', 'South Africa', 'Other',
]

const COUNTRIES = [
  'Nepal', 'India', 'China', 'United States', 'United Kingdom', 'Japan',
  'Australia', 'Germany', 'France', 'Canada', 'South Korea', 'Thailand',
  'Bangladesh', 'Sri Lanka', 'Malaysia', 'Singapore', 'UAE', 'Saudi Arabia',
  'Netherlands', 'Italy', 'Spain', 'Switzerland', 'Russia', 'Brazil', 'Other',
]

const ID_TYPES = ['Passport', 'National ID', "Driver's License"]

const VIP_LEVELS = [
  { value: 'none', label: 'None', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-300' },
  { value: 'silver', label: 'Silver', color: 'bg-slate-50 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
  { value: 'gold', label: 'Gold', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-400' },
  { value: 'platinum', label: 'Platinum', color: 'bg-violet-50 text-violet-700 border-violet-300', dot: 'bg-violet-400' },
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

const MARKET_SEGMENTS = [
  { value: 'transient_leisure', label: 'Transient Leisure' },
  { value: 'transient_business', label: 'Transient Business' },
  { value: 'group_leisure', label: 'Group Leisure' },
  { value: 'group_business', label: 'Group Business' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'government', label: 'Government' },
  { value: 'airline_crew', label: 'Airline Crew' },
  { value: 'long_stay', label: 'Long Stay' },
]

const VACANT_STATUSES = ['vacant_clean', 'inspected']

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

const REQUEST_CHIPS = [
  { label: 'Late Check-in', icon: Clock },
  { label: 'Extra Bed', icon: BedDouble },
  { label: 'Baby Crib', icon: Copy },
  { label: 'Airport Transfer', icon: Plane },
  { label: 'High Floor', icon: Building },
  { label: 'Non-smoking', icon: Shield },
]

const STEPS: StepConfig[] = [
  { label: 'Booking Contact', icon: Briefcase, optional: true, description: 'Booker details' },
  { label: 'Guest Information', icon: User, description: 'Guest profile' },
  { label: 'Stay Details', icon: BedDouble, description: 'Room & dates' },
  { label: 'Review & Confirm', icon: CheckCircle2, description: 'Verify & create' },
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

function formatDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = formatDayOfWeek(dateStr)
  const formatted = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
  return `${day} ${formatted}`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Component ─────────────────────────────────────────────────────────────

export function NewReservationPage({ onBack, onCreated }: NewReservationPageProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // ── Wizard State ──
  const [currentStep, setCurrentStep] = useState(1)
  const [previewConf] = useState(generatePreviewConfirmation)

  // ── Booking Contact State ──
  const [bookingContactType, setBookingContactType] = useState<'person' | 'company' | 'travel_agent'>('person')
  const [sameAsGuest, setSameAsGuest] = useState(false)
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
  const [guestProfileExpanded, setGuestProfileExpanded] = useState(false)
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
  const [marketSegment, setMarketSegment] = useState('transient_leisure')
  const [checkInDate, setCheckInDate] = useState<string>(getTodayString())
  const [checkOutDate, setCheckOutDate] = useState<string>('')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedRatePlanId, setSelectedRatePlanId] = useState('')
  const [roomRate, setRoomRate] = useState<number>(0)
  const [roomFilterType, setRoomFilterType] = useState<string>('all')
  const [roomFilterFloor, setRoomFilterFloor] = useState<string>('all')
  const [roomFilterStatus, setRoomFilterStatus] = useState<string>('available')
  const [specialRequests, setSpecialRequests] = useState('')
  const [addCompany, setAddCompany] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [guaranteed, setGuaranteed] = useState(false)
  const [notes, setNotes] = useState('')

  // ── Validation State ──
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Refs ──
  const guestSearchRef = useRef<HTMLDivElement>(null)

  // ── Debounced guest search ──
  const debouncedSearch = useDebounce(guestSearchQuery, 300)

  // ── Data Fetching ──
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-for-reservation'],
    queryFn: () => apiFetch('/api/rooms'),
  })

  const { data: guestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ['guests-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2) return { guests: [] }
      return apiFetch(`/api/guests?search=${encodeURIComponent(debouncedSearch.trim())}`)
    },
    enabled: debouncedSearch.trim().length >= 2,
  })

  // ── Derived Data ──
  const rooms: RoomData[] = useMemo(() => roomsData?.rooms || [], [roomsData])
  const roomTypes: RoomTypeData[] = useMemo(() => roomsData?.roomTypes || [], [roomsData])

  const availableRooms = useMemo(() => {
    return rooms.filter((r) => VACANT_STATUSES.includes(r.status))
  }, [rooms])

  const filteredRooms = useMemo(() => {
    let filtered = availableRooms
    if (roomFilterType !== 'all') {
      filtered = filtered.filter((r) => r.typeId === roomFilterType)
    }
    if (roomFilterFloor !== 'all') {
      filtered = filtered.filter((r) => r.floor.toString() === roomFilterFloor)
    }
    if (roomFilterStatus === 'vacant_clean') {
      filtered = filtered.filter((r) => r.status === 'vacant_clean')
    }
    return filtered
  }, [availableRooms, roomFilterType, roomFilterFloor, roomFilterStatus])

  const availableFloors = useMemo(() => {
    const floors = new Set(availableRooms.map((r) => r.floor))
    return Array.from(floors).sort((a, b) => a - b)
  }, [availableRooms])

  const guestSearchResults: GuestData[] = useMemo(() => guestsData?.guests || [], [guestsData])

  const ratePlansForType = useMemo(() => {
    if (!selectedRoomTypeId) return []
    const rt = roomTypes.find((t) => t.id === selectedRoomTypeId)
    return rt?.ratePlans || []
  }, [roomTypes, selectedRoomTypeId])

  // ── Calculated Values ──
  const nights = useMemo(() => {
    if (checkInDate && checkOutDate) {
      return nightsBetween(checkInDate, checkOutDate)
    }
    return 0
  }, [checkInDate, checkOutDate])

  const taxRate = 13
  const serviceRate = 10
  const subtotal = nights * roomRate
  const taxAmount = subtotal * (taxRate / 100)
  const serviceAmount = subtotal * (serviceRate / 100)
  const totalAmount = subtotal + taxAmount + serviceAmount

  // ── Set default check-out date when check-in changes ──
  const handleCheckInChange = useCallback((date: string) => {
    setCheckInDate(date)
    if (date) {
      const tomorrow = new Date(date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const outStr = tomorrow.toISOString().split('T')[0]
      setCheckOutDate(outStr)
    }
  }, [])

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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
    setSelectedRoomTypeId(room.typeId)
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
    setGuestProfileExpanded(true)
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
    // Auto-fill booking contact if "Same as Guest"
    if (sameAsGuest) {
      setBookingContact((prev) => ({
        ...prev,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email || '',
        phone: guest.phone || '',
      }))
    }
  }, [sameAsGuest])

  // ── Reset guest fields when switching to new guest ──
  const handleCreateNewGuestToggle = useCallback(() => {
    setCreateNewGuest(true)
    setSelectedGuest(null)
    setGuestSearchQuery('')
    setGuestProfileExpanded(false)
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
    setGuestProfileExpanded(false)
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

  // ── Special request chips toggle ──
  const handleChipToggle = useCallback((chipLabel: string) => {
    setSpecialRequests((prev) => {
      const parts = prev.split(',').map((s) => s.trim()).filter(Boolean)
      const idx = parts.findIndex((p) => p === chipLabel)
      if (idx >= 0) {
        parts.splice(idx, 1)
      } else {
        parts.push(chipLabel)
      }
      return parts.join(', ')
    })
  }, [])

  // ── Create Reservation Mutation ──
  const createReservation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      // If no guest selected, create new guest first
      if (!selectedGuest && guestFields.firstName && guestFields.lastName) {
        const guestPayload: Record<string, unknown> = {
          firstName: guestFields.firstName,
          lastName: guestFields.lastName,
          email: guestFields.email || null,
          phone: guestFields.phone || null,
          nationality: guestFields.nationality || null,
          gender: guestFields.gender || null,
          dateOfBirth: guestFields.dateOfBirth || null,
          idType: guestFields.idType || null,
          idNumber: guestFields.idNumber || null,
          address: guestFields.address || null,
          city: guestFields.city || null,
          country: guestFields.country || null,
          vipLevel: guestFields.vipLevel || 'none',
        }
        const newGuest = await apiFetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestPayload),
        })
        payload.guestId = newGuest.guest.id
      }

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
      onBack?.()
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

  // ── Per-step validation ──
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
    if (step < currentStep) {
      setErrors({})
      setCurrentStep(step)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
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
      checkIn: checkInDate,
      checkOut: checkOutDate,
      roomRate,
      adults,
      children,
      source,
      reservationType,
      specialRequests: specialRequests || null,
      guaranteed,
      company: addCompany || null,
      poNumber: poNumber || null,
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
    if (errors[`guest${field}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`guest${field}`]
        return next
      })
    }
  }, [errors])

  // ── Review helpers ──
  const bookingContactLabel = useMemo(() => {
    if (bookingContactType === 'person') {
      const parts = [bookingContact.salutation, bookingContact.firstName, bookingContact.lastName].filter(Boolean)
      return parts.length > 0 ? parts.join(' ') : '—'
    }
    if (bookingContactType === 'company') return bookingContact.companyName || '—'
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
  const marketSegmentLabel = MARKET_SEGMENTS.find((m) => m.value === marketSegment)?.label || marketSegment

  const hasBookingContactData = useMemo(() => {
    if (bookingContactType === 'person') {
      return bookingContact.firstName || bookingContact.lastName || bookingContact.email
    }
    if (bookingContactType === 'company') return !!bookingContact.companyName
    if (bookingContactType === 'travel_agent') return !!bookingContact.agentName || !!bookingContact.agencyName
    return false
  }, [bookingContactType, bookingContact])

  // ──────────────────────────────────────────────────────────────────────
  //  SIDEBAR — Live Stay Summary
  // ──────────────────────────────────────────────────────────────────────

  const renderSidebar = () => (
    <div className="space-y-4">
      {/* Confirmation Preview */}
      <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Hash className="h-3.5 w-3.5 text-teal-600" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-teal-600">Confirmation</span>
        </div>
        <p className="font-mono font-semibold text-sm text-teal-700">{previewConf}</p>
      </div>

      {/* Stay Summary */}
      <Card className="py-0 gap-0">
        <div className="px-4 py-3 border-b bg-slate-50/80">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            Stay Summary
          </h3>
        </div>
        <CardContent className="p-4 space-y-3">
          {/* Room */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Room</span>
            <span className="text-xs font-semibold">
              {selectedRoom ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  <span className="font-mono">{selectedRoom.number}</span>
                  <span className="text-muted-foreground font-normal">· {selectedRoom.type.name}</span>
                </span>
              ) : selectedRoomTypeId ? (
                <span>{selectedRoomType}</span>
              ) : (
                <span className="text-muted-foreground font-normal">Not selected</span>
              )}
            </span>
          </div>

          {/* Dates */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Dates</span>
            <span className="text-xs font-medium">
              {checkInDate && checkOutDate ? (
                <span>
                  {formatDate(checkInDate)} → {formatDate(checkOutDate)}
                </span>
              ) : (
                <span className="text-muted-foreground">Not selected</span>
              )}
            </span>
          </div>

          {/* Nights */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Nights</span>
            <span className={cn(
              "text-xs font-bold rounded-full px-2.5 py-0.5",
              nights > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
            )}>
              {nights > 0 ? `${nights}N` : '0N'}
            </span>
          </div>

          {/* Guests */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Guests</span>
            <span className="text-xs font-medium">
              {adults}A{children > 0 ? ` · ${children}C` : ''}
            </span>
          </div>

          <Separator />

          {/* Guest Name */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Guest</span>
            <span className="text-xs font-medium text-right max-w-[180px] truncate">
              {guestFields.firstName || guestFields.lastName ? (
                `${guestFields.firstName} ${guestFields.lastName}`
              ) : (
                <span className="text-muted-foreground">Not selected</span>
              )}
              {guestFields.vipLevel !== 'none' && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-1 border-current/20">
                  {guestFields.vipLevel}
                </Badge>
              )}
            </span>
          </div>

          {/* Rate */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rate Plan</span>
            <span className="text-xs font-medium">
              {selectedRatePlan ? selectedRatePlan.name : '—'}
            </span>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Source</span>
            <span className="text-xs font-medium">{sourceLabel}</span>
          </div>

          <Separator />

          {/* Cost Breakdown */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {roomRate.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}
              </span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span className="text-muted-foreground">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Service ({serviceRate}%)</span>
              <span className="text-muted-foreground">{formatCurrency(serviceAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-teal-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────
  //  STEP RENDERERS
  // ──────────────────────────────────────────────────────────────────────

  // ── Step 1: Booking Contact ──
  const renderStep1 = () => (
    <StepContent
      title="Booking Contact"
      description="Who is making this reservation? (Optional)"
      icon={Briefcase}
    >
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Teal top border accent */}
        <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-400" />

        <div className="p-4 sm:p-5 space-y-3">
          {/* Radio-style Tab Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['person', 'company', 'travel_agent'] as const).map((type) => {
              const icons = { person: User, company: Building2, travel_agent: Plane }
              const labels = { person: 'Person', company: 'Company', travel_agent: 'Travel Agent' }
              const Icon = icons[type]
              const isActive = bookingContactType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBookingContactType(type)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all',
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {labels[type]}
                </button>
              )
            })}
          </div>

          {/* Same as Guest checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="same-as-guest"
              checked={sameAsGuest}
              onCheckedChange={(v) => {
                setSameAsGuest(v === true)
                if (v && guestFields.firstName && guestFields.lastName) {
                  setBookingContact((prev) => ({
                    ...prev,
                    firstName: guestFields.firstName,
                    lastName: guestFields.lastName,
                    email: guestFields.email,
                    phone: guestFields.phone,
                  }))
                }
              }}
            />
            <Label htmlFor="same-as-guest" className="text-xs text-slate-500 cursor-pointer">
              Same as Guest (auto-fills from guest info)
            </Label>
          </div>

          {/* Person Fields */}
          {bookingContactType === 'person' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Salutation</Label>
                <Select
                  value={bookingContact.salutation}
                  onValueChange={(v) => setBookingContact((p) => ({ ...p, salutation: v }))}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">First Name</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.firstName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Last Name</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.lastName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  className="h-9 text-xs"
                  type="email"
                  value={bookingContact.email}
                  onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.phone}
                  onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+977-1-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Mobile
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.mobile}
                  onChange={(e) => setBookingContact((p) => ({ ...p, mobile: e.target.value }))}
                  placeholder="+977-98..."
                />
              </div>
            </div>
          )}

          {/* Company Fields */}
          {bookingContactType === 'company' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Company Name</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.companyName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Company Address</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.companyAddress}
                  onChange={(e) => setBookingContact((p) => ({ ...p, companyAddress: e.target.value }))}
                  placeholder="123 Business St"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">City</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.city}
                  onChange={(e) => setBookingContact((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Kathmandu"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Country</Label>
                <Select value={bookingContact.country} onValueChange={(v) => setBookingContact((p) => ({ ...p, country: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Contact Person</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.contactPersonName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, contactPersonName: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  className="h-9 text-xs"
                  type="email"
                  value={bookingContact.email}
                  onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.phone}
                  onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+977-1-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Tax ID (VAT/PAN)
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.taxId}
                  onChange={(e) => setBookingContact((p) => ({ ...p, taxId: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.website}
                  onChange={(e) => setBookingContact((p) => ({ ...p, website: e.target.value }))}
                  placeholder="www.company.com"
                />
              </div>
            </div>
          )}

          {/* Travel Agent Fields */}
          {bookingContactType === 'travel_agent' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Agent Name</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.agentName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, agentName: e.target.value }))}
                  placeholder="Agent full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Agency Name</Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.agencyName}
                  onChange={(e) => setBookingContact((p) => ({ ...p, agencyName: e.target.value }))}
                  placeholder="Travel Agency Inc."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  className="h-9 text-xs"
                  type="email"
                  value={bookingContact.email}
                  onChange={(e) => setBookingContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="agent@agency.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.phone}
                  onChange={(e) => setBookingContact((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+977-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> IATA Number
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={bookingContact.iataNumber}
                  onChange={(e) => setBookingContact((p) => ({ ...p, iataNumber: e.target.value }))}
                  placeholder="IATA-XXXXX"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </StepContent>
  )

  // ── Step 2: Guest Information ──
  const renderStep2 = () => (
    <StepContent
      title="Guest Information"
      description="Search for an existing guest or create a new profile"
      icon={User}
    >
      <div className="space-y-3">
        {/* Guest Search */}
        <div className="relative" ref={guestSearchRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="h-10 text-sm pl-10 pr-10 bg-white"
                placeholder="Search guest by name, email, or phone..."
                value={guestSearchQuery}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {!createNewGuest && (
              <Button variant="outline" className="h-10 text-xs whitespace-nowrap gap-1.5" onClick={handleCreateNewGuestToggle}>
                <User className="h-3.5 w-3.5" /> New Guest
              </Button>
            )}
            {createNewGuest && (
              <Button variant="outline" className="h-10 text-xs whitespace-nowrap gap-1.5" onClick={handleClearGuest}>
                <Search className="h-3.5 w-3.5" /> Search
              </Button>
            )}
          </div>

          {/* Guest Search Dropdown */}
          {guestSearchOpen && !createNewGuest && guestsLoading && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-teal-500 mr-2" />
              <span className="text-xs text-slate-500">Searching guests...</span>
            </div>
          )}
          {guestSearchOpen && !createNewGuest && !guestsLoading && guestSearchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider border-b bg-slate-50">
                {guestSearchResults.length} guest{guestSearchResults.length !== 1 ? 's' : ''} found
              </div>
              {guestSearchResults.map((guest) => (
                <button
                  key={guest.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                  onClick={() => handleGuestSelect(guest)}
                >
                  {/* Avatar placeholder */}
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {guest.firstName} {guest.lastName}
                      </span>
                      {guest.vipLevel !== 'none' && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          VIP_LEVELS.find((v) => v.value === guest.vipLevel)?.color
                        )}>
                          <Star className="h-2.5 w-2.5 inline -mt-0.5 mr-0.5" />
                          {guest.vipLevel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {guest.email && <span className="truncate">{guest.email}</span>}
                      {guest.phone && <span className="truncate">{guest.phone}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
          {guestSearchOpen && !createNewGuest && !guestsLoading && debouncedSearch.length >= 2 && guestSearchResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center">
              <p className="text-xs text-slate-500">No guests found. Click &quot;New Guest&quot; to create one.</p>
            </div>
          )}
        </div>

        {/* Selected Guest Profile Card (collapsible) */}
        {selectedGuest && !createNewGuest && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setGuestProfileExpanded(!guestProfileExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">
                  Guest selected: <strong>{selectedGuest.firstName} {selectedGuest.lastName}</strong>
                  {selectedGuest.vipLevel !== 'none' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-1 border-emerald-300 text-emerald-600">
                      <Star className="h-2.5 w-2.5 inline -mt-0.5 mr-0.5" />
                      {selectedGuest.vipLevel}
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); handleClearGuest() }}>
                  <X className="h-3 w-3 mr-0.5" /> Clear
                </Button>
                {guestProfileExpanded ? <EyeOff className="h-3.5 w-3.5 text-emerald-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
            </button>
            {guestProfileExpanded && (
              <div className="px-3 pb-3 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-emerald-600">
                  {selectedGuest.email && <div><span className="text-emerald-400">Email:</span> {selectedGuest.email}</div>}
                  {selectedGuest.phone && <div><span className="text-emerald-400">Phone:</span> {selectedGuest.phone}</div>}
                  {selectedGuest.nationality && <div><span className="text-emerald-400">Nationality:</span> {selectedGuest.nationality}</div>}
                  {selectedGuest.idType && <div><span className="text-emerald-400">ID:</span> {selectedGuest.idType} — {selectedGuest.idNumber}</div>}
                  {selectedGuest.city && <div><span className="text-emerald-400">City:</span> {selectedGuest.city}{selectedGuest.country ? `, ${selectedGuest.country}` : ''}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Guest Indicator */}
        {createNewGuest && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">Creating new guest profile</span>
          </div>
        )}

        <Separator />

        {/* Guest Details Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Title</Label>
            <Select value={guestFields.title} onValueChange={(v) => updateGuestField('title', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr">Mr</SelectItem>
                <SelectItem value="Ms">Ms</SelectItem>
                <SelectItem value="Mrs">Mrs</SelectItem>
                <SelectItem value="Dr">Dr</SelectItem>
                <SelectItem value="Prof">Prof</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              First Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-xs", errors.guestFirstName && "border-rose-400 focus-visible:ring-rose-400")}
              value={guestFields.firstName}
              onChange={(e) => updateGuestField('firstName', e.target.value)}
              placeholder="Rajesh"
            />
            {errors.guestFirstName && (
              <p className="text-[10px] text-rose-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.guestFirstName}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Last Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-xs", errors.guestLastName && "border-rose-400 focus-visible:ring-rose-400")}
              value={guestFields.lastName}
              onChange={(e) => updateGuestField('lastName', e.target.value)}
              placeholder="Sharma"
            />
            {errors.guestLastName && (
              <p className="text-[10px] text-rose-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.guestLastName}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input className="h-9 text-xs" type="email" value={guestFields.email} onChange={(e) => updateGuestField('email', e.target.value)} placeholder="guest@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone
            </Label>
            <Input className="h-9 text-xs" value={guestFields.phone} onChange={(e) => updateGuestField('phone', e.target.value)} placeholder="+977-98..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Nationality
            </Label>
            <Select value={guestFields.nationality} onValueChange={(v) => updateGuestField('nationality', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {NATIONALITIES.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Date of Birth</Label>
            <Input className="h-9 text-xs" type="date" value={guestFields.dateOfBirth} onChange={(e) => updateGuestField('dateOfBirth', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Gender</Label>
            <Select value={guestFields.gender} onValueChange={(v) => updateGuestField('gender', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">ID Type</Label>
            <Select value={guestFields.idType} onValueChange={(v) => updateGuestField('idType', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">ID Number</Label>
            <Input className="h-9 text-xs" value={guestFields.idNumber} onChange={(e) => updateGuestField('idNumber', e.target.value)} placeholder="ID number" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Address
            </Label>
            <Input className="h-9 text-xs" value={guestFields.address} onChange={(e) => updateGuestField('address', e.target.value)} placeholder="Street address" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">City</Label>
            <Input className="h-9 text-xs" value={guestFields.city} onChange={(e) => updateGuestField('city', e.target.value)} placeholder="City" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Country</Label>
            <Select value={guestFields.country} onValueChange={(v) => updateGuestField('country', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* VIP Level Visual Selector */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Crown className="h-3 w-3" /> VIP Level
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {VIP_LEVELS.map((lvl) => {
                const isActive = guestFields.vipLevel === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => updateGuestField('vipLevel', lvl.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium border-2 transition-all",
                      isActive
                        ? cn(lvl.color, "ring-2 ring-offset-1 ring-current/20 scale-105")
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", lvl.dot)} />
                    {lvl.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </StepContent>
  )

  // ── Step 3: Stay Details ──
  const renderStep3 = () => (
    <StepContent
      title="Stay Details"
      description="Select dates, room, and rate plan"
      icon={BedDouble}
    >
      <div className="space-y-3">
        {/* ── Section: Dates & Guests ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-teal-100 flex items-center justify-center">
              <CalendarPlus className="h-3 w-3 text-teal-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">Dates & Guests</h4>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            {/* Date pickers row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Check-in <span className="text-rose-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-sm font-normal bg-white",
                        !checkInDate && "text-slate-400",
                        errors.checkIn && "border-rose-400"
                      )}
                    >
                      <CalendarPlus className="h-4 w-4 mr-2 text-slate-400" />
                      {checkInDate ? (
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{formatDayOfWeek(checkInDate)}</span>
                          {formatDate(checkInDate)}
                        </span>
                      ) : "Select date"}
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
                {errors.checkIn && <p className="text-[10px] text-rose-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.checkIn}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Check-out <span className="text-rose-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-sm font-normal bg-white",
                        !checkOutDate && "text-slate-400",
                        errors.checkOut && "border-rose-400"
                      )}
                    >
                      <CalendarPlus className="h-4 w-4 mr-2 text-slate-400" />
                      {checkOutDate ? (
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{formatDayOfWeek(checkOutDate)}</span>
                          {formatDate(checkOutDate)}
                        </span>
                      ) : "Select date"}
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
                {errors.checkOut && <p className="text-[10px] text-rose-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.checkOut}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Duration</Label>
                <div className="h-10 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                  <span className={cn(
                    "text-lg font-bold",
                    nights > 0 ? "text-teal-600" : "text-slate-300"
                  )}>
                    {nights || '—'}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {nights === 1 ? 'night' : nights > 1 ? 'nights' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Adults & Children */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Adults
                </Label>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
                  <button type="button" className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-l-lg transition-colors" onClick={() => setAdults((a) => Math.max(1, a - 1))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">{adults}</span>
                  <button type="button" className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-r-lg transition-colors" onClick={() => setAdults((a) => a + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Children
                </Label>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
                  <button type="button" className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-l-lg transition-colors" onClick={() => setChildren((c) => Math.max(0, c - 1))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">{children}</span>
                  <button type="button" className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-r-lg transition-colors" onClick={() => setChildren((c) => c + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Room Selection ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-teal-100 flex items-center justify-center">
              <Hotel className="h-3 w-3 text-teal-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">Room Selection</h4>
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50 border-b">
              <Select value={roomFilterType} onValueChange={setRoomFilterType}>
                <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Room Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {roomTypes.map((rt) => (<SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={roomFilterFloor} onValueChange={setRoomFilterFloor}>
                <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="Floor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {availableFloors.map((f) => (<SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={roomFilterStatus} onValueChange={setRoomFilterStatus}>
                <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">All Available</SelectItem>
                  <SelectItem value="vacant_clean">Vacant Clean</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-auto text-[10px] text-slate-400">
                {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Room Grid */}
            {roomsLoading ? (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">No available rooms found matching filters.</p>
              </div>
            ) : (
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {filteredRooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomSelect(room)}
                      className={cn(
                        "relative text-left rounded-lg border-2 p-3 transition-all hover:shadow-md",
                        isSelected
                          ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      {/* Room Number */}
                      <div className="text-lg font-mono font-bold text-slate-800">{room.number}</div>
                      {/* Details */}
                      <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{room.type.name}</span>
                          <span className={cn("h-2 w-2 rounded-full shrink-0 ml-1", STATUS_COLORS[room.status])} />
                        </div>
                        <span className="text-slate-400">F{room.floor}{room.wing ? ` · ${room.wing}` : ''}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="h-4 w-4 text-teal-500" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Selected Room Detail */}
            {selectedRoom && (
              <div className="px-3 py-3 border-t bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <span className="font-mono font-bold text-sm text-teal-700">{selectedRoom.number}</span>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-700">{selectedRoom.type.name}</p>
                    <p className="text-slate-400 mt-0.5">
                      Floor {selectedRoom.floor}{selectedRoom.wing ? ` · ${selectedRoom.wing} Wing` : ''} · {selectedRoom.type.bedConfig}
                    </p>
                    {selectedRoom.type.amenities && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {JSON.parse(selectedRoom.type.amenities).slice(0, 6).map((a: string) => (
                          <Badge key={a} variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-slate-200 text-slate-500">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.room && !selectedRoom && (
              <div className="px-3 py-2 border-t border-t-rose-200 bg-rose-50">
                <p className="text-[10px] text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.room}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Section: Rate & Source ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-teal-100 flex items-center justify-center">
              <BadgePercent className="h-3 w-3 text-teal-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">Rate & Source</h4>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Room Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Room Type</Label>
                <Select
                  value={selectedRoomTypeId}
                  onValueChange={(v) => {
                    setSelectedRoomTypeId(v)
                    if (selectedRoom && selectedRoom.typeId !== v) setSelectedRoom(null)
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
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select room type" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.name} ({rt.code}) — {rt.bedConfig}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Rate Plan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Rate Plan</Label>
                <Select value={selectedRatePlanId} onValueChange={handleRatePlanChange} disabled={ratePlansForType.length === 0}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={ratePlansForType.length === 0 ? 'Select room type first' : 'Select rate plan'} />
                  </SelectTrigger>
                  <SelectContent>
                    {ratePlansForType.map((rp) => (
                      <SelectItem key={rp.id} value={rp.id}>{rp.name} — {formatCurrency(rp.baseRate)}/night</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Custom Rate */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Custom Rate (NPR)</Label>
                <Input className="h-9 text-xs" type="number" min={0} value={roomRate || ''} onChange={(e) => setRoomRate(parseFloat(e.target.value) || 0)} placeholder="Override rate" />
              </div>
              {/* Source of Business */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Source of Business</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {/* Reservation Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Reservation Type</Label>
                <Select value={reservationType} onValueChange={setReservationType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESERVATION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {/* Market Segment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Market Segment</Label>
                <Select value={marketSegment} onValueChange={setMarketSegment}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKET_SEGMENTS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Special Requests ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-teal-100 flex items-center justify-center">
              <FileText className="h-3 w-3 text-teal-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">Special Requests</h4>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <Textarea
              className="text-sm min-h-[70px] resize-y"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests or preferences..."
            />
            <div className="flex flex-wrap gap-1.5">
              {REQUEST_CHIPS.map((chip) => {
                const Icon = chip.icon
                const isActive = specialRequests.split(',').map((s) => s.trim()).includes(chip.label)
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipToggle(chip.label)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all",
                      isActive
                        ? "bg-teal-50 border-teal-300 text-teal-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </StepContent>
  )

  // ── Step 4: Review & Confirm ──
  const renderStep4 = () => {
    const goToStep = (step: number) => {
      setErrors({})
      setCurrentStep(step)
    }

    return (
      <StepContent
        title="Review & Confirm"
        description="Verify all details before creating the reservation"
        icon={CheckCircle2}
      >
        <div className="space-y-3">

          {/* Preview Confirmation */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-teal-50 to-slate-50 border border-teal-200">
            <Hash className="h-4 w-4 text-teal-600" />
            <span className="text-xs text-teal-700">
              Preview Confirmation: <strong className="font-mono text-sm">{previewConf}</strong>
            </span>
          </div>

          {/* Guest Info Card */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest Information</CardTitle>
              </div>
              <button onClick={() => goToStep(2)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {guestFields.title ? `${guestFields.title} ` : ''}{guestFields.firstName} {guestFields.lastName}
                    </span>
                    {selectedGuest && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-200 text-emerald-600">Existing</Badge>}
                    {createNewGuest && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">New</Badge>}
                    {guestFields.vipLevel !== 'none' && (
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full", VIP_LEVELS.find((v) => v.value === guestFields.vipLevel)?.color)}>
                        <Star className="h-2.5 w-2.5 inline -mt-0.5 mr-0.5" />
                        {guestFields.vipLevel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1.5">
                    {guestFields.email && <div><span className="text-slate-400">Email:</span> {guestFields.email}</div>}
                    {guestFields.phone && <div><span className="text-slate-400">Phone:</span> {guestFields.phone}</div>}
                    {guestFields.idType && guestFields.idNumber && <div><span className="text-slate-400">ID:</span> {guestFields.idType} — {guestFields.idNumber}</div>}
                    {guestFields.nationality && <div><span className="text-slate-400">Nationality:</span> {guestFields.nationality}</div>}
                    {guestFields.city && <div><span className="text-slate-400">City:</span> {guestFields.city}{guestFields.country ? `, ${guestFields.country}` : ''}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stay Details Card */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-slate-400" />
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stay Details</CardTitle>
              </div>
              <button onClick={() => goToStep(3)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400">Room:</span>{' '}
                  <span className="font-semibold font-mono">
                    {selectedRoom ? selectedRoom.number : '—'}
                    {selectedRoom ? ` (${selectedRoom.type.name})` : selectedRoomTypeId ? `(${selectedRoomType})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Check-in:</span>{' '}
                  <span className="font-medium">{checkInDate ? `${formatDateWithDay(checkInDate)}` : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Check-out:</span>{' '}
                  <span className="font-medium">{checkOutDate ? `${formatDateWithDay(checkOutDate)}` : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duration:</span>{' '}
                  <span className="font-bold text-teal-600">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400">Guests:</span>{' '}
                  <span>{adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400">Rate Plan:</span>{' '}
                  <span>{selectedRatePlan?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Rate:</span>{' '}
                  <span className="font-semibold">{formatCurrency(roomRate)}/night</span>
                </div>
                <div>
                  <span className="text-slate-400">Type:</span>{' '}
                  <span>{reservationTypeLabel}</span>
                </div>
                <div>
                  <span className="text-slate-400">Source:</span>{' '}
                  <span>{sourceLabel}</span>
                </div>
                <div>
                  <span className="text-slate-400">Segment:</span>{' '}
                  <span>{marketSegmentLabel}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Contact Card */}
          {hasBookingContactData && (
            <Card className="py-0 gap-0">
              <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booking Contact</CardTitle>
                </div>
                <button onClick={() => goToStep(1)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400">Type:</span>{' '}
                    <span className="font-medium capitalize">{bookingContactType.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Name:</span>{' '}
                    <span className="font-medium">{bookingContactLabel}</span>
                  </div>
                  {bookingContact.email && (
                    <div><span className="text-slate-400">Email:</span> {bookingContact.email}</div>
                  )}
                  {bookingContact.phone && (
                    <div><span className="text-slate-400">Phone:</span> {bookingContact.phone}</div>
                  )}
                  {bookingContactType === 'company' && bookingContact.taxId && (
                    <div><span className="text-slate-400">Tax ID:</span> <span className="font-mono">{bookingContact.taxId}</span></div>
                  )}
                  {bookingContactType === 'travel_agent' && bookingContact.iataNumber && (
                    <div><span className="text-slate-400">IATA:</span> <span className="font-mono">{bookingContact.iataNumber}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown */}
          <Card className="py-0 gap-0 overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Breakdown</CardTitle>
              </div>
            </div>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">
                    {formatCurrency(roomRate)} × {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tax ({taxRate}%)</span>
                  <span className="text-slate-500">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Service Charge ({serviceRate}%)</span>
                  <span className="text-slate-500">{formatCurrency(serviceAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-lg font-bold text-teal-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
            <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-400" />
          </Card>

          {/* Special Requests */}
          {specialRequests && (
            <div className="rounded-lg border border-slate-200 p-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Special Requests
              </h4>
              <p className="text-xs text-slate-600">{specialRequests}</p>
            </div>
          )}

          {/* Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="text-xs text-rose-700">
                {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''} — please go back and fix highlighted fields.
              </span>
            </div>
          )}

          {/* Guarantee Checkbox */}
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <Checkbox
              id="confirm-details"
              checked={guaranteed}
              onCheckedChange={(v) => setGuaranteed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-details" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              I confirm that all reservation details are correct and the guest has been informed of the booking terms, cancellation policy, and check-in/check-out times.
            </Label>
          </div>
        </div>
      </StepContent>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header Bar ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 md:px-6 md:py-2.5 border-b bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-teal-600" />
              New Reservation
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Confirmation: <span className="font-mono font-medium text-slate-500">{previewConf}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          Save as Draft
        </button>
      </header>

      {/* ── Step Indicator ─────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-white">
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* ── Scrollable Content — Two Column Layout ─────────────── */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main Form Column */}
            <div className="flex-1 min-w-0 lg:max-w-[65%]">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </div>

            {/* Sidebar Column — Sticky */}
            <div className="w-full lg:w-[35%] shrink-0">
              <div className="lg:sticky lg:top-0">
                {renderSidebar()}
              </div>
            </div>
          </div>
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
        submitDisabled={!guaranteed}
      />
    </div>
  )
}
