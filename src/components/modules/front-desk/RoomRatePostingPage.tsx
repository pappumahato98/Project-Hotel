'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  DollarSign, Clock, AlertCircle, CheckCircle, Loader2, X,
  Search, Filter, RefreshCw, ChevronDown, ChevronRight, Eye,
  Ban, Zap, CalendarDays, Users, TrendingUp, BedDouble,
  ArrowUpDown, MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency, toDateOnly } from '@/lib/format'
import { invalidate } from '@/lib/queryKeys'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
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

type TabValue = 'all' | 'pending' | 'posted' | 'voided'

// ─── Component ──────────────────────────────────────────────────────────

export function RoomRatePostingPage() {
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<TabValue>('pending')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<PostingRow | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [postConfirmOpen, setPostConfirmOpen] = useState(false)
  const [postTarget, setPostTarget] = useState<PendingReservation | null>(null)

  // ── Fetch all postings list ──────────────────────────────────────────
  const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useQuery({
    queryKey: ['rate-posting-list', { activeTab, search, statusFilter, dateFrom, dateTo, page }],
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
    onError: () => toast.error('Failed to void posting'),
  })

  // ── Post single reservation's pending nights ────────────────────────
  const postMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return apiFetch('/api/room-rate-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
    },
    onSuccess: () => {
      toast.success('Pending charges posted successfully')
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['rate-posting-pending'] })
      queryClient.invalidateQueries({ queryKey: ['rate-posting-list'] })
      setPostConfirmOpen(false)
      setPostTarget(null)
    },
    onError: () => toast.error('Failed to post charges'),
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
    },
    onError: () => toast.error('Bulk post failed'),
  })

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
    setStatusFilter('all')
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
    postMutation.mutate(postTarget.reservationId)
  }, [postTarget, postMutation])

  const handleBulkPost = useCallback(() => {
    bulkPostMutation.mutate()
  }, [bulkPostMutation])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id))
  }, [])

  // ── Derived data ────────────────────────────────────────────────────
  const stats = listData?.stats
  const pendingSummary = pendingData?.summary
  const postings = listData?.postings || []
  const pendingReservations = pendingData?.pendingReservations || []
  const pagination = listData?.pagination

  const isWorking = voidMutation.isPending || postMutation.isPending || bulkPostMutation.isPending

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
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
            onClick={() => {
              refetchList()
              refetchPending()
            }}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          {activeTab === 'pending' && pendingReservations.length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkPost}
              disabled={isWorking}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkPostMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              Post All Pending
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign className="size-4 text-emerald-600" />}
          label="Today's Posting"
          value={String(stats?.postedToday ?? pendingSummary?.totalReservations ?? 0)}
          sublabel={stats ? `${stats.todayRevenue > 0 ? formatCurrency(stats.todayRevenue) : 'No revenue today'}` : pendingSummary ? `${pendingSummary.totalPendingNights} nights pending` : '—'}
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
          label="In-House Guests"
          value={String(stats?.inHouseReservations ?? 0)}
          sublabel="Active reservations"
          bgClass="bg-orange-50 border-orange-200"
        />
        <StatCard
          icon={<AlertCircle className="size-4 text-red-600" />}
          label="Voided"
          value={String(stats?.voidedCount ?? 0)}
          sublabel="Cancelled postings"
          bgClass="bg-red-50 border-red-200"
        />
      </div>

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabValue); setPage(1) }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

          {/* Filters (for All/Posted/Voided tabs) */}
          {activeTab !== 'pending' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Guest, Room, Conf#..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 w-[180px] pl-8 text-xs"
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
              <Button variant="ghost" size="sm" onClick={handleSearch} className="h-8 text-xs">
                Search
              </Button>
              {(search || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground">
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── PENDING TAB ──────────────────────────────────────────── */}
        <TabsContent value="pending" className="mt-4">
          {isLoadingPending ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : pendingReservations.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="size-12 text-emerald-400" />}
              title="All Caught Up!"
              description="No pending room charges to post. All in-house guests are up to date."
            />
          ) : (
            <>
              {/* Pending Summary Bar */}
              <Card className="py-2.5 px-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{pendingSummary?.totalReservations}</span> reservations
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-amber-600">{pendingSummary?.totalPendingNights}</span> pending nights
                    </span>
                    <span className="font-semibold tabular-nums">
                      {pendingSummary && formatCurrency(pendingSummary.totalPendingAmount)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkPost}
                    disabled={isWorking}
                    className="h-7 text-xs gap-1.5"
                  >
                    {bulkPostMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                    Post All
                  </Button>
                </div>
              </Card>

              {/* Pending Table */}
              <Card className="overflow-hidden">
                <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-xs w-[40px]"></TableHead>
                        <TableHead className="text-xs">Room</TableHead>
                        <TableHead className="text-xs">Guest</TableHead>
                        <TableHead className="text-xs">Stay</TableHead>
                        <TableHead className="text-xs text-right">Rate/Night</TableHead>
                        <TableHead className="text-xs text-center">Pending</TableHead>
                        <TableHead className="text-xs text-center">Posted</TableHead>
                        <TableHead className="text-xs text-center">Future</TableHead>
                        <TableHead className="text-xs text-right">Pending Amt</TableHead>
                        <TableHead className="text-xs text-right w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReservations.map((res) => (
                        <PendingRow
                          key={res.reservationId}
                          reservation={res}
                          isExpanded={expandedRow === res.reservationId}
                          onToggle={() => toggleExpand(res.reservationId)}
                          onPost={() => { setPostTarget(res); setPostConfirmOpen(true) }}
                          isPosting={postMutation.isPending && postMutation.variables === res.reservationId}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── ALL / POSTED / VOIDED TABS ───────────────────────────── */}
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
              description={
                activeTab === 'voided'
                  ? 'No voided postings in the system.'
                  : 'No room rate postings match your filters.'
              }
            />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-xs w-[40px]"></TableHead>
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
                        <TableHead className="text-xs w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postings.map((posting) => (
                        <PostingListRow
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 w-7 text-xs p-0"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Void Confirmation Dialog ────────────────────────────────── */}
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{formatDate(voidTarget.postingDate)}</span></div>
                <div><span className="text-muted-foreground">Room:</span> <span className="font-medium">{voidTarget.reservation?.room?.number || '—'}</span></div>
                <div><span className="text-muted-foreground">Guest:</span> <span className="font-medium">{voidTarget.reservation?.guest ? `${voidTarget.reservation.guest.firstName} ${voidTarget.reservation.guest.lastName}` : '—'}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-red-600">{formatCurrency(voidTarget.totalAmount)}</span></div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason for voiding (required)</label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Incorrect rate, duplicate posting..."
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={!voidReason.trim() || voidMutation.isPending}
              className="gap-1.5"
            >
              {voidMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
              Void Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Post Confirmation Dialog ────────────────────────────────── */}
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
            <div className="space-y-2 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Room:</span> <span className="font-medium">{postTarget.room?.number || '—'}</span></div>
                <div><span className="text-muted-foreground">Guest:</span> <span className="font-medium">{postTarget.guest ? `${postTarget.guest.firstName} ${postTarget.guest.lastName}` : '—'}</span></div>
                <div><span className="text-muted-foreground">Pending Nights:</span> <span className="font-semibold text-amber-600">{postTarget.pendingNights.length}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold">{formatCurrency(postTarget.pendingAmount)}</span></div>
              </div>
              <div className="text-muted-foreground mt-2">
                Nights to post: {postTarget.pendingNights.join(', ')}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPostConfirmOpen(false)} className="gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              onClick={handlePostReservation}
              disabled={postMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {postMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
              Post Charges
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
          </div>
          <div className="p-2 rounded-lg bg-background/60">{icon}</div>
        </div>
      </CardContent>
    </Card>
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

function PendingRow({
  reservation: res,
  isExpanded,
  onToggle,
  onPost,
  isPosting,
}: {
  reservation: PendingReservation
  isExpanded: boolean
  onToggle: () => void
  onPost: () => void
  isPosting: boolean
}) {
  const guestName = res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'

  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-muted/50', isExpanded && 'bg-muted/30')}
        onClick={onToggle}
      >
        <TableCell className="p-1.5">
          {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-xs font-semibold">{res.room?.number || '—'}</TableCell>
        <TableCell className="text-xs font-medium truncate max-w-[140px]" title={guestName}>{guestName}</TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
        </TableCell>
        <TableCell className="text-xs text-right font-mono tabular-nums">{formatCurrency(res.roomRate)}</TableCell>
        <TableCell className="text-center">
          <Badge variant="destructive" className="h-5 text-[10px] font-semibold px-1.5">
            {res.pendingNights.length}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
            {res.postedNights.length}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">
            {res.futureNights.length}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-right font-semibold tabular-nums text-amber-600">
          {formatCurrency(res.pendingAmount)}
        </TableCell>
        <TableCell className="text-right p-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            onClick={(e) => { e.stopPropagation(); onPost() }}
            disabled={isPosting}
          >
            {isPosting ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
            Post
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/20 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">Pending Nights</p>
                <div className="flex flex-wrap gap-1">
                  {res.pendingNights.map((d) => (
                    <Badge key={d} variant="destructive" className="h-5 text-[10px] px-1.5">
                      {formatDate(d)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">Already Posted</p>
                <div className="flex flex-wrap gap-1">
                  {res.postedNights.map((d) => (
                    <Badge key={d} variant="secondary" className="h-5 text-[10px] px-1.5">
                      {formatDate(d)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">Future Nights</p>
                <div className="flex flex-wrap gap-1">
                  {res.futureNights.map((d) => (
                    <Badge key={d} variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground">
                      {formatDate(d)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function PostingListRow({
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
          'cursor-pointer hover:bg-muted/50',
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
        <TableCell className="p-1.5 text-right">
          {posting.status === 'posted' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onVoid() }} className="text-red-600">
                  <Ban className="size-3.5 mr-2" />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Guest</p>
                <p className="font-medium mt-0.5">{guestName}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Stay Dates</p>
                <p className="font-medium mt-0.5">
                  {posting.reservation ? `${formatDate(posting.reservation.checkIn)} → ${formatDate(posting.reservation.checkOut)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Room Type</p>
                <p className="font-medium mt-0.5">{posting.reservation?.room?.type?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Folio Balance</p>
                <p className="font-medium mt-0.5 tabular-nums">{posting.folio ? formatCurrency(posting.folio.balance) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Created At</p>
                <p className="font-medium mt-0.5">{posting.createdAt ? formatDate(posting.createdAt) : '—'}</p>
              </div>
              {posting.voidedBy && (
                <div>
                  <p className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Voided By</p>
                  <p className="font-medium mt-0.5">{posting.voidedBy}</p>
                  {posting.voidReason && <p className="text-muted-foreground text-[10px]">{posting.voidReason}</p>}
                </div>
              )}
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