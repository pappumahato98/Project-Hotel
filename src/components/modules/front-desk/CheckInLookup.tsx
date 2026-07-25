'use client'

import { apiFetch } from '@/lib/api'
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, User, Users, Clock, Loader2, Check, Zap, ArrowLeft, X, CheckCircle2,
  Crown, Mail, Phone, CalendarDays, Star, BedDouble, Minus, Plus,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'

import { formatDate, formatCurrency, nightsBetween, getTodayString, formatDateShort, toDateOnly, fromDateOnly } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore, useFrontDeskContextStore, type CheckInSession } from '@/lib/store'
// Types

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

interface CheckInLookupProps {
  onBack: () => void
  prefillReservationId?: string
}

const COUNTRIES = [
  'Nepal', 'India', 'China', 'USA', 'UK', 'Japan', 'South Korea',
  'Germany', 'France', 'Australia', 'Canada', 'Singapore', 'Malaysia',
  'Thailand', 'Sri Lanka', 'Bangladesh', 'Pakistan', 'UAE', 'Saudi Arabia',
  'Netherlands', 'Italy', 'Spain', 'Brazil', 'Russia', 'Other',
]
function InfoItem({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium flex items-center gap-1">{icon}{value}</p>
    </div>
  )
}

function NumberStepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
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
  )
}

function sourceLabel(source: string | null) {
  switch (source) {
    case 'walk_in': return 'Walk-in'
    case 'online': return 'Online'
    case 'phone': return 'Phone'
    case 'travel_agent': return 'Travel Agent'
    case 'corporate': return 'Corporate'
    default: return source || 'Direct'
  }
}

// Main Component ──────────────────────────────────────────────────--------------------------------------------------

export function CheckInLookup({ onBack, prefillReservationId }: CheckInLookupProps) {
  const { setActiveSubModule } = useNavigationStore()
  const { setCheckInSession, setPrefillReservationId } = useFrontDeskContextStore()

  const today = getTodayString()

  // State ───────────────────────────────────────────────────────────-------------------------------------------------
  const [expressMode, setExpressMode] = useState(false)
  const [isDirectWalkIn, setIsDirectWalkIn] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchedReservationId, setSearchedReservationId] = useState<string | null>(null)

  // Walk-in fields
  const [walkInDate, setWalkInDate] = useState(today)
  const [walkInCheckOut, setWalkInCheckOut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateOnly(d)
  })
  const [walkInAdults, setWalkInAdults] = useState(2)
  const [walkInChildren, setWalkInChildren] = useState(0)
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestNationality, setGuestNationality] = useState('')

  // Clear prefill on unmount to avoid stale prefills
  useEffect(() => {
    return () => { setPrefillReservationId(null) }
  }, [setPrefillReservationId])

  // Debounced search ────────────────────────────────────────────────---------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Data Queries ────────────────────────────────────────────────────------------------------------------------

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

  // Guest stay history
  const { data: guestStayHistory } = useQuery({
    queryKey: ['guest-stays', reservationData?.guest?.id],
    queryFn: async () => {
      if (!reservationData?.guest?.id) return null
      try {
        return await apiFetch(`/api/guests/${reservationData.guest.id}/stays`) as Array<{ id: string; checkIn: string; checkOut: string; roomNumber: string }>
      } catch {
        return null
      }
    },
    enabled: !!reservationData?.guest?.id && !!searchedReservationId,
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

  // Available rooms for walk-in mode (for live summary)
  const { data: availableRoomsData } = useQuery({
    queryKey: ['rooms-available-count'],
    queryFn: async () => {
      return apiFetch('/api/rooms?status=vacant_clean,inspected') as Promise<{
        rooms: Array<{ id: string; type: { id: string; name: string; code: string } }>
        roomTypes: Array<{ id: string; name: string; code: string; baseOccupancy: number; maxOccupancy: number }>
        summary?: { available: number; totalRooms: number; occupied: number }
      }>
    },
    enabled: isDirectWalkIn,
  })

  // Compute available rooms by type for walk-in
  const walkInNights = nightsBetween(walkInDate, walkInCheckOut)
  const totalPax = walkInAdults + walkInChildren
  const canContinue = !!(guestFirstName.trim() && guestLastName.trim())
  const availableRoomTypes = useMemo(() => {
    if (!availableRoomsData) return []
    const counts: Record<string, number> = {}
    for (const r of availableRoomsData.rooms) {
      const rtId = r.type.id
      counts[rtId] = (counts[rtId] || 0) + 1
    }
    return availableRoomsData.roomTypes.map(rt => ({
      ...rt,
      availableCount: counts[rt.id] || 0,
    })).filter(rt => rt.availableCount > 0 && rt.maxOccupancy >= totalPax)
  }, [availableRoomsData, totalPax])

  // Reservation search (debounced)
  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useQuery({
    queryKey: ['reservation-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null
      const data = await apiFetch<{ reservations?: ReservationData[] }>(`/api/reservations?search=${encodeURIComponent(debouncedQuery)}&status=confirmed,tentative`)
      return (data?.reservations || []) as ReservationData[]
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Handlers ────────────────────────────────────────────────────────-----------------------------------------------

  const navigateToProcess = useCallback((session: CheckInSession) => {
    setCheckInSession(session)
    setActiveSubModule('check-in-process')
  }, [setCheckInSession, setActiveSubModule])

  const handleUseReservation = useCallback(() => {
    if (!reservationData) return
    navigateToProcess({
      reservationId: reservationData.id,
      reservationData: reservationData as unknown as Record<string, unknown>,
      isDirectWalkIn: false,
      walkInGuest: null,
      walkInDates: null,
      startAtStep: 1,
    })
    toast.success('Reservation confirmed! Proceeding to check-in.')
  }, [reservationData, navigateToProcess])

  const handleExpressCheckIn = useCallback((res: ReservationData) => {
    navigateToProcess({
      reservationId: res.id,
      reservationData: res as unknown as Record<string, unknown>,
      isDirectWalkIn: false,
      walkInGuest: null,
      walkInDates: null,
      startAtStep: 2,
    })
    toast.success('Express check-in - skipping to Room & Rate')
  }, [navigateToProcess])

  const handleWalkInContinue = useCallback(() => {
    if (!guestFirstName || !guestLastName) {
      toast.error('Please enter guest first and last name')
      return
    }
    navigateToProcess({
      reservationId: null,
      reservationData: null,
      isDirectWalkIn: true,
      walkInGuest: {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
        phone: guestPhone,
        nationality: guestNationality,
      },
      walkInDates: {
        checkIn: walkInDate,
        checkOut: walkInCheckOut,
        adults: walkInAdults,
        children: walkInChildren,
      },
      startAtStep: 1,
    })
  }, [guestFirstName, guestLastName, guestEmail, guestPhone, guestNationality, walkInDate, walkInCheckOut, walkInAdults, walkInChildren, navigateToProcess])

  // Reservation Card Renderer ───────────────────────────────────────-----------------------------

  const renderReservationCard = useCallback((res: ReservationData) => {
    const isSelected = searchedReservationId === res.id
    return (
      <Card
        key={res.id}
        className={cn(
          'p-2.5 cursor-pointer transition-all border',
          isSelected
            ? 'border-teal-400 ring-2 ring-teal-400/20 bg-teal-50/50 dark:bg-teal-950/20'
            : 'hover:bg-muted/50'
        )}
        onClick={() => setSearchedReservationId(res.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                {res.confirmationNo}
              </Badge>
              {res.guest?.vipLevel && res.guest.vipLevel !== 'none' && (
                <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                  VIP
                </Badge>
              )}
              {res.source && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {sourceLabel(res.source)}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium truncate">
              {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : 'Guest unknown'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {res.room && <span>Room {res.room.number}</span>}
              {res.room && <RoomTypeBedBadge typeName={res.room.type.name} bedConfig={res.room.type.bedConfig} typeCode={res.room.type.code} pax={res.adults + res.children} inline />}
              <span>·</span>
              <span>{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
              <span>·</span>
              <span className="font-medium">{formatCurrency(res.roomRate)}/night</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isSelected && (
              <Check className="w-4 h-4 text-teal-600" />
            )}
            {expressMode && (
              <Button
                size="sm"
                className="h-7 text-[11px] px-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchedReservationId(res.id)
                  handleExpressCheckIn(res)
                }}
              >
                <Zap className="w-3 h-3 mr-1" />
                Express
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }, [searchedReservationId, expressMode, handleExpressCheckIn])

  // Render ──────────────────────────────────────────────────────────-----------------------------------------------
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4">

          {/* Prefilled reservation mode */}
          {prefillReservationId ? (
            <>
              {/* Header for prefill mode */}
              <div className="shrink-0 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-2 px-3 sm:px-4 py-2.5 border-b bg-card">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <Separator orientation="vertical" className="h-5" />
                  <h1 className="text-base sm:text-lg font-semibold text-foreground">Guest Check-In</h1>
                </div>
              </div>
              {reservationLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-40 w-full" />
                </div>
              )}
              {reservationError && (
                <Card className="border-red-200 dark:border-red-800 p-2.5">
                  <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <svg className="h-5 w-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p className="font-medium text-sm">Reservation Not Found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The reservation could not be found. Please search or use direct walk-in.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => { setPrefillReservationId(null) }}>
                    Use Direct Walk-in Instead
                  </Button>
                </Card>
              )}
              {reservationData && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check className="w-3 h-3 mr-1" />
                      Reservation Found
                    </Badge>
                  </div>
                  <Card className="p-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <InfoItem label="Confirmation #" value={reservationData.confirmationNo} />
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <p className="text-sm font-medium flex items-center gap-1"><StatusBadge status={reservationData.status} /></p>
                      </div>
                      <InfoItem label="Guest" value={reservationData.guest ? `${reservationData.guest.firstName} ${reservationData.guest.lastName}` : '-'} />
                      <InfoItem label="Room" value={reservationData.room ? <span className="flex items-center gap-1.5">{reservationData.room.number} <RoomTypeBedBadge typeName={reservationData.room.type.name} bedConfig={reservationData.room.type.bedConfig} typeCode={reservationData.room.type.code} pax={reservationData.adults + reservationData.children} inline /></span> : '-'} />
                      <InfoItem label="Stay" value={`${formatDate(reservationData.checkIn)} → ${formatDate(reservationData.checkOut)}`} />
                      <InfoItem label="Rate" value={`${formatCurrency(reservationData.roomRate)}/night`} />
                    </div>
                    {/* Guest stay history */}
                    {guestStayHistory && guestStayHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Previous Stays ({guestStayHistory.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {guestStayHistory.slice(0, 3).map((stay, i) => (
                            <Badge key={stay.id || i} variant="secondary" className="text-[10px] h-5">
                              {stay.roomNumber} · {formatDateShort(stay.checkIn)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                  <div className="flex gap-2">
                    <Button onClick={handleUseReservation} className="flex-1">
                      <Check className="w-4 h-4 mr-2" />
                      Go Check-in
                    </Button>
                    {expressMode && (
                      <Button variant="outline" className="flex-1" onClick={() => handleExpressCheckIn(reservationData)}>
                        <Zap className="w-4 h-4 mr-2 text-amber-500" />
                        Express Check-In
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Combined Header: Back + Mode Toggle + Express */}
              <div className="shrink-0 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-2 px-3 sm:px-4 py-2 border-b bg-card">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <Separator orientation="vertical" className="h-5 hidden sm:block" />
                  <div className="flex-1 flex items-center bg-muted/60 rounded-lg p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setIsDirectWalkIn(false)}
                      className={cn(
                        'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all text-center',
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
                        'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all text-center',
                        isDirectWalkIn
                          ? 'bg-white dark:bg-card shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <User className="w-3.5 h-3.5 inline mr-1.5" />
                      Direct Walk-in
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <Zap className={cn('w-3.5 h-3.5', expressMode ? 'text-amber-500' : 'text-muted-foreground')} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">Express</span>
                    <Switch
                      id="express-mode"
                      checked={expressMode}
                      onCheckedChange={setExpressMode}
                      className="scale-90"
                    />
                  </div>
                </div>
              </div>

              {!isDirectWalkIn ? (
                /* --- Find Reservation Mode (Dual Column) --- */
                <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
                  {/* Left Column — Search & Results List */}
                  <div className="lg:w-[48%] xl:w-[46%] 2xl:w-[44%] space-y-2 min-w-0">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by confirmation #, guest name, or room..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9 h-10 text-sm"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setDebouncedQuery(''); setSearchedReservationId(null) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {searchLoading && (
                        <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Search results */}
                    {searchResults && searchResults.length > 0 && (
                      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                        {searchResults.map(res => renderReservationCard(res))}
                      </div>
                    )}
                    {searchResults && debouncedQuery.length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
                        No reservations found matching &quot;{debouncedQuery}&quot;
                      </p>
                    )}

                    {/* Today's Expected Arrivals */}
                    {!debouncedQuery && (
                      <div className="space-y-2">
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
                          <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                            {arrivalsData.map(res => renderReservationCard(res))}
                          </div>
                        )}
                        {arrivalsData && arrivalsData.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2 bg-muted/30 rounded-lg">
                            No expected arrivals for today
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column — Selected Reservation Detail / Calendar Summary */}
                  <div className="lg:w-[52%] xl:w-[54%] 2xl:w-[56%] min-w-0">
                    {searchedReservationId && reservationData ? (
                      <Card className="p-3 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-4 h-4 text-teal-600" />
                          <h4 className="text-sm font-semibold">Reservation Details</h4>
                          <Badge variant="outline" className="text-[10px] font-mono ml-auto">{reservationData.confirmationNo}</Badge>
                        </div>

                        {/* Guest info header */}
                        <div className="flex items-center gap-3 mb-2 pb-2 border-b">
                          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-teal-700 dark:text-teal-300">
                              {reservationData.guest?.firstName?.charAt(0)?.toUpperCase() || '?'}
                              {reservationData.guest?.lastName?.charAt(0)?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {reservationData.guest ? `${reservationData.guest.firstName} ${reservationData.guest.lastName}` : 'Unknown Guest'}
                              {reservationData.guest?.vipLevel && reservationData.guest.vipLevel !== 'none' && (
                                <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 ml-2">
                                  <Crown className="w-2.5 h-2.5 mr-0.5" /> VIP
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {reservationData.guest?.email && <><Mail className="w-3 h-3" /><span className="truncate">{reservationData.guest.email}</span></>}
                            </div>
                          </div>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-2">
                          <InfoItem label="Room" value={reservationData.room ? <span className="flex items-center gap-1.5">{reservationData.room.number} <RoomTypeBedBadge typeName={reservationData.room.type.name} bedConfig={reservationData.room.type.bedConfig} typeCode={reservationData.room.type.code} pax={reservationData.adults + reservationData.children} inline /></span> : 'Not assigned'} />
                          <InfoItem label="Stay" value={`${formatDateShort(reservationData.checkIn)} → ${formatDateShort(reservationData.checkOut)}`} />
                          <InfoItem label="Rate" value={`${formatCurrency(reservationData.roomRate)}/night`} />
                          <InfoItem label="Pax" value={
                            <>
                              <span>{reservationData.adults} Adults</span>
                              {reservationData.children > 0 && (
                                <span className="ml-1">{reservationData.children} Children</span>
                              )}
                              <span className="text-red-500 font-semibold ml-1">
                                ({reservationData.adults + reservationData.children})
                              </span>
                            </>
                          } />
                          <InfoItem label="Source" value={sourceLabel(reservationData.source)} />
                          <InfoItem label="Total" value={formatCurrency(reservationData.totalAmount)} />
                        </div>

                        {/* Calendar stay summary */}
                        {reservationData.checkIn && reservationData.checkOut && (() => {
                          const ci = fromDateOnly(reservationData.checkIn)
                          const co = fromDateOnly(reservationData.checkOut)
                          const nights = nightsBetween(reservationData.checkIn, reservationData.checkOut)
                          return (
                            <div className="rounded-lg bg-background/60 p-2 mb-2">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Stay Calendar</h4>
                              <div className="grid grid-cols-7 gap-1 text-center">
                                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                                  <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                                ))}
                                {Array.from({ length: 35 }, (_, i) => {
                                  const baseDate = new Date(ci.getFullYear(), ci.getMonth(), 1)
                                  const day = new Date(baseDate)
                                  day.setDate(baseDate.getDate() + i - baseDate.getDay())
                                  const isCheckIn = day.toDateString() === ci.toDateString()
                                  const isCheckOut = day.toDateString() === co.toDateString()
                                  const isStay = day >= ci && day < co
                                  const isToday = day.toDateString() === new Date().toDateString()
                                  const isCurrentMonth = day.getMonth() === ci.getMonth()
                                  return (
                                    <div
                                      key={i}
                                      className={cn(
                                        'text-[11px] py-1 rounded-md transition-colors',
                                        !isCurrentMonth && 'text-muted-foreground/30',
                                        isCurrentMonth && !isStay && !isCheckIn && !isCheckOut && 'text-muted-foreground',
                                        isStay && !isCheckIn && !isCheckOut && 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 font-medium',
                                        isCheckIn && 'bg-emerald-500 text-white font-bold rounded-l-md',
                                        isCheckOut && 'bg-rose-500 text-white font-bold rounded-r-md',
                                        isToday && 'ring-1 ring-inset ring-amber-400',
                                      )}
                                    >
                                      {day.getDate()}
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="flex items-center justify-between mt-2 text-[10px]">
                                <span className="text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</span>
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Check-in</span>
                                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-100 dark:bg-teal-900/40" /> Stay</span>
                                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Check-out</span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Special requests */}
                        {reservationData.specialRequests && (
                          <div className="mb-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Special Requests</p>
                            <p className="text-xs text-muted-foreground">{reservationData.specialRequests}</p>
                          </div>
                        )}

                        {/* Guest stay history */}
                        {guestStayHistory && guestStayHistory.length > 0 && (
                          <div className="mb-2 pt-2 border-t">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              <Star className="w-3 h-3 inline mr-0.5" />
                              Previous Stays ({guestStayHistory.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {guestStayHistory.slice(0, 3).map((stay, i) => (
                                <Badge key={stay.id || i} variant="secondary" className="text-[10px] h-5">
                                  {stay.roomNumber} · {formatDateShort(stay.checkIn)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={handleUseReservation} className="flex-1">
                            <Check className="w-4 h-4 mr-2" />
                            Go Check-in
                          </Button>
                          {expressMode && (
                            <Button variant="outline" className="flex-1" onClick={() => handleExpressCheckIn(reservationData)}>
                              <Zap className="w-4 h-4 mr-2 text-amber-500" />
                              Express Check-In
                            </Button>
                          )}
                        </div>
                      </Card>
                    ) : (
                      /* Empty state for right column */
                      <Card className="p-6 border-dashed flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <Search className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Select a Reservation</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Click a reservation from the list or search to view details and check-in
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                /* --- Direct Walk-in Mode (Split Screen) --- */
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Left Panel — Form */}
                  <div className="lg:w-[55%] xl:w-[52%] 2xl:w-[50%] space-y-2">
                    {/* Guest Info */}
                    <Card className="p-2.5">
                      <CardTitle className="text-sm mb-2">
                        <User className="w-3.5 h-3.5 inline mr-1.5 text-amber-600" />
                        Guest Information
                      </CardTitle>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
                          <Input value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)} placeholder="First name" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Last Name <span className="text-red-500">*</span></Label>
                          <Input value={guestLastName} onChange={e => setGuestLastName(e.target.value)} placeholder="Last name" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="guest@email.com" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+977-98XXXXXXXX" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Nationality</Label>
                          <Select value={guestNationality} onValueChange={setGuestNationality}>
                            <SelectTrigger className="h-9 text-sm">
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
                    <Card className="p-2.5">
                      <CardTitle className="text-sm mb-2">
                        <CalendarDays className="w-3.5 h-3.5 inline mr-1.5 text-teal-600" />
                        Stay Details
                      </CardTitle>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Check-in Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 text-sm w-full justify-start font-normal">
                                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                                {formatDate(walkInDate)}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={fromDateOnly(walkInDate)} onSelect={d => d && setWalkInDate(toDateOnly(d))} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Check-out Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 text-sm w-full justify-start font-normal">
                                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                                {formatDate(walkInCheckOut)}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={fromDateOnly(walkInCheckOut)} onSelect={d => d && setWalkInCheckOut(toDateOnly(d))} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <NumberStepper label="Adults" value={walkInAdults} min={1} max={10} onChange={setWalkInAdults} />
                        <NumberStepper label="Children" value={walkInChildren} min={0} max={10} onChange={setWalkInChildren} />
                      </div>
                    </Card>

                    {/* Continue Button */}
                    <Button onClick={handleWalkInContinue} className="w-full" size="lg" disabled={!canContinue}>
                      <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                      Continue to Check-In
                    </Button>
                  </div>

                  {/* Right Panel — Live Summary */}
                  <div className="lg:w-[45%] xl:w-[48%] 2xl:w-[50%] space-y-2">
                    <Card className="p-3 border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          <User className="w-3 h-3 mr-1" />
                          Direct Walk-in
                        </Badge>
                        {canContinue ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground ml-auto">Fill name to continue</span>
                        )}
                      </div>

                      {/* Guest Summary */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest</h4>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                              {guestFirstName ? guestFirstName.charAt(0).toUpperCase() : '?'}
                              {guestLastName ? guestLastName.charAt(0).toUpperCase() : ''}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {guestFirstName || guestLastName
                                ? `${guestFirstName || ''} ${guestLastName || ''}`.trim() || '—'
                                : <span className="text-muted-foreground italic">Enter guest name</span>
                              }
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {guestEmail && <><Mail className="w-3 h-3" /><span className="truncate">{guestEmail}</span></>}
                              {guestPhone && <><Phone className="w-3 h-3 ml-1" /><span>{guestPhone}</span></>}
                            </div>
                            {guestNationality && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <Star className="w-3 h-3 inline mr-0.5" />{guestNationality}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-2" />

                      {/* Stay Summary */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stay</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 rounded-lg bg-background/60">
                            <p className="text-[10px] text-muted-foreground">Check-in</p>
                            <p className="text-sm font-semibold">{formatDateShort(walkInDate)}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background/60">
                            <p className="text-[10px] text-muted-foreground">Nights</p>
                            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{walkInNights}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background/60">
                            <p className="text-[10px] text-muted-foreground">Check-out</p>
                            <p className="text-sm font-semibold">{formatDateShort(walkInCheckOut)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{walkInAdults}</span>
                            <span className="text-muted-foreground text-xs">Adults</span>
                          </span>
                          {walkInChildren > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">{walkInChildren}</span>
                              <span className="text-muted-foreground text-xs">Children</span>
                            </span>
                          )}
                          <span className="text-red-500 dark:text-red-400 font-semibold text-xs">
                            Pax: {totalPax}
                          </span>
                        </div>
                      </div>

                      <Separator className="my-2" />

                      {/* Stay Calendar Summary */}
                      {walkInNights > 0 && (() => {
                        const ci = fromDateOnly(walkInDate)
                        const co = fromDateOnly(walkInCheckOut)
                        return (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stay Calendar</h4>
                            <div className="rounded-lg bg-background/60 p-2">
                              <div className="grid grid-cols-7 gap-0.5 text-center">
                                {['S','M','T','W','T','F','S'].map((d, i) => (
                                  <div key={i} className="text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
                                ))}
                                {Array.from({ length: 35 }, (_, i) => {
                                  const baseDate = new Date(ci.getFullYear(), ci.getMonth(), 1)
                                  const day = new Date(baseDate)
                                  day.setDate(baseDate.getDate() + i - baseDate.getDay())
                                  const isCheckIn = day.toDateString() === ci.toDateString()
                                  const isCheckOut = day.toDateString() === co.toDateString()
                                  const isStay = day >= ci && day < co
                                  const isToday = day.toDateString() === new Date().toDateString()
                                  const isCurrentMonth = day.getMonth() === ci.getMonth()
                                  return (
                                    <div
                                      key={i}
                                      className={cn(
                                        'text-[10px] py-0.5 rounded-sm',
                                        !isCurrentMonth && 'opacity-20',
                                        isCurrentMonth && !isStay && !isCheckIn && !isCheckOut && 'text-muted-foreground',
                                        isStay && !isCheckIn && !isCheckOut && 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
                                        isCheckIn && 'bg-emerald-500 text-white font-bold',
                                        isCheckOut && 'bg-rose-500 text-white font-bold',
                                        isToday && !isCheckIn && !isCheckOut && 'ring-1 ring-inset ring-amber-400',
                                      )}
                                    >
                                      {day.getDate()}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      <Separator className="my-2" />

                      {/* Available Rooms Summary */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Available Room Types
                          {availableRoomsData && (
                            <span className="ml-1 text-teal-600 dark:text-teal-400 font-normal normal-case">
                              ({availableRoomsData.rooms.length} rooms)
                            </span>
                          )}
                        </h4>
                        {!availableRoomsData ? (
                          <div className="space-y-1.5">
                            <Skeleton className="h-7 w-full" />
                            <Skeleton className="h-7 w-3/4" />
                          </div>
                        ) : availableRoomTypes.length > 0 ? (
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {availableRoomTypes.map(rt => (
                              <div key={rt.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background/60 hover:bg-background/80 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BedDouble className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs font-medium truncate">{rt.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{rt.code}</span>
                                </div>
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                                  {rt.availableCount} room{rt.availableCount > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 text-center py-2">
                            No room types available for {totalPax} pax
                          </p>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}