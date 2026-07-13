'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  LogOut, BedDouble, Receipt, CreditCard, AlertTriangle, CheckCircle2, Printer,
  Zap, Eye, Clock, Banknote, Mail, X, ArrowRight, BedSingle, FileText, BookOpen,
  MoreVertical, RefreshCw, Download, Printer as PrinterIcon, Rows3,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { StatusBadge } from '@/components/shared/status-badge'
import { RoomTypeBedBadge } from '@/components/shared/room-type-bed-badge'
import { formatDate, formatTime, formatCurrency, getTodayString } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore, usePreferencesStore, useNavigationStore, useFolioContextStore, useGuestLedgerContextStore } from '@/lib/store'
import { invalidate } from '@/lib/queryKeys'

// ─── Types ──────────────────────────────────────────────────────────────

interface DepartureGuest {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  vipLevel: string
}

interface DepartureRoom {
  id: string
  number: string
  floor: number
  type: { name: string; code: string; bedConfig?: string }
}

interface FolioLineItem {
  id: string
  description: string
  amount: number
  type: 'charge' | 'payment'
  date: string
}

interface DepartureFolio {
  id: string
  balance: number
  status: string
  items?: FolioLineItem[]
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
  room: DepartureRoom | null
  adults?: number
  children?: number
  folios: DepartureFolio[]
}

type LateCheckoutOption = '14:00' | '16:00' | '18:00'
type PaymentMethod = 'cash' | 'card' | 'bank_transfer'

const LATE_CHECKOUT_OPTIONS: Record<LateCheckoutOption, { label: string; surchargePercent: number; timeLabel: string }> = {
  '14:00': { label: '2:00 PM', surchargePercent: 25, timeLabel: '2:00 PM (+25% surcharge)' },
  '16:00': { label: '4:00 PM', surchargePercent: 50, timeLabel: '4:00 PM (+50% surcharge)' },
  '18:00': { label: '6:00 PM', surchargePercent: 100, timeLabel: '6:00 PM (+100% surcharge)' },
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Credit/Debit Card',
  bank_transfer: 'Bank Transfer',
}

// ─── Component ──────────────────────────────────────────────────────────

export function DeparturesView() {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const { preferences } = usePreferencesStore()
  const { navigateTo } = useNavigationStore()
  const today = getTodayString()

  // Dialog states
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [folioDialogOpen, setFolioDialogOpen] = useState(false)
  const [lateCheckoutDialogOpen, setLateCheckoutDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)

  // Selected departure
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null)

  // Late checkout
  const [lateCheckoutOption, setLateCheckoutOption] = useState<LateCheckoutOption>('14:00')

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  // Receipt data
  const [receiptData, setReceiptData] = useState<Departure | null>(null)

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
    queryClient.invalidateQueries({ queryKey: ['departures'] })
  }

  const handlePrint = () => {
    window.print()
  }

  // Fetch today's departures (checked_in with checkOut = today)
  const { data, isLoading } = useQuery({
    queryKey: ['departures', today],
    queryFn: async () => {
      // Fetch both: today's departures AND overdue departures
      const [todayData, overdueData] = await Promise.all([
        apiFetch(`/api/reservations?status=checked_in&checkOutDate=${today}`),
        // Fetch overdue: checked_in with checkOut < today
        apiFetch(`/api/reservations?status=checked_in&checkOutBefore=${today}`),
      ])
      // Merge and deduplicate
      const todayReservations = todayData?.reservations || []
      const overdueReservations = overdueData?.reservations || []
      const seen = new Set<string>()
      const merged = [...todayReservations, ...overdueReservations].filter((r: { id: string }) => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })
      return { reservations: merged }
    },
    refetchInterval: 30000,
  })

  const departures: Departure[] = data?.reservations || []

  // Stats
  const overdueCount = departures.filter((d) => new Date(d.checkOut) < new Date(today)).length
  const todayCount = departures.length - overdueCount
  const totalDepartures = departures.length
  const checkedOutCount = departures.filter((d) => d.status === 'checked_out').length
  const pendingDepartures = departures.filter((d) => d.status === 'checked_in').length
  const outstandingBalance = departures.reduce((sum, d) => {
    return sum + (d.folios[0]?.balance || 0)
  }, 0)

  // Zero-balance pending guests (for express & batch checkout)
  const zeroBalancePending = departures.filter(
    (d) => d.status === 'checked_in' && (d.folios[0]?.balance || 0) === 0,
  )

  // ─── Mutations ─────────────────────────────────────────────────────

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_out' }),
      })
    },
    onSuccess: () => {
      invalidate.afterCheckout(queryClient)
    },
  })

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ folioId, amount, method, reference }: { folioId: string; amount: number; method: PaymentMethod; reference: string }) => {
      return apiFetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment', paymentMethod: method, amount, reference }),
      })
    },
    onSuccess: () => {
      invalidate.afterFolioChange(queryClient)
      setPaymentDialogOpen(false)
      setPaymentAmount('')
      setPaymentReference('')
      toast.success('Payment recorded successfully')
    },
    onError: () => {
      toast.error('Failed to record payment')
    },
  })

  // Late checkout mutation
  const lateCheckoutMutation = useMutation({
    mutationFn: async ({ reservationId, newCheckOut, surcharge }: { reservationId: string; newCheckOut: string; surcharge: number }) => {
      // First get the folio ID for this reservation
      const reservation = departures.find((d) => d.id === reservationId)
      const folioId = reservation?.folios[0]?.id

      const result = await apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkOut: newCheckOut }),
      })
      // Add surcharge to folio
      if (surcharge > 0 && folioId) {
        await apiFetch(`/api/folio/${folioId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'charge',
            transactionType: 'late_checkout',
            description: `Late checkout surcharge (${LATE_CHECKOUT_OPTIONS[lateCheckoutOption].label})`,
            amount: surcharge,
          }),
        })
      }
      return result
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      invalidate.afterFolioChange(queryClient)
      setLateCheckoutDialogOpen(false)
      toast.success('Late checkout request processed successfully')
    },
    onError: () => {
      toast.error('Failed to process late checkout request')
    },
  })

  // Batch checkout mutation
  const batchCheckoutMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = []
      for (let i = 0; i < ids.length; i++) {
        const result = await apiFetch(`/api/reservations/${ids[i]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'checked_out' }),
        })
        results.push(result)
        toast.success(`Checked out ${i + 1} of ${ids.length} rooms...`)
      }
      return results
    },
    onSuccess: (_data, ids) => {
      invalidate.afterCheckout(queryClient)
      toast.success(`Batch checkout complete! ${ids.length} rooms checked out.`)
      toast.info(`${ids.length} rooms marked for housekeeping - Vacant Dirty`)
    },
    onError: () => {
      toast.error('Batch checkout failed. Some rooms may not have been processed.')
    },
  })

  // ─── Handlers ─────────────────────────────────────────────────────

  const getBalance = (dep: Departure) => dep.folios[0]?.balance || 0

  const toggleSelectAll = () => {
    if (selectedIds.size === departures.length && departures.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(departures.map((d) => d.id)))
    }
  }

  const handleExportCSV = () => {
    const headers = ['Room', 'Guest', 'Confirmation', 'Check-Out', 'Balance', 'Status']
    const rows = departures.map((d) => [
      d.room?.number ?? 'Unassigned',
      `${d.guest.firstName} ${d.guest.lastName}`,
      d.confirmationNo,
      d.checkOut,
      String(getBalance(d)),
      d.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'departures.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCheckoutSelected = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    batchCheckoutMutation.mutate(ids)
    setSelectedIds(new Set())
  }

  const handleExpressCheckout = (dep: Departure) => {
    checkoutMutation.mutate(dep.id, {
      onSuccess: () => {
        toast.success(`Express checkout complete for Room ${dep.room?.number ?? 'N/A'}`)
        toast.info(`Room ${dep.room?.number ?? 'N/A'} marked for housekeeping - Vacant Dirty`)
      },
    })
  }

  const handleReviewFolio = (dep: Departure) => {
    setSelectedDeparture(dep)
    setFolioDialogOpen(true)
  }

  const handleNavigateToFolio = (dep: Departure) => {
    useFolioContextStore.getState().setFolioContext({
      reservationId: dep.id,
      guestId: dep.guest?.id || '',
      guestName: `${dep.guest?.firstName || ''} ${dep.guest?.lastName || ''}`.trim(),
      roomNumber: dep.room?.number || '',
      confirmationNo: dep.confirmationNo,
    })
    navigateTo('front-desk', 'folio')
  }

  const handleViewLedger = (dep: Departure) => {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({
      guestId: dep.guest?.id || '',
      guestName: `${dep.guest?.firstName || ''} ${dep.guest?.lastName || ''}`.trim(),
    })
    navigateTo('front-desk', 'guest-ledger')
  }

  const handleFolioSettleCheckout = () => {
    setFolioDialogOpen(false)
    setCheckoutDialogOpen(true)
  }

  const handleQuickCheckout = (dep: Departure) => {
    setSelectedDeparture(dep)
    setCheckoutDialogOpen(true)
  }

  const handleRequestLateCheckout = (dep: Departure) => {
    setSelectedDeparture(dep)
    setLateCheckoutOption('14:00')
    setLateCheckoutDialogOpen(true)
  }

  const handleConfirmLateCheckout = () => {
    if (!selectedDeparture) return
    const option = LATE_CHECKOUT_OPTIONS[lateCheckoutOption]
    const surcharge = Math.round(selectedDeparture.roomRate * option.surchargePercent / 100)

    // Build new checkout datetime with the selected time
    const currentCheckout = new Date(selectedDeparture.checkOut)
    const [hours, minutes] = lateCheckoutOption.split(':').map(Number)
    currentCheckout.setHours(hours, minutes, 0, 0)

    lateCheckoutMutation.mutate({
      reservationId: selectedDeparture.id,
      newCheckOut: currentCheckout.toISOString(),
      surcharge,
    })
  }

  const handleOpenPaymentDialog = () => {
    if (!selectedDeparture) return
    const balance = getBalance(selectedDeparture)
    setPaymentAmount(String(balance))
    setPaymentMethod('cash')
    setPaymentReference('')
    setPaymentDialogOpen(true)
  }

  const handleRecordPayment = () => {
    if (!selectedDeparture) return
    const folioId = selectedDeparture.folios[0]?.id
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

  const confirmCheckout = () => {
    if (!selectedDeparture) return
    const roomNumber = selectedDeparture.room.number
    checkoutMutation.mutate(selectedDeparture.id, {
      onSuccess: () => {
        setCheckoutDialogOpen(false)
        setReceiptData(selectedDeparture)
        setReceiptDialogOpen(true)
        toast.info(`Room ${roomNumber} marked for housekeeping - Vacant Dirty`)
      },
    })
  }

  const handleBatchCheckout = () => {
    const ids = zeroBalancePending.map((d) => d.id)
    if (ids.length === 0) {
      toast.info('No guests with zero balance to batch checkout')
      return
    }
    batchCheckoutMutation.mutate(ids)
  }

  const handlePrintReceipt = () => {
    if (!receiptData) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) { toast.error('Please allow popups to print receipts'); return }
    const guestName = `${receiptData.guest.firstName} ${receiptData.guest.lastName}`
    const roomNum = receiptData.room?.number ?? 'N/A'
    const roomType = receiptData.room?.type?.name ?? ''
    const balance = getBalance(receiptData)
    printWindow.document.write(`
      <html><head><title>Checkout Receipt</title>
      <style>body{font-family:monospace;max-width:350px;margin:0 auto;padding:20px;font-size:12px}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}.green{color:green}.red{color:red}
      h2{margin:0 0 4px}p.sub{margin:0 0 16px;color:#666;font-size:11px}</style></head>
      <body>
      <div class="center"><h2>MERIDIAN HOTEL</h2><p class="sub">Checkout Receipt</p></div>
      <div class="line"></div>
      <div class="row"><span>Guest:</span><span class="bold">${guestName}</span></div>
      <div class="row"><span>Room:</span><span>${roomNum} ${roomType}</span></div>
      <div class="row"><span>Confirmation:</span><span>${receiptData.confirmationNo}</span></div>
      <div class="row"><span>Check-in:</span><span>${formatDate(receiptData.checkIn)}</span></div>
      <div class="row"><span>Check-out:</span><span>${formatDate(receiptData.checkOut)}</span></div>
      <div class="line"></div>
      <div class="row"><span>Room Total:</span><span>${formatCurrency(receiptData.totalAmount)}</span></div>
      <div class="row"><span>Payments:</span><span class="green">-${formatCurrency(receiptData.paidAmount)}</span></div>
      <div class="line"></div>
      <div class="row"><span class="bold">Balance Due:</span><span class="bold ${balance > 0 ? 'red' : 'green'}">${formatCurrency(balance)}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:16px;font-size:10px;color:#999">Thank you for staying with us!</div>
      <script>window.print();window.close();</script>
      </body></html>
    `)
    printWindow.document.close()
    toast.success('Receipt sent to printer')
  }

  const handleEmailReceipt = () => {
    if (!receiptData) return
    const guestEmail = receiptData.guest.email || 'no email on file'
    // In production, this would call an email API
    toast.success(`Receipt emailed to ${guestEmail}`)
  }

  // ─── Computed values ──────────────────────────────────────────────

  const lateCheckoutFee = selectedDeparture
    ? Math.round(selectedDeparture.roomRate * LATE_CHECKOUT_OPTIONS[lateCheckoutOption].surchargePercent / 100)
    : 0

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today&apos;s Departures</h2>
          <p className="text-xs text-muted-foreground">
            {todayCount} scheduled for {formatDate(today)}{overdueCount > 0 && <span className="text-red-600 font-medium"> · {overdueCount} overdue</span>}
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
                <PrinterIcon className="size-4 mr-2" />
                Print List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCompactView((v) => !v)}>
                <Rows3 className="size-4 mr-2" />
                {compactView ? 'Normal View' : 'Compact View'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {zeroBalancePending.length > 0 && (
            <Button
              onClick={handleBatchCheckout}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
              disabled={batchCheckoutMutation.isPending}
            >
              <Zap className="size-4 mr-1.5" />
              {batchCheckoutMutation.isPending
                ? `Processing ${batchCheckoutMutation.submittedAt ? '...' : ''}`
                : `Batch Checkout All Ready (${zeroBalancePending.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Departures List */}
      <div className="relative">
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={departures.length > 0 && selectedIds.size === departures.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[70px]">Room</TableHead>
                  <TableHead className="w-[120px]">Type & Pax</TableHead>
                  <TableHead className="w-[100px]">Check-out</TableHead>
                  <TableHead className="w-[110px] text-right">Balance</TableHead>
                  <TableHead className="w-[90px] text-right">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : departures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      <LogOut className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      No departures scheduled for today
                    </TableCell>
                  </TableRow>
                ) : (
                  departures.map((dep) => {
                    const balance = getBalance(dep)
                    const isPending = dep.status === 'checked_in'
                    const isZeroBalance = balance === 0
                    const isOverdue = new Date(dep.checkOut) < new Date(today)
                    return (
                      <TableRow key={dep.id} className={cn(isOverdue ? 'bg-red-50/50 dark:bg-red-950/20' : '', selectedIds.has(dep.id) && 'bg-primary/5')}>
                        <TableCell className={cn('pl-4', compactView ? 'py-1.5' : '')}>
                          <Checkbox
                            checked={selectedIds.has(dep.id)}
                            onCheckedChange={() => toggleSelect(dep.id)}
                          />
                        </TableCell>
                        {/* Guest */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{dep.guest.firstName} {dep.guest.lastName}</span>
                            {dep.guest.vipLevel !== 'none' && (
                              <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">VIP</Badge>
                            )}
                            {isOverdue && (
                              <Badge className="text-[10px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-0">OVERDUE</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{dep.confirmationNo}</p>
                        </TableCell>
                        {/* Room */}
                        <TableCell className={cn('font-bold font-mono', compactView ? 'py-1.5' : '')}>
                          {dep.room ? dep.room.number : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {/* Type & Pax */}
                        <TableCell>
                          {dep.room ? (
                            <RoomTypeBedBadge typeName={dep.room.type.name} bedConfig={dep.room.type.bedConfig} typeCode={dep.room.type.code} pax={(dep.adults ?? 1) + (dep.children ?? 0)} />
                          ) : null}
                        </TableCell>
                        {/* Check-out */}
                        <TableCell className="text-xs">
                          <div>{formatDate(dep.checkOut)}</div>
                          <div className="text-muted-foreground">{formatTime(dep.checkOut)}</div>
                        </TableCell>
                        {/* Balance */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={cn('font-medium', balance > 0 ? 'text-red-600' : 'text-green-600')}>
                              {formatCurrency(balance)}
                            </span>
                            {isPending && balance > 5000 && (
                              <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 animate-pulse border-0">HIGH</Badge>
                            )}
                            {isPending && balance > 0 && balance <= 5000 && (
                              <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0 border-0">DUE</Badge>
                            )}
                          </div>
                        </TableCell>
                        {/* Status */}
                        <TableCell className="text-right">
                          {dep.status === 'checked_out' ? (
                            <div className="flex items-center justify-end gap-1">
                              <BedSingle className="size-3 text-yellow-500" />
                              <StatusBadge status="vacant_dirty" />
                            </div>
                          ) : (
                            <StatusBadge status="checked_in" />
                          )}
                        </TableCell>
                        {/* Actions - Hamburger */}
                        <TableCell>
                          {isPending ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7" aria-label="Row actions">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {isZeroBalance && (
                                  <DropdownMenuItem onClick={() => handleExpressCheckout(dep)} disabled={checkoutMutation.isPending}>
                                    <Zap className="size-4 mr-2 text-green-600" /> Express Checkout
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleReviewFolio(dep)}>
                                  <Eye className="size-4 mr-2" /> Review Folio
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleNavigateToFolio(dep)}>
                                  <FileText className="size-4 mr-2" /> Full Folio
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewLedger(dep)}>
                                  <BookOpen className="size-4 mr-2" /> View Ledger
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRequestLateCheckout(dep)}>
                                  <Clock className="size-4 mr-2" /> Late Checkout
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleQuickCheckout(dep)} className="text-red-600 focus:text-red-600">
                                  <LogOut className="size-4 mr-2" /> Checkout
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Done
                            </Badge>
                          )}
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
              onClick={handleCheckoutSelected}
              disabled={batchCheckoutMutation.isPending}
            >
              <LogOut className="size-4 mr-1.5" />
              Checkout Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Deselect All
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* ─── Folio Review Dialog ─────────────────────────────────── */}
      <Dialog open={folioDialogOpen} onOpenChange={setFolioDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Folio Review</DialogTitle>
            <DialogDescription>
              {selectedDeparture && (
                <>Room {selectedDeparture.room.number} <RoomTypeBedBadge typeName={selectedDeparture.room.type.name} bedConfig={selectedDeparture.room.type.bedConfig} typeCode={selectedDeparture.room.type.code} pax={(selectedDeparture.adults ?? 1) + (selectedDeparture.children ?? 0)} inline /> — {selectedDeparture.guest.firstName} {selectedDeparture.guest.lastName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              {/* Folio items table */}
              <div className="rounded-lg border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs w-[90px]">Date</TableHead>
                      <TableHead className="text-xs w-[90px] text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Show mock folio items based on reservation data */}
                    <TableRow>
                      <TableCell className="text-sm">Room Charge (<RoomTypeBedBadge typeName={selectedDeparture.room.type.name} bedConfig={selectedDeparture.room.type.bedConfig} typeCode={selectedDeparture.room.type.code} pax={(selectedDeparture.adults ?? 1) + (selectedDeparture.children ?? 0)} inline />)</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(selectedDeparture.checkIn)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-600">
                        {formatCurrency(selectedDeparture.totalAmount)}
                      </TableCell>
                    </TableRow>
                    {selectedDeparture.paidAmount > 0 && (
                      <TableRow>
                        <TableCell className="text-sm">Advance Payment</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(selectedDeparture.checkIn)}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-green-600">
                          -{formatCurrency(selectedDeparture.paidAmount)}
                      </TableCell>
                      </TableRow>
                    )}
                    {(selectedDeparture.folios[0]?.items || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(item.date)}</TableCell>
                        <TableCell className={cn(
                          'text-right text-sm font-medium',
                          item.type === 'charge' ? 'text-red-600' : 'text-green-600',
                        )}>
                          {item.type === 'charge' ? '' : '-'}{formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Charges:</span>
                  <span className="font-medium">{formatCurrency(selectedDeparture.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Payments:</span>
                  <span className="font-medium text-green-600">-{formatCurrency(selectedDeparture.paidAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Outstanding Balance:</span>
                  <span className={cn(
                    getBalance(selectedDeparture) > 0 ? 'text-red-600' : 'text-green-600',
                  )}>
                    {formatCurrency(getBalance(selectedDeparture))}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolioDialogOpen(false)}>Close</Button>
            <Button onClick={handleFolioSettleCheckout}>
              <ArrowRight className="size-4 mr-1.5" />
              Settle &amp; Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Late Checkout Dialog ───────────────────────────────── */}
      <Dialog open={lateCheckoutDialogOpen} onOpenChange={setLateCheckoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Late Checkout</DialogTitle>
            <DialogDescription>
              {selectedDeparture && (
                <>Room {selectedDeparture.room.number} <RoomTypeBedBadge typeName={selectedDeparture.room.type.name} bedConfig={selectedDeparture.room.type.bedConfig} typeCode={selectedDeparture.room.type.code} pax={(selectedDeparture.adults ?? 1) + (selectedDeparture.children ?? 0)} inline /> — {selectedDeparture.guest.firstName} {selectedDeparture.guest.lastName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">Current checkout: {formatTime(selectedDeparture.checkOut)}</p>
                <p className="text-muted-foreground">Room rate: {formatCurrency(selectedDeparture.roomRate)}/night</p>
              </div>

              <RadioGroup value={lateCheckoutOption} onValueChange={(v) => setLateCheckoutOption(v as LateCheckoutOption)}>
                {(Object.entries(LATE_CHECKOUT_OPTIONS) as [LateCheckoutOption, typeof LATE_CHECKOUT_OPTIONS[LateCheckoutOption]][]).map(([key, opt]) => {
                  const fee = Math.round(selectedDeparture.roomRate * opt.surchargePercent / 100)
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                        lateCheckoutOption === key
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50',
                      )}
                      onClick={() => setLateCheckoutOption(key)}
                    >
                      <RadioGroupItem value={key} id={`late-${key}`} />
                      <Label htmlFor={`late-${key}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{opt.timeLabel}</span>
                          <span className="text-sm text-muted-foreground">
                            +{formatCurrency(fee)}
                          </span>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>

              {/* Fee summary */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="size-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300">Late Checkout Fee</p>
                    <p className="text-amber-600 dark:text-amber-400">
                      Extended to {LATE_CHECKOUT_OPTIONS[lateCheckoutOption].label} — Additional charge: <strong>{formatCurrency(lateCheckoutFee)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLateCheckoutDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmLateCheckout}
              disabled={lateCheckoutMutation.isPending}
            >
              <Clock className="size-4 mr-1.5" />
              {lateCheckoutMutation.isPending ? 'Processing...' : 'Confirm Late Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ─────────────────────────────────────── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Balance</DialogTitle>
            <DialogDescription>
              {selectedDeparture && (
                <>Record a payment for Room {selectedDeparture.room.number} — Outstanding: {formatCurrency(getBalance(selectedDeparture))}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount ({preferences.currency})</Label>
              <Input
                id="payment-amount"
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min={1}
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference / Note</Label>
              <Input
                id="payment-reference"
                type="text"
                placeholder="e.g. Transaction ID, Receipt No."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRecordPayment}
              disabled={paymentMutation.isPending}
            >
              <Banknote className="size-4 mr-1.5" />
              {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Checkout Confirmation Dialog ───────────────────────── */}
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
                      getBalance(selectedDeparture) > 0 ? 'text-red-600' : 'text-green-600',
                    )}>
                      {formatCurrency(getBalance(selectedDeparture))}
                    </span>
                  </div>
                </div>
              </div>

              {(getBalance(selectedDeparture)) > 0 && (
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
            {selectedDeparture && getBalance(selectedDeparture) > 0 && (
              <Button variant="outline" onClick={handleOpenPaymentDialog}>
                <CreditCard className="size-4 mr-1.5" />
                Settle Balance
              </Button>
            )}
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

      {/* ─── Checkout Summary Receipt Dialog ────────────────────── */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout Summary</DialogTitle>
            <DialogDescription>Guest checkout receipt</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              {/* Guest & Room */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-semibold">{receiptData.guest.firstName} {receiptData.guest.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">
                    {receiptData.room?.number ?? 'N/A'}
                    {receiptData.room?.type && (
                      <> (<RoomTypeBedBadge typeName={receiptData.room.type.name} bedConfig={receiptData.room.type.bedConfig} typeCode={receiptData.room.type.code} pax={(receiptData.adults ?? 1) + (receiptData.children ?? 0)} inline />)</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span>{formatDate(receiptData.checkIn)} {formatTime(receiptData.checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out:</span>
                  <span>{formatDate(receiptData.checkOut)} {formatTime(receiptData.checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmation:</span>
                  <span className="font-mono text-xs">{receiptData.confirmationNo}</span>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="size-3.5" />
                  Charges Breakdown
                </h4>
                <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Room Charge
                      {receiptData.room?.type && (
                        <> (<RoomTypeBedBadge typeName={receiptData.room.type.name} bedConfig={receiptData.room.type.bedConfig} typeCode={receiptData.room.type.code} pax={(receiptData.adults ?? 1) + (receiptData.children ?? 0)} inline />)</>
                      )}
                    </span>
                    <span>{formatCurrency(receiptData.totalAmount)}</span>
                  </div>
                  {(receiptData.folios[0]?.items || [])
                    .filter((item) => item.type === 'charge')
                    .map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Payments Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <CreditCard className="size-3.5" />
                  Payments
                </h4>
                <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                  {receiptData.paidAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Advance Payment</span>
                      <span className="text-green-600">-{formatCurrency(receiptData.paidAmount)}</span>
                    </div>
                  )}
                  {(receiptData.folios[0]?.items || [])
                    .filter((item) => item.type === 'payment')
                    .map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="text-green-600">-{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Final Balance */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-base font-bold">
                  <span>Final Balance:</span>
                  <span className={cn(
                    getBalance(receiptData) > 0 ? 'text-red-600' : 'text-green-600',
                  )}>
                    {formatCurrency(getBalance(receiptData))}
                  </span>
                </div>
              </div>

              {/* Room Status */}
              <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-3 text-sm">
                <BedSingle className="size-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Room Status: Vacant Dirty — Marked for Housekeeping
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              <X className="size-4 mr-1.5" />
              Close
            </Button>
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Printer className="size-4 mr-1.5" />
              Print Receipt
            </Button>
            <Button onClick={handleEmailReceipt}>
              <Mail className="size-4 mr-1.5" />
              Email Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
