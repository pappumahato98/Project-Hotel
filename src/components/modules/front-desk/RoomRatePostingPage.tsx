'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  DollarSign, Clock, AlertCircle, CheckCircle, Loader2, X,
  Search, Filter, RefreshCw, ChevronDown, ChevronRight, Eye,
  Ban, Zap, CalendarDays, Users, TrendingUp, BedDouble,
  ArrowUpDown, MoreHorizontal, Download, FileSpreadsheet,
  ListChecks, CheckSquare, Wallet, Moon, ArrowRight,
  ChevronLeft, ShieldCheck, Timer, BarChart3, Building2,
  ListTodo,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency, toDateOnly } from '@/lib/format'
import { invalidate } from '@/lib/queryKeys'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ──────────────────────────────────────────────────────────────

interface PostingRow {
  id: string
  reservationId: string
  folioId: string
  roomId: string
  postingDate: string
  roomRate: number
  taxAmount: number
  serviceCharge: number
  totalAmount: number
  status: string
  postedBy: string | null
  voidedBy: string | null
  voidReason: string | null
  createdAt: string
  reservation: {
    id: string
    confirmationNo: string
    status: string
    checkIn: string
    checkOut: string
    roomRate: number
    guest: { id: string; firstName: string; lastName: string } | null
    room: { id: string; number: string; type: { name: string } | null } | null
  } | null
  folio: { id: string; balance: number; status: string } | null
}

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

interface PostingListResponse {
  postings: PostingRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  stats: {
    totalPosted: number
    postedToday: number
    totalRevenue: number
    todayRevenue: number
    inHouseReservations: number
    voidedCount: number
  }
}

interface PendingResponse {
  pendingReservations: PendingReservation[]
  summary: { totalReservations: number; totalPendingNights: number; totalPendingAmount: number }
}

// ─── Constants ──────────────────────────────────────────────────────────

type TabValue = 'pending' | 'all' | 'posted' | 'voided'

const SORT_OPTIONS = [
  { value: 'room-asc', label: 'Room ↑' },
  { value: 'room-desc', label: 'Room ↓' },
  { value: 'guest-asc', label: 'Guest A→Z' },
  { value: 'amount-desc', label: 'Amount ↓' },
  { value: 'pending-desc', label: 'Most Pending' },
] as const

// ─── Component ──────────────────────────────────────────────────────────

export function RoomRatePostingPage() {
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<TabValue>('pending')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('room-asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<PostingRow | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [postConfirmOpen, setPostConfirmOpen] = useState(false)
  const [postTarget, setPostTarget] = useState<PendingReservation | null>(null)
  const [bulkPostOpen, setBulkPostOpen] = useState(false)
  const [rateOverride, setRateOverride] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(false)

  const tableRef = useRef<HTMLDivElement>(null)

  // ── Fetch all postings list ──────────────────────────────────────────
  const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useQuery({
    queryKey: ['rate-posting-list', { activeTab, search, dateFrom, dateTo, page }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeTab !== 'pending') {
        params.set('status', activeTab === 'all' ? 'all' : activeTab)
      }
      if (search) params.set('search', search)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('limit', '50')

      return apiFetch<PostingListResponse>(`/api/room-rate-posting/list?${params}`)
    },
    enabled: activeTab !== 'pending',
  })

  // ── Fetch pending reservations ───────────────────────────────────────
  const { data: pendingData, isLoading: isLoadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['rate-posting-pending'],
    queryFn: () => apiFetch<PendingResponse>('/api/room-rate-posting/pending'),
    enabled: activeTab === 'pending',
  })

  // ── Void mutation ───────────────────────────────────────────────────
  const voidMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiFetch(`/api/room-rate-posting/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voidReason: reason }),
      })
    },
    onSuccess: () => {
      toast.success('Rate posting voided successfully')
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-list'] })
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      setVoidDialogOpen(false)
      setVoidTarget(null)
      setVoidReason('')
    },
    onError: (error) => toast.error(error.message || 'Failed to void posting'),
  })

  // ── Post single reservation's pending nights ────────────────────────
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
      queryClient.invalidateQueries({ queryKey: ['rate-posting-list'] })
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

  // ── Post selected (batch) ───────────────────────────────────────────
  const postSelectedMutation = useMutation({
    mutationFn: async (items: { reservationId: string; dates: string[] }[]) => {
      const results = []
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
      if (fail > 0) {
        toast.warning(`${ok} posted, ${fail} failed`)
      } else {
        toast.success(`${ok} reservation(s) posted successfully`)
      }
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      queryClient.invalidateQueries({ queryKey: ['rate-posting-list'] })
      setSelectedIds(new Set())
    },
    onError: (error) => toast.error(error.message || 'Batch post failed'),
  })

  // ── Bulk post all pending ───────────────────────────────────────────
  const bulkPostMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/room-rate-posting/bulk-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postAll: true }),
      })
    },
    onSuccess: (data) => {
      const result = data as { message?: string; summary?: { totalPostedNights: number; successCount: number } }
      toast.success(result?.message || 'Bulk post completed')
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      queryClient.invalidateQueries({ queryKey: ['rate-posting-list'] })
      setBulkPostOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Bulk post failed')
      setBulkPostOpen(false)
    },
  })

  // ── Derived data ────────────────────────────────────────────────────
  const stats = listData?.stats
  const pendingSummary = pendingData?.summary
  const postings = listData?.postings || []
  const pendingReservations = pendingData?.pendingReservations || []
  const pagination = listData?.pagination

  // Filter + sort pending
  const filteredPendingReservations = useMemo(() => {
    let list = [...pendingReservations]
    if (roomFilter) {
      list = list.filter((r) => r.room?.number?.toLowerCase().includes(roomFilter.toLowerCase()))
    }
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((r) =>
        r.guest?.firstName?.toLowerCase().includes(s) ||
        r.guest?.lastName?.toLowerCase().includes(s) ||
        r.confirmationNo?.toLowerCase().includes(s)
      )
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'room-desc': return (b.room?.number || '').localeCompare(a.room?.number || '', undefined, { numeric: true })
        case 'guest-asc': {
          const ga = a.guest ? `${a.guest.firstName} ${a.guest.lastName}` : ''
          const gb = b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : ''
          return ga.localeCompare(gb)
        }
        case 'amount-desc': return b.pendingAmount - a.pendingAmount
        case 'pending-desc': return b.pendingNights.length - a.pendingNights.length
        default: return (a.room?.number || '').localeCompare(b.room?.number || '', undefined, { numeric: true })
      }
    })
    return list
  }, [pendingReservations, roomFilter, search, sortBy])

  // Calculated stats for pending tab
  const pendingStats = useMemo(() => {
    const noRoom = filteredPendingReservations.filter((r) => !r.room).length
    const avgRate = filteredPendingReservations.length > 0
      ? Math.round(filteredPendingReservations.reduce((s, r) => s + r.roomRate, 0) / filteredPendingReservations.length)
      : 0
    const totalFolioBalance = filteredPendingReservations.reduce((s, r) => s + (r.folio?.balance || 0), 0)
    return { noRoom, avgRate, totalFolioBalance }
  }, [filteredPendingReservations])

  const isWorking = voidMutation.isPending || postMutation.isPending || bulkPostMutation.isPending || postSelectedMutation.isPending

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }, [handleSearch])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setRoomFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }, [])

  const handleVoid = useCallback(() => {
    if (!voidTarget || !voidReason.trim()) return
    voidMutation.mutate({ id: voidTarget.id, reason: voidReason.trim() })
  }, [voidTarget, voidReason, voidMutation])

  const handlePostReservation = useCallback(() => {
    if (!postTarget) return
    const customRate = rateOverride ? parseFloat(rateOverride) : undefined
    postMutation.mutate({ reservationId: postTarget.reservationId, dates: postTarget.pendingNights, customRate })
  }, [postTarget, rateOverride, postMutation])

  const handleBulkPost = useCallback(() => {
    bulkPostMutation.mutate()
  }, [bulkPostMutation])

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
    if (selectedIds.size === filteredPendingReservations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPendingReservations.map((r) => r.reservationId)))
    }
  }, [selectedIds.size, filteredPendingReservations])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = activeTab === 'pending'
      ? filteredPendingReservations.map((r) => ({
          Room: r.room?.number || '',
          Guest: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '',
          'Check-In': formatDate(r.checkIn),
          'Check-Out': formatDate(r.checkOut),
          'Rate/Night': r.roomRate,
          'Pending Nights': r.pendingNights.length,
          'Posted Nights': r.postedNights.length,
          'Future Nights': r.futureNights.length,
          'Pending Amount': r.pendingAmount,
        }))
      : postings.map((p) => ({
          Date: formatDate(p.postingDate),
          Room: p.reservation?.room?.number || '',
          Guest: p.reservation?.guest ? `${p.reservation.guest.firstName} ${p.reservation.guest.lastName}` : '',
          'Confirmation #': p.reservation?.confirmationNo || '',
          'Room Rate': p.roomRate,
          Tax: p.taxAmount,
          'Service Charge': p.serviceCharge,
          Total: p.totalAmount,
          Status: p.status,
          'Posted By': p.postedBy || 'System',
        }))

    if (rows.length === 0) {
      toast.info('No data to export')
      return
    }

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${(r as Record<string, unknown>)[h]}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rate-posting-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} records`)
  }, [activeTab, filteredPendingReservations, postings])

  // ── Render ───────────────────────────────────────────────────────────
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
            Manage daily room charge postings across all reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchList(); refetchPending() }}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Export
          </Button>
          <DropdownMenu open={showQuickActions} onOpenChange={setShowQuickActions}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Zap className="size-3.5" />
                Quick Actions
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Posting Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeTab === 'pending' && (
                <>
                  <DropdownMenuItem
                    onClick={() => { setShowQuickActions(false); setBulkPostOpen(true) }}
                    disabled={isWorking || pendingReservations.length === 0}
                    className="gap-2"
                  >
                    <Zap className="size-4 text-emerald-600" />
                    <div>
                      <p className="font-medium">Post All Pending</p>
                      <p className="text-[10px] text-muted-foreground">Post charges for all {pendingSummary?.totalReservations || 0} reservations</p>
                    </div>
                  </DropdownMenuItem>
                  {selectedIds.size > 0 && (
                    <DropdownMenuItem
                      onClick={() => { setShowQuickActions(false); handlePostSelected() }}
                      disabled={isWorking}
                      className="gap-2"
                    >
                      <ListChecks className="size-4 text-blue-600" />
                      <div>
                        <p className="font-medium">Post Selected ({selectedIds.size})</p>
                        <p className="text-[10px] text-muted-foreground">Post charges for {selectedIds.size} selected reservations</p>
                      </div>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); setActiveTab('posted') }}>
                <FileSpreadsheet className="size-4 text-blue-600" />
                <div>
                  <p className="font-medium">View Posted History</p>
                  <p className="text-[10px] text-muted-foreground">See all posted room charges</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShowQuickActions(false); setActiveTab('voided') }}>
                <Ban className="size-4 text-red-500" />
                <div>
                  <p className="font-medium">View Voided</p>
                  <p className="text-[10px] text-muted-foreground">See cancelled/voided postings</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ═══════════════ STAT CARDS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {activeTab === 'pending' ? (
          <>
            <StatCard
              icon={<Clock className="size-4 text-amber-600" />}
              label="Pending"
              value={String(pendingSummary?.totalReservations ?? 0)}
              sublabel={`${pendingSummary?.totalPendingNights ?? 0} nights`}
              bgClass="bg-amber-50 border-amber-200"
            />
            <StatCard
              icon={<Wallet className="size-4 text-emerald-600" />}
              label="Pending Amount"
              value={pendingSummary ? formatCurrency(pendingSummary.totalPendingAmount) : 'NPR 0'}
              sublabel="Total charges"
              bgClass="bg-emerald-50 border-emerald-200"
            />
            <StatCard
              icon={<Users className="size-4 text-blue-600" />}
              label="In-House"
              value={String(stats?.inHouseReservations ?? 0)}
              sublabel="Active guests"
              bgClass="bg-blue-50 border-blue-200"
            />
            <StatCard
              icon={<BarChart3 className="size-4 text-violet-600" />}
              label="Avg Rate/Night"
              value={pendingStats.avgRate > 0 ? formatCurrency(pendingStats.avgRate) : 'NPR 0'}
              sublabel="Of pending reservations"
              bgClass="bg-violet-50 border-violet-200"
            />
            <StatCard
              icon={<Building2 className="size-4 text-sky-600" />}
              label="Folio Balance"
              value={pendingStats.totalFolioBalance > 0 ? formatCurrency(pendingStats.totalFolioBalance) : 'NPR 0'}
              sublabel="Combined balance"
              bgClass="bg-sky-50 border-sky-200"
            />
            <StatCard
              icon={<AlertCircle className="size-4 text-red-600" />}
              label="No Room"
              value={String(pendingStats.noRoom)}
              sublabel={pendingStats.noRoom > 0 ? 'Cannot post' : 'All assigned'}
              bgClass="bg-red-50 border-red-200"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<DollarSign className="size-4 text-emerald-600" />}
              label="Today's Posting"
              value={String(stats?.postedToday ?? 0)}
              sublabel={stats?.todayRevenue ? formatCurrency(stats.todayRevenue) : 'No revenue today'}
              bgClass="bg-emerald-50 border-emerald-200"
            />
            <StatCard
              icon={<TrendingUp className="size-4 text-blue-600" />}
              label="Total Posted"
              value={String(stats?.totalPosted ?? 0)}
              sublabel={stats ? formatCurrency(stats.totalRevenue) : '—'}
              bgClass="bg-blue-50 border-blue-200"
            />
            <StatCard
              icon={<Users className="size-4 text-orange-600" />}
              label="In-House"
              value={String(stats?.inHouseReservations ?? 0)}
              sublabel="Active reservations"
              bgClass="bg-orange-50 border-orange-200"
            />
            <StatCard
              icon={<Ban className="size-4 text-red-600" />}
              label="Voided"
              value={String(stats?.voidedCount ?? 0)}
              sublabel="Cancelled postings"
              bgClass="bg-red-50 border-red-200"
            />
          </>
        )}
      </div>

      {/* ═══════════════ TABS + FILTERS ═══════════════ */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabValue); setPage(1); setSelectedIds(new Set()) }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="size-3.5" />
              Pending
              {pendingSummary && pendingSummary.totalReservations > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1 ml-1">
                  {pendingSummary.totalReservations}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <DollarSign className="size-3.5" />
              All
            </TabsTrigger>
            <TabsTrigger value="posted" className="gap-1.5">
              <CheckCircle className="size-3.5" />
              Posted
            </TabsTrigger>
            <TabsTrigger value="voided" className="gap-1.5">
              <Ban className="size-3.5" />
              Voided
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pending tab filters */}
            {activeTab === 'pending' && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Guest, Conf#..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-[140px] pl-8 text-xs"
                  />
                </div>
                <div className="relative">
                  <BedDouble className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Room..."
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="h-8 w-[80px] pl-8 text-xs"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <ArrowUpDown className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Other tabs filters */}
            {activeTab !== 'pending' && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Guest, Room, Conf#..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-[160px] pl-8 text-xs"
                  />
                </div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="h-8 w-[130px] text-xs"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="h-8 w-[130px] text-xs"
                />
              </>
            )}

            {(search || roomFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground gap-1">
                <X className="size-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ═══════════════ PENDING TAB ═══════════════ */}
        <TabsContent value="pending" className="mt-4">
          {isLoadingPending ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : filteredPendingReservations.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="size-12 text-emerald-400" />}
              title="All Caught Up!"
              description="No pending room charges to post. All in-house guests are up to date."
            />
          ) : (
            <>
              {/* Pending Summary + Batch Actions Bar */}
              <Card className="py-2.5 px-4">
                <div className="flex items-center justify-between text-xs gap-3 flex-wrap">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedIds.size === filteredPendingReservations.length && filteredPendingReservations.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="size-3.5"
                      />
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{filteredPendingReservations.length}</span> reservations
                      </span>
                    </label>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-amber-600">{pendingSummary?.totalPendingNights}</span> pending nights
                    </span>
                    <span className="font-semibold tabular-nums">
                      {pendingSummary && formatCurrency(pendingSummary.totalPendingAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePostSelected}
                        disabled={isWorking}
                        className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <ListChecks className="size-3" />
                        Post {selectedIds.size} Selected
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkPostOpen(true)}
                      disabled={isWorking || pendingReservations.length === 0}
                      className="h-7 text-xs gap-1.5"
                    >
                      {bulkPostMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                      Post All
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Pending Table */}
              <Card className="overflow-hidden">
                <div ref={tableRef} className="max-h-[calc(100vh-420px)] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-xs w-[36px] p-1.5">
                          <Checkbox
                            checked={selectedIds.size === filteredPendingReservations.length && filteredPendingReservations.length > 0}
                            onCheckedChange={toggleSelectAll}
                            className="size-3.5"
                          />
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
                        <TableHead className="text-xs text-right w-[70px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingReservations.map((res) => (
                        <EnhancedPendingRow
                          key={res.reservationId}
                          reservation={res}
                          isExpanded={expandedRow === res.reservationId}
                          isSelected={selectedIds.has(res.reservationId)}
                          onToggle={() => toggleExpand(res.reservationId)}
                          onSelect={() => toggleSelect(res.reservationId)}
                          onPost={() => { setPostTarget(res); setPostConfirmOpen(true); setRateOverride('') }}
                          isPosting={postMutation.isPending && postMutation.variables?.reservationId === res.reservationId}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════ ALL / POSTED / VOIDED TABS ═══════════════ */}
        <TabsContent value={activeTab} className="mt-4">
          {isLoadingList ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : postings.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="size-12 text-slate-300" />}
              title="No Postings Found"
              description={activeTab === 'voided' ? 'No voided postings in the system.' : 'No room rate postings match your filters.'}
            />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-xs w-[32px]"></TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Room</TableHead>
                        <TableHead className="text-xs">Guest</TableHead>
                        <TableHead className="text-xs">Reservation</TableHead>
                        <TableHead className="text-xs text-right">Room Rate</TableHead>
                        <TableHead className="text-xs text-right">Tax</TableHead>
                        <TableHead className="text-xs text-right">Svc</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs">Posted By</TableHead>
                        <TableHead className="text-xs w-[44px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postings.map((posting) => (
                        <EnhancedPostingListRow
                          key={posting.id}
                          posting={posting}
                          isExpanded={expandedRow === posting.id}
                          onToggle={() => toggleExpand(posting.id)}
                          onVoid={() => { setVoidTarget(posting); setVoidDialogOpen(true) }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) pageNum = i + 1
                      else if (pagination.page <= 3) pageNum = i + 1
                      else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                      else pageNum = pagination.page - 2 + i
                      return (
                        <Button key={pageNum} variant={pageNum === pagination.page ? 'default' : 'outline'} size="sm"
                          className="h-7 w-7 text-xs p-0" onClick={() => setPage(pageNum)}>
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════ VOID DIALOG ═══════════════ */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="size-5" />
              Void Rate Posting
            </DialogTitle>
            <DialogDescription>
              This will void the room charge and reverse the folio transaction. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {voidTarget && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <DetailItem label="Date" value={formatDate(voidTarget.postingDate)} />
                <DetailItem label="Room" value={voidTarget.reservation?.room?.number || '—'} />
                <DetailItem label="Guest" value={voidTarget.reservation?.guest ? `${voidTarget.reservation.guest.firstName} ${voidTarget.reservation.guest.lastName}` : '—'} />
                <DetailItem label="Amount" value={formatCurrency(voidTarget.totalAmount)} className="text-red-600 font-semibold" />
                <DetailItem label="Room Rate" value={formatCurrency(voidTarget.roomRate)} />
                <DetailItem label="Tax" value={formatCurrency(voidTarget.taxAmount)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Reason for voiding (required)</Label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Incorrect rate, duplicate posting..."
                  className="mt-1.5 h-9 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidMutation.isPending} className="gap-1.5">
              {voidMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
              Void Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ POST CONFIRM DIALOG ═══════════════ */}
      <Dialog open={postConfirmOpen} onOpenChange={setPostConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-emerald-600" />
              Post Pending Charges
            </DialogTitle>
            <DialogDescription>
              Post all pending room charges for this reservation to the guest folio.
            </DialogDescription>
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

              {/* Rate Override */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  Override Rate (optional)
                </Label>
                <Input
                  type="number"
                  value={rateOverride}
                  onChange={(e) => setRateOverride(e.target.value)}
                  placeholder={`Default: ${formatCurrency(postTarget.roomRate)}`}
                  className="mt-1.5 h-9 text-sm"
                  min={0}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use the default room rate</p>
              </div>

              <div className="text-[10px] text-muted-foreground">
                Nights to post: <span className="font-mono">{postTarget.pendingNights.join(', ')}</span>
              </div>

              {!postTarget.room && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>No room assigned. Charges cannot be posted.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPostConfirmOpen(false); setRateOverride('') }} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              onClick={handlePostReservation}
              disabled={postMutation.isPending || !postTarget?.room}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {postMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
              Post Charges
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ BULK POST ALL DIALOG ═══════════════ */}
      <Dialog open={bulkPostOpen} onOpenChange={setBulkPostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-amber-500" />
              Post All Pending Charges
            </DialogTitle>
            <DialogDescription>
              Post pending room charges for ALL in-house reservations at once.
            </DialogDescription>
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
                <p className="text-2xl font-bold text-emerald-700">
                  {pendingSummary ? formatCurrency(pendingSummary.totalPendingAmount) : 'NPR 0'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
              </div>
            </div>

            {pendingStats.noRoom > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="size-4 shrink-0" />
                <span><strong>{pendingStats.noRoom}</strong> reservation(s) have no room assigned and will be skipped.</span>
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
            <Button variant="outline" onClick={() => setBulkPostOpen(false)} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              onClick={handleBulkPost}
              disabled={bulkPostMutation.isPending || (pendingSummary?.totalReservations ?? 0) === 0}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              {bulkPostMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
              Confirm Post All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sublabel, bgClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  bgClass: string
}) {
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

function EmptyState({
  icon, title, description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="py-12">
      <CardContent className="px-6 text-center space-y-3">
        {icon}
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EnhancedPendingRow({
  reservation: res,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onPost,
  isPosting,
}: {
  reservation: PendingReservation
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onSelect: () => void
  onPost: () => void
  isPosting: boolean
}) {
  const guestName = res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'
  const hasRoom = !!res.room

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer hover:bg-muted/50 transition-colors',
          isExpanded && 'bg-muted/30',
          !hasRoom && 'opacity-60',
          isSelected && 'bg-emerald-50/50',
        )}
        onClick={onToggle}
      >
        {/* Checkbox */}
        <TableCell className="p-1.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} className="size-3.5" />
        </TableCell>
        {/* Expand */}
        <TableCell className="p-1.5" onClick={(e) => e.stopPropagation()}>
          {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </TableCell>
        {/* Room */}
        <TableCell className="text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {hasRoom ? (
              <>
                <BedDouble className="size-3 text-muted-foreground" />
                {res.room.number}
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    —
                  </span>
                </TooltipTrigger>
                <TooltipContent>No room assigned</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>
        {/* Guest */}
        <TableCell className="text-xs font-medium truncate max-w-[120px]" title={guestName} onClick={(e) => e.stopPropagation()}>
          {guestName}
        </TableCell>
        {/* Stay */}
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <span className="hidden sm:inline">{formatDate(res.checkIn)} <ArrowRight className="size-2.5 inline" /> {formatDate(res.checkOut)}</span>
          <span className="sm:hidden">{formatDate(res.checkIn)}</span>
        </TableCell>
        {/* Rate/Night */}
        <TableCell className="text-xs text-right font-mono tabular-nums" onClick={(e) => e.stopPropagation()}>
          {formatCurrency(res.roomRate)}
        </TableCell>
        {/* Pending */}
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Badge variant="destructive" className="h-5 text-[10px] font-semibold px-1.5">
            {res.pendingNights.length}
          </Badge>
        </TableCell>
        {/* Posted */}
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
            {res.postedNights.length}
          </Badge>
        </TableCell>
        {/* Future */}
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          {res.futureNights.length > 0 ? (
            <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">
              {res.futureNights.length}
            </Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </TableCell>
        {/* Pending Amt */}
        <TableCell className="text-xs text-right font-semibold tabular-nums text-amber-600" onClick={(e) => e.stopPropagation()}>
          {formatCurrency(res.pendingAmount)}
        </TableCell>
        {/* Folio Balance */}
        <TableCell className="text-center text-[10px] tabular-nums" onClick={(e) => e.stopPropagation()}>
          {res.folio ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  'font-medium',
                  (res.folio.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600',
                )}>
                  {formatCurrency(res.folio.balance)}
                </span>
              </TooltipTrigger>
              <TooltipContent>Folio Balance</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        {/* Action */}
        <TableCell className="text-right p-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            onClick={onPost}
            disabled={isPosting || !hasRoom}
          >
            {isPosting ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
            Post
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Detail */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/20 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Night breakdown */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="font-semibold mb-1.5 text-amber-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Clock className="size-3" /> Pending Nights ({res.pendingNights.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {res.pendingNights.length > 0 ? res.pendingNights.map((d) => (
                        <Badge key={d} variant="destructive" className="h-5 text-[10px] px-1.5">
                          {formatDate(d)}
                        </Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-emerald-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <CheckCircle className="size-3" /> Posted ({res.postedNights.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {res.postedNights.length > 0 ? res.postedNights.map((d) => (
                        <Badge key={d} variant="secondary" className="h-5 text-[10px] px-1.5">
                          {formatDate(d)}
                        </Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Moon className="size-3" /> Future ({res.futureNights.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {res.futureNights.length > 0 ? res.futureNights.map((d) => (
                        <Badge key={d} variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">
                          {formatDate(d)}
                        </Badge>
                      )) : <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary info */}
              <div className="space-y-2">
                <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Details</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmation</span>
                    <span className="font-mono font-medium">{res.confirmationNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Type</span>
                    <span className="font-medium">{res.room?.type?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Nights</span>
                    <span className="font-medium">{res.totalNights}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Folio Balance</span>
                    <span className={cn('font-semibold tabular-nums', (res.folio?.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {res.folio ? formatCurrency(res.folio.balance) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Amount</span>
                    <span className="font-semibold tabular-nums text-amber-600">{formatCurrency(res.pendingAmount)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] gap-1 mt-2"
                  onClick={onPost}
                  disabled={isPosting || !hasRoom}
                >
                  {isPosting ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                  Post {res.pendingNights.length} Night(s)
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function EnhancedPostingListRow({
  posting,
  isExpanded,
  onToggle,
  onVoid,
}: {
  posting: PostingRow
  isExpanded: boolean
  onToggle: () => void
  onVoid: () => void
}) {
  const guestName = posting.reservation?.guest
    ? `${posting.reservation.guest.firstName} ${posting.reservation.guest.lastName}`
    : '—'

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer hover:bg-muted/50 transition-colors',
          isExpanded && 'bg-muted/30',
          posting.status === 'voided' && 'opacity-60',
        )}
        onClick={onToggle}
      >
        <TableCell className="p-1.5">
          {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-xs font-medium whitespace-nowrap">{formatDate(posting.postingDate)}</TableCell>
        <TableCell className="text-xs font-semibold">{posting.reservation?.room?.number || '—'}</TableCell>
        <TableCell className="text-xs truncate max-w-[120px]" title={guestName}>{guestName}</TableCell>
        <TableCell className="text-xs text-muted-foreground font-mono">{posting.reservation?.confirmationNo || '—'}</TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums">{formatCurrency(posting.roomRate)}</TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(posting.taxAmount)}</TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(posting.serviceCharge)}</TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums font-semibold">{formatCurrency(posting.totalAmount)}</TableCell>
        <TableCell className="text-center">
          <PostingStatusBadge status={posting.status} />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{posting.postedBy || 'System'}</TableCell>
        <TableCell className="p-1.5 text-right" onClick={(e) => e.stopPropagation()}>
          {posting.status === 'posted' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onVoid} className="text-red-600 gap-2">
                  <Ban className="size-3.5" />
                  Void Posting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/20 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <DetailItem label="Guest" value={guestName} />
              <DetailItem label="Stay Dates" value={posting.reservation ? `${formatDate(posting.reservation.checkIn)} → ${formatDate(posting.reservation.checkOut)}` : '—'} />
              <DetailItem label="Room Type" value={posting.reservation?.room?.type?.name || '—'} />
              <DetailItem
                label="Folio Balance"
                value={posting.folio ? formatCurrency(posting.folio.balance) : '—'}
                className={(posting.folio?.balance ?? 0) > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}
              />
              <DetailItem label="Created At" value={posting.createdAt ? formatDate(posting.createdAt) : '—'} />
              {posting.voidedBy && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Voided By</span>
                  <span className="font-medium mt-0.5">{posting.voidedBy}</span>
                  {posting.voidReason && <p className="text-muted-foreground text-[10px] mt-0.5">{posting.voidReason}</p>}
                </div>
              )}
              <DetailItem label="Tax Amount" value={formatCurrency(posting.taxAmount)} />
              <DetailItem label="Service Charge" value={formatCurrency(posting.serviceCharge)} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function PostingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'posted':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] h-5 gap-0.5 px-1.5">
          <CheckCircle className="size-2.5" />
          Posted
        </Badge>
      )
    case 'voided':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[10px] h-5 gap-0.5 px-1.5">
          <Ban className="size-2.5" />
          Voided
        </Badge>
      )
    case 'adjusted':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px] h-5 gap-0.5 px-1.5">
          <AlertCircle className="size-2.5" />
          Adjusted
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{status}</Badge>
  }
}