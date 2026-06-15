'use client'

import React, { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  CheckCircle, Clock, AlertCircle, CalendarDays, BedDouble,
  DollarSign, Loader2, X, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { invalidate } from '@/lib/queryKeys'

// ─── Types ──────────────────────────────────────────────────────────────

interface RoomRatePostingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: string
  onPosted?: () => void
  roomNumber?: string
  roomTypeName?: string
  roomRate?: number
  checkIn?: string
  checkOut?: string
  reservationConfirmationNo?: string
}

interface ReservationDetail {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
  roomRate: number
  room: { number: string } | null
  guest: { firstName: string; lastName: string } | null
}

interface RatePosting {
  id: string
  reservationId: string
  postingDate: string
  roomRate: number
  tax: number
  serviceCharge: number
  total: number
  status: 'posted' | 'pending'
}

interface NightRow {
  date: Date
  dayName: string
  formattedDate: string
  roomRate: number
  tax: number
  serviceCharge: number
  total: number
  isFuture: boolean
  isPosted: boolean
  isPending: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────

const TAX_RATE = 0.13
const SERVICE_CHARGE_RATE = 0.10

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Component ──────────────────────────────────────────────────────────

export function RoomRatePostingDialog({
  open,
  onOpenChange,
  reservationId,
  onPosted,
}: RoomRatePostingDialogProps) {
  const queryClient = useQueryClient()

  // ── Fetch reservation details ────────────────────────────────────────
  const { data: reservation, isLoading: isLoadingReservation } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => apiFetch(`/api/reservations/${reservationId}`) as Promise<ReservationDetail>,
    enabled: open && !!reservationId,
  })

  // ── Fetch existing rate postings ──────────────────────────────────────
  const { data: postingsRaw, isLoading: isLoadingPostings } = useQuery({
    queryKey: ['room-rate-postings', reservationId],
    queryFn: () => apiFetch<{ postings: RatePosting[]; count: number }>(`/api/room-rate-posting?reservationId=${reservationId}`),
    enabled: open && !!reservationId,
  })
  const postings: RatePosting[] = Array.isArray(postingsRaw?.postings) ? postingsRaw.postings : []

  // ── Build nights array ───────────────────────────────────────────────
  const nights: NightRow[] = useMemo(() => {
    if (!reservation) return []

    const checkInDate = new Date(reservation.checkIn)
    const checkOutDate = new Date(reservation.checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const roomRate = reservation.roomRate || 0
    const rows: NightRow[] = []

    let current = new Date(checkInDate)
    current.setHours(0, 0, 0, 0)

    while (current < checkOutDate) {
      const isFuture = current > today
      const isPosted = postings.some((p) => {
        const pDate = new Date(p.postingDate)
        pDate.setHours(0, 0, 0, 0)
        return pDate.getTime() === current.getTime() && p.status === 'posted'
      })

      const tax = Math.round(roomRate * TAX_RATE)
      const serviceCharge = Math.round(roomRate * SERVICE_CHARGE_RATE)
      const total = roomRate + tax + serviceCharge
      const dayName = DAY_NAMES[current.getDay()]
      const formattedDate = formatDate(current)

      rows.push({
        date: new Date(current),
        dayName,
        formattedDate: `${formattedDate} (${dayName})`,
        roomRate,
        tax,
        serviceCharge,
        total,
        isFuture,
        isPosted,
        isPending: !isPosted && !isFuture,
      })

      current.setDate(current.getDate() + 1)
    }

    return rows
  }, [reservation, postings])

  // ── Summary calculations ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalNights = nights.length
    const totalRoomCharges = nights.reduce((sum, n) => sum + n.roomRate, 0)
    const totalTax = nights.reduce((sum, n) => sum + n.tax, 0)
    const totalServiceCharge = nights.reduce((sum, n) => sum + n.serviceCharge, 0)
    const grandTotal = totalRoomCharges + totalTax + totalServiceCharge
    const pendingCount = nights.filter((n) => n.isPending).length
    const allPosted = pendingCount === 0

    return { totalNights, totalRoomCharges, totalTax, totalServiceCharge, grandTotal, pendingCount, allPosted }
  }, [nights])

  // ── Post all pending mutation ─────────────────────────────────────────
  const postAllMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/room-rate-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
    },
    onSuccess: () => {
      toast.success(`${summary.pendingCount} room charges posted to guest folio`)
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['room-rate-postings', reservationId] })
      onPosted?.()
    },
    onError: () => {
      toast.error('Failed to post room charges. Please try again.')
    },
  })

  // ── Post single night mutation ────────────────────────────────────────
  const postSingleMutation = useMutation({
    mutationFn: async (postingDate: string) => {
      return apiFetch('/api/room-rate-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, postingDate }),
      })
    },
    onSuccess: (_data, variables) => {
      toast.success('Room charge posted for ' + formatDate(variables))
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['room-rate-postings', reservationId] })
      onPosted?.()
    },
    onError: () => {
      toast.error('Failed to post room charge. Please try again.')
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePostAll = () => {
    postAllMutation.mutate()
  }

  const handlePostSingle = (night: NightRow) => {
    const dateStr = night.date.toISOString().split('T')[0]
    postSingleMutation.mutate(dateStr)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  // ── Computed ─────────────────────────────────────────────────────────
  const isLoading = isLoadingReservation || isLoadingPostings
  const isPosting = postAllMutation.isPending || postSingleMutation.isPending

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-600" />
              Room Rate Posting
            </DialogTitle>
            <DialogDescription>
              Post daily room charges to guest folio
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body (scrollable) ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !reservation ? (
            <ErrorState />
          ) : (
            <>
              {/* Reservation Summary Card */}
              <ReservationSummaryCard reservation={reservation} nights={summary.totalNights} />

              {/* Posting Schedule Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="text-xs font-semibold w-[180px]">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Room Rate</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Tax (13%)</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Svc (10%)</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[70px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nights.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No nights found for this reservation.
                          </TableCell>
                        </TableRow>
                      ) : (
                        nights.map((night) => (
                          <TableRow
                            key={night.date.toISOString()}
                            className={cn(
                              'text-xs',
                              night.isPosted && 'bg-emerald-50/70 hover:bg-emerald-50',
                              night.isPending && 'bg-amber-50/60 hover:bg-amber-50',
                              night.isFuture && 'bg-muted/40 hover:bg-muted/40',
                            )}
                          >
                            {/* Date */}
                            <TableCell className="font-medium text-xs">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="size-3 text-muted-foreground shrink-0" />
                                <span className="whitespace-nowrap">{night.formattedDate}</span>
                              </div>
                            </TableCell>

                            {/* Room Rate */}
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(night.roomRate)}
                            </TableCell>

                            {/* Tax */}
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              {formatCurrency(night.tax)}
                            </TableCell>

                            {/* Service Charge */}
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              {formatCurrency(night.serviceCharge)}
                            </TableCell>

                            {/* Total */}
                            <TableCell className="text-right font-mono tabular-nums font-semibold">
                              {formatCurrency(night.total)}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="text-center">
                              <StatusBadge
                                status={night.isPosted ? 'posted' : night.isFuture ? 'future' : 'pending'}
                              />
                            </TableCell>

                            {/* Action */}
                            <TableCell className="text-right">
                              {night.isPending ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => handlePostSingle(night)}
                                  disabled={isPosting}
                                >
                                  {postSingleMutation.isPending &&
                                  postSingleMutation.variables === night.date.toISOString().split('T')[0] ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="size-3" />
                                  )}
                                  Post
                                </Button>
                              ) : (
                                <span className="sr-only">
                                  {night.isPosted ? 'Already posted' : night.isFuture ? 'Future night' : '—'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary Row */}
              <Card className="py-3">
                <CardContent className="px-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <SummaryItem label="Total Nights" value={String(summary.totalNights)} />
                    <SummaryItem
                      label="Total Room Charges"
                      value={formatCurrency(summary.totalRoomCharges)}
                    />
                    <SummaryItem
                      label="Total Tax"
                      value={formatCurrency(summary.totalTax)}
                    />
                    <SummaryItem
                      label="Total Service Charge"
                      value={formatCurrency(summary.totalServiceCharge)}
                    />
                    <Separator orientation="vertical" className="hidden lg:block col-span-0" />
                    <div className="col-span-2 lg:col-span-1 flex flex-col justify-center rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">
                        Grand Total
                      </span>
                      <span className="text-sm font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(summary.grandTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <Separator />
        <DialogFooter className="px-6 py-4 gap-2">
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <X className="size-3.5" />
            Skip for Now
          </Button>
          <Button
            onClick={handlePostAll}
            disabled={summary.allPosted || isPosting || nights.length === 0}
            className={cn(
              'gap-1.5 min-w-[160px]',
              summary.allPosted && 'bg-emerald-600 hover:bg-emerald-600',
            )}
          >
            {postAllMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Posting…
              </>
            ) : summary.allPosted ? (
              <>
                <CheckCircle className="size-4" />
                All Posted ✓
              </>
            ) : (
              <>
                <DollarSign className="size-4" />
                Post All Pending ({summary.pendingCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ReservationSummaryCard({
  reservation,
  nights,
}: {
  reservation: ReservationDetail
  nights: number
}) {
  const guestName = reservation.guest
    ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
    : '—'
  const roomNumber = reservation.room?.number ?? '—'

  return (
    <Card className="py-3 bg-muted/30 border-dashed">
      <CardContent className="px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          {/* Reservation No */}
          <InfoItem icon={<CalendarDays className="size-3.5" />} label="Reservation No." value={reservation.confirmationNo} />

          <Separator orientation="vertical" className="hidden sm:block h-5" />

          {/* Guest Name */}
          <InfoItem label="Guest" value={guestName} />

          <Separator orientation="vertical" className="hidden sm:block h-5" />

          {/* Room */}
          <InfoItem icon={<BedDouble className="size-3.5" />} label="Room" value={roomNumber} />

          <Separator orientation="vertical" className="hidden sm:block h-5" />

          {/* Dates */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium">{formatDate(reservation.checkIn)}</span>
            <ArrowRight className="size-3" />
            <span className="font-medium">{formatDate(reservation.checkOut)}</span>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-5" />

          {/* Nights */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Nights:</span>
            <Badge variant="secondary" className="h-5 text-[10px] font-semibold px-1.5">
              {nights}
            </Badge>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-5" />

          {/* Rate */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Rate/night:</span>
            <span className="font-semibold tabular-nums">{formatCurrency(reservation.roomRate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: 'posted' | 'pending' | 'future' }) {
  switch (status) {
    case 'posted':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] h-5 gap-0.5 px-1.5">
          <CheckCircle className="size-2.5" />
          Posted
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px] h-5 gap-0.5 px-1.5">
          <Clock className="size-2.5" />
          Pending
        </Badge>
      )
    case 'future':
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 text-[10px] h-5 gap-0.5 px-1.5">
          <AlertCircle className="size-2.5" />
          Future
        </Badge>
      )
  }
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xs font-semibold tabular-nums mt-0.5">{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary card skeleton */}
      <Card className="py-3">
        <CardContent className="px-4">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* Summary skeleton */}
      <Card className="py-3">
        <CardContent className="px-4">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 flex-1" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorState() {
  return (
    <Card className="py-6">
      <CardContent className="px-6 text-center space-y-3">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <div>
          <p className="font-medium text-sm">Failed to Load Reservation</p>
          <p className="text-xs text-muted-foreground mt-1">
            Unable to fetch reservation details. Please try again.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
