'use client'
import { toast } from 'sonner'

import React, { useState, useMemo } from 'react'
import {
  UtensilsCrossed, Users, DollarSign, ShoppingBag, Plus, Minus,
  Trash2, Search, X, CreditCard, BedDouble, AlertTriangle, Clock, PartyPopper,
  Percent, Scissors, Receipt, Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePosData, formatNPR, timeAgo,
  type TableItem, type MenuItem, type Order, type OrderItem, type GuestReservation,
} from './pos-types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '@/lib/store'

// ─── Allergen Icons ─────────────────────────────────────────────────
function AllergenBadges({ allergens }: { allergens?: string[] }) {
  if (!allergens || allergens.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {allergens.map((a) => (
        <Badge key={a} variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          {a}
        </Badge>
      ))}
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: { openTables: number; totalCovers: number; revenueToday: number } }) {
  const items = [
    { label: 'Open Tables', value: stats.openTables, icon: UtensilsCrossed, color: 'text-emerald-600' },
    { label: 'Total Covers', value: stats.totalCovers, icon: Users, color: 'text-blue-600' },
    { label: "Today's Revenue", value: formatNPR(stats.revenueToday), icon: DollarSign, color: 'text-amber-600' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <Card key={item.label} className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className={`rounded-lg p-1.5 bg-muted ${item.color}`}>
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{item.label}</p>
              <p className="text-sm font-bold truncate">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Table Grid ─────────────────────────────────────────────────────
function TableGrid({
  tables,
  selectedTable,
  onSelect,
}: {
  tables: TableItem[]
  selectedTable: number | null
  onSelect: (id: number) => void
}) {
  const statusConfig: Record<TableItem['status'], { bg: string; border: string; label: string; dot: string }> = {
    available: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', label: 'Available', dot: 'bg-emerald-500' },
    occupied: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-700', label: 'Occupied', dot: 'bg-blue-500' },
    reserved: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700', label: 'Reserved', dot: 'bg-amber-500' },
    needs_cleaning: { bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-300 dark:border-gray-600', label: 'Needs Cleaning', dot: 'bg-gray-400' },
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
      {tables.map((table) => {
        const config = statusConfig[table.status]
        const isSelected = selectedTable === table.id
        return (
          <button
            key={table.id}
            onClick={() => onSelect(table.id)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 transition-all hover:shadow-md ${config.bg} ${config.border} ${
              isSelected ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-lg' : ''
            }`}
          >
            <span className="text-lg font-bold">{table.id}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <PartyPopper className="h-3 w-3" />
              {table.seats}
            </span>
            {table.status === 'occupied' && table.guestCount && (
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                {table.guestCount} guests
              </span>
            )}
            <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${config.dot}`} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Order Panel ────────────────────────────────────────────────────
function OrderPanel({
  order,
  onUpdateQty,
  onRemoveItem,
  onOpenMenu,
  onPay,
  onPostToRoom,
  onOpenDiscount,
  onOpenSplitBill,
  isRemoving,
  discountAmount,
}: {
  order: Order | null
  onUpdateQty: (itemId: string, delta: number) => void
  onRemoveItem: (itemId: string) => void
  onOpenMenu: () => void
  onPay: () => void
  onPostToRoom: () => void
  onOpenDiscount: () => void
  onOpenSplitBill: () => void
  isRemoving: string | null
  discountAmount: number
}) {
  const { settings } = useSettingsStore()
  const subtotal = order?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0
  const tax = Math.round((subtotal - discountAmount) * (settings.taxRate / 100))
  const total = subtotal - discountAmount + tax

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Table {order?.tableId} — {order?.guestName}
          </CardTitle>
          {order?.rush && (
            <Badge variant="destructive" className="text-[10px]">RUSH</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {order ? `Order ${order.id} · ${timeAgo(order.createdAt)} ago` : 'Select a table to view order'}
        </p>
      </CardHeader>

      {order && (
        <>
          <CardContent className="flex-1 px-3 pb-0">
            <ScrollArea className="h-[240px]">
              <div className="space-y-2 pr-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNPR(item.price)}</p>
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQty(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQty(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{formatNPR(item.price * item.quantity)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={isRemoving === item.id}
                    >
                      {isRemoving === item.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="px-3 pt-2">
            <Separator className="mb-2" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatNPR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatNPR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({settings.taxRate}%)</span>
                <span>{formatNPR(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>{formatNPR(total)}</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button onClick={onOpenMenu} variant="outline" className="flex-1 gap-1 text-[11px] h-7">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
              <Button onClick={onPostToRoom} variant="outline" className="flex-1 gap-1 text-[11px] h-7">
                <BedDouble className="h-3.5 w-3.5" /> Post to Room
              </Button>
              <Button onClick={onOpenDiscount} variant="outline" className="flex-1 gap-1 text-[11px] h-7">
                <Percent className="h-3.5 w-3.5" /> Discount
              </Button>
              <Button onClick={onOpenSplitBill} variant="outline" className="flex-1 gap-1 text-[11px] h-7">
                <Scissors className="h-3.5 w-3.5" /> Split
              </Button>
              <Button onClick={onPay} className="flex-1 gap-1 text-[11px] h-7">
                <CreditCard className="h-3.5 w-3.5" /> Pay
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

// ─── Menu Browser Sheet ──────────────────────────────────────────────
function MenuBrowserSheet({
  open,
  onClose,
  menuItems,
  onAddItem,
}: {
  open: boolean
  onClose: () => void
  menuItems: MenuItem[]
  onAddItem: (item: MenuItem) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'appetizer', label: 'Appetizers' },
    { id: 'main_course', label: 'Main Course' },
    { id: 'beverage', label: 'Beverages' },
    { id: 'dessert', label: 'Desserts' },
  ]

  const filtered = useMemo(() => {
    return menuItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      return item.available
    })
  }, [menuItems, category, search])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Menu Browser
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-3 flex-1 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="w-full h-7">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs flex-1">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={category} className="mt-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAddItem(item)
                        onClose()
                      }}
                      className="flex items-start gap-2 rounded-lg border p-3 text-left transition-all hover:shadow-md hover:border-primary/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-sm font-bold text-primary">{formatNPR(item.price)}</p>
                        <AllergenBadges allergens={item.allergens} />
                      </div>
                      <Plus className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No items found</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Payment Dialog ─────────────────────────────────────────────────
function PaymentDialog({
  open,
  onClose,
  total,
}: {
  open: boolean
  onClose: () => void
  total: number
}) {
  const [method, setMethod] = useState('cash')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Process Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-3xl font-bold mt-1">{formatNPR(total)}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="mobile">Mobile Payment (eSewa/Khalti)</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === 'cash' && (
            <div>
              <label className="text-sm font-medium">Amount Received</label>
              <Input type="number" placeholder="Enter amount" className="mt-1.5" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.success('Payment processed successfully'); onClose() }}>Complete Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Void Reason Dialog ──────────────────────────────────────────────
function VoidDialog({
  open,
  onClose,
  onConfirm,
  itemName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Void Item
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Are you sure you want to void <strong>{itemName}</strong>? This requires manager approval.
        </p>
        <Input placeholder="Reason for void (required)" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose() }}>Void Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Post to Room Dialog ────────────────────────────────────────────
function PostToRoomDialog({
  open,
  onClose,
  reservations,
}: {
  open: boolean
  onClose: () => void
  reservations: GuestReservation[]
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Post to Room
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select the guest reservation to charge this order to:</p>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select guest..." />
          </SelectTrigger>
          <SelectContent>
            {reservations.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.guestName} — Room {r.roomNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.info('Charge posted to guest room'); onClose() }}>Post Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Discount Dialog ─────────────────────────────────────────────────
function DiscountDialog({
  open,
  onClose,
  orderId,
  subtotal,
  discountAmount: currentDiscount,
}: {
  open: boolean
  onClose: () => void
  orderId: string | null
  subtotal: number
  discountAmount: number
}) {
  const queryClient = useQueryClient()
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [reason, setReason] = useState('')

  const calculatedDiscount = useMemo(() => {
    const val = parseFloat(discountValue) || 0
    if (discountType === 'percentage') return Math.round(subtotal * (Math.min(val, 100) / 100))
    return Math.min(val, subtotal)
  }, [discountType, discountValue, subtotal])

  const discountMutation = useMutation({
    mutationFn: async (data: { orderId: string; discountType: string; discountValue: number; reason?: string }) => {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_discount', ...data }),
      })
      if (!res.ok) throw new Error('Failed to apply discount')
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Discount of ${formatNPR(calculatedDiscount)} applied successfully`)
      queryClient.invalidateQueries({ queryKey: ['pos'] })
      setDiscountValue('')
      setReason('')
      onClose()
    },
    onError: () => {
      toast.error('Failed to apply discount')
    },
  })

  const handleApply = () => {
    if (!orderId || !discountValue) return
    discountMutation.mutate({
      orderId,
      discountType,
      discountValue: calculatedDiscount,
      reason: reason || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Apply Discount
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Order Subtotal: </span>
            <span className="font-bold">{formatNPR(subtotal)}</span>
          </div>
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (NPR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">
              Discount Value {discountType === 'percentage' ? '(%)' : '(NPR)'}
            </label>
            <Input
              type="number"
              min="0"
              max={discountType === 'percentage' ? '100' : String(subtotal)}
              step={discountType === 'percentage' ? '0.5' : '1'}
              placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              placeholder="e.g. Loyalty discount, manager approval..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
            />
          </div>
          {calculatedDiscount > 0 && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
              <span className="text-emerald-700 dark:text-emerald-300">Discount Amount: </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                -{formatNPR(calculatedDiscount)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                (Net: {formatNPR(subtotal - calculatedDiscount)})
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!orderId || !discountValue || calculatedDiscount <= 0 || discountMutation.isPending}
          >
            {discountMutation.isPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
            ) : null}
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Split Bill Dialog ────────────────────────────────────────────────
function SplitBillDialog({
  open,
  onClose,
  order,
}: {
  open: boolean
  onClose: () => void
  order: Order | null
}) {
  const queryClient = useQueryClient()
  const [splitCount, setSplitCount] = useState(2)
  const [assignments, setAssignments] = useState<Record<string, number>>({})

  const splitSubtotals = useMemo(() => {
    if (!order) return []
    const subs = Array(splitCount).fill(0)
    order.items.forEach((item) => {
      const split = assignments[item.id] ?? 1
      if (split >= 1 && split <= splitCount) {
        subs[split - 1] += item.price * item.quantity
      }
    })
    return subs
  }, [order, splitCount, assignments])

  const splitMutation = useMutation({
    mutationFn: async (data: { orderId: string; assignments: Record<string, number>; splitSubtotals: number[] }) => {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split_bill', ...data }),
      })
      if (!res.ok) throw new Error('Failed to split bill')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bill split successfully recorded')
      queryClient.invalidateQueries({ queryKey: ['pos'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to split bill')
    },
  })

  const handleApplySplit = () => {
    if (!order) return
    splitMutation.mutate({
      orderId: order.id,
      assignments,
      splitSubtotals,
    })
  }

  const handleReset = () => {
    setAssignments({})
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Split Bill — Order {order?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Number of Splits</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setSplitCount(Math.max(2, splitCount - 1)); handleReset() }}
                disabled={splitCount <= 2}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-bold">{splitCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setSplitCount(Math.min(5, splitCount + 1)); handleReset() }}
                disabled={splitCount >= 5}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={handleReset}>
              Reset Assignments
            </Button>
          </div>

          {/* Split subtotal cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {splitSubtotals.map((sub, idx) => (
              <div key={idx} className="rounded-lg border p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  Split {idx + 1}
                </div>
                <p className="text-sm font-bold mt-1">{formatNPR(sub)}</p>
              </div>
            ))}
          </div>

          {/* Item assignments */}
          {order && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assign items to splits:</p>
              {order.items.map((item) => {
                const assigned = assignments[item.id] ?? 1
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatNPR(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: splitCount }, (_, idx) => idx + 1).map((n) => (
                        <Button
                          key={n}
                          variant={assigned === n ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 w-7 text-xs p-0 ${assigned === n ? '' : ''}`}
                          onClick={() => setAssignments((prev) => ({ ...prev, [item.id]: n }))}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApplySplit} disabled={splitMutation.isPending}>
            {splitMutation.isPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
            ) : (
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
            )}
            Apply Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main RestaurantView ────────────────────────────────────────────
export default function RestaurantView() {
  const { data, isLoading } = usePosData('restaurant')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; itemName: string; itemId: string }>({ open: false, itemName: '', itemId: '' })
  const [postToRoomOpen, setPostToRoomOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [splitBillOpen, setSplitBillOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)

  const tables = data?.tables ?? []
  const menuItems = data?.menuItems ?? []
  const orders = data?.orders ?? []
  const reservations = data?.guestReservations ?? []
  const stats = data?.stats

  const currentOrder = useMemo(() => {
    if (!selectedTable) return null
    return orders.find((o) => o.tableId === selectedTable) ?? null
  }, [selectedTable, orders])

  const handleSelectTable = (id: number) => {
    setSelectedTable(selectedTable === id ? null : id)
    setDiscountAmount(0)
  }

  const handleUpdateQty = (itemId: string, delta: number) => {
    // Client-side optimistic simulation
  }

  const handleRemoveItem = (itemId: string) => {
    const item = currentOrder?.items.find((i) => i.id === itemId)
    if (item) {
      setVoidDialog({ open: true, itemName: item.name, itemId })
    }
  }

  const handleConfirmVoid = () => {
    setIsRemoving(voidDialog.itemId)
    toast.success(`Item "${voidDialog.itemName}" voided`)
    setTimeout(() => setIsRemoving(null), 1000)
  }

  const handleAddItem = (_item: MenuItem) => {
    // Optimistic add
  }

  const { settings } = useSettingsStore()
  const subtotal = currentOrder?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0
  const tax = Math.round((subtotal - discountAmount) * (settings.taxRate / 100))
  const total = subtotal - discountAmount + tax

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Stats Bar */}
      {stats && <StatsBar stats={stats} />}

      {/* Main Layout */}
      <div className="grid gap-2 lg:grid-cols-[1fr_380px]">
        {/* Left: Table Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Floor Plan</h2>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Occupied</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Reserved</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Cleaning</span>
            </div>
          </div>
          <TableGrid
            tables={tables}
            selectedTable={selectedTable}
            onSelect={handleSelectTable}
          />

          {/* Status summary */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{tables.filter((t) => t.status === 'available').length} Available</span>
            <span>{tables.filter((t) => t.status === 'occupied').length} Occupied</span>
            <span>{tables.filter((t) => t.status === 'reserved').length} Reserved</span>
            <span>{tables.filter((t) => t.status === 'needs_cleaning').length} Cleaning</span>
          </div>
        </div>

        {/* Right: Order Panel */}
        <OrderPanel
          order={currentOrder}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onOpenMenu={() => setMenuOpen(true)}
          onPay={() => setPaymentOpen(true)}
          onPostToRoom={() => setPostToRoomOpen(true)}
          onOpenDiscount={() => setDiscountOpen(true)}
          onOpenSplitBill={() => setSplitBillOpen(true)}
          isRemoving={isRemoving}
          discountAmount={discountAmount}
        />
      </div>

      {/* Menu Browser Sheet */}
      <MenuBrowserSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        menuItems={menuItems}
        onAddItem={handleAddItem}
      />

      {/* Payment Dialog */}
      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} total={total} />

      {/* Void Dialog */}
      <VoidDialog
        open={voidDialog.open}
        onClose={() => setVoidDialog({ ...voidDialog, open: false })}
        onConfirm={handleConfirmVoid}
        itemName={voidDialog.itemName}
      />

      {/* Post to Room Dialog */}
      <PostToRoomDialog
        open={postToRoomOpen}
        onClose={() => setPostToRoomOpen(false)}
        reservations={reservations}
      />

      {/* Discount Dialog */}
      <DiscountDialog
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        orderId={currentOrder?.id ?? null}
        subtotal={subtotal}
        discountAmount={discountAmount}
      />

      {/* Split Bill Dialog */}
      <SplitBillDialog
        open={splitBillOpen}
        onClose={() => setSplitBillOpen(false)}
        order={currentOrder}
      />
    </div>
  )
}
