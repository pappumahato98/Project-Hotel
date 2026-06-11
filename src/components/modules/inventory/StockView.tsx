'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, AlertTriangle, Package, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatNPR, cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  reorderPoint: number
  unitCost: number
  supplier?: string
  location?: string
  minStock: number
  maxStock: number
  active: boolean
}

const UNITS = ['pcs', 'kg', 'ltr', 'mtr', 'box', 'pack', 'set']

const EMPTY_FORM = {
  name: '',
  category: '',
  unit: 'pcs',
  currentStock: 0,
  reorderPoint: 0,
  minStock: 0,
  maxStock: 0,
  unitCost: 0,
  supplier: '',
  location: '',
  active: true,
}

type ItemForm = typeof EMPTY_FORM

// ── API helpers ──────────────────────────────────────────────
async function fetchInventory(category?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  const res = await fetch(`/api/inventory?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch inventory')
  return res.json()
}

// ── Component ────────────────────────────────────────────────
export function StockView() {
  const queryClient = useQueryClient()
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM)

  // ── Queries ─────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', filterCategory],
    queryFn: () => fetchInventory(filterCategory || undefined),
  })

  const filteredItems = data?.items?.filter((item: InventoryItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.supplier?.toLowerCase().includes(q)
  })

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (body: ItemForm) => {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Item created successfully')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create item'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: InventoryItem & { id: string }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Item updated successfully')
      setEditOpen(false)
      setSelectedItem(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to update item'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Item deleted successfully')
      setDeleteOpen(false)
      setSelectedItem(null)
    },
    onError: () => toast.error('Failed to delete item'),
  })

  // ── Helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      minStock: item.minStock,
      maxStock: item.maxStock,
      unitCost: item.unitCost,
      supplier: item.supplier || '',
      location: item.location || '',
      active: item.active,
    })
    setEditOpen(true)
  }

  const openDelete = (item: InventoryItem) => {
    setSelectedItem(item)
    setDeleteOpen(true)
  }

  const getStockPercentage = (item: InventoryItem) => {
    if (item.maxStock <= 0) return 0
    return Math.min(100, Math.round((item.currentStock / item.maxStock) * 100))
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Stock Levels</h1>
          <p className="text-xs text-muted-foreground">Current inventory status and stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {data?.total ?? 0} items
          </Badge>
          <Button className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-lg font-bold">{data?.total ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-lg font-bold text-red-600">{data?.lowStockItems?.length ?? '—'}</p>
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
              <p className="text-lg font-bold">{data ? formatNPR(data.totalValue) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-lg font-bold">{data?.categories?.length ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {data?.lowStockItems?.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {data.lowStockItems.length} items are at or below reorder point
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.lowStockItems.slice(0, 5).map((item: InventoryItem) => (
                <Badge key={item.id} variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {item.name}: {item.currentStock} {item.unit}
                </Badge>
              ))}
              {data.lowStockItems.length > 5 && (
                <Badge variant="outline">+{data.lowStockItems.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-7 rounded-md border bg-background px-3 text-xs"
        >
          <option value="">All Categories</option>
          {data?.categories?.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Reorder Point</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Unit Cost</TableHead>
                  <TableHead className="hidden md:table-cell">Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems?.map((item: InventoryItem) => (
                    <TableRow key={item.id} className={cn(item.currentStock <= item.reorderPoint && 'bg-red-50/50 dark:bg-red-950/20')}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.currentStock <= item.reorderPoint && (
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.category}</TableCell>
                      <TableCell className="text-center font-medium">
                        <span className={cn(item.currentStock <= item.reorderPoint && 'text-red-600')}>
                          {item.currentStock}
                        </span>
                        <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-center">
                        {item.reorderPoint} {item.unit}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">{formatNPR(item.unitCost)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Progress
                          value={getStockPercentage(item)}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground ml-1">
                          {getStockPercentage(item)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          item.currentStock <= item.reorderPoint
                            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                            : item.currentStock <= item.minStock * 1.5
                              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                        )}>
                          {item.currentStock <= item.reorderPoint ? 'Low' : item.currentStock <= item.minStock * 1.5 ? 'Warning' : 'Good'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => openDelete(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Create Item Dialog ─────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Create a new item in the inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Item Name *</Label>
                <Input placeholder="e.g., Bath Towel" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input placeholder="e.g., Linen" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input type="number" value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input type="number" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Stock</Label>
                <Input type="number" value={form.maxStock} onChange={(e) => setForm((f) => ({ ...f, maxStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input placeholder="e.g., ABC Supplies" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g., Store Room A" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.category || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ──────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Item Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input type="number" value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input type="number" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Stock</Label>
                <Input type="number" value={form.maxStock} onChange={(e) => setForm((f) => ({ ...f, maxStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedItem && updateMutation.mutate({ id: selectedItem.id, ...form })} disabled={!form.name || !form.category || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedItem?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
