'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search, Phone, MessageSquare, Receipt, Bell, Users, Crown,
  Star, Globe, Mail, CalendarDays, BedDouble, Building,
  Sparkles, UserCheck, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────

type VipLevel = 'none' | 'silver' | 'gold' | 'platinum'

interface Guest {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  floor: number
  roomType: string
  vipLevel: VipLevel
  phone: string
  email: string
  nationality: string
  checkIn: string
  checkOut: string
  specialRequests: string
}

// ─── Static Mock Data ───────────────────────────────────────────────────

const GUESTS: Guest[] = [
  {
    id: 'g-1',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    roomNumber: '201',
    floor: 2,
    roomType: 'Deluxe King',
    vipLevel: 'gold',
    phone: '+977-9841-234567',
    email: 'rajesh.sharma@ntc.com.np',
    nationality: 'Nepal',
    checkIn: '2025-07-15',
    checkOut: '2025-07-23',
    specialRequests: 'Extra pillows, late checkout preferred',
  },
  {
    id: 'g-2',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    roomNumber: '305',
    floor: 3,
    roomType: 'Suite',
    vipLevel: 'platinum',
    phone: '+1-555-012-3456',
    email: 'sarah.m@gmail.com',
    nationality: 'United Kingdom',
    checkIn: '2025-07-16',
    checkOut: '2025-07-25',
    specialRequests: 'Honeymoon couple, champagne on arrival, mountain view',
  },
  {
    id: 'g-3',
    firstName: 'Bikash',
    lastName: 'Thapa',
    roomNumber: '102',
    floor: 1,
    roomType: 'Standard Double',
    vipLevel: 'none',
    phone: '+977-9851-345678',
    email: 'bikash.thapa@gmail.com',
    nationality: 'Nepal',
    checkIn: '2025-07-18',
    checkOut: '2025-07-22',
    specialRequests: 'Early check-in at 10 AM, business center access',
  },
  {
    id: 'g-4',
    firstName: 'Priya',
    lastName: 'Koirala',
    roomNumber: '115',
    floor: 1,
    roomType: 'Deluxe Twin',
    vipLevel: 'silver',
    phone: '+977-9861-456789',
    email: 'priya.k@outlook.com',
    nationality: 'Nepal',
    checkIn: '2025-07-17',
    checkOut: '2025-07-24',
    specialRequests: 'Extra bed for child, vegetarian meals',
  },
  {
    id: 'g-5',
    firstName: 'David',
    lastName: 'Chen',
    roomNumber: '308',
    floor: 3,
    roomType: 'Superior King',
    vipLevel: 'none',
    phone: '+86-138-0012-3456',
    email: 'david.chen@163.com',
    nationality: 'China',
    checkIn: '2025-07-19',
    checkOut: '2025-07-23',
    specialRequests: 'Chinese breakfast, no spicy food',
  },
  {
    id: 'g-6',
    firstName: 'Aarav',
    lastName: 'Poudel',
    roomNumber: '210',
    floor: 2,
    roomType: 'Deluxe King',
    vipLevel: 'gold',
    phone: '+977-9842-567890',
    email: 'aarav.p@xyz.com',
    nationality: 'Nepal',
    checkIn: '2025-07-18',
    checkOut: '2025-07-21',
    specialRequests: 'Anniversary celebration, flower arrangement',
  },
  {
    id: 'g-7',
    firstName: 'Emily',
    lastName: 'Johnson',
    roomNumber: '401',
    floor: 4,
    roomType: 'Premium Suite',
    vipLevel: 'platinum',
    phone: '+44-7700-900123',
    email: 'emily.j@business.co.uk',
    nationality: 'United Kingdom',
    checkIn: '2025-07-19',
    checkOut: '2025-07-26',
    specialRequests: 'Conference delegate, high-speed WiFi, printer access',
  },
  {
    id: 'g-8',
    firstName: 'Suman',
    lastName: 'Lama',
    roomNumber: '203',
    floor: 2,
    roomType: 'Deluxe King',
    vipLevel: 'gold',
    phone: '+977-9852-678901',
    email: 'suman.lama@mail.com.np',
    nationality: 'Nepal',
    checkIn: '2025-07-17',
    checkOut: '2025-07-23',
    specialRequests: 'Anniversary, fruit basket, wake-up call at 8 AM',
  },
  {
    id: 'g-9',
    firstName: 'Anita',
    lastName: 'Gurung',
    roomNumber: '410',
    floor: 4,
    roomType: 'Premium Suite',
    vipLevel: 'platinum',
    phone: '+977-9843-789012',
    email: 'anita.gurung@travel.com',
    nationality: 'Nepal',
    checkIn: '2025-07-16',
    checkOut: '2025-07-22',
    specialRequests: 'Mountain flight at 6:30 AM, packed breakfast',
  },
  {
    id: 'g-10',
    firstName: 'Deepak',
    lastName: 'Maharjan',
    roomNumber: '106',
    floor: 1,
    roomType: 'Standard Single',
    vipLevel: 'none',
    phone: '+977-9853-890123',
    email: 'deepak.m@gmail.com',
    nationality: 'Nepal',
    checkIn: '2025-07-20',
    checkOut: '2025-07-22',
    specialRequests: 'Quiet room, away from elevator',
  },
  {
    id: 'g-11',
    firstName: 'Hiroshi',
    lastName: 'Tanaka',
    roomNumber: '307',
    floor: 3,
    roomType: 'Superior King',
    vipLevel: 'silver',
    phone: '+81-90-1234-5678',
    email: 'tanaka.h@docomo.ne.jp',
    nationality: 'Japan',
    checkIn: '2025-07-19',
    checkOut: '2025-07-24',
    specialRequests: 'Japanese speaking staff if available, tatami room preferred',
  },
  {
    id: 'g-12',
    firstName: 'Krishtika',
    lastName: 'Tuladhar',
    roomNumber: '212',
    floor: 2,
    roomType: 'Deluxe Twin',
    vipLevel: 'silver',
    phone: '+977-9860-112233',
    email: 'krishtika.t@gmail.com',
    nationality: 'Nepal',
    checkIn: '2025-07-20',
    checkOut: '2025-07-25',
    specialRequests: 'Yoga mat in room, green tea before bed',
  },
]

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

  // ─── Computed values ──────────────────────────────────────────

  const floors = useMemo(() => {
    const floorSet = new Set(GUESTS.map((g) => g.floor))
    return Array.from(floorSet).sort((a, b) => a - b)
  }, [])

  const roomTypes = useMemo(() => {
    const typeSet = new Set(GUESTS.map((g) => g.roomType))
    return Array.from(typeSet).sort()
  }, [])

  const filteredGuests = useMemo(() => {
    let filtered = GUESTS
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (g) =>
          `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
          g.roomNumber.includes(q) ||
          g.phone.includes(q) ||
          g.email.toLowerCase().includes(q),
      )
    }
    if (vipFilter !== 'all') {
      filtered = filtered.filter((g) => g.vipLevel === vipFilter)
    }
    if (floorFilter !== 'all') {
      filtered = filtered.filter((g) => g.floor === Number(floorFilter))
    }
    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter((g) => g.roomType === roomTypeFilter)
    }
    // Sort: VIP first (platinum > gold > silver > none), then by room number
    const vipOrder: Record<VipLevel, number> = { platinum: 0, gold: 1, silver: 2, none: 3 }
    return [...filtered].sort((a, b) => {
      const vipDiff = vipOrder[a.vipLevel] - vipOrder[b.vipLevel]
      if (vipDiff !== 0) return vipDiff
      return a.roomNumber.localeCompare(b.roomNumber)
    })
  }, [searchQuery, vipFilter, floorFilter, roomTypeFilter])

  const totalGuests = GUESTS.length
  const vipGuests = GUESTS.filter((g) => g.vipLevel !== 'none').length
  const avgStay = useMemo(() => {
    const stays = GUESTS.map((g) => {
      const checkIn = new Date(g.checkIn)
      const checkOut = new Date(g.checkOut)
      return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    })
    return (stays.reduce((a, b) => a + b, 0) / stays.length).toFixed(1)
  }, [])
  const newToday = GUESTS.filter((g) => g.checkIn === new Date().toISOString().split('T')[0]).length

  // ─── Quick Action Handlers ───────────────────────────────────

  function handleCallGuest(guest: Guest) {
    toast.success(`Calling ${guest.firstName} ${guest.lastName}...`, {
      description: guest.phone,
      duration: 4000,
    })
  }

  function handleMessageGuest(guest: Guest) {
    toast.info(`Message sent to Room ${guest.roomNumber}`, {
      description: `${guest.firstName} ${guest.lastName}`,
    })
  }

  function handleViewFolio(guest: Guest) {
    setActiveSubModule('folio')
    toast.info(`Navigated to Folio`, {
      description: `Room ${guest.roomNumber} — ${guest.firstName} ${guest.lastName}`,
    })
  }

  function handleWakeUpCall(guest: Guest) {
    toast.success(`Wake-up call scheduled for ${guest.firstName} ${guest.lastName}`, {
      description: `Room ${guest.roomNumber}`,
    })
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Guest Directory</h2>
        <p className="text-xs text-muted-foreground">
          Current in-house guests — searchable directory and quick actions
        </p>
      </div>

      {/* Filters */}
      <Card className="py-0">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Search name, room, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('pl-8 h-7 text-xs', searchQuery && 'pr-7')}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Select value={vipFilter} onValueChange={setVipFilter}>
                  <SelectTrigger className={cn('w-[100px] h-7 data-[size=default]:h-7 text-xs', vipFilter !== 'all' && 'pr-8')}>
                    <SelectValue placeholder="VIP Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All VIP</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="none">Regular</SelectItem>
                  </SelectContent>
                </Select>
                {vipFilter !== 'all' && (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                    onClick={(e) => { e.stopPropagation(); setVipFilter('all') }}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className={cn('w-[90px] h-7 data-[size=default]:h-7 text-xs', floorFilter !== 'all' && 'pr-8')}>
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor} value={String(floor)}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {floorFilter !== 'all' && (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                    onClick={(e) => { e.stopPropagation(); setFloorFilter('all') }}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                  <SelectTrigger className={cn('w-[110px] h-7 data-[size=default]:h-7 text-xs', roomTypeFilter !== 'all' && 'pr-8')}>
                    <SelectValue placeholder="Room Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {roomTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roomTypeFilter !== 'all' && (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                    onClick={(e) => { e.stopPropagation(); setRoomTypeFilter('all') }}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
            {(searchQuery || vipFilter !== 'all' || floorFilter !== 'all' || roomTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setVipFilter('all'); setFloorFilter('all'); setRoomTypeFilter('all') }}
                className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0"
                title="Clear all filters"
              >
                <X className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredGuests.length} of {totalGuests}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Guest Cards Grid */}
      {filteredGuests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="size-8 mb-2 opacity-40" />
            <p className="text-sm">No guests match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuests.map((guest) => {
            const isVip = guest.vipLevel !== 'none'
            const isGoldOrPlatinum = guest.vipLevel === 'gold' || guest.vipLevel === 'platinum'

            return (
              <Card
                key={guest.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  isGoldOrPlatinum && 'border-amber-300 dark:border-amber-700 shadow-amber-100/50 dark:shadow-amber-950/30',
                )}
              >
                <CardContent className="p-2.5 flex flex-col gap-2">
                  {/* Guest Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'flex size-9 items-center justify-center rounded-full text-sm font-bold shrink-0',
                        isGoldOrPlatinum
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300 dark:ring-amber-700'
                          : isVip
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'bg-muted text-muted-foreground',
                      )}>
                        {guest.firstName[0]}{guest.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">
                            {guest.firstName} {guest.lastName}
                          </span>
                          <VipBadge level={guest.vipLevel} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <BedDouble className="size-3" />
                          <span className="font-mono font-medium">Room {guest.roomNumber}</span>
                          <span>·</span>
                          <span>{guest.roomType}</span>
                          <span>·</span>
                          <Building className="size-3" />
                          <span>Floor {guest.floor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      <span className="font-mono truncate">{guest.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="size-3 shrink-0" />
                      <span className="truncate">{guest.nationality}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3" />
                    <span>{formatDate(guest.checkIn)} → {formatDate(guest.checkOut)}</span>
                  </div>

                  {/* Special Requests */}
                  {guest.specialRequests && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Special Requests</p>
                      <p className="text-xs text-muted-foreground italic truncate">{guest.specialRequests}</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 gap-1 px-2"
                      onClick={() => handleCallGuest(guest)}
                      title={`Call ${guest.phone}`}
                    >
                      <Phone className="size-3" />
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 gap-1 px-2"
                      onClick={() => handleMessageGuest(guest)}
                      title="Send message"
                    >
                      <MessageSquare className="size-3" />
                      <span className="hidden sm:inline">Message</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 gap-1 px-2"
                      onClick={() => handleViewFolio(guest)}
                      title="View folio"
                    >
                      <Receipt className="size-3" />
                      <span className="hidden sm:inline">Folio</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 gap-1 px-2"
                      onClick={() => handleWakeUpCall(guest)}
                      title="Schedule wake-up call"
                    >
                      <Bell className="size-3" />
                      <span className="hidden sm:inline">Wake-up</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
