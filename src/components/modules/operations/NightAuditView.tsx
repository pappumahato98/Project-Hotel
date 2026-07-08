'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import {
  MoonStar, CheckCircle2, Circle, AlertTriangle, Play, Loader2,
  BedDouble, UtensilsCrossed, Wallet, DollarSign, Receipt,
  TrendingUp, Percent, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ──────────────────────────────────────────────────────
interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

interface AuditRevenue {
  roomRevenue: number
  fAndBRevenue: number
  otherRevenue: number
  totalRevenue: number
  totalTax: number
  netRevenue: number
}

interface AuditOccupancy {
  percent: number
  adr: number
  revpar: number
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  outOfOrderRooms: number
}

interface PreviousAudit {
  id: string
  date: string
  revenue: number
  occupancy: number
  status: string
  completedBy: string
}

interface NightAuditData {
  status: string
  checklist: ChecklistItem[]
  revenue: AuditRevenue
  occupancy: AuditOccupancy
  previousAudits: PreviousAudit[]
}

// ─── Helpers ────────────────────────────────────────────────────
function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function statusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    default: return 'bg-muted text-muted-foreground'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    default: return status
  }
}

// ─── Skeleton Loader ───────────────────────────────────────────
function NightAuditSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function NightAuditView() {
  const queryClient = useQueryClient()
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [initialized, setInitialized] = useState(false)

  const { data, isLoading, isError } = useQuery<NightAuditData>({
    queryKey: ['operations', 'night-audit'],
    queryFn: async () => {
      const json = await apiFetch<{ nightAudit: NightAuditData }>('/api/operations')
      return json.nightAudit
    },
  })

  // Initialize checklist from API data once loaded
  if (data && !initialized) {
    setChecklist(data.checklist.map((item) => ({ ...item, checked: false })))
    setInitialized(true)
  }

  const auditMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-audit',
          data: { startedBy: 'Ramesh K.' },
        }),
      })
    },
    onSuccess: () => {
      toast.success('Night audit started successfully')
      invalidate.afterAudit(queryClient)
    },
    onError: () => {
      toast.error('Failed to start night audit')
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

  if (isLoading) return <NightAuditSkeleton />
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load night audit data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  const { revenue, occupancy, previousAudits } = data

  return (
    <div className="flex flex-col gap-2">
      {/* ── Audit Status Banner ──────────────────────────────── */}
      <Alert
        className={
          data.status === 'completed'
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            : data.status === 'in_progress'
              ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
        }
      >
        <MoonStar className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Night Audit Status
          <Badge className={statusColor(data.status)} variant="outline">
            {statusLabel(data.status)}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          {data.status === 'pending' &&
            'Complete the pre-audit checklist below before running the night audit.'}
          {data.status === 'in_progress' &&
            'Night audit is currently in progress. Please wait for it to complete.'}
          {data.status === 'completed' &&
            'Night audit has been completed successfully for the current business date.'}
        </AlertDescription>
      </Alert>

      {/* ── Pre-Audit Checklist ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
            Pre-Audit Checklist
          </CardTitle>
          <CardDescription>
            All items must be verified before running the night audit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Progress Bar */}
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

          {/* Checklist Items */}
          <div className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleCheck(item.id)}
                  disabled={data.status !== 'pending'}
                />
                <span
                  className={`flex-1 text-sm ${
                    item.checked
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {item.label}
                </span>
                {item.checked ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </label>
            ))}
          </div>

          {/* Run Audit Button */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={!allChecked || data.status !== 'pending' || auditMutation.isPending}
              onClick={() => auditMutation.mutate()}
            >
              {auditMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Night Audit
                </>
              )}
            </Button>
            {!allChecked && data.status === 'pending' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Complete all checklist items to enable the audit button
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Revenue Summary Cards ─────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Revenue Summary
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <RevenueCard
            icon={BedDouble}
            label="Room Revenue"
            value={formatNPR(revenue.roomRevenue)}
            color="text-teal-600"
            bg="bg-teal-50 dark:bg-teal-950/30"
          />
          <RevenueCard
            icon={UtensilsCrossed}
            label="F&B Revenue"
            value={formatNPR(revenue.fAndBRevenue)}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
          <RevenueCard
            icon={Wallet}
            label="Other Revenue"
            value={formatNPR(revenue.otherRevenue)}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-950/30"
          />
          <RevenueCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatNPR(revenue.totalRevenue)}
            color="text-emerald-600"
            bg="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <RevenueCard
            icon={Receipt}
            label="Total Tax"
            value={formatNPR(revenue.totalTax)}
            color="text-rose-600"
            bg="bg-rose-50 dark:bg-rose-950/30"
          />
          <RevenueCard
            icon={DollarSign}
            label="Net Revenue"
            value={formatNPR(revenue.netRevenue)}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-950/30"
            highlight
          />
        </div>
      </div>

      {/* ── Occupancy Stats ───────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Occupancy Statistics
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                  <p className="mt-1 text-3xl font-bold">{formatPercent(occupancy.percent)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {occupancy.occupiedRooms} of {occupancy.totalRooms} rooms
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/30">
                  <Building2 className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">ADR</p>
                  <p className="mt-1 text-3xl font-bold">{formatNPR(occupancy.adr)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Average Daily Rate</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">RevPAR</p>
                  <p className="mt-1 text-3xl font-bold">{formatNPR(occupancy.revpar)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Revenue Per Available Room</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <Percent className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Previous Audits Table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Previous Night Audits</CardTitle>
          <CardDescription>Last 7 audit records</CardDescription>
        </CardHeader>
        <CardContent>
          {previousAudits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MoonStar className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">No previous audit records found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Occupancy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Completed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previousAudits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">
                        {format(new Date(audit.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNPR(audit.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercent(audit.occupancy)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(audit.status)} variant="outline">
                          {statusLabel(audit.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {audit.completedBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Revenue Card Sub-Component ─────────────────────────────────
function RevenueCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  bg: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-primary/30 shadow-sm' : ''}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-1 text-lg font-bold truncate ${highlight ? color : ''}`}>
              {value}
            </p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
