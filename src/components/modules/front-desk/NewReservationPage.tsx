'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import {
  ArrowLeft, User, Users, Building2, Plane,
  BedDouble, CreditCard, FileText, Sparkles, ChevronDown,
  Search, X, Loader2, CheckCircle2, AlertCircle, Phone,
  Mail, Globe, MapPin, Clock, Hash, BadgePercent, Crown,
  Building, Briefcase, Hotel, Minus, Plus, Save,
  ChevronRight, Pencil, Shield, Copy, Wifi, Car, Utensils,
  Tv, Dumbbell, Waves, Coffee, Eye, EyeOff, Star,
  CalendarCheck, Check, CheckIcon, ArrowRight,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from '@/components/ui/dialog'
import { formatDate, formatDateShort, formatCurrency, nightsBetween, getTodayString, toDateOnly, fromDateOnly } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import type { DateRange } from 'react-day-picker'

// ─── Types ────────────────────────────────────────────────────────────────

interface NewReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

// ─── Amenity Icon Mapping ─────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, any> = {
  'wi-fi': Wifi, wifi: Wifi, internet: Wifi,
  'smart tv': Tv, tv: Tv, television: Tv,
  gym: Dumbbell, 'fitness center': Dumbbell, 'fitness': Dumbbell,
  pool: Waves, 'swimming pool': Waves,
  'coffee maker': Coffee, 'coffee': Coffee, minibar: Coffee,
  parking: Car, 'car park': Car,
}

function getAmenityIcon(name: string) {
  const lower = name.toLowerCase().trim()
  for (const [key, Icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return Icon
  }
  return null
}

// ─── Helper ────────────────────────────────────────────────────────────────

function generatePreviewConfirmation(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'MRD-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return WEEKDAY_SHORT[d.getDay()]
}

function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = formatDayOfWeek(dateStr)
  const formatted = formatDateShort(d)
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

function parseAmenities(amenitiesStr: string | null): string[] {
  if (!amenitiesStr) return []
  try {
    const parsed = JSON.parse(amenitiesStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Dialog Component ─────────────────────────────────────────────────────

export function NewReservationDialog({ open, onOpenChange, onCreated }: NewReservationDialogProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // ── Wizard State ──
  const [step, setStep] = useState(1)
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
  const [checkInDate, setCheckInDate] = useState<string>('')
  const [checkOutDate, setCheckOutDate] = useState<string>('')
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>(undefined)
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

  // ── Reset form when dialog opens ──
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setStep(1)
      setCalendarRange(undefined)
      setCheckInDate('')
      setCheckOutDate('')
      setSelectedRoom(null)
      setSelectedGuest(null)
      setCreateNewGuest(false)
      setGuestSearchQuery('')
      setGuestFields({
        title: '', firstName: '', lastName: '', email: '', phone: '',
        nationality: '', dateOfBirth: '', gender: '', idType: '', idNumber: '',
        address: '', city: '', country: '', vipLevel: 'none',
      })
      setNotes('')
      setAdults(1)
      setChildren(0)
      setRoomRate(0)
      setSelectedRoomTypeId('')
      setSelectedRatePlanId('')
      setErrors({})
      setSpecialRequests('')
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

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

  // ── Calendar range selection handler ──
  const handleRangeSelect = useCallback((range: DateRange | undefined) => {
    setCalendarRange(range)
    if (range?.from) {
      setCheckInDate(toDateOnly(range.from))
    } else {
      setCheckInDate('')
    }
    if (range?.to) {
      setCheckOutDate(toDateOnly(range.to))
    } else {
      setCheckOutDate('')
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
      dateOfBirth: guest.dateOfBirth ? toDateOnly(new Date(guest.dateOfBirth)) : '',
      gender: guest.gender || '',
      idType: guest.idType || '',
      idNumber: guest.idNumber || '',
      address: guest.address || '',
      city: guest.city || '',
      country: guest.country || '',
      vipLevel: guest.vipLevel || 'none',
    })
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
      title: '', firstName: '', lastName: '', email: '', phone: '',
      nationality: '', dateOfBirth: '', gender: '', idType: '', idNumber: '',
      address: '', city: '', country: '', vipLevel: 'none',
    })
  }, [])

  // ── Clear selected guest ──
  const handleClearGuest = useCallback(() => {
    setSelectedGuest(null)
    setGuestSearchQuery('')
    setCreateNewGuest(false)
    setGuestProfileExpanded(false)
    setGuestFields({
      title: '', firstName: '', lastName: '', email: '', phone: '',
      nationality: '', dateOfBirth: '', gender: '', idType: '', idNumber: '',
      address: '', city: '', country: '', vipLevel: 'none',
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
      invalidate.afterReservationChange(queryClient)
      onCreated?.(data.reservation)
      onOpenChange(false)
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

  // ── Submit Handler ──
  const handleSubmit = useCallback(() => {
    // Guest name validation
    const fullName = `${guestFields.firstName} ${guestFields.lastName}`.trim()
    if (!fullName) {
      toast.error('Guest name is required')
      return
    }
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
    bookingContactType, bookingContact, guestFields, createReservation,
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

  // ── Step navigation ──
  const canGoNext = useMemo(() => {
    if (step === 1) return checkInDate !== '' && checkOutDate !== ''
    if (step === 2) return selectedRoom !== null
    return true
  }, [step, checkInDate, checkOutDate, selectedRoom])

  const handleNext = useCallback(() => {
    if (step === 1 && (!checkInDate || !checkOutDate)) {
      toast.error('Please select both check-in and check-out dates')
      return
    }
    if (step === 2 && !selectedRoom) {
      toast.error('Please select a room')
      return
    }
    setStep((s) => Math.min(s + 1, 3))
    setErrors({})
  }, [step, checkInDate, checkOutDate, selectedRoom])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1))
    setErrors({})
  }, [])

  // ──────────────────────────────────────────────────────────────────────
  //  STEP INDICATOR
  // ──────────────────────────────────────────────────────────────────────

  const renderStepIndicator = () => {
    const steps = [
      { label: 'Dates', num: 1 },
      { label: 'Room', num: 2 },
      { label: 'Guest', num: 3 },
    ]

    return (
      <div className="flex items-center justify-center gap-0 py-3">
        {steps.map((s, i) => {
          const isCompleted = step > s.num
          const isCurrent = step === s.num
          const isUpcoming = step < s.num

          return (
            <div key={s.num} className="flex items-center">
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  isCompleted && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                  isCurrent && 'border-primary/50 bg-primary/15 text-primary',
                  isUpcoming && 'border-border/40 bg-muted/30 text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="font-semibold">{s.num}</span>
                )}
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-px w-4 sm:w-8',
                    step > s.num ? 'bg-emerald-500/40' : 'bg-border',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  STEP 1 — DATES
  // ──────────────────────────────────────────────────────────────────────

  const renderDatesStep = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="space-y-4">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="range"
            selected={calendarRange}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            disabled={{ before: today }}
            className="mx-auto"
          />
        </div>

        {/* Date summary line */}
        {checkInDate && checkOutDate && (
          <div className="text-center text-sm text-muted-foreground">
            {formatDateShort(checkInDate)} → {formatDateShort(checkOutDate)}, {new Date(checkOutDate).getFullYear()}
            <span className="ml-2 font-medium text-primary">({nights} night{nights !== 1 ? 's' : ''})</span>
          </div>
        )}

        {/* Adults & Children row */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium">Adults</Label>
            <Select value={String(adults)} onValueChange={(v) => setAdults(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'adult' : 'adults'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium">Children</Label>
            <Select value={String(children)} onValueChange={(v) => setChildren(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'child' : 'children'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Notes</Label>
          <Textarea
            className="text-sm min-h-[60px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests or notes for this reservation..."
          />
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  STEP 2 — ROOM SELECTION
  // ──────────────────────────────────────────────────────────────────────

  const renderRoomStep = () => {
    return (
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roomFilterType} onValueChange={setRoomFilterType}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Room Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {roomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roomFilterFloor} onValueChange={setRoomFilterFloor}>
            <SelectTrigger className="h-8 text-xs w-[100px]">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {availableFloors.map((f) => (
                <SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {/* Room grid */}
        {roomsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No available rooms found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
            {filteredRooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id
              const amenities = parseAmenities(room.type.amenities)
              const amenityCount = amenities.length
              const keyAmenities = amenities.slice(0, 3)
              const rt = roomTypes.find((t) => t.id === room.typeId)
              const baseRate = rt?.ratePlans?.[0]?.baseRate || 0

              return (
                <Button
                  key={room.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleRoomSelect(room)}
                  className={cn(
                    'h-auto w-full text-left p-4 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border/60 hover:border-border bg-card',
                  )}
                >
                  <div className="space-y-2 w-full">
                    {/* Room number + type */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-bold font-mono leading-none">{room.number}</div>
                        <div className="text-sm font-medium mt-1">{room.type.name}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Floor {room.floor}</span>
                      <span>·</span>
                      <span>Max {room.type.maxOccupancy}</span>
                      <span>·</span>
                      <span>{amenityCount} amenities</span>
                    </div>

                    {/* Key amenities */}
                    {keyAmenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {keyAmenities.map((a) => {
                          const AmenityIcon = getAmenityIcon(a)
                          return (
                            <span
                              key={a}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                            >
                              {AmenityIcon && <AmenityIcon className="h-3 w-3" />}
                              {a}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Price */}
                    {baseRate > 0 && (
                      <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">{formatCurrency(baseRate)} / night</span>
                        <span className="text-sm font-semibold text-primary">
                          total {formatCurrency(baseRate * nights)}
                        </span>
                      </div>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  STEP 3 — GUEST
  // ──────────────────────────────────────────────────────────────────────

  const renderGuestStep = () => {
    const guestDisplayName = selectedGuest
      ? `${selectedGuest.firstName} ${selectedGuest.lastName}`
      : createNewGuest
        ? `${guestFields.firstName} ${guestFields.lastName}`.trim() || '—'
        : '—'

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Guest search/creation */}
        <div className="space-y-3">
          {!createNewGuest ? (
            <>
              {/* Guest Search Combobox */}
              <div className="relative" ref={guestSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="h-10 text-sm pl-10 pr-10"
                    placeholder="Search guests by name or email…"
                    value={guestSearchQuery}
                    onChange={(e) => {
                      setGuestSearchQuery(e.target.value)
                      setGuestSearchOpen(true)
                      if (selectedGuest) setSelectedGuest(null)
                    }}
                    onFocus={() => setGuestSearchOpen(true)}
                  />
                  {(guestSearchQuery || selectedGuest) && (
                    <button
                      onClick={handleClearGuest}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Search dropdown */}
                {guestSearchOpen && guestsLoading && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-3 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                    <span className="text-xs text-muted-foreground">Searching guests…</span>
                  </div>
                )}
                {guestSearchOpen && !guestsLoading && guestSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {guestSearchResults.map((guest) => (
                      <button
                        key={guest.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left border-b border-border/50 last:border-0 transition-colors"
                        onClick={() => handleGuestSelect(guest)}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {guest.firstName} {guest.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {guest.email || guest.phone || '—'}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {guestSearchOpen && !guestsLoading && debouncedSearch.length >= 2 && guestSearchResults.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">No guests found.</p>
                  </div>
                )}
              </div>

              {/* Selected guest indicator */}
              {selectedGuest && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">
                    {selectedGuest.firstName} {selectedGuest.lastName}
                  </span>
                </div>
              )}

              {/* New guest link */}
              <button
                type="button"
                onClick={handleCreateNewGuestToggle}
                className="text-xs text-primary hover:underline"
              >
                + New guest instead
              </button>
            </>
          ) : (
            <>
              {/* New guest form */}
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Full name</Label>
                  <Input
                    className={cn(
                      'h-9 text-sm',
                      (errors.guestFirstName || errors.guestLastName) && 'border-destructive',
                    )}
                    placeholder="Full name"
                    value={`${guestFields.firstName} ${guestFields.lastName}`.trim()}
                    onChange={(e) => {
                      const parts = e.target.value.trim().split(/\s+/)
                      setGuestFields((prev) => ({
                        ...prev,
                        firstName: parts[0] || '',
                        lastName: parts.slice(1).join(' ') || '',
                      }))
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.guestFirstName
                        delete next.guestLastName
                        return next
                      })
                    }}
                  />
                  {(errors.guestFirstName || errors.guestLastName) && (
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Guest name is required
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email address</Label>
                  <Input
                    className="h-9 text-sm"
                    type="email"
                    placeholder="Email address"
                    value={guestFields.email}
                    onChange={(e) => updateGuestField('email', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Phone (optional)</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Phone (optional)"
                    value={guestFields.phone}
                    onChange={(e) => updateGuestField('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Back to search link */}
              <button
                type="button"
                onClick={handleClearGuest}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Pick an existing guest
              </button>
            </>
          )}
        </div>

        {/* Right: Booking review panel */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            REVIEW BOOKING
          </h4>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Dates</dt>
              <dd className="font-medium">
                {checkInDate && checkOutDate
                  ? `${formatDateShort(checkInDate)} → ${formatDateShort(checkOutDate)}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nights</dt>
              <dd className="font-medium">{nights || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Room</dt>
              <dd className="font-medium">
                {selectedRoom
                  ? `${selectedRoom.number} · ${selectedRoom.type.name}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="font-medium">
                {adults} adult{adults !== 1 ? 's' : ''}
                {children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Guest</dt>
              <dd className="font-medium text-right max-w-[180px] truncate">
                {guestDisplayName}
              </dd>
            </div>
          </dl>

          <Separator className="my-3 border-border/60" />

          {/* Price breakdown */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{formatCurrency(roomRate)} × {nights}</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service ({serviceRate}%)</span>
              <span>{formatCurrency(serviceAmount)}</span>
            </div>
            <Separator className="border-border/60" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  FOOTER NAVIGATION
  // ──────────────────────────────────────────────────────────────────────

  const renderFooter = () => {
    return (
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={step === 1}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext}
            className="gap-1.5"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedRoom}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarCheck className="h-4 w-4" />
            )}
            {isSubmitting ? 'Creating…' : `Confirm Booking · ${formatCurrency(totalAmount)}`}
          </Button>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[88vh] overflow-y-auto p-5 sm:p-6 backdrop-blur-xl bg-card/95"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <CalendarCheck className="h-5 w-5 text-primary" />
            New Reservation
          </DialogTitle>
          <DialogDescription>
            Three quick steps — dates, room and guest. Confirmed bookings appear instantly on the front desk lists.
          </DialogDescription>
        </DialogHeader>

        <DialogClose className="absolute top-4 right-4" />

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 1 && renderDatesStep()}
          {step === 2 && renderRoomStep()}
          {step === 3 && renderGuestStep()}
        </div>

        {/* Footer */}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}

// ─── Backward-Compatible Wrapper ────────────────────────────────────────

export function NewReservationPage({ onBack, onCreated }: { onBack?: () => void; onCreated?: (reservation: any) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <NewReservationDialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) onBack?.() }}
      onCreated={(r) => { onCreated?.(r); setOpen(false) }}
    />
  )
}
