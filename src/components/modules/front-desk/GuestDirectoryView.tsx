'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  Search, Phone, MessageSquare, Receipt, Bell, Users, Crown,
  Star, Mail, CalendarDays, BedDouble, Building,
  Sparkles, X, BookOpen, List, LayoutGrid,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/format'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { cn } from '@/lib/utils'
import { useNavigationStore, useFolioContextStore, useGuestLedgerContextStore } from '@/lib/store'
import { StatusBadge } from '@/components/shared/status-badge'

// ─── Types ──────────────────────────────────────────────────────────────

type VipLevel = 'none' | 'silver' | 'gold' | 'platinum'

type ViewMode = 'card' | 'table'

interface Guest {
  id: string
  reservationId: string
  confirmationNo: string
  firstName: string
  lastName: string
  roomNumber: string
  floor: number
  wing: string | null
  roomTypeName: string
  roomTypeCode: string
  roomBedConfig: string | null
  vipLevel: VipLevel
  phone: string | null
  email: string | null
  checkIn: string
  checkOut: string
  adults: number
  children: number
  specialRequests: string | null
  folioBalance: number
  status: string
}

// ─── VIP Badge ────────────────────────────────────────────────────────

function VipBadge({ level }: { level: VipLevel }) {
  if (level === 'none') return <span className="text-xs text-muted-foreground">—</span>

  const styles: Record<string, string> = {
    silver: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    gold: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    platinum: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-700',
  }

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 gap-0.5', styles[level])}>
      {level === 'gold' && <Crown className="size-3" />}
      {level === 'platinum' && <Star className="size-3 fill-violet-500 text-violet-500" />}
      {level === 'silver' && <Sparkles className="size-3" />}
      {level.toUpperCase()}
    </Badge>
  )
}

// ─── Main Component ────────────────────────────────────────────────────

export function GuestDirectoryView() {
  const { setActiveSubModule } = useNavigationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [vipFilter, setVipFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  // ─── Data Fetching ──────────────────────────────────────────────────

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['reservations', 'checked_in', 'guest-directory'],
    queryFn: () => apiFetch<{ reservations: any[]; total: number }>('/api/reservations?status=checked_in'),
    refetchInterval: 120000,
  })

  const guests: Guest[] = useMemo(() => {
    const raw = data?.reservations
    if (!Array.isArray(raw)) return []
    return raw.map((res: any) => ({
      id: res.guest?.id || '',
      reservationId: res.id || '',
      confirmationNo: res.confirmationNo || '',
      firstName: res.guest?.firstName || '',
      lastName: res.guest?.lastName || '',
      roomNumber: res.room?.number || '—',
      floor: res.room?.floor || 0,
      wing: res.room?.wing || null,
      roomTypeName: res.room?.type?.name || '',
      roomTypeCode: res.room?.type?.code || '',
      roomBedConfig: res.room?.type?.bedConfig || null,
      vipLevel: (res.guest?.vipLevel || 'none') as VipLevel,
      phone: res.guest?.phone || null,
      email: res.guest?.email || null,
      checkIn: res.checkIn || '',
      checkOut: res.checkOut || '',
      adults: res.adults || 0,
      children: res.children || 0,
      specialRequests: res.specialRequests || null,
      folioBalance: res.folios?.[0]?.balance ?? 0,
      status: res.status || 'checked_in',
    }))
  }, [data])

  // ─── Computed values ──────────────────────────────────────────

  const floors = useMemo(() => {
    const s = new Set(guests.map((g) => g.floor))
    return Array.from(s).sort((a, b) => a - b)
  }, [guests])

  const roomTypes = useMemo(() => {
    const s = new Set(guests.map((g) => g.roomTypeName).filter(Boolean))
    return Array.from(s).sort()
  }, [guests])

  const filteredGuests = useMemo(() => {
    let filtered = guests
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (g) =>
          `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
          g.roomNumber.includes(q) ||
          (g.phone && g.phone.includes(q)) ||
          (g.email && g.email.toLowerCase().includes(q)) ||
          g.confirmationNo.toLowerCase().includes(q),
      )
    }
    if (vipFilter !== 'all') filtered = filtered.filter((g) => g.vipLevel === vipFilter)
    if (floorFilter !== 'all') filtered = filtered.filter((g) => g.floor === Number(floorFilter))
    if (roomTypeFilter !== 'all') filtered = filtered.filter((g) => g.roomTypeName === roomTypeFilter)
    const vipOrder: Record<VipLevel, number> = { platinum: 0, gold: 1, silver: 2, none: 3 }
    return [...filtered].sort((a, b) => {
      const d = vipOrder[a.vipLevel] - vipOrder[b.vipLevel]
      return d !== 0 ? d : a.roomNumber.localeCompare(b.roomNumber)
    })
  }, [guests, searchQuery, vipFilter, floorFilter, roomTypeFilter])

  const totalGuests = guests.length
  const vipGuests = guests.filter((g) => g.vipLevel !== 'none').length

  // ─── Quick Action Handlers ───────────────────────────────────

  function handleCallGuest(guest: Guest) {
    toast.success(`Calling ${guest.firstName} ${guest.lastName}...`, { description: guest.phone || 'No phone', duration: 4000 })
  }
  function handleMessageGuest(guest: Guest) {
    toast.info(`Message sent to Room ${guest.roomNumber}`, { description: `${guest.firstName} ${guest.lastName}` })
  }
  function handleViewFolio(guest: Guest) {
    useFolioContextStore.getState().setFolioContext({
      reservationId: guest.reservationId,
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
      roomNumber: guest.roomNumber,
      confirmationNo: guest.confirmationNo,
    })
    setActiveSubModule('folio')
  }
  function handleViewLedger(guest: Guest) {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
    })
    setActiveSubModule('guest-ledger')
  }
  function handleWakeUpCall(guest: Guest) {
    toast.success(`Wake-up call scheduled for ${guest.firstName} ${guest.lastName}`, { description: `Room ${guest.roomNumber}` })
  }

  // ─── Loading / Error ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-52 mt-1" /></div>
        <Card className="py-0"><CardContent className="p-2"><div className="flex flex-wrap items-center gap-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" /></div></CardContent></Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-44 w-full" /></CardContent></Card>)}</div>
      </div>
    )
  }

  if (queryError) {
    return (
      <Card><CardContent className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-sm font-medium">Failed to load guest data</p>
        <p className="text-xs text-muted-foreground mt-1">{String(queryError)}</p>
      </CardContent></Card>
    )
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Guest Directory</h2>
        <p className="text-xs text-muted-foreground">
          {totalGuests} in-house guests · {vipGuests} VIP · Searchable directory
        </p>
      </div>

      {/* Filters */}
      <Card className="py-0">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Search name, room, phone, confirmation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('pl-8 h-7 text-xs', searchQuery && 'pr-7')}
              />
              {searchQuery && (
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors" onClick={() => setSearchQuery('')}>
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center justify-center size-7 transition-colors',
                    viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setViewMode('card')}
                  title="Card view"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center justify-center size-7 transition-colors border-l',
                    viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setViewMode('table')}
                  title="Table view"
                >
                  <List className="size-3.5" />
                </button>
              </div>
              <div className="relative">
                <Select value={vipFilter} onValueChange={setVipFilter}>
                  <SelectTrigger className={cn('w-[100px] h-7 data-[size=default]:h-7 text-xs', vipFilter !== 'all' && 'pr-8')}><SelectValue placeholder="VIP Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All VIP</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="none">Regular</SelectItem>
                  </SelectContent>
                </Select>
                {vipFilter !== 'all' && (
                  <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10" onClick={(e) => { e.stopPropagation(); setVipFilter('all') }}>
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className={cn('w-[90px] h-7 data-[size=default]:h-7 text-xs', floorFilter !== 'all' && 'pr-8')}><SelectValue placeholder="Floor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => <SelectItem key={floor} value={String(floor)}>Floor {floor}</SelectItem>)}
                  </SelectContent>
                </Select>
                {floorFilter !== 'all' && (
                  <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10" onClick={(e) => { e.stopPropagation(); setFloorFilter('all') }}>
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                  <SelectTrigger className={cn('w-[110px] h-7 data-[size=default]:h-7 text-xs', roomTypeFilter !== 'all' && 'pr-8')}><SelectValue placeholder="Room Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {roomTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
                {roomTypeFilter !== 'all' && (
                  <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10" onClick={(e) => { e.stopPropagation(); setRoomTypeFilter('all') }}>
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
            {(searchQuery || vipFilter !== 'all' || floorFilter !== 'all' || roomTypeFilter !== 'all') && (
              <button type="button" onClick={() => { setSearchQuery(''); setVipFilter('all'); setFloorFilter('all'); setRoomTypeFilter('all') }} className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0" title="Clear all filters">
                <X className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">Showing {filteredGuests.length} of {totalGuests}</p>
          </div>
        </CardContent>
      </Card>

      {/* Guest Cards / Table */}
      {filteredGuests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="size-8 mb-2 opacity-40" />
            <p className="text-sm">No guests match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuests.map((guest) => {
            const isVip = guest.vipLevel !== 'none'
            const isGoldOrPlatinum = guest.vipLevel === 'gold' || guest.vipLevel === 'platinum'

            return (
              <Card key={guest.reservationId} className={cn('transition-all hover:shadow-md', isGoldOrPlatinum && 'border-amber-300 dark:border-amber-700 shadow-amber-100/50 dark:shadow-amber-950/30')}>
                <CardContent className="p-2.5 flex flex-col gap-2">
                  {/* Guest Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('flex size-9 items-center justify-center rounded-full text-sm font-bold shrink-0', isGoldOrPlatinum ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300 dark:ring-amber-700' : isVip ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-muted text-muted-foreground')}>
                        {guest.firstName?.[0] || '?'}{guest.lastName?.[0] || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{guest.firstName} {guest.lastName}</span>
                          <VipBadge level={guest.vipLevel} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <BedDouble className="size-3" />
                          <span className="font-mono font-medium">{guest.roomNumber}</span>
                          {guest.roomTypeName && <RoomTypeBedBadge typeName={guest.roomTypeName} bedConfig={guest.roomBedConfig} typeCode={guest.roomTypeCode} pax={guest.adults + guest.children} inline />}
                          {guest.floor > 0 && (<><span>·</span><Building className="size-3" /><span>Floor {guest.floor}</span></>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      <span className="font-mono truncate">{guest.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{guest.email || '—'}</span>
                    </div>
                    {guest.folioBalance > 0 && (
                      <div className="flex items-center gap-1.5 text-red-500 col-span-2">
                        <Receipt className="size-3 shrink-0" />
                        <span className="font-medium">Balance: {formatCurrency(guest.folioBalance)}</span>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  {guest.checkIn && guest.checkOut && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      <span>{formatDate(guest.checkIn)} → {formatDate(guest.checkOut)}</span>
                    </div>
                  )}

                  {/* Special Requests */}
                  {guest.specialRequests && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Special Requests</p>
                      <p className="text-xs text-muted-foreground italic truncate">{guest.specialRequests}</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 px-2" onClick={() => handleCallGuest(guest)} title={`Call ${guest.phone}`}><Phone className="size-3" /><span className="hidden sm:inline">Call</span></Button>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 px-2" onClick={() => handleMessageGuest(guest)} title="Send message"><MessageSquare className="size-3" /><span className="hidden sm:inline">Message</span></Button>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 px-2" onClick={() => handleViewFolio(guest)} title="View folio"><Receipt className="size-3" /><span className="hidden sm:inline">Folio</span></Button>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 px-2" onClick={() => handleViewLedger(guest)} title="View ledger"><BookOpen className="size-3" /><span className="hidden sm:inline">Ledger</span></Button>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 px-2" onClick={() => handleWakeUpCall(guest)} title="Schedule wake-up call"><Bell className="size-3" /><span className="hidden sm:inline">Wake-up</span></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Room</TableHead>
                  <TableHead className="text-xs">Guest Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Dates</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                  <TableHead className="text-xs">VIP</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => (
                  <TableRow key={guest.reservationId}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">{guest.roomNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{guest.firstName} {guest.lastName}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">{guest.confirmationNo}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{guest.roomTypeName}</span>
                        {guest.roomBedConfig && (
                          <RoomTypeBedBadge typeName={guest.roomTypeName} bedConfig={guest.roomBedConfig} typeCode={guest.roomTypeCode} pax={guest.adults + guest.children} inline />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {guest.checkIn && guest.checkOut ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(guest.checkIn)} → {formatDate(guest.checkOut)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn('text-sm font-semibold', guest.folioBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {formatCurrency(guest.folioBalance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <VipBadge level={guest.vipLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={guest.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => handleCallGuest(guest)} title="Call">
                          <Phone className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => handleViewFolio(guest)} title="Folio">
                          <Receipt className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => handleViewLedger(guest)} title="Ledger">
                          <BookOpen className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
