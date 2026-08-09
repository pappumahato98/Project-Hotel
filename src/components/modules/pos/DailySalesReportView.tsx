'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

import {
  TrendingUp, DollarSign, Receipt, Percent, CreditCard,
  Smartphone, BedDouble, Banknote, Calendar, Printer, Download,
  UtensilsCrossed, Wine, Flower2, BellRing, Monitor, Store,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNPR } from '@/lib/nepal-standards'

// ─── Types ───────────────────────────────────────────────────────────
interface DailyReportData {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  taxCollected: number
  byOutlet: { name: string; revenue: number; orders: number; icon: string }[]
  byCategory: { name: string; amount: number; percentage: number }[]
  byPayment: { method: string; amount: number; percentage: number; icon: string }[]
  topItems: { rank: number; name: string; qtySold: number; revenue: number }[]
  hourlySales: { hour: string; revenue: number; orders: number }[]
}

// ─── Fallback Mock Data ──────────────────────────────────────────────
const FALLBACK_REPORT: DailyReportData = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  taxCollected: 0,
  byOutlet: [],
  byCategory: [],
  byPayment: [],
  topItems: [],
  hourlySales: [],
}

const OUTLET_ICONS: Record<string, React.ElementType> = {
  utensils: UtensilsCrossed,
  wine: Wine,
  bell: BellRing,
  flower: Flower2,
  monitor: Monitor,
  store: Store,
}

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  banknote: Banknote,
  creditcard: CreditCard,
  smartphone: Smartphone,
  bed: BedDouble,
}

// ─── Query Hook ─────────────────────────────────────────────────────
function useDailySalesReport(date: string) {
  return useQuery<DailyReportData>({
    queryKey: ['pos-daily-sales', date],
    queryFn: () => apiFetch<DailyReportData>(`/api/pos/daily-sales?date=${date}`),
    staleTime: 60_000, // 1 minute
  })
}

// ─── Loading Skeleton ────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-3">
            <CardContent className="flex items-center gap-2 px-3 py-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="py-3">
          <CardContent className="px-3 py-0 space-y-3">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-3 py-0 space-y-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="py-3">
          <CardContent className="px-3 py-0 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-3 py-0 space-y-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="py-3">
        <CardContent className="px-3 py-0 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── No Data State ──────────────────────────────────────────────────
function NoDataState({ date }: { date: string }) {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center gap-2">
        <Receipt className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">No Sales Data</p>
        <p className="text-xs text-muted-foreground">No closed or voided orders found for {date}.</p>
      </CardContent>
    </Card>
  )
}

// ─── Summary Cards ───────────────────────────────────────────────────
function SummaryCards({ data }: { data: DailyReportData }) {
  const cards = [
    { label: 'Total Revenue', value: formatNPR(data.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Total Orders', value: data.totalOrders, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Avg Order Value', value: formatNPR(data.avgOrderValue), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    { label: 'Tax Collected', value: formatNPR(data.taxCollected), icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card) => (
        <Card key={card.label} className="py-3">
          <CardContent className="flex items-center gap-2 px-3 py-0">
            <div className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
              <p className="text-sm font-bold truncate">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Sales by Outlet ─────────────────────────────────────────────────
function SalesByOutlet({ outlets, totalRevenue }: { outlets: DailyReportData['byOutlet']; totalRevenue: number }) {
  const maxRevenue = Math.max(...outlets.map((o) => o.revenue))

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3 px-3 pt-3">
        <CardTitle className="text-sm">Sales by Outlet</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {outlets.map((outlet) => {
          const Icon = OUTLET_ICONS[outlet.icon] ?? UtensilsCrossed
          const pct = Math.round((outlet.revenue / totalRevenue) * 100)
          const barWidth = Math.round((outlet.revenue / maxRevenue) * 100)

          return (
            <div key={outlet.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-muted p-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium">{outlet.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold">{formatNPR(outlet.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">{outlet.orders} orders</div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Sales by Category ───────────────────────────────────────────────
function SalesByCategory({ categories }: { categories: DailyReportData['byCategory'] }) {
  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3 px-3 pt-3">
        <CardTitle className="text-sm">Sales by Category</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Share</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.name} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{cat.name}</td>
                  <td className="px-3 py-2 text-right">{formatNPR(cat.amount)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{cat.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Payment Method Breakdown ────────────────────────────────────────
function PaymentBreakdown({ payments }: { payments: DailyReportData['byPayment'] }) {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-amber-500',
  ]

  if (payments.length === 0) {
    return (
      <Card className="rounded-lg border">
        <CardHeader className="pb-3 px-3 pt-3">
          <CardTitle className="text-sm">Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">No payment data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3 px-3 pt-3">
        <CardTitle className="text-sm">Payment Method Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Visual bar */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {payments.map((p, idx) => (
            <div
              key={p.method}
              className={`${colors[idx]} transition-all duration-500`}
              style={{ width: `${p.percentage}%` }}
              title={`${p.method}: ${p.percentage}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {payments.map((p, idx) => {
            const Icon = PAYMENT_ICONS[p.icon] ?? CreditCard
            return (
              <div key={p.method} className="flex items-center gap-2 rounded-md border p-2">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colors[idx]}`} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate">{p.method}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatNPR(p.amount)} · {p.percentage}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Top Selling Items ───────────────────────────────────────────────
function TopSellingItems({ items }: { items: DailyReportData['topItems'] }) {
  if (items.length === 0) {
    return (
      <Card className="rounded-lg border">
        <CardHeader className="pb-3 px-3 pt-3">
          <CardTitle className="text-sm">Top 5 Selling Items</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">No items sold</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3 px-3 pt-3">
        <CardTitle className="text-sm">Top 5 Selling Items</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-10">#</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item Name</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty Sold</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.rank} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-center">
                    <Badge variant={item.rank <= 3 ? 'default' : 'outline'} className={`text-[10px] h-5 w-5 flex items-center justify-center p-0 ${item.rank <= 3 ? 'bg-amber-600 hover:bg-amber-600 text-white' : ''}`}>
                      {item.rank}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-right">{item.qtySold}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatNPR(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Hourly Sales Trend ──────────────────────────────────────────────
function HourlySalesTrend({ hourly }: { hourly: DailyReportData['hourlySales'] }) {
  if (hourly.length === 0) {
    return (
      <Card className="rounded-lg border">
        <CardHeader className="pb-3 px-3 pt-3">
          <CardTitle className="text-sm">Hourly Sales Trend</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">No hourly data available</p>
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...hourly.map((h) => h.revenue))

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-3 px-3 pt-3">
        <CardTitle className="text-sm">Hourly Sales Trend</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ScrollArea className="max-h-72">
          <div className="space-y-2 pr-2">
            {hourly.map((h) => {
              const barWidth = h.revenue > 0 ? Math.max(4, Math.round((h.revenue / maxRevenue) * 100)) : 2
              const isPeak = h.revenue >= maxRevenue * 0.8

              return (
                <div key={h.hour} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-10 text-right flex-shrink-0">{h.hour}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden relative">
                      <div
                        className={`h-full rounded transition-all duration-500 ${isPeak ? 'bg-primary' : 'bg-primary/60'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-medium w-16 text-right flex-shrink-0">
                    {formatNPR(h.revenue)}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-12 text-right flex-shrink-0">
                    {h.orders} ord
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── CSV Export Helper ───────────────────────────────────────────────
function buildCsvContent(report: DailyReportData, date: string): string {
  const lines: string[] = []

  // Header
  lines.push(`POS Daily Sales Report — ${date}`)
  lines.push('')

  // Summary
  lines.push('=== SUMMARY ===')
  lines.push(`Total Revenue,${formatNPR(report.totalRevenue)}`)
  lines.push(`Total Orders,${report.totalOrders}`)
  lines.push(`Avg Order Value,${formatNPR(report.avgOrderValue)}`)
  lines.push(`Tax Collected,${formatNPR(report.taxCollected)}`)
  lines.push('')

  // By Outlet
  lines.push('=== SALES BY OUTLET ===')
  lines.push('Outlet,Revenue,Orders')
  for (const o of report.byOutlet) {
    lines.push(`"${o.name}",${o.revenue},${o.orders}`)
  }
  lines.push('')

  // By Category
  lines.push('=== SALES BY CATEGORY ===')
  lines.push('Category,Amount,Share (%)')
  for (const c of report.byCategory) {
    lines.push(`"${c.name}",${c.amount},${c.percentage}`)
  }
  lines.push('')

  // By Payment
  lines.push('=== PAYMENT BREAKDOWN ===')
  lines.push('Method,Amount,Share (%)')
  for (const p of report.byPayment) {
    lines.push(`"${p.method}",${p.amount},${p.percentage}`)
  }
  lines.push('')

  // Top Items
  lines.push('=== TOP SELLING ITEMS ===')
  lines.push('Rank,Item Name,Qty Sold,Revenue')
  for (const item of report.topItems) {
    lines.push(`${item.rank},"${item.name}",${item.qtySold},${item.revenue}`)
  }
  lines.push('')

  // Hourly
  lines.push('=== HOURLY SALES ===')
  lines.push('Hour,Revenue,Orders')
  for (const h of report.hourlySales) {
    lines.push(`${h.hour},${h.revenue},${h.orders}`)
  }

  return lines.join('\n')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Print Helper ────────────────────────────────────────────────────
function buildPrintHtml(report: DailyReportData, date: string): string {
  const outletRows = report.byOutlet.map(o =>
    `<tr><td>${o.name}</td><td style="text-align:right">${formatNPR(o.revenue)}</td><td style="text-align:right">${o.orders}</td></tr>`
  ).join('')

  const categoryRows = report.byCategory.map(c =>
    `<tr><td>${c.name}</td><td style="text-align:right">${formatNPR(c.amount)}</td><td style="text-align:right">${c.percentage}%</td></tr>`
  ).join('')

  const paymentRows = report.byPayment.map(p =>
    `<tr><td>${p.method}</td><td style="text-align:right">${formatNPR(p.amount)}</td><td style="text-align:right">${p.percentage}%</td></tr>`
  ).join('')

  const topItemRows = report.topItems.map(item =>
    `<tr><td style="text-align:center">${item.rank}</td><td>${item.name}</td><td style="text-align:right">${item.qtySold}</td><td style="text-align:right">${formatNPR(item.revenue)}</td></tr>`
  ).join('')

  const hourlyRows = report.hourlySales.map(h =>
    `<tr><td>${h.hour}</td><td style="text-align:right">${formatNPR(h.revenue)}</td><td style="text-align:right">${h.orders}</td></tr>`
  ).join('')

  return `
<html><head><title>POS Daily Sales Report — ${date}</title>
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px;font-size:12px;color:#1a1a1a}
  h1{font-size:18px;margin:0 0 4px 0}
  h2{font-size:14px;margin:20px 0 8px 0;border-bottom:1px solid #e5e7eb;padding-bottom:4px;color:#374151}
  .meta{color:#6b7280;font-size:11px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#f9fafb;text-align:left;font-weight:600;font-size:11px;padding:6px 8px;border-bottom:2px solid #e5e7eb}
  td{padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
  .summary-card{background:#f9fafb;border-radius:8px;padding:12px}
  .summary-card .label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
  .summary-card .value{font-size:16px;font-weight:700;margin-top:2px}
  @media print{body{padding:12px} .no-print{display:none}}
</style></head><body>
<h1>POS Daily Sales Report</h1>
<p class="meta">Date: ${date}</p>

<div class="summary">
  <div class="summary-card"><div class="label">Total Revenue</div><div class="value">${formatNPR(report.totalRevenue)}</div></div>
  <div class="summary-card"><div class="label">Total Orders</div><div class="value">${report.totalOrders}</div></div>
  <div class="summary-card"><div class="label">Avg Order Value</div><div class="value">${formatNPR(report.avgOrderValue)}</div></div>
  <div class="summary-card"><div class="label">Tax Collected</div><div class="value">${formatNPR(report.taxCollected)}</div></div>
</div>

<h2>Sales by Outlet</h2>
<table><thead><tr><th>Outlet</th><th style="text-align:right">Revenue</th><th style="text-align:right">Orders</th></tr></thead><tbody>${outletRows}</tbody></table>

<h2>Sales by Category</h2>
<table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr></thead><tbody>${categoryRows}</tbody></table>

<h2>Payment Breakdown</h2>
<table><thead><tr><th>Method</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr></thead><tbody>${paymentRows}</tbody></table>

<h2>Top 5 Selling Items</h2>
<table><thead><tr><th style="text-align:center">#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${topItemRows}</tbody></table>

<h2>Hourly Sales</h2>
<table><thead><tr><th>Hour</th><th style="text-align:right">Revenue</th><th style="text-align:right">Orders</th></tr></thead><tbody>${hourlyRows}</tbody></table>

<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── Main DailySalesReportView ──────────────────────────────────────
export default function DailySalesReportView() {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [outletFilter, setOutletFilter] = useState('all')

  const { data: report, isLoading, isError, error } = useDailySalesReport(reportDate)

  // Use fallback when no data is returned from the API
  const reportData = report ?? FALLBACK_REPORT

  const hasData = reportData.totalOrders > 0 || reportData.byOutlet.length > 0

  const filteredOutlet = useMemo(() => {
    if (outletFilter === 'all') return reportData.byOutlet
    return reportData.byOutlet.filter((o) => o.name.toLowerCase().replace(/[\s&]/g, '-') === outletFilter)
  }, [reportData, outletFilter])

  const handlePrint = () => {
    if (!hasData) {
      toast.info('No data to print for this date')
      return
    }
    const html = buildPrintHtml(reportData, reportDate)
    const printWindow = window.open('', '_blank', 'width=750,height=900')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleExport = () => {
    if (!hasData) {
      toast.info('No data to export for this date')
      return
    }
    const csv = buildCsvContent(reportData, reportDate)
    const filename = `pos-daily-sales-${reportDate}.csv`
    downloadCsv(csv, filename)
    toast.success('Report exported as CSV')
  }

  return (
    <div className="space-y-2">
      {/* Header with date picker and actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-44 h-7 text-xs"
          />
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-40 data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {reportData.byOutlet.map((o) => (
                <SelectItem key={o.name.toLowerCase().replace(/[\s&]/g, '-')} value={o.name.toLowerCase().replace(/[\s&]/g, '-')}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1 text-[11px]" onClick={handlePrint} disabled={isLoading}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button variant="outline" className="gap-1 text-[11px]" onClick={handleExport} disabled={isLoading}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm text-destructive">Failed to load sales data</p>
            <p className="text-xs text-muted-foreground">{error?.message || 'An unexpected error occurred'}</p>
          </CardContent>
        </Card>
      )}

      {/* Data loaded — show content */}
      {!isLoading && !isError && (
        <>
          {/* No data state */}
          {!hasData ? (
            <NoDataState date={reportDate} />
          ) : (
            <>
              {/* Summary Cards */}
              <SummaryCards data={reportData} />

              {/* Tab Sections */}
              <Tabs defaultValue="outlets">
                <TabsList>
                  <TabsTrigger value="outlets" className="text-xs gap-1.5">
                    <TrendingUp className="h-3 w-3" />
                    By Outlet
                  </TabsTrigger>
                  <TabsTrigger value="category" className="text-xs">
                    Category
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs">
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="items" className="text-xs">
                    Top Items
                  </TabsTrigger>
                  <TabsTrigger value="hourly" className="text-xs">
                    Hourly
                  </TabsTrigger>
                </TabsList>

                {/* All tab contents rendered (tabs are purely for visual navigation) */}
                <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <SalesByOutlet outlets={filteredOutlet} totalRevenue={reportData.totalRevenue} />
                  <SalesByCategory categories={reportData.byCategory} />
                </div>

                <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <PaymentBreakdown payments={reportData.byPayment} />
                  <TopSellingItems items={reportData.topItems} />
                </div>

                <div className="mt-2">
                  <HourlySalesTrend hourly={reportData.hourlySales} />
                </div>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  )
}
