'use client'

import { format } from 'date-fns'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
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
    <div className="flex flex-col gap-2">
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
      const json = await apiFetch<{ shiftHandover: ShiftHandoverData }>('/api/operations')
      return json.shiftHandover
    },
  })

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge-handover',
          data: { name: 'Supervisor' },
        }),
      })
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

  const handleExportShiftHandover = () => {
    const s = sections
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const rows: string[][] = [
      ['Shift Handover Report'],
      [`Generated: ${data.generatedAt}`],
      [`Shift: ${data.shiftType}`],
      [`Outgoing Supervisor: ${data.outgoingSupervisor}`],
      [`Incoming Supervisor: ${data.incomingSupervisor}`],
      [''],
      ['Category', 'Metric', 'Value'],
      ['Guest Statistics', 'In-House Guests', String(s.inHouseGuests)],
      ['Guest Statistics', 'Arrivals Checked In', String(s.arrivals.checkedIn)],
      ['Guest Statistics', 'Arrivals Pending', String(s.arrivals.pending)],
      ['Guest Statistics', 'Departures Done', String(s.departures.done)],
      ['Guest Statistics', 'Departures Pending', String(s.departures.pending)],
      ['Operations', 'HK Task Completion %', String(s.hkTaskCompletion)],
      ['Operations', 'Open Work Orders', String(s.openWorkOrders)],
      ['Operations', 'Open POS Tables', String(s.openPosTables)],
      ['Financial', 'Cashier Balance', String(s.cashierBalance)],
      ['Financial', 'Folios Above Credit', String(s.pendingFoliosAboveCredit)],
      [''],
      ['VIP In-House', 'Room', 'Reason'],
      ...s.vipInHouse.map(v => ['VIP', v.room, v.reason]),
      [''],
      ['Special Notes'],
      ...s.specialNotes.map(n => [n]),
    ]
    const csvContent = rows.map(r => r.map(c => {
      const val = String(c ?? '')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shift-handover-${dateStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Shift handover exported as CSV')
  }

  const handlePrintShiftHandover = () => {
    const s = sections
    const printWindow = window.open('', '_blank', 'width=500,height=700')
    if (!printWindow) {
      toast.error('Please allow pop-ups to print')
      return
    }
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Shift Handover Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 400px; margin: 0 auto; padding: 20px 10px; color: #000; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #000; padding-bottom: 12px; }
    .hotel-name { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .title { font-size: 14px; margin-top: 4px; }
    .date { font-size: 10px; color: #555; margin-top: 4px; }
    .info { margin-bottom: 12px; }
    .info-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #ccc; }
    .info-label { color: #555; }
    .info-value { font-weight: bold; }
    .section { margin-bottom: 12px; }
    .section-title { font-size: 13px; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #000; font-size: 10px; color: #555; }
    @media print { body { width: 80mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel-name">Shift Handover Report</div>
    <div class="title">${data.shiftType} Shift</div>
    <div class="date">Generated: ${format(new Date(data.generatedAt), 'MMM dd, yyyy hh:mm a')}</div>
  </div>
  <div class="info">
    <div class="info-row"><span class="info-label">Outgoing Supervisor:</span><span class="info-value">${data.outgoingSupervisor}</span></div>
    <div class="info-row"><span class="info-label">Incoming Supervisor:</span><span class="info-value">${data.incomingSupervisor}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Guest Statistics</div>
    <div class="row"><span>In-House Guests:</span><span>${s.inHouseGuests}</span></div>
    <div class="row"><span>Arrivals (Checked In / Pending):</span><span>${s.arrivals.checkedIn} / ${s.arrivals.pending}</span></div>
    <div class="row"><span>Departures (Done / Pending):</span><span>${s.departures.done} / ${s.departures.pending}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Operations</div>
    <div class="row"><span>HK Task Completion:</span><span>${s.hkTaskCompletion}%</span></div>
    <div class="row"><span>Open Work Orders:</span><span>${s.openWorkOrders}</span></div>
    <div class="row"><span>Open POS Tables:</span><span>${s.openPosTables}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Financial</div>
    <div class="row"><span>Cashier Balance:</span><span>${formatNPR(s.cashierBalance)}</span></div>
    <div class="row"><span>Folios Above Credit Limit:</span><span>${s.pendingFoliosAboveCredit}</span></div>
  </div>
  ${s.vipInHouse.length > 0 ? `<div class="section"><div class="section-title">VIP In-House</div>${s.vipInHouse.map(v => `<div class="row"><span>${v.name} - Room ${v.room}</span></div><div class="row" style="color:#666;"><span>${v.reason}</span></div>`).join('')}</div>` : ''}
  ${s.specialNotes.length > 0 ? `<div class="section"><div class="section-title">Special Notes</div>${s.specialNotes.map((n, i) => `<div class="row"><span>${i + 1}. ${n}</span></div>`).join('')}</div>` : ''}
  <div class="footer">
    <p>Shift Handover — Confidential</p>
  </div>
  <div class="no-print" style="text-align:center; margin-top:12px;">
    <button onclick="window.print()" style="padding:8px 24px; font-size:14px; cursor:pointer; border:2px solid #000; background:#f5f5f5; border-radius:4px;">Print Report</button>
  </div>
  <script>setTimeout(() => { window.print(); }, 500);</script>
</body>
</html>`)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── Header Banner ─────────────────────────────────────── */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
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
      <div className="grid gap-2 lg:grid-cols-2">
        {/* Guest Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-blue-600" />
              Guest Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">In-House Guests</span>
              <span className="text-lg font-bold">{sections.inHouseGuests}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Arrivals (checked in / pending)</span>
              <span className="font-mono font-medium">
                <span className="text-green-600">{sections.arrivals.checkedIn}</span>
                {' / '}
                <span className="text-amber-600">{sections.arrivals.pending}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Departures (done / pending)</span>
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
          <CardContent className="space-y-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">HK Task Completion</span>
                <span className="font-medium">{sections.hkTaskCompletion}%</span>
              </div>
              <Progress value={sections.hkTaskCompletion} className="h-2" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
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
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
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
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cashier Balance</span>
              <span className="font-mono text-lg font-bold text-emerald-600">
                {formatNPR(sections.cashierBalance)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pending Folios Above Credit Limit</span>
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
            <div className="grid grid-cols-2 gap-2">
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
            <p className="text-xs text-muted-foreground">No VIP guests in-house</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {sections.vipInHouse.map((vip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
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
            <p className="text-xs text-muted-foreground">No special notes for this shift</p>
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
          <CardTitle className="text-sm">Detailed Report</CardTitle>
          <CardDescription>Expand sections for detailed handover information</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="guests">
              <AccordionTrigger className="text-sm">
                Guest Statistics — Detailed
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="grid gap-2 sm:grid-cols-2">
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
        <CardContent className="p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <Button variant="outline" size="sm" onClick={handlePrintShiftHandover}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportShiftHandover}>
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium text-sm ${highlight ? 'text-emerald-600' : ''}`}>
        {value}
      </span>
    </div>
  )
}
