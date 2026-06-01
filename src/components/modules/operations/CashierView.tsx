'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Banknote, Clock, User, ArrowDownRight, ArrowUpRight, FileText,
  Loader2, AlertTriangle, CreditCard, Building, Wallet,
  CircleDot, XCircle,
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

// ─── Types ──────────────────────────────────────────────────────
interface ShiftRecord {
  id: string
  cashierName: string
  shiftType: string
  startDate: string
  endDate: string | null
  openingFloat: number
  closingFloat: number | null
  totalPayments: number
  totalRefunds: number
  variance: number
  status: string
}

interface CashierSummaryBreakdown {
  cash: { count: number; amount: number }
  card: { count: number; amount: number }
  bankTransfer: { count: number; amount: number }
  other: { count: number; amount: number }
}

interface CashierData {
  activeShift: ShiftRecord
  shiftHistory: ShiftRecord[]
  summary: CashierSummaryBreakdown
}

// ─── Helpers ────────────────────────────────────────────────────
function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

function formatTime(date: string): string {
  return format(new Date(date), 'hh:mm a')
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
    <div className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function CashierView() {
  const queryClient = useQueryClient()
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportType, setReportType] = useState<'X' | 'Z'>('X')

  const { data, isLoading, isError } = useQuery<CashierData>({
    queryKey: ['operations', 'cashier'],
    queryFn: async () => {
      const res = await fetch('/api/operations')
      if (!res.ok) throw new Error('Failed to fetch cashier data')
      const json = await res.json()
      return json.cashier
    },
  })

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-shift' }),
      })
      if (!res.ok) throw new Error('Failed to close shift')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Shift closed successfully')
      queryClient.invalidateQueries({ queryKey: ['operations'] })
      setCloseDialogOpen(false)
    },
    onError: () => {
      toast.error('Failed to close shift')
    },
  })

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
  const expectedClosing =
    activeShift.openingFloat +
    activeShift.totalPayments -
    activeShift.totalRefunds

  const openReport = (type: 'X' | 'Z') => {
    setReportType(type)
    setReportDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Active Shift Card ─────────────────────────────────── */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-5 w-5 text-amber-600" />
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
          <CardDescription>Current cashier shift information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cashier</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{activeShift.cashierName}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Shift Type</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium capitalize">{shiftTypeLabel(activeShift.shiftType)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Start Time</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatTime(activeShift.startDate)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Opening Float</p>
              <p className="font-mono font-medium">{formatNPR(activeShift.openingFloat)}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
              <p className="text-xs text-green-700 dark:text-green-400">Total Payments</p>
              <p className="mt-1 font-mono text-lg font-bold text-green-700 dark:text-green-400">
                {formatNPR(activeShift.totalPayments)}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
              <p className="text-xs text-red-700 dark:text-red-400">Total Refunds</p>
              <p className="mt-1 font-mono text-lg font-bold text-red-700 dark:text-red-400">
                {formatNPR(activeShift.totalRefunds)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">Expected Closing</p>
              <p className="mt-1 font-mono text-lg font-bold text-amber-700 dark:text-amber-400">
                {formatNPR(expectedClosing)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openReport('X')}>
              <FileText className="mr-2 h-4 w-4" />
              X Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => openReport('Z')}>
              <FileText className="mr-2 h-4 w-4" />
              Z Report
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCloseDialogOpen(true)}
              disabled={activeShift.status !== 'open'}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Close Shift
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Cashier Summary ──────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Summary
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift History</CardTitle>
          <CardDescription>All cashier shifts with status and variance details</CardDescription>
        </CardHeader>
        <CardContent>
          {shiftHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Banknote className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">No shift records found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="hidden md:table-cell">Start</TableHead>
                    <TableHead className="hidden md:table-cell">End</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Float In</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Float Out</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftHistory.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.cashierName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {shiftTypeLabel(shift.shiftType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {shift.startDate ? format(new Date(shift.startDate), 'MMM dd, hh:mm a') : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {shift.endDate ? format(new Date(shift.endDate), 'MMM dd, hh:mm a') : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNPR(shift.totalPayments)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono">
                        {formatNPR(shift.openingFloat)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono">
                        {shift.closingFloat != null ? formatNPR(shift.closingFloat) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 font-mono ${varianceClass(shift.variance)}`}>
                          {varianceIcon(shift.variance)}
                          {formatNPR(Math.abs(shift.variance))}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
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
            <DialogTitle>Close Shift — {activeShift.cashierName}</DialogTitle>
            <DialogDescription>
              Confirm closing the current {shiftTypeLabel(activeShift.shiftType)} shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening Float</span>
              <span className="font-mono font-medium">{formatNPR(activeShift.openingFloat)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Total Payments</span>
              <span className="font-mono font-medium">+ {formatNPR(activeShift.totalPayments)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Total Refunds</span>
              <span className="font-mono font-medium">- {formatNPR(activeShift.totalRefunds)}</span>
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
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reportType} Report — {activeShift.cashierName}
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
            <TabsContent value="payments" className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Payments</span>
                <span className="font-mono">{formatNPR(summary.cash.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Card Payments</span>
                <span className="font-mono">{formatNPR(summary.card.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank Transfers</span>
                <span className="font-mono">{formatNPR(summary.bankTransfer.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Other</span>
                <span className="font-mono">{formatNPR(summary.other.amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="font-mono">{formatNPR(activeShift.totalPayments)}</span>
              </div>
            </TabsContent>
            <TabsContent value="summary" className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Transactions</span>
                <span className="font-mono">{summary.cash.count + summary.card.count + summary.bankTransfer.count + summary.other.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opening Float</span>
                <span className="font-mono">{formatNPR(activeShift.openingFloat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Payments</span>
                <span className="font-mono text-green-600">{formatNPR(activeShift.totalPayments)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Refunds</span>
                <span className="font-mono text-red-600">{formatNPR(activeShift.totalRefunds)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-bold font-mono truncate">{formatNPR(amount)}</p>
            <p className="text-xs text-muted-foreground">{count} transactions</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
