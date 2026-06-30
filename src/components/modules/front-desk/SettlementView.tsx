'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  Wallet, CreditCard, Banknote, CheckCircle, Search, Filter, ArrowRight,
  Smartphone, Building2, Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { formatCurrency, formatDate, nightsBetween } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNavigationStore, useFolioContextStore } from '@/lib/store'
import { invalidate } from '@/lib/queryKeys'

// ─── Types ──────────────────────────────────────────────────────────────

interface SettlementGuest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  vipLevel: string
}

interface SettlementRoom {
  id: string
  number: string
  floor: number
  wing: string
  type: { name: string; code: string; bedConfig?: string }
}

interface SettlementFolio {
  id: string
  balance: number
  status: string
  payments?: { id: string; amount: number; createdAt: string }[]
}

interface InHouseReservation {
  id: string
  confirmationNo: string
  guest: SettlementGuest
  room: SettlementRoom
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  paidAmount: number
  folios: SettlementFolio[]
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet'

type BalanceFilter = 'all' | 'over_10k' | 'over_50k' | 'over_100k'

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="size-4" /> },
  { value: 'card', label: 'Credit/Debit Card', icon: <CreditCard className="size-4" /> },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: <Building2 className="size-4" /> },
  { value: 'digital_wallet', label: 'Digital Wallet', icon: <Smartphone className="size-4" /> },
]

const BALANCE_FILTER_OPTIONS: { value: BalanceFilter; label: string }[] = [
  { value: 'all', label: 'All Balances' },
  { value: 'over_10k', label: 'Over 10K NPR' },
  { value: 'over_50k', label: 'Over 50K NPR' },
  { value: 'over_100k', label: 'Over 100K NPR' },
]

// ─── Helpers ────────────────────────────────────────────────────────────

function getOutstandingBalance(res: InHouseReservation): number {
  return res.folios[0]?.balance ?? (res.totalAmount - res.paidAmount)
}

function getLastPayment(res: InHouseReservation): string | null {
  const payments = res.folios[0]?.payments
  if (!payments || payments.length === 0) return null
  const latest = payments.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  )
  return new Date(latest.createdAt).toLocaleDateString()
}

function getVipBadge(vipLevel: string) {
  if (vipLevel === 'none' || !vipLevel) return null
  const level = vipLevel.charAt(0).toUpperCase() + vipLevel.slice(1)
  return (
    <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">
      {level}
    </Badge>
  )
}

// ─── Component ──────────────────────────────────────────────────────────

export function SettlementView() {
  const queryClient = useQueryClient()
  const { navigateTo } = useNavigationStore()

  // Dialog states
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)

  // Selected reservation for single settle
  const [selectedReservation, setSelectedReservation] = useState<InHouseReservation | null>(null)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')

  // Payment form (single)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  // Batch payment form
  const [batchPaymentMethod, setBatchPaymentMethod] = useState<PaymentMethod>('cash')

  // ─── Data Fetching ──────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', 'checked_in', 'settlement'],
    queryFn: async () => {
      return apiFetch<{ reservations: InHouseReservation[]; total: number }>(
        '/api/reservations?status=checked_in'
      )
    },
    refetchInterval: 30000,
  })

  const reservations: InHouseReservation[] = data?.reservations || []

  // ─── Computed ───────────────────────────────────────────────────────

  const filteredReservations = useMemo(() => {
    let result = reservations.filter((r) => getOutstandingBalance(r) > 0)

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) => {
        const guestName = r.guest ? `${r.guest.firstName} ${r.guest.lastName}`.toLowerCase() : ''
        const roomNumber = r.room ? r.room.number.toLowerCase() : ''
        const confirmationNo = r.confirmationNo.toLowerCase()
        return guestName.includes(q) || roomNumber.includes(q) || confirmationNo.includes(q)
      })
    }

    // Balance filter
    switch (balanceFilter) {
      case 'over_10k':
        result = result.filter((r) => getOutstandingBalance(r) > 10000)
        break
      case 'over_50k':
        result = result.filter((r) => getOutstandingBalance(r) > 50000)
        break
      case 'over_100k':
        result = result.filter((r) => getOutstandingBalance(r) > 100000)
        break
    }

    return result
  }, [reservations, searchQuery, balanceFilter])

  const totalOutstanding = filteredReservations.reduce(
    (sum, r) => sum + getOutstandingBalance(r),
    0
  )
  const guestCount = filteredReservations.length

  // All reservations with outstanding balance (for batch)
  const allOutstanding = reservations.filter((r) => getOutstandingBalance(r) > 0)
  const batchTotalOutstanding = allOutstanding.reduce(
    (sum, r) => sum + getOutstandingBalance(r),
    0
  )

  // ─── Mutations ─────────────────────────────────────────────────────

  // Single payment mutation — uses existing API pattern: POST /api/folio/{folioId}
  const paymentMutation = useMutation({
    mutationFn: async ({
      folioId,
      amount,
      method,
      reference,
    }: {
      folioId: string
      amount: number
      method: PaymentMethod
      reference: string
    }) => {
      return apiFetch(`/api/folio/${folioId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, amount, reference }),
      })
    },
    onSuccess: () => {
      invalidate.afterFolioChange(queryClient)
      setSettleDialogOpen(false)
      setPaymentAmount('')
      setPaymentReference('')
      toast.success('Payment processed successfully')
    },
    onError: () => {
      toast.error('Failed to process payment. Please try again.')
    },
  })

  // Batch settlement mutation
  const batchSettleMutation = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const results: { reservation: InHouseReservation; success: boolean; error?: string }[] = []
      for (let i = 0; i < allOutstanding.length; i++) {
        const res = allOutstanding[i]
        const balance = getOutstandingBalance(res)
        const folioId = res.folios[0]?.id
        if (!folioId) {
          results.push({ reservation: res, success: false, error: 'No folio found' })
          continue
        }
        try {
          await apiFetch(`/api/folio/${folioId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, amount: balance, reference: '' }),
          })
          results.push({ reservation: res, success: true })
          toast.success(`Settled ${i + 1} of ${allOutstanding.length}: Room ${res.room.number}`)
        } catch {
          results.push({ reservation: res, success: false, error: 'Payment failed' })
        }
      }
      return results
    },
    onSuccess: (results) => {
      invalidate.afterFolioChange(queryClient)
      setBatchDialogOpen(false)
      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length
      if (failCount === 0) {
        toast.success(`All ${successCount} accounts settled successfully!`)
      } else {
        toast.warning(`Settled ${successCount} accounts. ${failCount} failed.`)
      }
    },
    onError: () => {
      toast.error('Batch settlement failed. Please try again.')
    },
  })

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleSettleClick = (res: InHouseReservation) => {
    setSelectedReservation(res)
    const balance = getOutstandingBalance(res)
    setPaymentAmount(String(balance))
    setPaymentMethod('cash')
    setPaymentReference('')
    setSettleDialogOpen(true)
  }

  const handleProcessPayment = () => {
    if (!selectedReservation) return
    const folioId = selectedReservation.folios[0]?.id
    if (!folioId) {
      toast.error('No folio found for this reservation')
      return
    }
    const amount = Number(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    paymentMutation.mutate({
      folioId,
      amount,
      method: paymentMethod,
      reference: paymentReference,
    })
  }

  const handleSettleAll = () => {
    if (allOutstanding.length === 0) {
      toast.info('No outstanding balances to settle')
      return
    }
    setBatchPaymentMethod('cash')
    setBatchDialogOpen(true)
  }

  const handleConfirmBatchSettle = () => {
    batchSettleMutation.mutate(batchPaymentMethod)
  }

  const handleViewFolio = (res: InHouseReservation) => {
    useFolioContextStore.getState().setFolioContext({
      reservationId: res.id,
      guestId: res.guest.id,
      guestName: `${res.guest.firstName} ${res.guest.lastName}`.trim(),
      roomNumber: res.room.number,
      confirmationNo: res.confirmationNo,
    })
    navigateTo('front-desk', 'folio')
  }

  // ─── Render ─────────────────────────────────────────────────────────

  const selectedBalance = selectedReservation
    ? getOutstandingBalance(selectedReservation)
    : 0

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Settlement
          </h2>
          <p className="text-xs text-muted-foreground">
            View and settle outstanding guest folio balances
          </p>
        </div>
        {allOutstanding.length > 0 && (
          <Button
            onClick={handleSettleAll}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            <CheckCircle className="size-4 mr-1.5" />
            Settle All ({allOutstanding.length})
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-950">
              <Wallet className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-950">
              <CreditCard className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Guests with Balance</p>
              <p className="text-lg font-bold">{guestCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-green-100 dark:bg-green-950">
              <Banknote className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Avg. Balance</p>
              <p className="text-lg font-bold">
                {guestCount > 0 ? formatCurrency(Math.round(totalOutstanding / guestCount)) : formatCurrency(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="py-0">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, room number, or confirmation..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="size-4 text-muted-foreground" />
            <Select
              value={balanceFilter}
              onValueChange={(v) => setBalanceFilter(v as BalanceFilter)}
            >
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BALANCE_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Accounts Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Room</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell">Confirmation</TableHead>
                  <TableHead className="w-[70px] text-center hidden lg:table-cell">Nights</TableHead>
                  <TableHead className="w-[120px] text-right">Outstanding</TableHead>
                  <TableHead className="w-[100px] text-center hidden md:table-cell">Last Payment</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <Wallet className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      {searchQuery || balanceFilter !== 'all'
                        ? 'No matching accounts found'
                        : 'All accounts are settled'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((res) => {
                    const balance = getOutstandingBalance(res)
                    const nights = res.checkIn && res.checkOut ? nightsBetween(res.checkIn, res.checkOut) : 0
                    const lastPay = getLastPayment(res)
                    return (
                      <TableRow key={res.id}>
                        {/* Room */}
                        <TableCell className="font-bold font-mono">
                          {res.room ? (
                            <>
                              {res.room.number}
                              <RoomTypeBedBadge
                                typeName={res.room.type.name}
                                bedConfig={res.room.type.bedConfig}
                                typeCode={res.room.type.code}
                                inline
                                className="ml-1"
                              />
                            </>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Guest */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'}
                            </span>
                            {res.guest && getVipBadge(res.guest.vipLevel)}
                          </div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {res.confirmationNo}
                          </p>
                        </TableCell>

                        {/* Confirmation */}
                        <TableCell className="text-xs font-mono hidden md:table-cell">
                          {res.confirmationNo}
                        </TableCell>

                        {/* Nights */}
                        <TableCell className="text-center hidden lg:table-cell">
                          <span className="text-sm font-medium">{nights}</span>
                        </TableCell>

                        {/* Outstanding Balance */}
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-semibold',
                            balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600',
                          )}>
                            {formatCurrency(balance)}
                          </span>
                        </TableCell>

                        {/* Last Payment */}
                        <TableCell className="text-center text-xs text-muted-foreground hidden md:table-cell">
                          {lastPay || '—'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleSettleClick(res)}
                            >
                              <Banknote className="size-3 mr-0.5" />
                              Settle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleViewFolio(res)}
                            >
                              <ArrowRight className="size-3 mr-0.5" />
                              <span className="hidden sm:inline">View Folio</span>
                              <span className="sm:hidden">Folio</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Single Settlement Dialog ───────────────────────────────── */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-green-600" />
              Settle Account
            </DialogTitle>
            <DialogDescription>
              Process payment for this guest&apos;s outstanding balance
            </DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="flex flex-col gap-4">
              {/* Guest Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedReservation.guest ? `${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}` : 'Unknown Guest'}
                    {selectedReservation.guest && getVipBadge(selectedReservation.guest.vipLevel)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{selectedReservation.room ? `Room ${selectedReservation.room.number} · ${selectedReservation.room.type.name}` : 'Unassigned Room'}</span>
                  <span className="font-mono">{selectedReservation.confirmationNo}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(selectedBalance)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={paymentMethod === opt.value ? 'default' : 'outline'}
                      className={cn(
                        'h-10 justify-start gap-2 text-sm',
                        paymentMethod === opt.value && 'bg-green-600 hover:bg-green-700 text-white',
                      )}
                      onClick={() => setPaymentMethod(opt.value)}
                    >
                      {opt.icon}
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="settle-amount" className="text-sm font-medium">
                  Amount (NPR)
                </Label>
                <Input
                  id="settle-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-10 text-base font-semibold"
                />
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <Label htmlFor="settle-reference" className="text-sm font-medium">
                  Reference Number <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="settle-reference"
                  placeholder="e.g. REF-123, transaction ID..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSettleDialogOpen(false)}
              disabled={paymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleProcessPayment}
              disabled={paymentMutation.isPending}
            >
              {paymentMutation.isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="size-4 mr-1.5" />
              )}
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Settlement Dialog ───────────────────────────────── */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-600" />
              Settle All Outstanding
            </DialogTitle>
            <DialogDescription>
              Process payments for all {allOutstanding.length} guests with outstanding balances
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Accounts to Settle</span>
                <span className="text-sm font-semibold">{allOutstanding.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Outstanding</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(batchTotalOutstanding)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method (applied to all)</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={batchPaymentMethod === opt.value ? 'default' : 'outline'}
                    className={cn(
                      'h-10 justify-start gap-2 text-sm',
                      batchPaymentMethod === opt.value && 'bg-green-600 hover:bg-green-700 text-white',
                    )}
                    onClick={() => setBatchPaymentMethod(opt.value)}
                  >
                    {opt.icon}
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            {batchSettleMutation.isPending && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <Loader2 className="size-4 animate-spin" />
                  Processing payments... Please wait.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBatchDialogOpen(false)}
              disabled={batchSettleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmBatchSettle}
              disabled={batchSettleMutation.isPending}
            >
              {batchSettleMutation.isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="size-4 mr-1.5" />
              )}
              Settle All — {formatCurrency(batchTotalOutstanding)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}