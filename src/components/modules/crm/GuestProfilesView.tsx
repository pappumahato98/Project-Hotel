'use client'
import { toast } from 'sonner'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Search, Filter, Users, Crown, Star, CalendarDays, DollarSign,
  Mail, Phone, Globe, Heart, BedDouble, Receipt, User,
  TrendingUp, Award
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ── Types ────────────────────────────────────────────────────
interface Reservation {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
}

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  vipLevel: string
  loyaltyPoints: number
  loyaltyTier: string
  preferences: string | null
  totalStays: number
  totalRevenue: number
  lastStayAt: string | null
  createdAt: string
  reservations: Reservation[]
}

// ── Helpers ──────────────────────────────────────────────────
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

function vipColor(level: string): string {
  switch (level) {
    case 'platinum':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
    case 'gold':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
    case 'silver':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20'
  }
}

function tierThreshold(tier: string): { min: number; max: number } {
  switch (tier) {
    case 'platinum': return { min: 20000, max: 50000 }
    case 'gold': return { min: 5000, max: 20000 }
    case 'silver': return { min: 0, max: 5000 }
    default: return { min: 0, max: 0 }
  }
}

// ── VIP Badge ────────────────────────────────────────────────
function VipBadge({ level }: { level: string }) {
  if (level === 'none') return null

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', vipColor(level))}>
      {level === 'platinum' && <Crown className="h-3 w-3 fill-current" />}
      {level === 'gold' && <Star className="h-3 w-3 fill-current" />}
      {level === 'silver' && <Award className="h-3 w-3" />}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  )
}

// ── Guest Profile Sheet ─────────────────────────────────────
function GuestProfileSheet({
  guest,
  open,
  onOpenChange,
}: {
  guest: Guest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!guest) return null

  const fullName = `${guest.firstName} ${guest.lastName}`
  const prefs: string[] = []
  try {
    if (guest.preferences) {
      const parsed = JSON.parse(guest.preferences)
      if (Array.isArray(parsed)) prefs.push(...parsed)
      else if (typeof parsed === 'object') Object.values(parsed).forEach((v) => { if (typeof v === 'string') prefs.push(v) })
    }
  } catch { /* ignore */ }

  const { min, max } = tierThreshold(guest.loyaltyTier)
  const tierProgress = max > 0 ? Math.min(100, Math.round(((guest.loyaltyPoints - min) / (max - min)) * 100)) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {fullName}
            <VipBadge level={guest.vipLevel} />
          </SheetTitle>
          <SheetDescription>Guest Profile Details</SheetDescription>
        </SheetHeader>

        <div className="mt-2 space-y-2">
          {/* Personal Info */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Mail, label: 'Email', value: guest.email },
                { icon: Phone, label: 'Phone', value: guest.phone },
                { icon: Globe, label: 'Nationality', value: guest.nationality },
                { icon: CalendarDays, label: 'Member Since', value: format(new Date(guest.createdAt), 'MMM d, yyyy') },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </div>
                  <p className="text-sm font-medium truncate">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Quick Stats */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Lifetime Value
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Total Stays</p>
                <p className="text-xl font-bold">{guest.totalStays}</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatNPR(guest.totalRevenue)}</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-xl font-bold">{guest.loyaltyPoints.toLocaleString()}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Loyalty */}
          {guest.loyaltyTier !== 'none' && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Loyalty Program
              </h3>
              <div className="rounded-lg border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VipBadge level={guest.loyaltyTier} />
                  </div>
                  <span className="text-sm text-muted-foreground">{guest.loyaltyPoints.toLocaleString()} pts</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{min.toLocaleString()} pts</span>
                    <span>{max.toLocaleString()} pts</span>
                  </div>
                  <Progress value={tierProgress} className="h-2" />
                </div>
              </div>
            </section>
          )}

          {prefs.length > 0 && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Preferences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {prefs.map((pref) => (
                    <Badge key={pref} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Stay History */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BedDouble className="h-4 w-4" />
              Stay History
            </h3>
            {guest.reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stays recorded</p>
            ) : (
              <div className="rounded-lg border divide-y overflow-hidden">
                {guest.reservations.map((res) => (
                  <div key={res.id} className="flex items-center justify-between p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{res.confirmationNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(res.checkIn), 'MMM d')} — {format(new Date(res.checkOut), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {guest.lastStayAt && (
            <div className="text-xs text-muted-foreground text-right">
              Last stay: {format(new Date(guest.lastStayAt), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main Component ───────────────────────────────────────────
export function GuestProfilesView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [vipFilter, setVipFilter] = useState<string>('all')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, isLoading } = useQuery<{ guests: Guest[]; total: number }>({
    queryKey: ['guests', searchQuery, vipFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (vipFilter !== 'all') params.set('vipLevel', vipFilter)
      return apiFetch(`/api/guests?${params}`)
    },
  })

  const guests = data?.guests || []
  const total = data?.total || 0

  // Quick stats
  const vipCount = guests.filter((g) => g.vipLevel !== 'none').length
  const totalRevenue = guests.reduce((sum, g) => sum + g.totalRevenue, 0)
  const avgSpend = total > 0 ? totalRevenue / total : 0
  const newThisMonth = guests.filter((g) => {
    const d = new Date(g.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const handleRowClick = (guest: Guest) => {
    setSelectedGuest(guest)
    setSheetOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total Guests', value: total, icon: Users, color: 'text-foreground' },
          { label: 'VIP Guests', value: vipCount, icon: Crown, color: 'text-amber-600' },
          { label: 'Avg. Spend', value: formatNPR(Math.round(avgSpend)), icon: DollarSign, color: 'text-green-600' },
          { label: 'New This Month', value: newThisMonth, icon: TrendingUp, color: 'text-teal-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className={cn('h-3.5 w-3.5 opacity-20', stat.color)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
              className="pl-8 h-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={vipFilter} onValueChange={setVipFilter}>
            <SelectTrigger className="sm:w-[130px] data-[size=default]:h-7 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="VIP Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="none">Regular</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {guests.length} guest{guests.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Guest Table */}
      <Card className="py-0">
        <ScrollArea className="max-h-[520px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Nationality</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead className="hidden sm:table-cell">Stays</TableHead>
                <TableHead className="hidden lg:table-cell">Revenue</TableHead>
                <TableHead className="hidden md:table-cell">Last Stay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto opacity-20 mb-2" />
                    <p>No guests found</p>
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((guest) => (
                  <TableRow
                    key={guest.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(guest)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {guest.firstName} {guest.lastName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {guest.email || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {guest.phone || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {guest.nationality || '—'}
                    </TableCell>
                    <TableCell>
                      <VipBadge level={guest.vipLevel} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      {guest.totalStays}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs font-medium">
                      {formatNPR(guest.totalRevenue)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {guest.lastStayAt
                        ? format(new Date(guest.lastStayAt), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Profile Sheet */}
      <GuestProfileSheet
        guest={selectedGuest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
