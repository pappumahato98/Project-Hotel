'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  Wallet, CreditCard, Banknote, CheckCircle, Search, Filter, ArrowRight,
  Smartphone, Building2, Loader2, MoreVertical, RefreshCw, Download, Printer, Rows3,
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
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { formatCurrency, nightsBetween } from '@/lib/format'
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
  folioType: string
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
  return res.folios.reduce((sum, f) => sum + (f.balance > 0 ? f.balance : 0), 0)
    || (res.totalAmount - res.paidAmount)
}

function getLastPayment(res: InHouseReservation): string | null {
  const allPayments = res.folios.flatMap((f) => f.payments || [])
  if (allPayments.length === 0) return null
  const latest = allPayments.reduce((a, b) =>
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
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null)

  // Batch payment form
  const [batchPaymentMethod, setBatchPaymentMethod] = useState<PaymentMethod>('cash')

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [compactView, setCompactView] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations', 'checked_in', 'settlement'] })
  }

// handlePrint defined below after computed values

  // ─── Data Fetching ──────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', 'checked_in', 'settlement'],
    queryFn: async () => {
      return apiFetch<{ reservations: InHouseReservation[]; total: number }>(
        '/api/reservations?status=checked_in'
      )
    },
    refetchInterval: 10000,
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

  // ─── Print ───────────────────────────────────────────────────────

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      toast.error('Please allow pop-ups to print')
      return
    }
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const tableRows = filteredReservations.map((r) => {
      const guestName = r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '—'
      const roomNum = r.room ? r.room.number : '—'
      const balance = getOutstandingBalance(r)
      const lastPay = getLastPayment(r) || '—'
      return `<tr>
        <td>${roomNum}</td>
        <td>${guestName}</td>
        <td>${r.confirmationNo}</td>
        <td style="text-align:right">${formatCurrency(balance)}</td>
        <td>${lastPay}</td>
      </tr>`
    }).join('')
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Settlement List - Meridian Hotel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; padding: 24px; color: #000; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .hotel-name { font-size: 22px; font-weight: bold; letter-spacing: 2px; }
    .title { font-size: 16px; margin-top: 4px; color: #333; }
    .date { font-size: 12px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f5f5f5; border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { border: 1px solid #ddd; padding: 6px 10px; font-size: 12px; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 16px; display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px double #000; font-weight: bold; font-size: 14px; }
    .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 10px; color: #999; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel-name">MERIDIAN HOTEL</div>
    <div class="title">Settlement List</div>
    <div class="date">${dateStr}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Room</th>
        <th>Guest Name</th>
        <th>Confirmation</th>
        <th style="text-align:right">Outstanding Balance</th>
        <th>Last Payment</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="totals">
    <span>Total Guests: ${guestCount}</span>
    <span>Total Outstanding: ${formatCurrency(totalOutstanding)}</span>
  </div>
  <div class="footer">Generated: ${new Date().toLocaleString()}</div>
  <div class="no-print" style="text-align:center;margin-top:12px;">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:2px solid #000;background:#f5f5f5;border-radius:4px;">Print Report</button>
  </div>
  <script>setTimeout(() => { window.print(); }, 500);</script>
</body>
</html>`)
    printWindow.document.close()
  }

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
      return apiFetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment', paymentMethod: method, amount, reference }),
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

  // Batch settlement mutation — settles each folio individually
  const batchSettleMutation = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const results: { reservation: InHouseReservation; success: boolean; error?: string }[] = []
      for (let i = 0; i < allOutstanding.length; i++) {
        const res = allOutstanding[i]
        // Process each folio with a positive balance
        const foliosToSettle = res.folios.filter((f) => f.balance > 0)
        if (foliosToSettle.length === 0) {
          results.push({ reservation: res, success: false, error: 'No folio with balance found' })
          continue
        }
        let allSuccess = true
        for (const folio of foliosToSettle) {
          try {
            await apiFetch(`/api/folio/${folio.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'payment', paymentMethod: method, amount: folio.balance, reference: '' }),
            })
          } catch {
            allSuccess = false
          }
        }
        if (allSuccess) {
          results.push({ reservation: res, success: true })
          toast.success(`Settled ${i + 1} of ${allOutstanding.length}: Room ${res.room.number}`)
        } else {
          results.push({ reservation: res, success: false, error: 'Payment failed on one or more folios' })
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
    // Default to the first folio with a positive balance, or the first folio
    const folioWithBalance = res.folios.find((f) => f.balance > 0) || res.folios[0]
    setSelectedFolioId(folioWithBalance?.id || null)
    const balance = folioWithBalance?.balance ?? getOutstandingBalance(res)
    setPaymentAmount(String(balance))
    setPaymentMethod('cash')
    setPaymentReference('')
    setSettleDialogOpen(true)
  }

  const handleProcessPayment = () => {
    if (!selectedReservation) return
    const folioId = selectedFolioId || selectedReservation.folios[0]?.id
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReservations.length && filteredReservations.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredReservations.map((r) => r.id)))
    }
  }

  const handleExportCSV = () => {
    const headers = ['Room', 'Guest', 'Confirmation', 'Nights', 'Outstanding', 'Last Payment']
    const rows = filteredReservations.map((r) => [
      r.room?.number ?? 'Unassigned',
      r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '—',
      r.confirmationNo,
      String(r.checkIn && r.checkOut ? nightsBetween(r.checkIn, r.checkOut) : 0),
      String(getOutstandingBalance(r)),
      getLastPayment(r) || '—',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'settlement.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSettleSelected = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    // Open settle dialog for first selected
    const first = filteredReservations.find((r) => r.id === ids[0])
    if (first) {
      setSelectedReservation(first)
      const balance = getOutstandingBalance(first)
      setPaymentAmount(String(balance))
      setPaymentMethod('cash')
      setPaymentReference('')
      setSettleDialogOpen(true)
    }
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
    ? (selectedFolioId
        ? selectedReservation.folios.find((f) => f.id === selectedFolioId)?.balance ?? 0
        : getOutstandingBalance(selectedReservation))
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
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-8" aria-label="Actions menu">
                <MoreVertical className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRefresh}>
                <RefreshCw className="size-4 mr-2" />
                Refresh Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="size-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="size-4 mr-2" />
                Print List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCompactView((v) => !v)}>
                <Rows3 className="size-4 mr-2" />
                {compactView ? 'Normal View' : 'Compact View'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <div className="relative">
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={filteredReservations.length > 0 && selectedIds.size === filteredReservations.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[70px]">Room</TableHead>
                  <TableHead className="w-[120px]">Type & Pax</TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell">Confirmation</TableHead>
                  <TableHead className="w-[70px] text-center hidden lg:table-cell">Nights</TableHead>
                  <TableHead className="w-[120px] text-right">Outstanding</TableHead>
                  <TableHead className="w-[100px] text-center hidden md:table-cell">Last Payment</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
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
                      <TableRow key={res.id} className={selectedIds.has(res.id) ? 'bg-primary/5' : ''}>
                        <TableCell className={cn('pl-4', compactView ? 'py-1.5' : '')}>
                          <Checkbox
                            checked={selectedIds.has(res.id)}
                            onCheckedChange={() => toggleSelect(res.id)}
                          />
                        </TableCell>
                        {/* Guest */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">
                              {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : '—'}
                            </span>
                            {res.guest && getVipBadge(res.guest.vipLevel)}
                          </div>
                          <p className="text-xs text-muted-foreground md:hidden font-mono">
                            {res.confirmationNo}
                          </p>
                        </TableCell>
                        {/* Room */}
                        <TableCell className={cn('font-bold font-mono', compactView ? 'py-1.5' : '')}>
                          {res.room ? res.room.number : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {/* Type & Pax */}
                        <TableCell>
                          {res.room ? (
                            <RoomTypeBedBadge
                              typeName={res.room.type.name}
                              bedConfig={res.room.type.bedConfig}
                              typeCode={res.room.type.code}
                              pax={res.adults + res.children}
                            />
                          ) : null}
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

                        {/* Actions - Hamburger */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7" aria-label="Row actions">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => handleSettleClick(res)}>
                                <Banknote className="size-4 mr-2 text-green-600" /> Settle Account
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewFolio(res)}>
                                <ArrowRight className="size-4 mr-2" /> View Folio
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border bg-background p-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSettleSelected}
            >
              <Banknote className="size-4 mr-1.5" />
              Settle Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Deselect All
            </Button>
          </div>
        </div>
      )}
      </div>

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

                {/* Folio selector when multiple folios exist */}
                {selectedReservation.folios.length > 1 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Settle Folio</Label>
                      <Select value={selectedFolioId || ''} onValueChange={(v) => {
                        setSelectedFolioId(v)
                        const f = selectedReservation.folios.find((f) => f.id === v)
                        if (f) setPaymentAmount(String(f.balance))
                      }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select folio..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedReservation.folios
                            .filter((f) => f.balance > 0)
                            .map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                <span className="capitalize">{f.folioType}</span>
                                <span className="text-muted-foreground"> — {formatCurrency(f.balance)}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedReservation.folios.length > 1 ? 'Selected Folio Balance' : 'Outstanding Balance'}
                  </span>
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