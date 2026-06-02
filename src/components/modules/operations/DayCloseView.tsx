'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock, CheckCircle2, Circle, Lock, Loader2,
  BedDouble, Users, ArrowRightLeft, DollarSign, AlertTriangle, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
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

// ─── Types ──────────────────────────────────────────────────────
interface DayCloseChecklistItem {
  id: string
  label: string
  checked: boolean
}

interface DayKPI {
  roomsSold: number
  arrivals: number
  departures: number
  walkIns: number
  noShows: number
  cancellations: number
  averageRate: number
  totalRevenue: number
  totalPayments: number
  pendingFolioBalance: number
}

interface RevenueBreakdownItem {
  department: string
  amount: number
  percentage: number
}

interface DayCloseData {
  businessDate: string
  dayOfWeek: string
  checklist: DayCloseChecklistItem[]
  kpis: DayKPI
  revenueBreakdown: RevenueBreakdownItem[]
}

// ─── Helpers ────────────────────────────────────────────────────
function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

// ─── Skeleton Loader ───────────────────────────────────────────
function DayCloseSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function DayCloseView() {
  const queryClient = useQueryClient()
  const [checklist, setChecklist] = useState<DayCloseChecklistItem[]>([])
  const [initialized, setInitialized] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const { data, isLoading, isError } = useQuery<DayCloseData>({
    queryKey: ['operations', 'day-close'],
    queryFn: async () => {
      const res = await fetch('/api/operations')
      if (!res.ok) throw new Error('Failed to fetch day close data')
      const json = await res.json()
      return json.dayClose
    },
  })

  // Initialize checklist from API data once loaded
  if (data && !initialized) {
    setChecklist(data.checklist.map((item) => ({ ...item, checked: false })))
    setInitialized(true)
  }

  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-day' }),
      })
      if (!res.ok) throw new Error('Failed to close day')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Business day closed successfully')
      queryClient.invalidateQueries({ queryKey: ['operations'] })
      setConfirmDialogOpen(false)
    },
    onError: () => {
      toast.error('Failed to close business day')
    },
  })

  const checkedCount = checklist.filter((c) => c.checked).length
  const totalCount = checklist.length
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0
  const allChecked = checkedCount === totalCount && totalCount > 0

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    )
  }

  if (isLoading) return <DayCloseSkeleton />
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load day close data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  const { kpis, revenueBreakdown } = data

  return (
    <div className="flex flex-col gap-6">
      {/* ── Business Date Display ────────────────────────────── */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CalendarClock className="h-4 w-4" />
        <AlertTitle className="text-lg">
          {data.dayOfWeek}, {data.businessDate}
        </AlertTitle>
        <AlertDescription>
          This is the current business date. Closing will lock all daily transactions.
        </AlertDescription>
      </Alert>

      {/* ── Day Close Checklist ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
            Day Close Checklist
          </CardTitle>
          <CardDescription>
            Verify all items before closing the business day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">
                {checkedCount} / {totalCount} items
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleCheck(item.id)}
                />
                <span
                  className={`flex-1 text-sm ${
                    item.checked ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </span>
                {item.checked ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </label>
            ))}
          </div>

          <Separator />

          {/* Close Day Button */}
          <div className="pt-2">
            <Button
              size="lg"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={!allChecked || closeDayMutation.isPending}
              onClick={() => setConfirmDialogOpen(true)}
            >
              {closeDayMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing Day...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Close Business Day
                </>
              )}
            </Button>
            {!allChecked && (
              <p className="mt-2 text-xs text-muted-foreground">
                Complete all checklist items to enable the close button
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Statistics Snapshot ────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Statistics (Will Be Locked)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BedDouble} label="Rooms Sold" value={kpis.roomsSold.toString()} color="text-teal-600" bg="bg-teal-50 dark:bg-teal-950/30" />
          <StatCard icon={Users} label="Arrivals" value={kpis.arrivals.toString()} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30" />
          <StatCard icon={ArrowRightLeft} label="Departures" value={kpis.departures.toString()} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" />
          <StatCard icon={TrendingUp} label="Walk-ins" value={kpis.walkIns.toString()} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/30" />
          <StatCard icon={Users} label="No Shows" value={kpis.noShows.toString()} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-950/30" />
          <StatCard icon={Users} label="Cancellations" value={kpis.cancellations.toString()} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/30" />
          <StatCard icon={DollarSign} label="Average Rate" value={formatNPR(kpis.averageRate)} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/30" />
          <StatCard icon={DollarSign} label="Pending Balance" value={formatNPR(kpis.pendingFolioBalance)} color="text-red-600" bg="bg-red-50 dark:bg-red-950/30" />
        </div>

        {/* Revenue / Payments Highlight */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{formatNPR(kpis.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{formatNPR(kpis.totalPayments)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Revenue Breakdown ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Breakdown by Department</CardTitle>
          <CardDescription>Department-wise revenue distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueBreakdown.map((item) => (
              <div key={item.department} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.department}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{item.percentage}%</span>
                    <span className="font-mono font-medium">{formatNPR(item.amount)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatNPR(kpis.totalRevenue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ────────────────────────────────── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Day Close
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to close the business day for <strong>{data.businessDate}</strong>?
              This action will:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" />
              Lock all daily transactions and KPIs
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" />
              Advance the business date to the next day
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" />
              Prevent further modifications to today&apos;s records
            </li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => closeDayMutation.mutate()}
              disabled={closeDayMutation.isPending}
            >
              {closeDayMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                'Yes, Close Day'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Stat Card Sub-Component ────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold truncate">{value}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
