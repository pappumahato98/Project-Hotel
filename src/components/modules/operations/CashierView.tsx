'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import { formatNPR } from '@/lib/nepal-standards'
import {
  Banknote, Clock, User, ArrowDownRight, ArrowUpRight, FileText,
  Loader2, AlertTriangle, CreditCard, Building, Wallet,
  CircleDot, XCircle, MoreVertical, ChevronDown, ChevronRight,
  Receipt, Printer, Download, FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────
interface ShiftRecord {
  id: string
  sessionNo: number
  cashierName: string
  cashierId: string | null
  shiftType: string
  startDate: string
  endDate: string | null
  openingFloat: number
  closingFloat: number | null
  totalPayments: number
  totalRefunds: number
  variance: number
  transactionCount: number
  status: string
}

interface CashierSummaryBreakdown {
  cash: { count: number; amount: number }
  card: { count: number; amount: number }
  bankTransfer: { count: number; amount: number }
  other: { count: number; amount: number }
}

interface CashierData {
  activeShift: ShiftRecord | null
  shiftHistory: ShiftRecord[]
  summary: CashierSummaryBreakdown
}

interface BankDetail {
  name: string
  count: number
  amount: number
}

interface PaymentBreakdown {
  cash: { count: number; amount: number }
  cheque: { count: number; amount: number }
  bank: { total: number; count: number; details: BankDetail[] }
  wallet: { total: number; count: number; details: BankDetail[] }
  card: { total: number; count: number; details: BankDetail[] }
  others: { total: number; count: number; details: BankDetail[] }
  transactions: { type: string; count: number; amount: number; total: number }[]
  grandTotal: number
  totalTxnCount: number
  totalPayCount: number
}

// ─── Helpers ────────────────────────────────────────────────────
function formatTime(date: string): string {
  return format(new Date(date), 'hh:mm a')
}

function formatSessionNo(no: number): string {
  return `CS-${String(no).padStart(3, '0')}`
}

function shiftTypeLabel(type: string) {
  switch (type) {
    case 'morning': return 'Morning'
    case 'evening': return 'Evening'
    case 'night': return 'Night'
    default: return type
  }
}

function varianceClass(variance: number) {
  if (variance > 0) return 'text-green-600 dark:text-green-400'
  if (variance < 0) return 'text-red-600 dark:text-red-400'
  return 'text-muted-foreground'
}

function varianceIcon(variance: number) {
  if (variance > 0) return <ArrowUpRight className="h-3 w-3 inline" />
  if (variance < 0) return <ArrowDownRight className="h-3 w-3 inline" />
  return <CircleDot className="h-3 w-3 inline" />
}

// ─── Skeleton Loader ───────────────────────────────────────────
function CashierSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

// ─── Expandable Row Component ──────────────────────────────────
function ExpandedBreakdown({ breakdown, isLoading }: { breakdown: PaymentBreakdown | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={10} className="bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading breakdown...</span>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (!breakdown) {
    return (
      <TableRow>
        <TableCell colSpan={10} className="bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">No breakdown data available.</p>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={10} className="bg-muted/30 p-0">
        <div className="px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Cash */}
            <BreakdownCard
              title="Cash"
              icon={Banknote}
              count={breakdown.cash.count}
              amount={breakdown.cash.amount}
              color="text-green-600"
              bg="bg-green-50 dark:bg-green-950/30"
            />

            {/* Cheque */}
            <BreakdownCard
              title="Cheque"
              icon={FileText}
              count={breakdown.cheque.count}
              amount={breakdown.cheque.amount}
              color="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-950/30"
            />

            {/* Bank Transfer */}
            <BreakdownGroupCard
              title="Bank Transfer"
              icon={Building}
              total={breakdown.bank.total}
              count={breakdown.bank.count}
              details={breakdown.bank.details}
              color="text-blue-600"
              bg="bg-blue-50 dark:bg-blue-950/30"
            />

            {/* Wallet */}
            <BreakdownGroupCard
              title="Wallet"
              icon={Wallet}
              total={breakdown.wallet.total}
              count={breakdown.wallet.count}
              details={breakdown.wallet.details}
              color="text-purple-600"
              bg="bg-purple-50 dark:bg-purple-950/30"
            />

            {/* Card Pay */}
            <BreakdownGroupCard
              title="Card Pay"
              icon={CreditCard}
              total={breakdown.card.total}
              count={breakdown.card.count}
              details={breakdown.card.details}
              color="text-cyan-600"
              bg="bg-cyan-50 dark:bg-cyan-950/30"
            />

            {/* Others */}
            <BreakdownGroupCard
              title="Others"
              icon={Receipt}
              total={breakdown.others.total}
              count={breakdown.others.count}
              details={breakdown.others.details}
              color="text-orange-600"
              bg="bg-orange-50 dark:bg-orange-950/30"
            />
          </div>

          {/* Summary footer */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3">
            <div className="text-xs text-muted-foreground">
              Total Transactions: <span className="font-mono font-semibold text-foreground">{breakdown.totalTxnCount}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Payments: <span className="font-mono font-semibold text-foreground">{breakdown.totalPayCount}</span>
            </div>
            <div className="ml-auto text-xs font-semibold">
              Grand Total: <span className="font-mono text-green-600">{formatNPR(breakdown.grandTotal)}</span>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function BreakdownCard({
  title, icon: Icon, count, amount, color, bg,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  amount: number
  color: string
  bg: string
}) {
  return (
    <div className={cn('rounded-lg border p-3', bg)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <p className={cn('mt-1 font-mono text-sm font-bold', color)}>{formatNPR(amount)}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{count} payment{count !== 1 ? 's' : ''}</p>
    </div>
  )
}

function BreakdownGroupCard({
  title, icon: Icon, total, count, details, color, bg,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  total: number
  count: number
  details: BankDetail[]
  color: string
  bg: string
}) {
  return (
    <div className={cn('rounded-lg border p-3', bg)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <p className={cn('mt-1 font-mono text-sm font-bold', color)}>{formatNPR(total)}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{count} payment{count !== 1 ? 's' : ''}</p>
      {details.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {details.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-mono font-medium">{formatNPR(d.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function CashierView() {
  const queryClient = useQueryClient()
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportType, setReportType] = useState<'X' | 'Z'>('X')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<CashierData>({
    queryKey: ['operations', 'cashier'],
    queryFn: async () => {
      const json = await apiFetch<{ cashier: CashierData }>('/api/operations')
      return json.cashier
    },
  })

  // Fetch breakdown for expanded row
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery<{ breakdown: PaymentBreakdown }>({
    queryKey: ['cashier-breakdown', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return { breakdown: {} as PaymentBreakdown }
      return apiFetch<{ breakdown: PaymentBreakdown }>(`/api/cashier-shift/${expandedRowId}/breakdown`)
    },
    enabled: !!expandedRowId,
    staleTime: 60000,
  })

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-shift' }),
      })
    },
    onSuccess: () => {
      toast.success('Shift closed successfully')
      invalidate.afterAudit(queryClient)
      setCloseDialogOpen(false)
    },
    onError: () => {
      toast.error('Failed to close shift')
    },
  })

  const handleRowDoubleClick = useCallback((shiftId: string) => {
    setExpandedRowId((prev) => (prev === shiftId ? null : shiftId))
  }, [])

  if (isLoading) return <CashierSkeleton />
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load cashier data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  const { activeShift, shiftHistory, summary } = data
  const hasActiveShift = activeShift !== null
  const expectedClosing = hasActiveShift
    ? activeShift.openingFloat + activeShift.totalPayments - activeShift.totalRefunds
    : 0

  const openReport = (type: 'X' | 'Z') => {
    setReportType(type)
    setReportDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── Active Shift Card ─────────────────────────────────── */}
      {hasActiveShift ? (
        <Card className="border-amber-200 dark:border-amber-800 py-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Banknote className="h-4 w-4 text-amber-600" />
                Active Shift
              </CardTitle>
              <Badge
                className={
                  activeShift.status === 'open'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }
                variant="outline"
              >
                {activeShift.status === 'open' ? '● Active' : 'Closed'}
              </Badge>
            </div>
            <CardDescription className="text-xs">Current cashier shift information</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Session</p>
                <p className="font-mono text-xs font-semibold">{formatSessionNo(activeShift.sessionNo)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Cashier</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium">{activeShift.cashierName}</p>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Shift Type</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium capitalize">{shiftTypeLabel(activeShift.shiftType)}</p>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Start Time</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium">{formatTime(activeShift.startDate)}</p>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">Opening Float</p>
                <p className="font-mono text-xs font-medium">{formatNPR(activeShift.openingFloat)}</p>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-green-50 p-2 dark:bg-green-950/30">
                <p className="text-[11px] text-green-700 dark:text-green-400">Total Payments</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-green-700 dark:text-green-400">
                  {formatNPR(activeShift.totalPayments)}
                </p>
              </div>
              <div className="rounded-md bg-red-50 p-2 dark:bg-red-950/30">
                <p className="text-[11px] text-red-700 dark:text-red-400">Total Refunds</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-red-700 dark:text-red-400">
                  {formatNPR(activeShift.totalRefunds)}
                </p>
              </div>
              <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/30">
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Expected Closing</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {formatNPR(expectedClosing)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => openReport('X')}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                X Report
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => openReport('Z')}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Z Report
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setCloseDialogOpen(true)}
                disabled={activeShift.status !== 'open'}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Close Shift
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted py-0">
          <CardContent className="flex items-center gap-2 p-4">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No active cashier shift</p>
          </CardContent>
        </Card>
      )}

      {/* ── Cashier Summary ──────────────────────────────────── */}
      <div>
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Summary
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <PaymentCard
            icon={Banknote}
            label="Cash"
            count={summary.cash.count}
            amount={summary.cash.amount}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-950/30"
          />
          <PaymentCard
            icon={CreditCard}
            label="Card"
            count={summary.card.count}
            amount={summary.card.amount}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <PaymentCard
            icon={Building}
            label="Bank Transfer"
            count={summary.bankTransfer.count}
            amount={summary.bankTransfer.amount}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-950/30"
          />
          <PaymentCard
            icon={Wallet}
            label="Other"
            count={summary.other.count}
            amount={summary.other.amount}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
        </div>
      </div>

      {/* ── Shift History Table ───────────────────────────────── */}
      <Card className="py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Shift History</CardTitle>
          <CardDescription className="text-xs">Double-click any row to view payment breakdown details</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {shiftHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Banknote className="mb-1.5 h-8 w-8 opacity-30" />
              <p className="text-xs">No shift records found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow>
                    <TableHead className="w-8 text-xs">{' '}</TableHead>
                    <TableHead className="text-xs">Session</TableHead>
                    <TableHead className="text-xs">Cashier</TableHead>
                    <TableHead className="text-xs">Shift</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs">Start</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs">End</TableHead>
                    <TableHead className="text-right text-xs">Opening</TableHead>
                    <TableHead className="text-right text-xs">Transaction</TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-xs">Float In</TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-xs">Float Out</TableHead>
                    <TableHead className="text-right text-xs">Variance</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftHistory.map((shift) => {
                    const isExpanded = expandedRowId === shift.id
                    return (
                      <>
                        <TableRow
                          key={shift.id}
                          className={cn(
                            'cursor-pointer select-none transition-colors hover:bg-muted/50',
                            isExpanded && 'bg-muted/30'
                          )}
                          onDoubleClick={() => handleRowDoubleClick(shift.id)}
                        >
                          <TableCell className="w-8 p-1">
                            <button
                              className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowDoubleClick(shift.id)
                              }}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                            </button>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold">{formatSessionNo(shift.sessionNo)}</TableCell>
                          <TableCell className="text-xs font-medium">{shift.cashierName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {shiftTypeLabel(shift.shiftType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {shift.startDate ? format(new Date(shift.startDate), 'MMM dd, hh:mm a') : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {shift.endDate ? format(new Date(shift.endDate), 'MMM dd, hh:mm a') : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {formatNPR(shift.openingFloat)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {shift.transactionCount}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-xs font-mono text-green-600">
                            {formatNPR(shift.totalPayments)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-xs font-mono text-red-600">
                            {formatNPR(shift.totalRefunds)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className={cn('inline-flex items-center gap-0.5 text-xs font-mono', varianceClass(shift.variance))}>
                              {varianceIcon(shift.variance)}
                              {formatNPR(Math.abs(shift.variance))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge
                                className={
                                  shift.status === 'open'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-muted text-muted-foreground'
                                }
                                variant="outline"
                              >
                                {shift.status === 'open' ? 'Open' : 'Closed'}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setReportType('Z')
                                      setReportDialogOpen(true)
                                    }}
                                  >
                                    <FileText className="mr-2 h-3.5 w-3.5" />
                                    Cashier Report
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRowDoubleClick(shift.id)}>
                                    <Receipt className="mr-2 h-3.5 w-3.5" />
                                    Payment Breakdown
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Printer className="mr-2 h-3.5 w-3.5" />
                                    Print Shift
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-3.5 w-3.5" />
                                    Export PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                    Export Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <ExpandedBreakdown
                            breakdown={breakdownData?.breakdown}
                            isLoading={breakdownLoading}
                          />
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ── Close Shift Dialog ────────────────────────────────── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift — {activeShift?.cashierName ?? ''}</DialogTitle>
            <DialogDescription>
              Confirm closing the current {activeShift ? shiftTypeLabel(activeShift.shiftType) : ''} shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening Float</span>
              <span className="font-mono font-medium">{formatNPR(activeShift?.openingFloat ?? 0)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Total Payments (Float In)</span>
              <span className="font-mono font-medium">+ {formatNPR(activeShift?.totalPayments ?? 0)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Total Refunds (Float Out)</span>
              <span className="font-mono font-medium">- {formatNPR(activeShift?.totalRefunds ?? 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Expected Closing Float</span>
              <span className="font-mono">{formatNPR(expectedClosing)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => closeShiftMutation.mutate()}
              disabled={closeShiftMutation.isPending}
            >
              {closeShiftMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                'Close Shift'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Dialog ────────────────────────────────────── */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <FileText className="h-4 w-4" />
              {reportType} Report — {activeShift?.cashierName ?? 'N/A'}
            </DialogTitle>
            <DialogDescription>
              {reportType === 'X'
                ? 'Interim reading of the current shift totals (does not reset counters)'
                : 'Final reading of the current shift totals (resets counters)'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="payments" className="flex-1">Payments</TabsTrigger>
              <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-2 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cash Payments</span>
                <span className="font-mono">{formatNPR(summary.cash.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Card Payments</span>
                <span className="font-mono">{formatNPR(summary.card.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bank Transfers</span>
                <span className="font-mono">{formatNPR(summary.bankTransfer.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Other</span>
                <span className="font-mono">{formatNPR(summary.other.amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs font-bold">
                <span>Total</span>
                <span className="font-mono">{formatNPR(activeShift?.totalPayments ?? 0)}</span>
              </div>
            </TabsContent>
            <TabsContent value="summary" className="mt-2 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Transactions</span>
                <span className="font-mono">{summary.cash.count + summary.card.count + summary.bankTransfer.count + summary.other.count}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Opening Float</span>
                <span className="font-mono">{formatNPR(activeShift?.openingFloat ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Payments (Float In)</span>
                <span className="font-mono text-green-600">{formatNPR(activeShift?.totalPayments ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Refunds (Float Out)</span>
                <span className="font-mono text-red-600">{formatNPR(activeShift?.totalRefunds ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs font-bold">
                <span>Expected Cash Position</span>
                <span className="font-mono">{formatNPR(expectedClosing)}</span>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Payment Card Sub-Component ──────────────────────────────────
function PaymentCard({
  icon: Icon,
  label,
  count,
  amount,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  amount: number
  color: string
  bg: string
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold font-mono truncate">{formatNPR(amount)}</p>
            <p className="text-[11px] text-muted-foreground">{count} transactions</p>
          </div>
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', bg)}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
