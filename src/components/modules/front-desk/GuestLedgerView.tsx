'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigationStore, useFolioContextStore, useGuestLedgerContextStore, useReservationContextStore } from '@/lib/store'

// shadcn components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'

// Icons
import {
  Search, CalendarDays, FileText, TrendingUp, TrendingDown, AlertCircle,
  Printer, Plus, CreditCard, X, ChevronDown, ChevronRight, User, Mail,
  Phone as PhoneIcon, MapPin, Globe, Receipt, RotateCcw, Download, Filter,
  BookOpen, ArrowUpDown, Building2, DoorOpen,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────

interface GuestInfo {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  address: string | null
  city: string | null
  country: string | null
}

interface LedgerSummary {
  totalStays: number
  openFolios: number
  totalCharges: number
  totalPayments: number
  outstandingBalance: number
  aging: {
    current: number
    days30: number
    days60: number
    days90: number
    over90: number
  }
}

interface LedgerStay {
  reservationId: string
  confirmationNo: string
  roomNumber: string
  checkInDate: string
  checkOutDate: string
  status: string
  folioId: string
  folioStatus: string
  folioBalance: number
  totalCharges: number
  totalPayments: number
}

interface LedgerTransaction {
  id: string
  type: 'charge' | 'payment'
  transactionType: string
  description: string
  amount: number
  taxAmount: number
  totalAmount: number
  reservationId: string
  confirmationNo: string
  roomNumber: string
  folioId: string
  createdAt: string
  paymentMethod?: string
}

interface GuestSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  company?: string | null
  roomNumber?: string | null
}

interface FolioOption {
  id: string
  folioType: string
  status: string
  confirmationNo: string
  roomNumber: string
}

interface GuestLedgerData {
  guest: GuestInfo
  summary: LedgerSummary
  stays: LedgerStay[]
  transactions: LedgerTransaction[]
}

// ─── Constants ──────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<string, string> = {
  room: 'Room',
  f_and_b: 'F&B',
  laundry: 'Laundry',
  spa: 'Spa',
  phone: 'Phone',
  minibar: 'Minibar',
  business_center: 'Business Ctr',
  miscellaneous: 'Miscellaneous',
}

const PAY_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  city_ledger: 'City Ledger',
  voucher: 'Voucher',
  gift_card: 'Gift Card',
  foreign_currency: 'Foreign Currency',
}

const TX_TYPE_COLORS: Record<string, string> = {
  room: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  f_and_b: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  laundry: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  spa: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  phone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  minibar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  business_center: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  miscellaneous: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
}

const CHARGE_TYPES = [
  { value: 'room', label: 'Room' },
  { value: 'f_and_b', label: 'F&B' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'spa', label: 'Spa' },
  { value: 'phone', label: 'Phone' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'business_center', label: 'Business Center' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'city_ledger', label: 'City Ledger' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'foreign_currency', label: 'Foreign Currency' },
]

const CARD_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'Amex' },
]

const AGING_COLORS = [
  { key: 'current', label: 'Current', color: 'bg-emerald-500' },
  { key: 'days30', label: '1–30 Days', color: 'bg-amber-500' },
  { key: 'days60', label: '31–60 Days', color: 'bg-orange-500' },
  { key: 'days90', label: '61–90 Days', color: 'bg-red-500' },
  { key: 'over90', label: '90+ Days', color: 'bg-red-700' },
]

const CREDIT_LIMIT = 100000

// ─── Helpers ────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`
}

function isWithin24h(dateStr: string): boolean {
  const created = new Date(dateStr).getTime()
  const now = Date.now()
  return now - created < 24 * 60 * 60 * 1000
}

// ─── Sub-components ─────────────────────────────────────────────────────

/** Skeleton loader for the guest info + summary area */
function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Guest card skeleton */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
      {/* Summary cards skeleton */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="rounded-xl border bg-card shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Empty state shown before any guest is selected */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Guest Ledger</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Search for a guest by name, company, contact number, or room number
        to view their complete financial transaction history across all stays.
      </p>
    </div>
  )
}

/** Guest info card (left side) */
function GuestInfoCard({ guest }: { guest: GuestInfo }) {
  const fullName = `${guest.firstName} ${guest.lastName}`
  const initials = getInitials(guest.firstName, guest.lastName)

  return (
    <Card className="rounded-xl border bg-card shadow-sm h-full">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm md:text-base">{fullName}</h3>
            <p className="text-xs text-muted-foreground">Guest ID: {guest.id.slice(0, 8)}…</p>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="space-y-2.5 text-xs md:text-sm">
          {guest.email && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{guest.email}</span>
            </div>
          )}
          {guest.phone && (
            <div className="flex items-center gap-2 min-w-0">
              <PhoneIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{guest.phone}</span>
            </div>
          )}
          {guest.nationality && (
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{guest.nationality}</span>
            </div>
          )}
          {(guest.address || guest.city || guest.country) && (
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="truncate text-muted-foreground">
                {[guest.address, guest.city, guest.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Summary stat card */
function SummaryStatCard({
  icon: Icon,
  label,
  value,
  valueClass,
  subtitle,
  progressValue,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClass?: string
  subtitle?: React.ReactNode
  progressValue?: number
}) {
  return (
    <Card className="rounded-xl border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={cn('text-lg font-bold', valueClass)}>{value}</p>
        {subtitle && <div className="mt-1.5">{subtitle}</div>}
        {progressValue !== undefined && (
          <Progress value={Math.min(progressValue, 100)} className="mt-2 h-1.5" />
        )}
      </CardContent>
    </Card>
  )
}

/** Summary cards grid (right side) */
function SummaryCards({ summary }: { summary: LedgerSummary }) {
  const creditPct = CREDIT_LIMIT > 0 ? (summary.outstandingBalance / CREDIT_LIMIT) * 100 : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 h-full content-start">
      <SummaryStatCard
        icon={CalendarDays}
        label="Total Stays"
        value={String(summary.totalStays)}
      />
      <SummaryStatCard
        icon={FileText}
        label="Open Folios"
        value={String(summary.openFolios)}
      />
      <SummaryStatCard
        icon={TrendingUp}
        label="Total Charges"
        value={formatCurrency(summary.totalCharges)}
        valueClass="text-red-600 dark:text-red-400"
      />
      <SummaryStatCard
        icon={TrendingDown}
        label="Total Payments"
        value={formatCurrency(summary.totalPayments)}
        valueClass="text-emerald-600 dark:text-emerald-400"
      />
      <SummaryStatCard
        icon={AlertCircle}
        label="Outstanding"
        value={formatCurrency(summary.outstandingBalance)}
        valueClass="text-amber-600 dark:text-amber-400"
        subtitle={
          <span className="text-[10px] text-muted-foreground">
            {creditPct.toFixed(0)}% of {formatCurrency(CREDIT_LIMIT)} credit limit
          </span>
        }
        progressValue={creditPct}
      />
    </div>
  )
}

/** Aging tab content */
function AgingTab({ summary, stays, onNavigateToFolio, onNavigateToReservation }: { summary: LedgerSummary; stays: LedgerStay[]; onNavigateToFolio?: (stay: LedgerStay) => void; onNavigateToReservation?: (stay: LedgerStay) => void }) {
  const totalAging =
    summary.aging.current +
    summary.aging.days30 +
    summary.aging.days60 +
    summary.aging.days90 +
    summary.aging.over90

  return (
    <div className="space-y-6">
      {/* Horizontal bar chart */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Aging Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bar visualization */}
          <div className="flex h-8 rounded-md overflow-hidden bg-muted">
            {totalAging > 0
              ? AGING_COLORS.map(({ key, color }) => {
                  const val = summary.aging[key as keyof typeof summary.aging]
                  const pct = (val / totalAging) * 100
                  if (pct === 0) return null
                  return (
                    <div
                      key={key}
                      className={cn('h-full', color)}
                      style={{ width: `${pct}%` }}
                      title={`${AGING_COLORS.find((c) => c.key === key)?.label}: ${formatCurrency(val)}`}
                    />
                  )
                })
              : <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No outstanding balance</div>
            }
          </div>

          {/* Legend + values */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {AGING_COLORS.map(({ key, label, color }) => {
              const val = summary.aging[key as keyof typeof summary.aging]
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className={cn('h-2.5 w-2.5 rounded-sm shrink-0', color)} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {AGING_COLORS.map(({ key }) => {
              const val = summary.aging[key as keyof typeof summary.aging]
              return (
                <p key={key} className="text-sm font-semibold">{formatCurrency(val)}</p>
              )
            })}
          </div>

          <Separator />

          {/* Per-stay aging table */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Balance by Stay
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Confirmation #</TableHead>
                    <TableHead className="text-xs">Room</TableHead>
                    <TableHead className="text-xs">Check-In</TableHead>
                    <TableHead className="text-xs">Check-Out</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Folio Balance</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-xs text-center py-4 text-muted-foreground">
                        No stays found
                      </TableCell>
                    </TableRow>
                  ) : (
                    stays.map((stay) => (
                      <TableRow key={stay.reservationId}>
                        <TableCell className="text-xs font-mono">{stay.confirmationNo}</TableCell>
                        <TableCell className="text-xs">{stay.roomNumber}</TableCell>
                        <TableCell className="text-xs">{formatDate(stay.checkInDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(stay.checkOutDate)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stay.status}</Badge>
                        </TableCell>
                        <TableCell className={cn(
                          'text-xs text-right font-medium',
                          stay.folioBalance > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : stay.folioBalance < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ''
                        )}>
                          {formatCurrency(Math.abs(stay.folioBalance))}
                          {stay.folioBalance < 0 && ' Cr'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            {onNavigateToReservation && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => onNavigateToReservation(stay)}>
                                Reservation
                              </Button>
                            )}
                            {onNavigateToFolio && stay.folioId && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => onNavigateToFolio(stay)}>
                                Folio
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Transaction type badge */
function TxTypeBadge({ type }: { type: string }) {
  const label = TX_TYPE_LABELS[type] || type
  const colorClass = TX_TYPE_COLORS[type] || TX_TYPE_COLORS.miscellaneous
  return (
    <Badge variant="outline" className={cn('text-[10px] md:text-xs px-1.5 py-0 font-medium border-0', colorClass)}>
      {label}
    </Badge>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export function GuestLedgerView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const { guestLedgerContext, clearGuestLedgerContext } = useGuestLedgerContextStore()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('charges')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Dialog state
  const [postChargeOpen, setPostChargeOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<LedgerTransaction | null>(null)
  const [voidReason, setVoidReason] = useState('')

  // Form state for charge
  const [chargeForm, setChargeForm] = useState({
    folioId: '',
    transactionType: '',
    description: '',
    amount: '',
    reference: '',
  })

  // Form state for payment
  const [paymentForm, setPaymentForm] = useState({
    folioId: '',
    paymentMethod: '',
    amount: '',
    reference: '',
    cardType: '',
  })

  // Collapsed groups in charges tab
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Search dropdown state
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Auto-select guest from context (when navigated from another module)
  useEffect(() => {
    const unsub = useGuestLedgerContextStore.subscribe((state) => {
      if (state.guestLedgerContext) {
        const ctx = state.guestLedgerContext
        useGuestLedgerContextStore.getState().clearGuestLedgerContext()
        setSelectedGuestId(ctx.guestId)
        setSearchQuery(ctx.guestName)
      }
    })
    // Also check on mount in case context was set before component mounted
    const ctx = useGuestLedgerContextStore.getState().guestLedgerContext
    if (ctx) {
      useGuestLedgerContextStore.getState().clearGuestLedgerContext()
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setSelectedGuestId(ctx.guestId)
        setSearchQuery(ctx.guestName)
      })
    }
    return unsub
  }, [])

  // ─── Debounced search ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ─── Queries ────────────────────────────────────────────────────

  // Guest search — API returns guests with nested reservations (company, room)
  interface RawGuestResult {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    nationality: string | null
    reservations?: Array<{
      company: string | null
      room: { number: string } | null
      status: string
    }>
  }

  const { data: guestSearchData, isLoading: searchLoading } = useQuery<{ guests: RawGuestResult[] }>({
    queryKey: ['guest-search', debouncedSearch],
    queryFn: () => apiFetch(`/api/guests?search=${encodeURIComponent(debouncedSearch)}`),
    enabled: debouncedSearch.length >= 1,
  })

  // Flatten: pick the most relevant reservation for company & room display
  const guestResults: GuestSearchResult[] = useMemo(() => {
    const raw = guestSearchData?.guests ?? []
    const q = debouncedSearch.toLowerCase()
    return raw.map((g) => {
      const reservations = g.reservations || []

      // Find the reservation that best matches the search query
      const matchIdx = reservations.findIndex((r) =>
        (r.company && r.company.toLowerCase().includes(q)) ||
        (r.room?.number && r.room.number.toLowerCase().includes(q))
      )

      // If a matching reservation was found, use it; otherwise fall back to status-based priority
      let best = reservations[matchIdx >= 0 ? matchIdx : 0]
      if (matchIdx < 0) {
        const sorted = [...reservations].sort((a, b) => {
          const priority = (s: string) => (s === 'checked_in' ? 0 : s === 'confirmed' ? 1 : 2)
          return priority(a.status) - priority(b.status)
        })
        best = sorted[0]
      }

      return {
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
        nationality: g.nationality,
        company: best?.company ?? null,
        roomNumber: best?.room?.number ?? null,
      }
    })
  }, [guestSearchData, debouncedSearch])

  // Open folios for posting
  const { data: folioData } = useQuery<{ folios: FolioOption[] }>({
    queryKey: ['guest-folios', selectedGuestId],
    queryFn: () => apiFetch(`/api/folio?guestId=${selectedGuestId}`),
    enabled: !!selectedGuestId && (postChargeOpen || recordPaymentOpen),
  })
  const folioOptions = folioData?.folios ?? []

  // Guest ledger data
  const { data: ledger, isLoading: ledgerLoading, error: ledgerError } = useQuery<GuestLedgerData>({
    queryKey: ['guest-ledger', selectedGuestId, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ guestId: selectedGuestId! })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      return apiFetch(`/api/guest-ledger?${params}`)
    },
    enabled: !!selectedGuestId,
  })

  // ─── Mutations ──────────────────────────────────────────────────

  const postMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/guest-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Transaction posted successfully')
      invalidate.afterFolioChange(queryClient, selectedGuestId)
      setPostChargeOpen(false)
      setRecordPaymentOpen(false)
      resetChargeForm()
      resetPaymentForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to post transaction')
    },
  })

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/api/guest-ledger/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success('Transaction voided successfully')
      invalidate.afterFolioChange(queryClient, selectedGuestId)
      setVoidDialogOpen(false)
      setVoidTarget(null)
      setVoidReason('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to void transaction')
    },
  })

  // ─── Derived data ───────────────────────────────────────────────

  const charges = useMemo(
    () => (ledger?.transactions ?? []).filter((t) => t.type === 'charge'),
    [ledger?.transactions],
  )

  const payments = useMemo(
    () => (ledger?.transactions ?? []).filter((t) => t.type === 'payment'),
    [ledger?.transactions],
  )

  // Group charges by reservation
  const chargesByStay = useMemo(() => {
    const map = new Map<string, LedgerTransaction[]>()
    for (const tx of charges) {
      const key = tx.reservationId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return map
  }, [charges])

  // Group payments by payment method
  const paymentsByMethod = useMemo(() => {
    const map = new Map<string, LedgerTransaction[]>()
    for (const tx of payments) {
      const key = tx.paymentMethod || 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return map
  }, [payments])

  // ─── Handlers ───────────────────────────────────────────────────

  // ─── Navigation handlers ─────────────────────────────────────

  const handleNavigateToFolio = useCallback((stay: LedgerStay) => {
    const guest = ledger?.guest
    const guestName = guest ? `${guest.firstName} ${guest.lastName}` : ''
    useFolioContextStore.getState().setFolioContext({
      reservationId: stay.reservationId,
      guestId: selectedGuestId || '',
      guestName,
      roomNumber: stay.roomNumber,
      confirmationNo: stay.confirmationNo,
      folioId: stay.folioId,
    })
    navigateTo('front-desk', 'folio')
  }, [ledger?.guest, selectedGuestId, navigateTo])

  const handleNavigateToReservation = useCallback((stay: LedgerStay) => {
    useReservationContextStore.getState().setReservationContext({
      reservationId: stay.reservationId,
      confirmationNo: stay.confirmationNo,
    })
    navigateTo('front-desk', 'reservations')
  }, [navigateTo])

  const handleSelectGuest = useCallback((guest: GuestSearchResult) => {
    setSelectedGuestId(guest.id)
    setSearchDropdownOpen(false)
    setSearchQuery(`${guest.firstName} ${guest.lastName}`)
    setActiveTab('charges')
  }, [])

  const resetChargeForm = useCallback(() => {
    setChargeForm({ folioId: '', transactionType: '', description: '', amount: '', reference: '' })
  }, [])

  const resetPaymentForm = useCallback(() => {
    setPaymentForm({ folioId: '', paymentMethod: '', amount: '', reference: '', cardType: '' })
  }, [])

  const handleOpenPostCharge = useCallback(() => {
    resetChargeForm()
    setPostChargeOpen(true)
  }, [resetChargeForm])

  const handleOpenRecordPayment = useCallback(() => {
    resetPaymentForm()
    setRecordPaymentOpen(true)
  }, [resetPaymentForm])

  const handleSubmitCharge = useCallback(() => {
    if (!chargeForm.folioId || !chargeForm.transactionType || !chargeForm.amount) {
      toast.error('Please fill in all required fields')
      return
    }
    postMutation.mutate({
      folioId: chargeForm.folioId,
      type: 'charge',
      transactionType: chargeForm.transactionType,
      description: chargeForm.description,
      amount: parseFloat(chargeForm.amount),
      reference: chargeForm.reference || undefined,
    })
  }, [chargeForm, postMutation])

  const handleSubmitPayment = useCallback(() => {
    if (!paymentForm.folioId || !paymentForm.paymentMethod || !paymentForm.amount) {
      toast.error('Please fill in all required fields')
      return
    }
    postMutation.mutate({
      folioId: paymentForm.folioId,
      type: 'payment',
      paymentMethod: paymentForm.paymentMethod,
      amount: parseFloat(paymentForm.amount),
      reference: paymentForm.reference || undefined,
      cardType: paymentForm.paymentMethod === 'card' ? paymentForm.cardType || undefined : undefined,
    })
  }, [paymentForm, postMutation])

  const handleVoid = useCallback((tx: LedgerTransaction) => {
    setVoidTarget(tx)
    setVoidReason('')
    setVoidDialogOpen(true)
  }, [])

  const handleConfirmVoid = useCallback(() => {
    if (!voidTarget) return
    if (!voidReason.trim()) {
      toast.error('Please provide a reason for voiding')
      return
    }
    voidMutation.mutate({ id: voidTarget.id, reason: voidReason })
  }, [voidTarget, voidReason, voidMutation])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExport = useCallback(() => {
    if (!ledger) return
    const rows = ledger.transactions.map((tx) => [
      tx.createdAt,
      tx.type,
      tx.transactionType,
      tx.description,
      tx.confirmationNo,
      tx.roomNumber,
      tx.amount,
      tx.taxAmount,
      tx.totalAmount,
    ])
    const csvContent = [
      ['Date', 'Type', 'Category', 'Description', 'Confirmation#', 'Room', 'Amount', 'Tax', 'Total'].join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guest-ledger-${ledger.guest.firstName}-${ledger.guest.lastName}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Ledger exported as CSV')
  }, [ledger])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // ─── Get stay info for a reservation ID ─────────────────────────

  const getStayInfo = useCallback(
    (reservationId: string) => ledger?.stays.find((s) => s.reservationId === reservationId),
    [ledger?.stays],
  )

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* ─── Search Bar + Date Filters (no-print) ──────────── */}
      <div className="no-print flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search input with dropdown */}
        <div className="relative flex-1 w-full sm:max-w-md" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, contact, or room no..."
            className="pl-9 pr-9 h-10 rounded-lg"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchDropdownOpen(true)
              if (selectedGuestId && e.target.value === '') {
                setSelectedGuestId(null)
              }
            }}
            onFocus={() => {
              if (debouncedSearch.length >= 1) setSearchDropdownOpen(true)
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedGuestId(null)
                setSearchDropdownOpen(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search dropdown */}
          {searchDropdownOpen && debouncedSearch.length >= 1 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : guestResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No guests found
                </div>
              ) : (
                guestResults.slice(0, 10).map((guest: GuestSearchResult) => (
                  <button
                    key={guest.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                    onClick={() => handleSelectGuest(guest)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {getInitials(guest.firstName, guest.lastName)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {guest.firstName} {guest.lastName}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                        {guest.company && (
                          <span className="inline-flex items-center gap-0.5 shrink-0">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{guest.company}</span>
                            {(guest.email || guest.phone || guest.roomNumber) && <span className="text-muted-foreground/40">·</span>}
                          </span>
                        )}
                        {guest.roomNumber && (
                          <span className="inline-flex items-center gap-0.5 shrink-0">
                            <DoorOpen className="h-3 w-3" />
                            <span>Room {guest.roomNumber}</span>
                            {(guest.email || guest.phone) && <span className="text-muted-foreground/40">·</span>}
                          </span>
                        )}
                        <span className="truncate">
                          {[guest.email, guest.phone].filter(Boolean).join(' · ') || guest.nationality || 'No contact info'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2 no-print">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            className="h-9 w-36 text-xs rounded-lg"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="h-9 w-36 text-xs rounded-lg"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Print header (only visible in print) */}
      <div className="print-only text-center mb-6">
        <h1 className="text-xl font-bold">Meridian Hotel — Guest Ledger</h1>
        {ledger && (
          <p className="text-sm mt-1">
            {ledger.guest.firstName} {ledger.guest.lastName}
            {dateFrom && dateTo && ` · ${formatDate(dateFrom)} – ${formatDate(dateTo)}`}
          </p>
        )}
      </div>

      {/* ─── Guest Info + Summary ───────────────────────────── */}
      {selectedGuestId && ledgerLoading && <SummarySkeleton />}

      {selectedGuestId && ledgerError && (
        <Card className="rounded-xl border border-destructive/50 bg-card shadow-sm">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive font-medium">Failed to load guest ledger</p>
            <p className="text-xs text-muted-foreground mt-1">{(ledgerError as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {selectedGuestId && ledger && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <GuestInfoCard guest={ledger.guest} />
          <div className="lg:col-span-2">
            <SummaryCards summary={ledger.summary} />
          </div>
        </div>
      )}

      {/* ─── Tabs + Table ──────────────────────────────────── */}
      {selectedGuestId && ledger && (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-9">
              <TabsTrigger value="charges" className="text-xs px-3">
                Charges ({charges.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs px-3">
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="aging" className="text-xs px-3">
                Aging
              </TabsTrigger>
            </TabsList>

            {/* ─── Charges Tab ────────────────────────────── */}
            <TabsContent value="charges" className="mt-4">
              {charges.length === 0 ? (
                <Card className="rounded-xl border bg-card shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No charges found for this period</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {Array.from(chargesByStay.entries()).map(([reservationId, txns]) => {
                    const stay = getStayInfo(reservationId)
                    const isCollapsed = collapsedGroups.has(reservationId)
                    const groupTotal = txns.reduce((sum, tx) => sum + tx.totalAmount, 0)

                    return (
                      <Collapsible
                        key={reservationId}
                        open={!isCollapsed}
                        onOpenChange={() => toggleGroup(reservationId)}
                      >
                        <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isCollapsed ? (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className="text-left">
                                  <p className="text-sm font-medium">
                                    {stay?.confirmationNo || reservationId.slice(0, 8)}
                                    {stay?.roomNumber && (
                                      <span className="text-muted-foreground font-normal"> · Room {stay.roomNumber}</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {stay ? `${formatDate(stay.checkInDate)} – ${formatDate(stay.checkOutDate)}` : ''}
                                    {stay?.status && (
                                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                                        {stay.status}
                                      </Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(groupTotal)}
                              </span>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="max-h-96 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Type</TableHead>
                                    <TableHead className="text-xs">Description</TableHead>
                                    <TableHead className="text-xs">Ref</TableHead>
                                    <TableHead className="text-xs text-right">Amount</TableHead>
                                    <TableHead className="text-xs text-right">Tax</TableHead>
                                    <TableHead className="text-xs text-right">Total</TableHead>
                                    <TableHead className="text-xs w-10" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {txns.map((tx) => (
                                    <TableRow key={tx.id}>
                                      <TableCell className="text-xs whitespace-nowrap">
                                        {formatDate(tx.createdAt)}
                                      </TableCell>
                                      <TableCell>
                                        <TxTypeBadge type={tx.transactionType} />
                                      </TableCell>
                                      <TableCell className="text-xs max-w-[200px] truncate" title={tx.description}>
                                        {tx.description}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground font-mono">
                                        {tx.id.slice(0, 8)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right text-red-600 dark:text-red-400">
                                        -{formatCurrency(tx.amount)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right text-muted-foreground">
                                        {formatCurrency(tx.taxAmount)}
                                      </TableCell>
                                      <TableCell className="text-xs text-right font-medium text-red-600 dark:text-red-400">
                                        -{formatCurrency(tx.totalAmount)}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {isWithin24h(tx.createdAt) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleVoid(tx)}
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                            <span className="sr-only">Void</span>
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── Payments Tab ───────────────────────────── */}
            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <Card className="rounded-xl border bg-card shadow-sm">
                  <CardContent className="py-12 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No payments found for this period</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {Array.from(paymentsByMethod.entries()).map(([method, txns]) => {
                    const methodTotal = txns.reduce((sum, tx) => sum + tx.totalAmount, 0)
                    return (
                      <Card key={method} className="rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {PAY_METHOD_LABELS[method] || method}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {txns.length} transaction{txns.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(methodTotal)}
                          </span>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Stay</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs">Ref</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                                <TableHead className="text-xs w-10" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {txns.map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    {formatDate(tx.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    {tx.confirmationNo} · {tx.roomNumber}
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[200px] truncate" title={tx.description}>
                                    {tx.description}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground font-mono">
                                    {tx.id.slice(0, 8)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(tx.totalAmount)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {isWithin24h(tx.createdAt) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleVoid(tx)}
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span className="sr-only">Void</span>
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── Aging Tab ───────────────────────────────── */}
            <TabsContent value="aging" className="mt-4">
              <AgingTab summary={ledger.summary} stays={ledger.stays} onNavigateToFolio={handleNavigateToFolio} onNavigateToReservation={handleNavigateToReservation} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ─── Full Transaction Table (all, below tabs) ─────── */}
      {selectedGuestId && ledger && ledger.transactions.length > 0 && (
        <Card className="rounded-xl border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Stay</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Tax</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {tx.confirmationNo} · {tx.roomNumber}
                      </TableCell>
                      <TableCell>
                        <TxTypeBadge type={tx.transactionType} />
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {tx.id.slice(0, 8)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-xs text-right font-medium',
                          tx.type === 'charge'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {tx.type === 'charge' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {tx.type === 'charge' ? formatCurrency(tx.taxAmount) : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-xs text-right font-bold',
                          tx.type === 'charge'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {tx.type === 'charge' ? '-' : '+'}{formatCurrency(tx.totalAmount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isWithin24h(tx.createdAt) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleVoid(tx)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span className="sr-only">Void</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Action Buttons (no-print) ────────────────────── */}
      {selectedGuestId && ledger && (
        <div className="no-print flex flex-wrap gap-2">
          <Button size="sm" onClick={handleOpenPostCharge} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Post Charge
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenRecordPayment} className="h-8 text-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Record Payment
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      )}

      {/* ─── Empty State ──────────────────────────────────── */}
      {!selectedGuestId && <EmptyState />}

      {/* ═══════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════ */}

      {/* ─── Post Charge Dialog ───────────────────────────── */}
      <Dialog open={postChargeOpen} onOpenChange={(open) => {
        setPostChargeOpen(open)
        if (!open) resetChargeForm()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Post Charge</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Folio selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Folio <span className="text-destructive">*</span></Label>
              <Select
                value={chargeForm.folioId}
                onValueChange={(v) => setChargeForm((f) => ({ ...f, folioId: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select folio..." />
                </SelectTrigger>
                <SelectContent>
                  {folioOptions.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No open folios available
                    </SelectItem>
                  ) : (
                    folioOptions
                      .filter((f) => f.status === 'open' || f.status === 'Open')
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.confirmationNo} · Room {f.roomNumber} ({f.folioType})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Charge Type <span className="text-destructive">*</span></Label>
              <Select
                value={chargeForm.transactionType}
                onValueChange={(v) => setChargeForm((f) => ({ ...f, transactionType: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Enter description..."
                value={chargeForm.description}
                onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs">Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                className="h-9 text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reference</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Optional reference..."
                value={chargeForm.reference}
                onChange={(e) => setChargeForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPostChargeOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitCharge}
              disabled={postMutation.isPending}
            >
              {postMutation.isPending ? 'Posting...' : 'Post Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Record Payment Dialog ────────────────────────── */}
      <Dialog open={recordPaymentOpen} onOpenChange={(open) => {
        setRecordPaymentOpen(open)
        if (!open) resetPaymentForm()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Record Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Folio selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Folio <span className="text-destructive">*</span></Label>
              <Select
                value={paymentForm.folioId}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, folioId: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select folio..." />
                </SelectTrigger>
                <SelectContent>
                  {folioOptions.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No open folios available
                    </SelectItem>
                  ) : (
                    folioOptions
                      .filter((f) => f.status === 'open' || f.status === 'Open')
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.confirmationNo} · Room {f.roomNumber} ({f.folioType})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method <span className="text-destructive">*</span></Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v, cardType: '' }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Card type (only if payment method is card) */}
            {paymentForm.paymentMethod === 'card' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Card Type</Label>
                <Select
                  value={paymentForm.cardType}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, cardType: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select card type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs">Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                className="h-9 text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reference</Label>
              <Input
                className="h-9 text-sm"
                placeholder="Optional reference..."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitPayment}
              disabled={postMutation.isPending}
            >
              {postMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Void Confirmation Dialog ─────────────────────── */}
      <AlertDialog open={voidDialogOpen} onOpenChange={(open) => {
        setVoidDialogOpen(open)
        if (!open) {
          setVoidTarget(null)
          setVoidReason('')
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Transaction</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to void this transaction? This action cannot be undone.
                </p>
                {voidTarget && (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{voidTarget.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-medium text-right max-w-[200px] truncate">{voidTarget.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className={cn(
                        'font-bold',
                        voidTarget.type === 'charge'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}>
                        {formatCurrency(voidTarget.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formatDate(voidTarget.createdAt)}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Reason for voiding <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="text-sm min-h-[60px]"
                    placeholder="Enter reason for voiding this transaction..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVoid}
              disabled={voidMutation.isPending || !voidReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidMutation.isPending ? 'Voiding...' : 'Void Transaction'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}