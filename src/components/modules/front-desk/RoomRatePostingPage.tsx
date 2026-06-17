'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import {
  DollarSign, Clock, AlertCircle, CheckCircle, Loader2, X,
  Search, RefreshCw, ChevronDown, ChevronRight,
  Zap, CalendarDays, Users, BarChart3, BedDouble,
  MoreHorizontal, Download, FileSpreadsheet,
  ListChecks, Wallet, Moon, ArrowRight, ShieldCheck,
  Building2, FileText, UserCircle, Receipt, CreditCard,
  Eye, Filter, CalendarIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency } from '@/lib/format'
import { invalidate } from '@/lib/queryKeys'
import { useNavigationStore, useFolioContextStore } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

// ─── Types ──────────────────────────────────────────────────────────────

interface PendingReservation {
  reservationId: string
  confirmationNo: string
  guest: { id: string; firstName: string; lastName: string } | null
  room: { id: string; number: string; type: { name: string } | null } | null
  checkIn: string
  checkOut: string
  roomRate: number
  folio: { id: string; balance: number; status: string } | null
  pendingNights: string[]
  postedNights: string[]
  futureNights: string[]
  totalNights: number
  pendingAmount: number
}

interface PendingResponse {
  pendingReservations: PendingReservation[]
  summary: { totalReservations: number; totalPendingNights: number; totalPendingAmount: number }
}

// ─── Constants ──────────────────────────────────────────────────────────

type PostingType = 'all' | 'no-room' | 'urgent'

const POSTING_TYPE_OPTIONS: { value: PostingType; label: string }[] = [
  { value: 'all', label: 'All Pending' },
  { value: 'no-room', label: 'No Room' },
  { value: 'urgent', label: 'Urgent (3+)' },
]

// ─── Component ──────────────────────────────────────────────────────────

export function RoomRatePostingPage() {
  const queryClient = useQueryClient()
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const setFolioContext = useFolioContextStore((s) => s.setFolioContext)

  // State
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [postingType, setPostingType] = useState<PostingType>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [postConfirmOpen, setPostConfirmOpen] = useState(false)
  const [postTarget, setPostTarget] = useState<PendingReservation | null>(null)
  const [bulkPostOpen, setBulkPostOpen] = useState(false)
  const [rateOverride, setRateOverride] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(false)

  // ── Fetch pending reservations ───────────────────────────────────
  const { data: pendingData, isLoading, refetch } = useQuery({
    queryKey: ['rate-posting-pending'],
    queryFn: () => apiFetch<PendingResponse>('/api/room-rate-posting/pending'),
  })

  // ── Post single reservation's pending nights ────────────────────
  const postMutation = useMutation({
    mutationFn: async ({ reservationId, dates, customRate }: { reservationId: string; dates: string[]; customRate?: number }) => {
      const body: Record<string, unknown> = { reservationId, dates }
      if (customRate && customRate > 0) body.customRate = customRate
      return apiFetch('/api/room-rate-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success('Pending charges posted successfully')
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      setPostConfirmOpen(false)
      setPostTarget(null)
      setRateOverride('')
      setSelectedIds(new Set())
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to post charges')
      setPostConfirmOpen(false)
      setPostTarget(null)
      setRateOverride('')
    },
  })

  // ── Post selected (batch) ───────────────────────────────────────
  const postSelectedMutation = useMutation({
    mutationFn: async (items: { reservationId: string; dates: string[] }[]) => {
      const results: { reservationId: string; success: boolean; error?: string }[] = []
      for (const item of items) {
        try {
          await apiFetch('/api/room-rate-posting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId: item.reservationId, dates: item.dates }),
          })
          results.push({ reservationId: item.reservationId, success: true })
        } catch (e) {
          results.push({ reservationId: item.reservationId, success: false, error: (e as Error).message })
        }
      }
      return results
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.success).length
      const fail = results.filter((r) => !r.success).length
      if (fail > 0) toast.warning(`${ok} posted, ${fail} failed`)
      else toast.success(`${ok} reservation(s) posted successfully`)
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      setSelectedIds(new Set())
    },
    onError: (error) => toast.error(error.message || 'Batch post failed'),
  })

  // ── Bulk post all pending ───────────────────────────────────────
  const bulkPostMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/room-rate-posting/bulk-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postAll: true }),
      })
    },
    onSuccess: (data) => {
      const result = data as { message?: string }
      toast.success(result?.message || 'Bulk post completed')
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      setBulkPostOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Bulk post failed')
      setBulkPostOpen(false)
    },
  })

  // ── Derived data ────────────────────────────────────────────────
  const pendingSummary = pendingData?.summary
  const pendingReservations = pendingData?.pendingReservations || []

  const filteredPendingReservations = useMemo(() => {
    let list = [...pendingReservations]

    // Posting type filter
    if (postingType === 'no-room') list = list.filter((r) => !r.room)
    else if (postingType === 'urgent') list = list.filter((r) => r.pendingNights.length >= 3)

    // Search (name, room, conf#)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((r) =>
        r.guest?.firstName?.toLowerCase().includes(s) ||
        r.guest?.lastName?.toLowerCase().includes(s) ||
        r.confirmationNo?.toLowerCase().includes(s) ||
        r.room?.number?.toLowerCase().includes(s)
      )
    }

    // Date filter
    if (dateFilter) {
      list = list.filter((r) => r.pendingNights.includes(dateFilter))
    }

    // Sort by room number ascending
    list.sort((a, b) => (a.room?.number || '').localeCompare(b.room?.number || '', undefined, { numeric: true }))
    return list
  }, [pendingReservations, search, postingType, dateFilter])

  const pendingStats = useMemo(() => {
    const noRoom = filteredPendingReservations.filter((r) => !r.room).length
    const avgRate = filteredPendingReservations.length > 0
      ? Math.round(filteredPendingReservations.reduce((s, r) => s + r.roomRate, 0) / filteredPendingReservations.length)
      : 0
    const totalFolioBalance = filteredPendingReservations.reduce((s, r) => s + (r.folio?.balance || 0), 0)
    const totalPendingNights = filteredPendingReservations.reduce((s, r) => s + r.pendingNights.length, 0)
    const totalPendingAmount = filteredPendingReservations.reduce((s, r) => s + r.pendingAmount, 0)
    return { noRoom, avgRate, totalFolioBalance, totalPendingNights, totalPendingAmount }
  }, [filteredPendingReservations])

  const isWorking = postMutation.isPending || bulkPostMutation.isPending || postSelectedMutation.isPending

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSearch = useCallback(() => setSearch(searchInput), [searchInput])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch() }, [handleSearch])

  const clearFilters = useCallback(() => {
    setSearchInput(''); setSearch(''); setPostingType('all'); setDateFilter(''); setCalendarOpen(false)
  }, [])

  const handlePostReservation = useCallback(() => {
    if (!postTarget) return
    const customRate = rateOverride ? parseFloat(rateOverride) : undefined
    postMutation.mutate({ reservationId: postTarget.reservationId, dates: postTarget.pendingNights, customRate })
  }, [postTarget, rateOverride, postMutation])

  const handleBulkPost = useCallback(() => bulkPostMutation.mutate(), [bulkPostMutation])

  const handlePostSelected = useCallback(() => {
    const items = filteredPendingReservations
      .filter((r) => selectedIds.has(r.reservationId))
      .map((r) => ({ reservationId: r.reservationId, dates: r.pendingNights }))
    if (items.length === 0) return
    postSelectedMutation.mutate(items)
  }, [filteredPendingReservations, selectedIds, postSelectedMutation])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id))
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredPendingReservations.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredPendingReservations.map((r) => r.reservationId)))
  }, [selectedIds.size, filteredPendingReservations])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }, [])

  // ── Navigation actions ───────────────────────────────────────────
  const handleViewFolio = useCallback((res: PendingReservation) => {
    if (res.guest && res.room && res.folio) {
      setFolioContext({
        reservationId: res.reservationId, guestId: res.guest.id,
        guestName: `${res.guest.firstName} ${res.guest.lastName}`,
        roomNumber: res.room.number, confirmationNo: res.confirmationNo, folioId: res.folio.id,
      })
      navigateTo('front-desk', 'folio')
    } else { toast.error('Cannot open folio — missing guest, room, or folio data') }
  }, [navigateTo, setFolioContext])

  const handleViewReservation = useCallback((res: PendingReservation) => {
    navigateTo('front-desk', 'reservations')
    toast.info(`Viewing reservation ${res.confirmationNo}`)
  }, [navigateTo])

  const handleViewGuest = useCallback((res: PendingReservation) => {
    navigateTo('crm', 'profiles')
    toast.info('Viewing guest profile')
  }, [navigateTo])

  // ── Export CSV ──────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = filteredPendingReservations.map((r) => ({
      Room: r.room?.number || '', Guest: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '',
      'Check-In': formatDate(r.checkIn), 'Check-Out': formatDate(r.checkOut),
      'Rate/Night': r.roomRate, 'Pending Nights': r.pendingNights.length,
      'Posted Nights': r.postedNights.length, 'Future Nights': r.futureNights.length,
      'Pending Amount': r.pendingAmount, 'Folio Balance': r.folio?.balance || 0,
      'Confirmation #': r.confirmationNo,
    }))
    if (rows.length === 0) { toast.info('No data to export'); return }
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${(r as Record<string, unknown>)[h]}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `rate-posting-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url); toast.success(`Exported ${rows.length} records`)
  }, [filteredPendingReservations])

  const hasActiveFilters = search || postingType !== 'all' || dateFilter

  // ── Render ───────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-4">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="size-5 text-emerald-600" />
            Room Rate Posting
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage daily room charge postings for in-house guests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="size-3.5" /> Export
          </Button>
          <DropdownMenu open={showQuickActions} onOpenChange={setShowQuickActions}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Zap className="size-3.5" /> Quick Actions <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs">Posting Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setShowQuickActions(false); setBulkPostOpen(true) }}
                disabled={isWorking || pendingReservations.length === 0} className="gap-2.5 py-2"
              >
                <Zap className="size-4 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Post All Pending</p>
                  <p className="text-[10px] text-muted-foreground">Post charges for all {pendingSummary?.totalReservations || 0} reservations</p>
                </div>
              </DropdownMenuItem>
              {selectedIds.size > 0 && (
                <DropdownMenuItem
                  onClick={() => { setShowQuickActions(false); handlePostSelected() }}
                  disabled={isWorking} className="gap-2.5 py-2"
                >
                  <ListChecks className="size-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Post Selected ({selectedIds.size})</p>
                    <p className="text-[10px] text-muted-foreground">Post charges for selected reservations</p>
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Navigate To</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); navigateTo('front-desk', 'in-house') }} className="gap-2.5 py-2">
                <BedDouble className="size-4 text-teal-600" />
                <div className="flex-1"><p className="font-medium text-sm">In-House Guests</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); navigateTo('front-desk', 'folio') }} className="gap-2.5 py-2">
                <Receipt className="size-4 text-violet-600" />
                <div className="flex-1"><p className="font-medium text-sm">Guest Folio</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); navigateTo('front-desk', 'calendar') }} className="gap-2.5 py-2">
                <CalendarDays className="size-4 text-sky-600" />
                <div className="flex-1"><p className="font-medium text-sm">Reservation Calendar</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); navigateTo('front-desk', 'reports') }} className="gap-2.5 py-2">
                <FileSpreadsheet className="size-4 text-amber-600" />
                <div className="flex-1"><p className="font-medium text-sm">Reports</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); navigateTo('accounting', 'ledger') }} className="gap-2.5 py-2">
                <CreditCard className="size-4 text-purple-600" />
                <div className="flex-1"><p className="font-medium text-sm">Accounting Ledger</p></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ═══════════════ STAT CARDS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Clock className="size-4 text-amber-600" />} label="Pending" value={String(pendingSummary?.totalReservations ?? 0)} sublabel={`${pendingSummary?.totalPendingNights ?? 0} nights`} bgClass="bg-amber-50 border-amber-200" />
        <StatCard icon={<Wallet className="size-4 text-emerald-600" />} label="Pending Amount" value={pendingSummary ? formatCurrency(pendingSummary.totalPendingAmount) : 'NPR 0'} sublabel="Total charges" bgClass="bg-emerald-50 border-emerald-200" />
        <StatCard icon={<Users className="size-4 text-blue-600" />} label="In-House" value={String(filteredPendingReservations.length)} sublabel="With pending" bgClass="bg-blue-50 border-blue-200" />
        <StatCard icon={<BarChart3 className="size-4 text-violet-600" />} label="Avg Rate/Night" value={pendingStats.avgRate > 0 ? formatCurrency(pendingStats.avgRate) : 'NPR 0'} sublabel="Of pending" bgClass="bg-violet-50 border-violet-200" />
        <StatCard icon={<Building2 className="size-4 text-sky-600" />} label="Folio Balance" value={pendingStats.totalFolioBalance > 0 ? formatCurrency(pendingStats.totalFolioBalance) : 'NPR 0'} sublabel="Combined balance" bgClass="bg-sky-50 border-sky-200" />
        <StatCard icon={<AlertCircle className="size-4 text-red-600" />} label="Issues" value={String(pendingStats.noRoom)} sublabel={pendingStats.noRoom > 0 ? 'No room assigned' : 'All assigned'} bgClass="bg-red-50 border-red-200" />
      </div>

      {/* ═══════════════ FILTER BAR ═══════════════ */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search box — searches by name, room, conf# */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search guest, room, conf#..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 w-[330px] pl-8 pr-8 text-sm bg-background border-border/80"
          />
          {search && (
            <button
              onClick={() => { setSearchInput(''); setSearch('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Posting type toggle buttons */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
          {POSTING_TYPE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              onClick={() => setPostingType(opt.value)}
              className={cn(
                'h-8 text-xs px-3 rounded-md transition-all',
                postingType === opt.value
                  ? 'bg-background shadow-sm font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Filter className="size-3 mr-1.5" />
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Calendar date picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 gap-2 text-sm font-normal justify-start border-border/80',
                dateFilter ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {dateFilter ? (
                <span className="font-medium">{format(parseISO(dateFilter), 'dd MMM yyyy')}</span>
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter ? parseISO(dateFilter) : undefined}
              onSelect={(day) => {
                if (day) {
                  const y = day.getFullYear()
                  const m = String(day.getMonth() + 1).padStart(2, '0')
                  const d = String(day.getDate()).padStart(2, '0')
                  setDateFilter(`${y}-${m}-${d}`)
                } else {
                  setDateFilter('')
                }
                setCalendarOpen(false)
              }}
              initialFocus
            />
            {dateFilter && (
              <div className="border-t px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => { setDateFilter(''); setCalendarOpen(false) }}
                >
                  <X className="size-3" /> Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground gap-1.5 hover:text-foreground">
            <X className="size-3.5" /> Clear All
          </Button>
        )}
      </div>

      {/* ═══════════════ BATCH ACTIONS BAR ═══════════════ */}
      {!isLoading && filteredPendingReservations.length > 0 && (
        <Card className="py-2 px-4">
          <div className="flex items-center justify-between text-xs gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selectedIds.size === filteredPendingReservations.length && filteredPendingReservations.length > 0} onCheckedChange={toggleSelectAll} className="size-3.5" />
                <span className="text-muted-foreground"><span className="font-semibold text-foreground">{filteredPendingReservations.length}</span> reservations</span>
              </label>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground"><span className="font-semibold text-amber-600">{pendingStats.totalPendingNights}</span> pending nights</span>
              <span className="font-semibold tabular-nums">{formatCurrency(pendingStats.totalPendingAmount)}</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" variant="outline" onClick={handlePostSelected} disabled={isWorking} className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <ListChecks className="size-3" /> Post {selectedIds.size} Selected
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setBulkPostOpen(true)} disabled={isWorking || pendingReservations.length === 0} className="h-7 text-xs gap-1.5">
                {bulkPostMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />} Post All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════ PENDING TABLE ═══════════════ */}
      {isLoading ? (
        <Card><CardContent className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</CardContent></Card>
      ) : filteredPendingReservations.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="size-12 text-emerald-400" />}
          title={hasActiveFilters ? 'No Matches Found' : 'All Caught Up!'}
          description={hasActiveFilters ? 'No pending room charges match your current filters.' : 'No pending room charges to post. All in-house guests are up to date.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-xs w-[36px] p-1.5">
                    <Checkbox checked={selectedIds.size === filteredPendingReservations.length && filteredPendingReservations.length > 0} onCheckedChange={toggleSelectAll} className="size-3.5" />
                  </TableHead>
                  <TableHead className="text-xs w-[32px]"></TableHead>
                  <TableHead className="text-xs">Room</TableHead>
                  <TableHead className="text-xs">Guest</TableHead>
                  <TableHead className="text-xs">Stay</TableHead>
                  <TableHead className="text-xs text-right">Rate/Night</TableHead>
                  <TableHead className="text-xs text-center">Pend</TableHead>
                  <TableHead className="text-xs text-center">Post</TableHead>
                  <TableHead className="text-xs text-center">Futr</TableHead>
                  <TableHead className="text-xs text-right">Pending Amt</TableHead>
                  <TableHead className="text-xs text-center">Folio</TableHead>
                  <TableHead className="text-xs text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPendingReservations.map((res) => (
                  <PendingRow
                    key={res.reservationId}
                    reservation={res}
                    isExpanded={expandedRow === res.reservationId}
                    isSelected={selectedIds.has(res.reservationId)}
                    onToggle={() => toggleExpand(res.reservationId)}
                    onSelect={() => toggleSelect(res.reservationId)}
                    onPost={() => { setPostTarget(res); setPostConfirmOpen(true); setRateOverride('') }}
                    onViewFolio={() => handleViewFolio(res)}
                    onViewReservation={() => handleViewReservation(res)}
                    onViewGuest={() => handleViewGuest(res)}
                    isPosting={postMutation.isPending && postMutation.variables?.reservationId === res.reservationId}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ═══════════════ POST CONFIRM DIALOG ═══════════════ */}
      <Dialog open={postConfirmOpen} onOpenChange={setPostConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="size-5 text-emerald-600" /> Reserve Posting</DialogTitle>
            <DialogDescription>Post all pending room charges for this reservation to the guest folio.</DialogDescription>
          </DialogHeader>
          {postTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <DetailItem label="Room" value={postTarget.room?.number || '—'} />
                  <DetailItem label="Guest" value={postTarget.guest ? `${postTarget.guest.firstName} ${postTarget.guest.lastName}` : '—'} />
                  <DetailItem label="Confirmation" value={postTarget.confirmationNo} />
                  <DetailItem label="Room Type" value={postTarget.room?.type?.name || '—'} />
                </div>
                <Separator className="my-2.5" />
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div className="rounded-md bg-amber-50 border border-amber-200 py-1.5 px-2">
                    <p className="text-[10px] text-amber-600 font-medium uppercase">Pending</p>
                    <p className="font-bold text-amber-700">{postTarget.pendingNights.length}</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 py-1.5 px-2">
                    <p className="text-[10px] text-emerald-600 font-medium uppercase">Posted</p>
                    <p className="font-bold text-emerald-700">{postTarget.postedNights.length}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 border border-gray-200 py-1.5 px-2">
                    <p className="text-[10px] text-gray-500 font-medium uppercase">Future</p>
                    <p className="font-bold text-gray-600">{postTarget.futureNights.length}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-base font-bold tabular-nums">{formatCurrency(postTarget.pendingAmount)}</span>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ShieldCheck className="size-3" /> Override Rate (optional)</Label>
                <Input type="number" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={`Default: ${formatCurrency(postTarget.roomRate)}`} className="mt-1.5 h-9 text-sm" min={0} />
                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use the default room rate</p>
              </div>
              <div className="text-[10px] text-muted-foreground">Nights to post: <span className="font-mono">{postTarget.pendingNights.join(', ')}</span></div>
              {!postTarget.room && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="size-4 shrink-0" /> <span>No room assigned. Charges cannot be posted.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPostConfirmOpen(false); setRateOverride('') }} className="gap-1.5"><X className="size-3.5" /> Cancel</Button>
            <Button onClick={handlePostReservation} disabled={postMutation.isPending || !postTarget?.room} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {postMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />} Post Charges
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ BULK POST ALL DIALOG ═══════════════ */}
      <Dialog open={bulkPostOpen} onOpenChange={setBulkPostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="size-5 text-amber-500" /> Post All Pending Charges</DialogTitle>
            <DialogDescription>Post pending room charges for ALL in-house reservations at once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{pendingSummary?.totalReservations ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Reservations</p>
              </div>
              <div className="rounded-md border bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{pendingSummary?.totalPendingNights ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Nights</p>
              </div>
              <div className="rounded-md border bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{pendingSummary ? formatCurrency(pendingSummary.totalPendingAmount) : 'NPR 0'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
              </div>
            </div>
            {pendingStats.noRoom > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="size-4 shrink-0" /> <span><strong>{pendingStats.noRoom}</strong> reservation(s) have no room assigned and will be skipped.</span>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">What will happen:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Room charges will be created for each pending night</li>
                <li>Folio transactions will be generated automatically</li>
                <li>Guest folio balances will be updated</li>
                <li>This action cannot be undone (use Void to reverse)</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkPostOpen(false)} className="gap-1.5"><X className="size-3.5" /> Cancel</Button>
            <Button onClick={handleBulkPost} disabled={bulkPostMutation.isPending || (pendingSummary?.totalReservations ?? 0) === 0} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              {bulkPostMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} Confirm Post All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatCard({ icon, label, value, sublabel, bgClass }: { icon: React.ReactNode; label: string; value: string; sublabel: string; bgClass: string }) {
  return (
    <Card className={cn('py-3', bgClass)}>
      <CardContent className="px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold tabular-nums truncate" title={value}>{value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
          </div>
          <div className="p-1.5 rounded-lg bg-background/60 shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <span className={cn('text-xs font-medium mt-0.5', className)}>{value}</span>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="py-12">
      <CardContent className="px-6 text-center space-y-3">{icon}<div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground mt-1">{description}</p></div></CardContent>
    </Card>
  )
}

function PendingRow({
  reservation: res, isExpanded, isSelected, onToggle, onSelect, onPost,
  onViewFolio, onViewReservation, onViewGuest, isPosting,
}: {
  reservation: PendingReservation; isExpanded: boolean; isSelected: boolean
  onToggle: () => void; onSelect: () => void; onPost: () => void
  onViewFolio: () => void; onViewReservation: () => void; onViewGuest: () => void
  isPosting: boolean
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const guestName = res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'
  const hasRoom = !!res.room

  const handleShowDetails = useCallback(() => {
    setDropdownOpen(false)
    onToggle()
  }, [onToggle])

  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-muted/50 transition-colors', isExpanded && 'bg-muted/30', !hasRoom && 'opacity-60', isSelected && 'bg-emerald-50/50')}
        onClick={onToggle}
      >
        <TableCell className="p-1.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} className="size-3.5" />
        </TableCell>
        <TableCell className="p-1.5" onClick={(e) => e.stopPropagation()}>
          {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
          {hasRoom ? (
            <span className="flex items-center gap-1"><BedDouble className="size-3 text-muted-foreground" />{res.room.number}</span>
          ) : (
            <Tooltip><TooltipTrigger asChild><span className="text-amber-600 flex items-center gap-1"><AlertCircle className="size-3" />—</span></TooltipTrigger><TooltipContent>No room assigned</TooltipContent></Tooltip>
          )}
        </TableCell>
        <TableCell className="text-xs font-medium truncate max-w-[120px]" title={guestName} onClick={(e) => e.stopPropagation()}>{guestName}</TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <span className="hidden sm:inline">{formatDate(res.checkIn)} <ArrowRight className="size-2.5 inline" /> {formatDate(res.checkOut)}</span>
          <span className="sm:hidden">{formatDate(res.checkIn)}</span>
        </TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums" onClick={(e) => e.stopPropagation()}>{formatCurrency(res.roomRate)}</TableCell>
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Badge variant="destructive" className="h-5 text-[10px] font-semibold px-1.5">{res.pendingNights.length}</Badge>
        </TableCell>
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{res.postedNights.length}</Badge>
        </TableCell>
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          {res.futureNights.length > 0 ? <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">{res.futureNights.length}</Badge> : <span className="text-muted-foreground">0</span>}
        </TableCell>
        <TableCell className="text-xs text-right font-semibold tabular-nums text-amber-600" onClick={(e) => e.stopPropagation()}>{formatCurrency(res.pendingAmount)}</TableCell>
        <TableCell className="text-center text-[10px] tabular-nums" onClick={(e) => e.stopPropagation()}>
          {res.folio ? (
            <Tooltip><TooltipTrigger asChild>
              <span className={cn('font-medium', (res.folio.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}>{formatCurrency(res.folio.balance)}</span>
            </TooltipTrigger><TooltipContent>Folio Balance</TooltipContent></Tooltip>
          ) : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-right p-1.5" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPosting}><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Room {res.room?.number || '—'} — {guestName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); onPost() }} disabled={!hasRoom || isPosting} className="gap-2.5 py-2 text-emerald-700 focus:text-emerald-700">
                {isPosting ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                <div><p className="font-medium text-sm">Reserve Posting</p><p className="text-[10px] text-muted-foreground">Post {res.pendingNights.length} pending night(s) to folio</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShowDetails} className="gap-2.5 py-2">
                <Eye className="size-4 text-blue-600" />
                <div><p className="text-sm">{isExpanded ? 'Hide Details' : 'Show Details'}</p><p className="text-[10px] text-muted-foreground">View night breakdown &amp; info</p></div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); onViewFolio() }} className="gap-2.5 py-2">
                <Receipt className="size-4 text-violet-600" />
                <div><p className="text-sm">View Folio</p><p className="text-[10px] text-muted-foreground">Guest billing &amp; transactions</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); onViewReservation() }} className="gap-2.5 py-2">
                <FileText className="size-4 text-blue-600" />
                <div><p className="text-sm">View Reservation</p><p className="text-[10px] text-muted-foreground">Reservation details &amp; history</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); onViewGuest() }} className="gap-2.5 py-2">
                <UserCircle className="size-4 text-rose-600" />
                <div><p className="text-sm">View Guest Profile</p><p className="text-[10px] text-muted-foreground">Guest information &amp; stay history</p></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Expanded Detail */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/20 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="font-semibold mb-1.5 text-amber-600 uppercase tracking-wider text-[10px] flex items-center gap-1"><Clock className="size-3" /> Pending Nights ({res.pendingNights.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {res.pendingNights.length > 0 ? res.pendingNights.map((d) => (
                        <Badge key={d} variant="destructive" className="h-5 text-[10px] px-1.5">{formatDate(d)}</Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-emerald-600 uppercase tracking-wider text-[10px] flex items-center gap-1"><CheckCircle className="size-3" /> Posted ({res.postedNights.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {res.postedNights.length > 0 ? res.postedNights.map((d) => (
                        <Badge key={d} variant="secondary" className="h-5 text-[10px] px-1.5">{formatDate(d)}</Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1"><Moon className="size-3" /> Future ({res.futureNights.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {res.futureNights.length > 0 ? res.futureNights.map((d) => (
                        <Badge key={d} variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">{formatDate(d)}</Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Details</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Confirmation</span><span className="font-mono font-medium">{res.confirmationNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Room Type</span><span className="font-medium">{res.room?.type?.name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Nights</span><span className="font-medium">{res.totalNights}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Folio Balance</span><span className={cn('font-semibold tabular-nums', (res.folio?.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}>{res.folio ? formatCurrency(res.folio.balance) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pending Amount</span><span className="font-semibold tabular-nums text-amber-600">{formatCurrency(res.pendingAmount)}</span></div>
                </div>
                <Button size="sm" variant="outline" className="w-full h-7 text-[10px] gap-1 mt-2" onClick={onPost} disabled={isPosting || !hasRoom}>
                  {isPosting ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />} Post {res.pendingNights.length} Night(s)
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}