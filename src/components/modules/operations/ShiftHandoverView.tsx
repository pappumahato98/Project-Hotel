'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowRightLeft, Users, ClipboardCheck, Wrench,
  UtensilsCrossed, Banknote, CreditCard, Crown, StickyNote,
  CheckCircle2, Printer, Download, Loader2, AlertTriangle, Star, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// ─── Types ──────────────────────────────────────────────────────
interface VIPGuest {
  name: string
  room: string
  reason: string
}

interface HandoverSections {
  inHouseGuests: number
  arrivals: { checkedIn: number; pending: number }
  departures: { done: number; pending: number }
  hkTaskCompletion: number
  openWorkOrders: number
  openPosTables: number
  cashierBalance: number
  pendingFoliosAboveCredit: number
  vipInHouse: VIPGuest[]
  specialNotes: string[]
}

interface ShiftHandoverData {
  generatedAt: string
  shiftType: string
  outgoingSupervisor: string
  incomingSupervisor: string
  acknowledged: boolean
  acknowledgedAt: string | null
  sections: HandoverSections
}

// ─── Helpers ────────────────────────────────────────────────────
function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

// ─── Skeleton Loader ──────────────────────────────────────────
function HandoverSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function ShiftHandoverView() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery<ShiftHandoverData>({
    queryKey: ['operations', 'shift-handover'],
    queryFn: async () => {
      const res = await fetch('/api/operations')
      if (!res.ok) throw new Error('Failed to fetch handover data')
      const json = await res.json()
      return json.shiftHandover
    },
  })

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge-handover',
          data: { name: 'Supervisor' },
        }),
      })
      if (!res.ok) throw new Error('Failed to acknowledge')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Shift handover acknowledged successfully')
      queryClient.invalidateQueries({ queryKey: ['operations'] })
    },
    onError: () => {
      toast.error('Failed to acknowledge handover')
    },
  })

  if (isLoading) return <HandoverSkeleton />
  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load shift handover data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  const { sections } = data

  const handleRegenerate = () => {
    refetch()
    toast.success('Handover report regenerated')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header Banner ─────────────────────────────────────── */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                Shift Handover Report
              </CardTitle>
              <CardDescription className="mt-1">
                Auto-generated at {format(new Date(data.generatedAt), 'MMM dd, yyyy hh:mm a')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                {data.shiftType}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                Outgoing: {data.outgoingSupervisor}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Report Sections ───────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Guest Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-blue-600" />
              Guest Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">In-House Guests</span>
              <span className="text-lg font-bold">{sections.inHouseGuests}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Arrivals (checked in / pending)</span>
              <span className="font-mono font-medium">
                <span className="text-green-600">{sections.arrivals.checkedIn}</span>
                {' / '}
                <span className="text-amber-600">{sections.arrivals.pending}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Departures (done / pending)</span>
              <span className="font-mono font-medium">
                <span className="text-green-600">{sections.departures.done}</span>
                {' / '}
                <span className="text-amber-600">{sections.departures.pending}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Operations Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              Operations Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">HK Task Completion</span>
                <span className="font-medium">{sections.hkTaskCompletion}%</span>
              </div>
              <Progress value={sections.hkTaskCompletion} className="h-2" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                Open Work Orders
              </span>
              <Badge variant="outline" className={
                sections.openWorkOrders > 0
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              }>
                {sections.openWorkOrders}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <UtensilsCrossed className="h-4 w-4" />
                Open POS Tables
              </span>
              <Badge variant="outline" className={
                sections.openPosTables > 0
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              }>
                {sections.openPosTables}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financial Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Banknote className="h-4 w-4 text-emerald-600" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cashier Balance</span>
              <span className="font-mono text-lg font-bold text-emerald-600">
                {formatNPR(sections.cashierBalance)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Folios Above Credit Limit</span>
              <Badge variant="outline" className={
                sections.pendingFoliosAboveCredit > 0
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                  : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              }>
                {sections.pendingFoliosAboveCredit}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Quick Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="In-House" value={sections.inHouseGuests} />
              <MiniStat label="Pending Arrivals" value={sections.arrivals.pending} />
              <MiniStat label="Pending Deps" value={sections.departures.pending} />
              <MiniStat label="HK %" value={`${sections.hkTaskCompletion}%`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── VIP In-House List ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-amber-500" />
            VIP In-House
          </CardTitle>
          <CardDescription>
            Special attention required for these guests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sections.vipInHouse.length === 0 ? (
            <p className="text-sm text-muted-foreground">No VIP guests in-house</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {sections.vipInHouse.map((vip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Star className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{vip.name}</p>
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Room {vip.room}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{vip.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ── Special Notes ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="h-4 w-4 text-rose-600" />
            Special Notes
          </CardTitle>
          <CardDescription>Important information for the incoming shift</CardDescription>
        </CardHeader>
        <CardContent>
          {sections.specialNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No special notes for this shift</p>
          ) : (
            <ScrollArea className="max-h-64">
              <ul className="space-y-2">
                {sections.specialNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-foreground">{note}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ── Detailed Accordion ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Report</CardTitle>
          <CardDescription>Expand sections for detailed handover information</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="guests">
              <AccordionTrigger className="text-sm">
                Guest Statistics — Detailed
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Total In-House Guests" value={sections.inHouseGuests.toString()} />
                  <DetailRow label="Arrivals Checked In" value={sections.arrivals.checkedIn.toString()} />
                  <DetailRow label="Arrivals Pending" value={sections.arrivals.pending.toString()} />
                  <DetailRow label="Departures Done" value={sections.departures.done.toString()} />
                  <DetailRow label="Departures Pending" value={sections.departures.pending.toString()} />
                  <DetailRow label="VIP Guests In-House" value={sections.vipInHouse.length.toString()} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="operations">
              <AccordionTrigger className="text-sm">
                Operations — Detailed
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="HK Task Completion" value={`${sections.hkTaskCompletion}%`} />
                  <DetailRow label="Open Work Orders" value={sections.openWorkOrders.toString()} />
                  <DetailRow label="Open POS Tables" value={sections.openPosTables.toString()} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="financial">
              <AccordionTrigger className="text-sm">
                Financial — Detailed
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Cashier Balance" value={formatNPR(sections.cashierBalance)} highlight />
                  <DetailRow label="Folios Above Credit Limit" value={sections.pendingFoliosAboveCredit.toString()} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ── Actions Bar ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {data.acknowledged ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" variant="outline">
                  <BadgeCheck className="mr-1 h-3 w-3" />
                  Acknowledged by incoming supervisor
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" variant="outline">
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Awaiting incoming supervisor acknowledgment
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info('Print function initiated')}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info('Export function initiated')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                size="sm"
                disabled={data.acknowledged || acknowledgeMutation.isPending}
                onClick={() => acknowledgeMutation.mutate()}
              >
                {acknowledgeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Acknowledge Handover
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Mini Stat Sub-Component ────────────────────────────────────
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}

// ─── Detail Row Sub-Component ────────────────────────────────────
function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium text-sm ${highlight ? 'text-emerald-600' : ''}`}>
        {value}
      </span>
    </div>
  )
}
