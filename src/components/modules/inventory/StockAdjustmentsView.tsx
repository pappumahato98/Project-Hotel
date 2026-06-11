'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowUpDown, Plus, ArrowDown, ArrowRight, ArrowUp, AlertCircle, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
}

interface Adjustment {
  id: string
  date: string
  itemName: string
  type: string
  quantity: number
  adjustedBy: string
  reason: string
}

const ADJUSTMENT_TYPES = [
  { value: 'receive', label: 'Receive Stock', icon: ArrowDown, color: 'text-green-600' },
  { value: 'transfer', label: 'Transfer', icon: ArrowRight, color: 'text-blue-600' },
  { value: 'write-off', label: 'Write-Off', icon: AlertCircle, color: 'text-red-600' },
  { value: 'correction', label: 'Correction', icon: ArrowUpDown, color: 'text-amber-600' },
]

const EMPTY_ADJUSTMENT_FORM = {
  itemId: '',
  type: 'receive',
  quantity: 0,
  reason: '',
}

type AdjustmentForm = typeof EMPTY_ADJUSTMENT_FORM

// ── Static demo adjustments ──────────────────────────────────
const DEMO_ADJUSTMENTS: Adjustment[] = [
  {
    id: 'adj-1',
    date: new Date().toISOString(),
    itemName: 'Bath Towels',
    type: 'receive',
    quantity: 50,
    adjustedBy: 'Admin',
    reason: 'Monthly restock from supplier',
  },
  {
    id: 'adj-2',
    date: new Date(Date.now() - 86400000).toISOString(),
    itemName: 'Coffee Beans',
    type: 'write-off',
    quantity: -5,
    adjustedBy: 'Chef Raj',
    reason: 'Expired stock removed',
  },
  {
    id: 'adj-3',
    date: new Date(Date.now() - 172800000).toISOString(),
    itemName: 'Shampoo Bottles',
    type: 'correction',
    quantity: 12,
    adjustedBy: 'HK Manager',
    reason: 'Count correction after inventory audit',
  },
  {
    id: 'adj-4',
    date: new Date(Date.now() - 259200000).toISOString(),
    itemName: 'Bed Sheets',
    type: 'transfer',
    quantity: 20,
    adjustedBy: 'Admin',
    reason: 'Transferred from storage to floor stock',
  },
]

// ── Component ────────────────────────────────────────────────
export function StockAdjustmentsView() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<AdjustmentForm>(EMPTY_ADJUSTMENT_FORM)

  // ── Fetch inventory items for dropdown ─────────────────────
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetch('/api/inventory').then((r) => {
      if (!r.ok) throw new Error('Failed to fetch')
      return r.json()
    }),
  })

  const inventoryItems: InventoryItem[] = inventoryData?.items || []

  // ── Mutations ───────────────────────────────────────────────
  const adjustmentMutation = useMutation({
    mutationFn: async (body: AdjustmentForm) => {
      const item = inventoryItems.find((i) => i.id === body.itemId)
      if (!item) throw new Error('Item not found')

      const qtyChange = body.type === 'write-off' ? -Math.abs(body.quantity) : Math.abs(body.quantity)
      const newStock = item.currentStock + qtyChange

      // Update inventory item stock
      const res = await fetch(`/api/inventory/${body.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newStock }),
      })
      if (!res.ok) throw new Error('Failed to update stock')

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stock adjusted successfully')
      setCreateOpen(false)
      setForm(EMPTY_ADJUSTMENT_FORM)
    },
    onError: () => toast.error('Failed to adjust stock'),
  })

  // ── Summary stats ───────────────────────────────────────────
  const todaysAdjustments = DEMO_ADJUSTMENTS.filter((a) =>
    new Date(a.date).toDateString() === new Date().toDateString()
  ).length

  const pendingCount = 0 // Static placeholder
  const receivedCount = DEMO_ADJUSTMENTS.filter((a) => a.type === 'receive').length
  const writtenOffCount = DEMO_ADJUSTMENTS.filter((a) => a.type === 'write-off').length

  const getTypeIcon = (type: string) => {
    const found = ADJUSTMENT_TYPES.find((t) => t.value === type)
    return found?.icon || ArrowUpDown
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'receive': return 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
      case 'transfer': return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
      case 'write-off': return 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
      case 'correction': return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
      default: return ''
    }
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Stock Adjustments</h1>
          <p className="text-xs text-muted-foreground">Track stock movements and adjustments</p>
        </div>
        <Button className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today&apos;s Adjustments</p>
              <p className="text-lg font-bold">{todaysAdjustments}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
              <ArrowRight className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Count</p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items Received</p>
              <p className="text-lg font-bold">{receivedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items Written Off</p>
              <p className="text-lg font-bold">{writtenOffCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Adjustments Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Adjusted By</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_ADJUSTMENTS.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No adjustments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  DEMO_ADJUSTMENTS.map((adj) => {
                    const TypeIcon = getTypeIcon(adj.type)
                    return (
                      <TableRow key={adj.id}>
                        <TableCell className="text-xs">
                          {new Date(adj.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{adj.itemName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('gap-1', getTypeBadgeColor(adj.type))}>
                            <TypeIcon className="h-3 w-3" />
                            <span className="capitalize text-xs">{adj.type.replace('-', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          <span className={adj.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                            {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{adj.adjustedBy}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[200px]">
                          {adj.reason}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Create Adjustment Dialog ──────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>Record a stock movement or adjustment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={form.itemId} onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Current: {item.currentStock} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className={cn('h-4 w-4', t.color)} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity || ''}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Math.abs(Number(e.target.value)) }))}
                placeholder="Enter quantity"
              />
              <p className="text-xs text-muted-foreground">
                {form.type === 'write-off'
                  ? 'Stock will be decreased by this amount.'
                  : form.type === 'receive'
                    ? 'Stock will be increased by this amount.'
                    : form.type === 'transfer'
                      ? 'Stock will be adjusted accordingly.'
                      : 'Enter the corrected quantity.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Reason for this adjustment..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => adjustmentMutation.mutate(form)}
              disabled={!form.itemId || !form.quantity || !form.reason || adjustmentMutation.isPending}
            >
              {adjustmentMutation.isPending ? 'Processing...' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
