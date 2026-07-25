'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Package, DollarSign, AlertTriangle, ClipboardList, FileText, Truck,
  Star, Plus, ArrowUpDown, TrendingUp, Clock, CalendarClock,
  UtensilsCrossed, BedDouble, Sparkles, Wrench, ShoppingCart, CircleDot, PackageCheck,
} from 'lucide-react'
import { cn, formatNPR } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  reorderPoint: number
  unitCost: number
  minStock: number
  maxStock: number
  active: boolean
}

interface Vendor {
  id: string
  name: string
  category: string
  rating: number
  totalOrders: number
  lastOrderDate: string
  status: string
}

interface RequisitionsResponse {
  requisitions: { id: string; status: string }[]
  total: number
  summary: { pending: number; approved: number; received: number }
}

// ── Category icons & colors ───────────────────────────────────
const CATEGORY_META: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  'F&B': { icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950' },
  'F&B Supplies': { icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950' },
  'Linen': { icon: BedDouble, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950' },
  'Amenities': { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-950' },
  'HK Supplies': { icon: ShoppingCart, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-950' },
  'Maintenance': { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
  'Technology': { icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-950' },
}

const DEFAULT_CATEGORY_META = { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900' }

// ── API helpers ──────────────────────────────────────────────
function fetchInventory() {
  return apiFetch<{ items: InventoryItem[] }>('/api/inventory')
}

function fetchVendors() {
  return apiFetch<{ vendors: Vendor[] }>('/api/vendors')
}

function fetchRequisitions() {
  return apiFetch<RequisitionsResponse>('/api/requisitions')
}

// ── Component ────────────────────────────────────────────────
export function InventoryDashboardView() {
  const [navigateToTab, setNavigateToTab] = useState<string | null>(null)

  // ── Queries ─────────────────────────────────────────────────
  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  })

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })

  const { data: requisitionsData, isLoading: reqsLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: fetchRequisitions,
  })

  const items: InventoryItem[] = inventoryData?.items || []
  const vendors: Vendor[] = vendorsData?.vendors || []
  const requisitions = requisitionsData?.requisitions || []

  // ── Derived KPIs ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalItems = items.length
    const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0)
    const lowStockItems = items.filter((i) => i.currentStock <= i.reorderPoint)

    // Real counts derived from requisitions data
    const pendingRequisitions = requisitions.filter((r) => r.status === 'pending').length
    const openPOs = requisitions.filter((r) => r.status === 'ordered').length
    const pendingDeliveries = requisitions.filter((r) => r.status === 'approved').length

    return { totalItems, totalValue, lowStockAlerts: lowStockItems.length, pendingRequisitions, openPOs, pendingDeliveries }
  }, [items, requisitions])

  // ── Category distribution ──────────────────────────────────
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item) => {
      map.set(item.category, (map.get(item.category) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [items])

  // ── Low stock items (sorted by urgency) ──────────────────
  const lowStockItems = useMemo(() => {
    return items
      .filter((i) => i.currentStock <= i.reorderPoint)
      .sort((a, b) => {
        const aRatio = a.maxStock > 0 ? a.currentStock / a.maxStock : 0
        const bRatio = b.maxStock > 0 ? b.currentStock / b.maxStock : 0
        return aRatio - bRatio
      })
  }, [items])

  // ── Top vendors ────────────────────────────────────────────
  const topVendors = useMemo(() => {
    return [...vendors]
      .filter((v) => v.status === 'active')
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 5)
  }, [vendors])

  // ── Loading state ──────────────────────────────────────────
  if (invLoading || vendorsLoading || reqsLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Inventory Dashboard</h1>
          <p className="text-xs text-muted-foreground">Central overview of inventory, stock levels and activity</p>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-lg font-bold">{kpis.totalItems}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">{formatNPR(kpis.totalValue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
              <p className="text-lg font-bold text-red-600">{kpis.lowStockAlerts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Requisitions</p>
              <p className="text-lg font-bold text-amber-600">{kpis.pendingRequisitions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open POs</p>
              <p className="text-lg font-bold text-purple-600">{kpis.openPOs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950">
              <Truck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Deliveries</p>
              <p className="text-lg font-bold text-cyan-600">{kpis.pendingDeliveries}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <Card className="p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Quick Actions:</span>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setNavigateToTab('stock')}>
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setNavigateToTab('requisitions')}>
            <ClipboardList className="h-3.5 w-3.5" /> New Requisition
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setNavigateToTab('purchase-orders')}>
            <FileText className="h-3.5 w-3.5" /> New PO
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setNavigateToTab('adjustments')}>
            <ArrowUpDown className="h-3.5 w-3.5" /> Stock Adjustment
          </Button>
        </div>
      </Card>

      {/* ── Middle Row: Category Distribution + Low Stock Alerts ── */}
      <div className="grid gap-2 lg:grid-cols-2">
        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-2">
              {categoryDistribution.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No items in inventory yet.</p>
              ) : (
                categoryDistribution.map((cat) => {
                  const meta = CATEGORY_META[cat.name] || DEFAULT_CATEGORY_META
                  const Icon = meta.icon
                  const percentage = kpis.totalItems > 0 ? Math.round((cat.count / kpis.totalItems) * 100) : 0
                  return (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', meta.bg)}>
                        <Icon className={cn('h-4 w-4', meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium truncate">{cat.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {cat.count} items ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <ScrollArea className="max-h-[260px]">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">All items are above reorder level.</p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item) => {
                    const percentage = item.maxStock > 0 ? Math.round((item.currentStock / item.maxStock) * 100) : 0
                    const isCritical = item.currentStock <= item.minStock
                    return (
                      <div key={item.id} className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border',
                        isCritical
                          ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                          : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30'
                      )}>
                        <CircleDot className={cn('h-3 w-3 shrink-0', isCritical ? 'text-red-500' : 'text-amber-500')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category} &middot; Reorder at {item.reorderPoint} {item.unit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn('text-sm font-bold', isCritical ? 'text-red-600' : 'text-amber-600')}>
                            {item.currentStock} {item.unit}
                          </p>
                          <Progress value={Math.min(100, percentage)} className="h-1 w-16 mt-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Recent Activity + Top Vendors + Expiring Soon ── */}
      <div className="grid gap-2 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <ScrollArea className="max-h-[300px]">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PackageCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No recent inventory activity to display.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Activity will appear here as stock is received, adjusted, or transferred.</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Vendors</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-16 text-center text-xs text-muted-foreground">
                        No active vendors yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="text-xs font-medium truncate max-w-[100px]">{vendor.name}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-medium">{vendor.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-medium">{vendor.totalOrders}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {vendor.lastOrderDate
                            ? new Date(vendor.lastOrderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <ScrollArea className="max-h-[300px]">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No expiring items to display.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">Items nearing their expiry date will appear here.</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
