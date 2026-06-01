'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  BedDouble, CreditCard, AlertTriangle, Crown, Receipt, ArrowRightLeft, Plus, CalendarPlus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────

interface InHouseGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface InHouseRoom {
  id: string
  number: string
  floor: number
  type: { name: string; code: string }
}

interface InHouseFolio {
  id: string
  balance: number
  status: string
}

interface InHouseReservation {
  id: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  creditLimit: number
  status: string
  guest: InHouseGuest
  room: InHouseRoom
  folios: InHouseFolio[]
}

// ─── Component ──────────────────────────────────────────────────────────

export function InHouseView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<InHouseReservation | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Charge form
  const [chargeType, setChargeType] = useState('miscellaneous')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')

  // Fetch in-house reservations
  const { data, isLoading } = useQuery({
    queryKey: ['in-house'],
    queryFn: async () => {
      const res = await fetch('/api/reservations?status=checked_in')
      if (!res.ok) throw new Error('Failed to fetch in-house guests')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const reservations: InHouseReservation[] = data?.reservations || []

  // Stats
  const totalGuests = reservations.length
  const vipCount = reservations.filter((r) => r.guest.vipLevel && r.guest.vipLevel !== 'none').length
  const creditWarnings = reservations.filter((r) => {
    const balance = r.folios[0]?.balance || 0
    return balance >= r.creditLimit * 0.8 && balance < r.creditLimit
  }).length
  const creditBreaches = reservations.filter((r) => {
    const balance = r.folios[0]?.balance || 0
    return balance >= r.creditLimit
  }).length

  // Post charge mutation
  const postChargeMutation = useMutation({
    mutationFn: async ({
      folioId, transactionType, description, amount,
    }: {
      folioId: string; transactionType: string; description: string; amount: number
    }) => {
      const taxRate = 0.13
      const taxAmount = amount * taxRate
      const totalAmount = amount + taxAmount

      const res = await fetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'charge',
          transactionType,
          description,
          amount,
          taxAmount,
          totalAmount,
        }),
      })
      if (!res.ok) throw new Error('Failed to post charge')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-house'] })
      setChargeDialogOpen(false)
      setChargeDesc('')
      setChargeAmount('')
      setChargeType('miscellaneous')
    },
  })

  const handlePostCharge = (reservation: InHouseReservation) => {
    setSelectedReservation(reservation)
    setChargeDialogOpen(true)
  }

  const submitCharge = () => {
    if (!selectedReservation || !chargeAmount || !chargeDesc) return
    const folio = selectedReservation.folios[0]
    if (!folio) return
    postChargeMutation.mutate({
      folioId: folio.id,
      transactionType: chargeType,
      description: chargeDesc,
      amount: parseFloat(chargeAmount),
    })
  }

  const getCreditStatus = (reservation: InHouseReservation) => {
    const balance = reservation.folios[0]?.balance || 0
    const pct = (balance / reservation.creditLimit) * 100
    if (pct >= 100) return { status: 'breach', pct, color: 'text-red-600' }
    if (pct >= 80) return { status: 'warning', pct, color: 'text-amber-600' }
    return { status: 'ok', pct, color: 'text-green-600' }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">In-House Guests</h2>
        <p className="text-sm text-muted-foreground">
          Currently checked-in guests and their folio status
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <BedDouble className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGuests}</p>
              <p className="text-xs text-muted-foreground">In-House</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Crown className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vipCount}</p>
              <p className="text-xs text-muted-foreground">VIP Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{creditWarnings}</p>
              <p className="text-xs text-muted-foreground">Credit Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <CreditCard className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{creditBreaches}</p>
              <p className="text-xs text-muted-foreground">Credit Breaches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In-House Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">Room</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="w-[100px]">Check-in</TableHead>
                <TableHead className="w-[100px]">Check-out</TableHead>
                <TableHead className="w-[110px] text-right">Folio Balance</TableHead>
                <TableHead className="w-[130px]">Credit Limit</TableHead>
                <TableHead className="w-[50px]">VIP</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <BedDouble className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                    No in-house guests currently
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((res) => {
                  const credit = getCreditStatus(res)
                  const balance = res.folios[0]?.balance || 0
                  return (
                    <>
                      <TableRow
                        key={res.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === res.id ? null : res.id)}
                      >
                        <TableCell className="font-bold font-mono">{res.room.number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{res.guest.firstName} {res.guest.lastName}</span>
                            {res.guest.vipLevel !== 'none' && (
                              <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                VIP
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(res.checkIn)}</TableCell>
                        <TableCell className="text-xs">{formatDate(res.checkOut)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-medium', credit.color)}>
                            {formatCurrency(balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(credit.pct, 100)}
                              className={cn(
                                'h-2 w-16',
                                credit.status === 'breach' && '[&>div]:bg-red-500',
                                credit.status === 'warning' && '[&>div]:bg-amber-500',
                                credit.status === 'ok' && '[&>div]:bg-green-500',
                              )}
                            />
                            <span className={cn('text-xs font-medium', credit.color)}>
                              {Math.round(credit.pct)}%
                            </span>
                            {credit.status === 'breach' && (
                              <AlertTriangle className="size-3.5 text-red-500" />
                            )}
                            {credit.status === 'warning' && (
                              <AlertTriangle className="size-3.5 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {res.guest.vipLevel !== 'none' ? (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              <Crown className="size-3 mr-0.5" />
                              {res.guest.vipLevel.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handlePostCharge(res)}
                            >
                              <Plus className="size-3 mr-0.5" /> Post Charge
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => navigateTo('front-desk', 'folio')}
                            >
                              <Receipt className="size-3 mr-0.5" /> Folio
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Row */}
                      {expandedRow === res.id && (
                        <TableRow key={`${res.id}-expanded`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Confirmation</p>
                                <p className="font-mono font-medium">{res.confirmationNo}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Room Type</p>
                                <p className="font-medium">{res.room.type.name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Rate</p>
                                <p className="font-medium">{formatCurrency(res.roomRate)}/night</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Folio Balance</p>
                                <p className={cn('font-bold', credit.color)}>{formatCurrency(balance)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Credit Limit</p>
                                <p>{formatCurrency(res.creditLimit)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Folio Status</p>
                                <StatusBadge status={res.folios[0]?.status || 'open'} />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Post Charge Dialog */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Charge</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{selectedReservation.guest.firstName} {selectedReservation.guest.lastName}</p>
                <p className="text-muted-foreground">Room {selectedReservation.room.number} • {selectedReservation.confirmationNo}</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Charge Type</Label>
                  <Select value={chargeType} onValueChange={setChargeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="f_and_b">Food & Beverage</SelectItem>
                      <SelectItem value="laundry">Laundry</SelectItem>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="minibar">Minibar</SelectItem>
                      <SelectItem value="business_center">Business Center</SelectItem>
                      <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description *</Label>
                  <Input
                    placeholder="Charge description"
                    value={chargeDesc}
                    onChange={(e) => setChargeDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount (NPR) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                  />
                  {chargeAmount && parseFloat(chargeAmount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tax (13%): {formatCurrency(parseFloat(chargeAmount) * 0.13)} • Total: {formatCurrency(parseFloat(chargeAmount) * 1.13)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitCharge}
              disabled={!chargeDesc || !chargeAmount || parseFloat(chargeAmount) <= 0 || postChargeMutation.isPending}
            >
              {postChargeMutation.isPending ? 'Posting...' : 'Post Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
