'use client'

import React, { useState } from 'react'
import { apiFetch } from '@/lib/api'
import {
  Receipt, DollarSign, TrendingUp, Ban, Calendar, Filter,
  Clock, Eye, ShoppingBag,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery } from '@tanstack/react-query'
import { formatNPR, timeAgo } from './pos-types'

// ─── Types ────────────────────────────────────────────────────────────
interface HistoryOrder {
  id: string
  tableId: number | null
  items: { id: string; name: string; price: number; quantity: number; notes?: string }[]
  itemCount: number
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
}

interface HistoryStats {
  todayOrders: number
  todayRevenue: number
  avgOrderValue: number
  voidCount: number
}

// ─── Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    open: { variant: 'default', className: 'bg-amber-600 hover:bg-amber-600 text-white' },
    in_progress: { variant: 'secondary', className: 'bg-blue-600 hover:bg-blue-600 text-white' },
    ready: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
    served: { variant: 'secondary', className: '' },
    closed: { variant: 'outline', className: 'text-muted-foreground' },
    voided: { variant: 'destructive', className: '' },
  }
  const c = config[status] ?? config.open
  return (
    <Badge variant={c.variant} className={`text-[10px] ${c.className}`}>
      {status.toUpperCase()}
    </Badge>
  )
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    paid: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
    unpaid: { variant: 'outline', className: '' },
    partial: { variant: 'secondary', className: 'bg-amber-600 hover:bg-amber-600 text-white' },
  }
  const c = config[paymentStatus] ?? config.unpaid
  return (
    <Badge variant={c.variant} className={`text-[10px] ${c.className}`}>
      {paymentStatus.toUpperCase()}
    </Badge>
  )
}

// ─── Summary Cards ─────────────────────────────────────────────────
function SummaryCards({ stats }: { stats: HistoryStats | undefined }) {
  const cards = [
    { label: "Today's Orders", value: stats?.todayOrders ?? 0, icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: "Today's Revenue", value: stats ? formatNPR(stats.todayRevenue) : 'NPR 0', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Avg Order Value', value: stats ? formatNPR(stats.avgOrderValue) : 'NPR 0', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Void Count', value: stats?.voidCount ?? 0, icon: Ban, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
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

// ─── Order Detail Dialog ─────────────────────────────────────────────
function OrderDetailDialog({
  open,
  onClose,
  order,
}: {
  open: boolean
  onClose: () => void
  order: HistoryOrder | null
}) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Order {order.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.status} />
            <PaymentBadge paymentStatus={order.paymentStatus} />
            <Badge variant="outline" className="text-[10px]">
              <Clock className="h-2.5 w-2.5 mr-0.5" /> {timeAgo(order.createdAt)} ago
            </Badge>
            {order.tableId && (
              <Badge variant="outline" className="text-[10px]">
                <ShoppingBag className="h-2.5 w-2.5 mr-0.5" /> Table {order.tableId}
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 pr-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNPR(item.price)} × {item.quantity}
                    </p>
                    {item.notes && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Note: {item.notes}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium ml-3">{formatNPR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatNPR(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatNPR(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatNPR(order.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatNPR(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <Skeleton className="h-12 rounded-md" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    </div>
  )
}

// ─── Main OrderHistoryView ──────────────────────────────────────────
export default function OrderHistoryView() {
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<HistoryOrder | null>(null)

  const { data: historyData, isLoading } = useQuery<{
    orders: HistoryOrder[]
    stats: HistoryStats
  }>({
    queryKey: ['pos', 'order-history', dateFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        section: 'order-history',
        date: dateFilter,
        status: statusFilter,
      })
      return apiFetch(`/api/pos?${params}`)
    },
    refetchInterval: 15000, // 15-second auto-refresh
  })

  const orders = historyData?.orders ?? []
  const stats = historyData?.stats

  if (isLoading && !historyData) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-2">
      {/* Summary Cards */}
      <SummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-48 h-7 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{orders.length} orders</span>
          <span className="text-[10px]">(Auto-refresh: 15s)</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Order #</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Table</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Items</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Subtotal</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Tax</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Discount</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Payment</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Time</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">
                    No orders found for the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <span className="text-xs font-mono">{order.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {order.tableId ? `T-${order.tableId}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{order.itemCount}</td>
                    <td className="px-3 py-2.5 text-right">{formatNPR(order.subtotal)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNPR(order.taxAmount)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">
                      {order.discountAmount > 0 ? `-${formatNPR(order.discountAmount)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatNPR(order.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PaymentBadge paymentStatus={order.paymentStatus} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(order.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  )
}
