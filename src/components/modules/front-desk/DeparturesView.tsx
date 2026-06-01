'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  LogOut, BedDouble, Receipt, CreditCard, AlertTriangle, CheckCircle2, ArrowDownRight, Printer,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatTime, formatCurrency, getTodayString } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

interface DepartureGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface DepartureRoom {
  id: string
  number: string
  floor: number
  type: { name: string; code: string }
}

interface DepartureFolio {
  id: string
  balance: number
  status: string
}

interface Departure {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  paidAmount: number
  creditLimit: number
  guest: DepartureGuest
  room: DepartureRoom
  folios: DepartureFolio[]
}

// ─── Component ──────────────────────────────────────────────────────────

export function DeparturesView() {
  const queryClient = useQueryClient()
  const today = getTodayString()
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null)

  // Fetch today's departures (checked_in with checkOut = today)
  const { data, isLoading } = useQuery({
    queryKey: ['departures', today],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'checked_in', checkOutDate: today })
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch departures')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const departures: Departure[] = data?.reservations || []

  // Stats
  const totalDepartures = departures.length
  const checkedOutCount = departures.filter((d) => d.status === 'checked_out').length
  const pendingDepartures = departures.filter((d) => d.status === 'checked_in').length
  const outstandingBalance = departures.reduce((sum, d) => {
    return sum + (d.folios[0]?.balance || 0)
  }, 0)

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_out' }),
      })
      if (!res.ok) throw new Error('Failed to checkout')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures'] })
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setCheckoutDialogOpen(false)
    },
  })

  const handleQuickCheckout = (departure: Departure) => {
    setSelectedDeparture(departure)
    setCheckoutDialogOpen(true)
  }

  const confirmCheckout = () => {
    if (selectedDeparture) {
      checkoutMutation.mutate(selectedDeparture.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Today&apos;s Departures</h2>
        <p className="text-sm text-muted-foreground">
          Guest check-outs scheduled for {formatDate(today)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <LogOut className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDepartures}</p>
              <p className="text-xs text-muted-foreground">Total Departures</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{checkedOutCount}</p>
              <p className="text-xs text-muted-foreground">Checked Out</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <BedDouble className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDepartures}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <CreditCard className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(outstandingBalance)}</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departures List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">Room</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="w-[100px]">Check-out</TableHead>
                <TableHead className="w-[110px] text-right">Folio Balance</TableHead>
                <TableHead className="w-[100px] text-right">Outstanding</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : departures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <LogOut className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                    No departures scheduled for today
                  </TableCell>
                </TableRow>
              ) : (
                departures.map((dep) => {
                  const balance = dep.folios[0]?.balance || 0
                  const hasBalance = balance > 0
                  return (
                    <TableRow key={dep.id}>
                      <TableCell className="font-bold font-mono">{dep.room.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dep.guest.firstName} {dep.guest.lastName}</span>
                          {dep.guest.vipLevel !== 'none' && (
                            <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              VIP
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{dep.confirmationNo}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{formatDate(dep.checkOut)}</div>
                        <div className="text-muted-foreground">{formatTime(dep.checkOut)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn('font-medium', hasBalance ? 'text-red-600' : 'text-green-600')}>
                          {formatCurrency(balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          hasBalance && balance > 1000 ? 'text-red-600' : 'text-muted-foreground',
                        )}>
                          {hasBalance ? formatCurrency(balance) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {dep.status === 'checked_in' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => {/* Review folio - navigate */}}
                              >
                                <Receipt className="size-3 mr-0.5" /> Folio
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => handleQuickCheckout(dep)}
                              >
                                <LogOut className="size-3 mr-0.5" /> Checkout
                              </Button>
                            </>
                          )}
                          {dep.status === 'checked_out' && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Checked Out
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Checkout</DialogTitle>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              {/* Guest & Room Info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">
                  {selectedDeparture.guest.firstName} {selectedDeparture.guest.lastName}
                </p>
                <p className="text-muted-foreground">
                  Room {selectedDeparture.room.number} • {selectedDeparture.confirmationNo}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(selectedDeparture.checkIn)} → {formatDate(selectedDeparture.checkOut)}
                </p>
              </div>

              {/* Folio Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Folio Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Charges:</span>
                    <span className="font-medium">{formatCurrency(selectedDeparture.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payments:</span>
                    <span className="font-medium">{formatCurrency(selectedDeparture.paidAmount)}</span>
                  </div>
                  <Separator className="col-span-2" />
                  <div className="flex justify-between col-span-2">
                    <span className="font-semibold">Outstanding Balance:</span>
                    <span className={cn(
                      'font-bold',
                      (selectedDeparture.folios[0]?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600',
                    )}>
                      {formatCurrency(selectedDeparture.folios[0]?.balance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {(selectedDeparture.folios[0]?.balance || 0) > 0 && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>This guest has an outstanding balance. Please ensure all charges are settled before checkout.</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This will change the reservation status to <strong>Checked Out</strong> and update the room status to <strong>Vacant Dirty</strong> for housekeeping.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmCheckout}
              disabled={checkoutMutation.isPending}
            >
              <LogOut className="size-4 mr-1.5" />
              {checkoutMutation.isPending ? 'Processing...' : 'Confirm Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
