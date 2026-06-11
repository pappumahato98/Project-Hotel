'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'

import {
  TrendingUp, DollarSign, Receipt, Percent, CreditCard,
  Smartphone, BedDouble, Banknote, Calendar, Printer, Download,
  UtensilsCrossed, Wine, Flower2, BellRing, Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatNPR } from './pos-types'

// ─── Mock Data ─────────────────────────────────────────────────────────
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

const MOCK_REPORT: DailyReportData = {
  totalRevenue: 287450,
  totalOrders: 186,
  avgOrderValue: 1545,
  taxCollected: 37368,
  byOutlet: [
    { name: 'Restaurant', revenue: 132800, orders: 78, icon: 'utensils' },
    { name: 'Bar & Lounge', revenue: 62400, orders: 52, icon: 'wine' },
    { name: 'Room Service', revenue: 38200, orders: 28, icon: 'bell' },
    { name: 'Spa', revenue: 31500, orders: 18, icon: 'flower' },
    { name: 'Business Center', revenue: 22550, orders: 10, icon: 'monitor' },
  ],
  byCategory: [
    { name: 'Main Course', amount: 98500, percentage: 34.3 },
    { name: 'Beverages', amount: 62300, percentage: 21.7 },
    { name: 'Appetizers', amount: 48200, percentage: 16.8 },
    { name: 'Desserts', amount: 28400, percentage: 9.9 },
    { name: 'Services', amount: 31500, percentage: 10.9 },
    { name: 'Other', amount: 18550, percentage: 6.5 },
  ],
  byPayment: [
    { method: 'Cash', amount: 86235, percentage: 30.0, icon: 'banknote' },
    { method: 'Card', amount: 115000, percentage: 40.0, icon: 'creditcard' },
    { method: 'Mobile (eSewa/Khalti)', amount: 51761, percentage: 18.0, icon: 'smartphone' },
    { method: 'Room Charge', amount: 34454, percentage: 12.0, icon: 'bed' },
  ],
  topItems: [
    { rank: 1, name: 'Chicken Momo (8pc)', qtySold: 42, revenue: 18900 },
    { rank: 2, name: 'Thali Set', qtySold: 38, revenue: 24700 },
    { rank: 3, name: 'Draft Beer (Pint)', qtySold: 65, revenue: 22750 },
    { rank: 4, name: 'Paneer Tikka', qtySold: 34, revenue: 11900 },
    { rank: 5, name: 'Masala Tea', qtySold: 56, revenue: 4480 },
  ],
  hourlySales: [
    { hour: '7 AM', revenue: 4200, orders: 6 },
    { hour: '8 AM', revenue: 12800, orders: 18 },
    { hour: '9 AM', revenue: 8900, orders: 12 },
    { hour: '10 AM', revenue: 3200, orders: 4 },
    { hour: '11 AM', revenue: 5600, orders: 8 },
    { hour: '12 PM', revenue: 28400, orders: 22 },
    { hour: '1 PM', revenue: 32100, orders: 26 },
    { hour: '2 PM', revenue: 18600, orders: 14 },
    { hour: '3 PM', revenue: 8400, orders: 6 },
    { hour: '4 PM', revenue: 5200, orders: 4 },
    { hour: '5 PM', revenue: 9800, orders: 8 },
    { hour: '6 PM', revenue: 22400, orders: 18 },
    { hour: '7 PM', revenue: 38600, orders: 28 },
    { hour: '8 PM', revenue: 42100, orders: 30 },
    { hour: '9 PM', revenue: 35800, orders: 24 },
    { hour: '10 PM', revenue: 18300, orders: 12 },
    { hour: '11 PM', revenue: 6050, orders: 6 },
  ],
}

const OUTLET_ICONS: Record<string, React.ElementType> = {
  utensils: UtensilsCrossed,
  wine: Wine,
  bell: BellRing,
  flower: Flower2,
  monitor: Monitor,
}

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  banknote: Banknote,
  creditcard: CreditCard,
  smartphone: Smartphone,
  bed: BedDouble,
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

// ─── Sales by Outlet ──────────────────────────────────────────────────
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

// ─── Sales by Category ────────────────────────────────────────────────
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

// ─── Payment Method Breakdown ──────────────────────────────────────────
function PaymentBreakdown({ payments }: { payments: DailyReportData['byPayment'] }) {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-amber-500',
  ]

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

// ─── Top Selling Items ────────────────────────────────────────────────
function TopSellingItems({ items }: { items: DailyReportData['topItems'] }) {
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

// ─── Hourly Sales Trend ───────────────────────────────────────────────
function HourlySalesTrend({ hourly }: { hourly: DailyReportData['hourlySales'] }) {
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

// ─── Main DailySalesReportView ───────────────────────────────────────
export default function DailySalesReportView() {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [outletFilter, setOutletFilter] = useState('all')

  // Simulate different data for different dates (in real app, would fetch from API)
  const report = useMemo(() => {
    // Use mock data for demo; in production this would be fetched based on date
    return MOCK_REPORT
  }, [reportDate])

  const filteredOutlet = useMemo(() => {
    if (outletFilter === 'all') return report.byOutlet
    return report.byOutlet.filter((o) => o.name.toLowerCase().replace(/[\s&]/g, '-') === outletFilter)
  }, [report, outletFilter])

  const handlePrint = () => {
    toast.success('Preparing print view...')
    setTimeout(() => toast.info('Print dialog would open here'), 500)
  }

  const handleExport = () => {
    toast.success('Exporting report as CSV...')
    setTimeout(() => toast.info('Download would start here'), 500)
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
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="bar-lounge">Bar & Lounge</SelectItem>
              <SelectItem value="room-service">Room Service</SelectItem>
              <SelectItem value="spa">Spa</SelectItem>
              <SelectItem value="business-center">Business Center</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1 text-[11px]" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button variant="outline" className="gap-1 text-[11px]" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards data={report} />

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
          <SalesByOutlet outlets={filteredOutlet} totalRevenue={report.totalRevenue} />
          <SalesByCategory categories={report.byCategory} />
        </div>

        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
          <PaymentBreakdown payments={report.byPayment} />
          <TopSellingItems items={report.topItems} />
        </div>

        <div className="mt-2">
          <HourlySalesTrend hourly={report.hourlySales} />
        </div>
      </Tabs>
    </div>
  )
}
