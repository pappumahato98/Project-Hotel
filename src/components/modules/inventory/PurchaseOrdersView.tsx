'use client'

import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Plus, Eye, Search, CheckCircle, XCircle, Truck,
  Clock, DollarSign, AlertCircle, Package, ThumbsUp, ThumbsDown,
  MinusCircle, PlusCircle, CalendarDays,
} from 'lucide-react'
import { cn, formatNPR } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface Vendor {
  id: string
  name: string
}

interface POItem {
  name: string
  quantity: number
  unitPrice: number
  unit: string
}

interface PurchaseOrder {
  id: string
  poNumber: string
  vendor: string
  vendorId: string
  date: string
  items: POItem[]
  totalAmount: number
  priority: string
  status: string
  expectedDelivery: string
  notes?: string
  terms?: string
  approvedBy?: string
  approvedAt?: string
  createdAt: string
}

const PRIORITIES = ['High', 'Normal', 'Low']

const EMPTY_PO_ITEM: POItem = { name: '', quantity: 1, unitPrice: 0, unit: 'pcs' }

const EMPTY_PO_FORM = {
  vendorId: '',
  priority: 'Normal',
  expectedDelivery: '',
  notes: '',
  terms: '',
  items: [{ ...EMPTY_PO_ITEM }],
}

type POForm = typeof EMPTY_PO_FORM

// ── Status workflow ──────────────────────────────────────────
const STATUS_WORKFLOW: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  ordered: ['partial', 'delivered', 'cancelled'],
  partial: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

// ── Status / Priority badge colors ────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
  pending: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  ordered: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  partial: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  delivered: 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  cancelled: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  normal: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
  low: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
}

// ── API helpers ──────────────────────────────────────────────
function fetchPurchaseOrders() {
  return apiFetch<{ purchaseOrders: PurchaseOrder[] }>('/api/inventory/purchase-orders')
}

function fetchVendors() {
  return apiFetch('/api/vendors')
}

// ── Component ────────────────────────────────────────────────
export function PurchaseOrdersView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [statusChangeOpen, setStatusChangeOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [nextStatus, setNextStatus] = useState('')
  const [form, setForm] = useState<POForm>(EMPTY_PO_FORM)

  // ── Queries ─────────────────────────────────────────────────
  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })

  const purchaseOrders: PurchaseOrder[] = useMemo(
    () => poData?.purchaseOrders ?? [],
    [poData],
  )

  const vendors: Vendor[] = useMemo(() => {
    const apiVendors = vendorsData?.vendors?.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })) || []
    return apiVendors
  }, [vendorsData])

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      vendor: string
      vendorId: string
      priority: string
      expectedDelivery: string
      items: POItem[]
      notes?: string
      terms?: string
    }) =>
      apiFetch<PurchaseOrder>('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setCreateOpen(false)
      setForm(EMPTY_PO_FORM)
      toast.success('Purchase Order created successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create purchase order')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, approvedBy }: { id: string; status: string; approvedBy?: string }) =>
      apiFetch<PurchaseOrder>('/api/inventory/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, approvedBy }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(`PO updated to ${variables.status.charAt(0).toUpperCase() + variables.status.slice(1)}`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update purchase order')
    },
  })

  // ── Filtering ────────────────────────────────────────────────
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false
      if (vendorFilter !== 'all' && po.vendorId !== vendorFilter && po.vendor !== vendorFilter) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return po.poNumber.toLowerCase().includes(q) || po.vendor.toLowerCase().includes(q)
    })
  }, [purchaseOrders, searchQuery, statusFilter, vendorFilter])

  // ── Summary stats ──────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const totalPOs = purchaseOrders.length
    const pendingApproval = purchaseOrders.filter((po) => po.status === 'pending').length
    const inTransit = purchaseOrders.filter((po) => po.status === 'ordered' || po.status === 'partial').length
    const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)
    return { totalPOs, pendingApproval, inTransit, totalValue }
  }, [purchaseOrders])

  // ── Helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_PO_FORM)
    setCreateOpen(true)
  }

  const openView = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setViewOpen(true)
  }

  const openApprove = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setApproveOpen(true)
  }

  const openReject = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setRejectOpen(true)
  }

  const openStatusChange = (po: PurchaseOrder, status: string) => {
    setSelectedPO(po)
    setNextStatus(status)
    setStatusChangeOpen(true)
  }

  const updateFormItems = (newItems: POItem[]) => {
    setForm((f) => ({ ...f, items: newItems }))
  }

  const getNextStatuses = (po: PurchaseOrder): string[] => {
    return STATUS_WORKFLOW[po.status] || []
  }

  // ── Handle Create ──────────────────────────────────────────
  const handleCreate = () => {
    const vendor = vendors.find((v) => v.id === form.vendorId)
    if (!vendor || form.items.every((i) => !i.name)) return

    createMutation.mutate({
      vendor: vendor.name,
      vendorId: vendor.id,
      priority: form.priority.toLowerCase(),
      expectedDelivery: form.expectedDelivery || '',
      items: form.items.filter((i) => i.name),
      notes: form.notes || undefined,
      terms: form.terms || undefined,
    })
  }

  // ── Loading skeleton ───────────────────────────────────────
  if (poLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56 mt-1" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 flex-1 max-w-sm" />
          <Skeleton className="h-7 w-[130px]" />
          <Skeleton className="h-7 w-[160px]" />
        </div>
        <Card className="py-0">
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20 hidden md:block" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 hidden sm:block" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24 hidden lg:block" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-muted-foreground">Manage purchase orders and track deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {summaryStats.totalPOs} orders
          </Badge>
          <Button className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create New PO
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total POs</p>
              <p className="text-lg font-bold">{summaryStats.totalPOs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
              <p className="text-lg font-bold text-amber-600">{summaryStats.pendingApproval}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Transit</p>
              <p className="text-lg font-bold text-purple-600">{summaryStats.inTransit}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total PO Value</p>
              <p className="text-lg font-bold">{formatNPR(summaryStats.totalValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by PO # or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[160px] h-7 text-xs">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* PO Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Expected Delivery</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-medium">{po.poNumber}</TableCell>
                      <TableCell className="text-xs font-medium">{po.vendor}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {new Date(po.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{po.items.length}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">{formatNPR(po.totalAmount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={PRIORITY_COLORS[po.priority] ?? ''}>
                          <span className="capitalize">{po.priority}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[po.status] ?? ''}>
                          <span className="capitalize">{po.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {po.expectedDelivery
                          ? new Date(po.expectedDelivery).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(po)} title="View Details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {po.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => openApprove(po)} title="Approve">
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => openReject(po)} title="Reject">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {getNextStatuses(po).length > 0 && po.status !== 'pending' && (
                            getNextStatuses(po).map((s) => (
                              <Button
                                key={s}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  'h-7 w-7',
                                  s === 'delivered' && 'text-green-600 hover:text-green-700',
                                  s === 'cancelled' && 'text-red-500 hover:text-red-600',
                                  s === 'ordered' && 'text-purple-600 hover:text-purple-700',
                                  s === 'partial' && 'text-cyan-600 hover:text-cyan-700',
                                )}
                                onClick={() => openStatusChange(po, s)}
                                title={`Mark as ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                              >
                                {s === 'delivered' && <CheckCircle className="h-3.5 w-3.5" />}
                                {s === 'cancelled' && <XCircle className="h-3.5 w-3.5" />}
                                {s === 'ordered' && <Truck className="h-3.5 w-3.5" />}
                                {s === 'partial' && <Package className="h-3.5 w-3.5" />}
                                {s === 'pending' && <Clock className="h-3.5 w-3.5" />}
                              </Button>
                            ))
                          )}
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

      {/* ── Create PO Dialog ──────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>Add a new purchase order with item details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Vendor *</Label>
                <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={form.expectedDelivery}
                  onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))}
                />
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Order Items *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateFormItems([...form.items, { ...EMPTY_PO_ITEM }])}>
                  <PlusCircle className="h-3 w-3" /> Add Item
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_70px_90px_60px] gap-2">
                      <Input placeholder="Item name" value={item.name} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], name: e.target.value }
                        updateFormItems(newItems)
                      }} />
                      <Input type="number" placeholder="Qty" min="1" value={item.quantity || ''} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], quantity: Math.max(1, Number(e.target.value)) }
                        updateFormItems(newItems)
                      }} />
                      <Input type="number" placeholder="Price" step="0.01" value={item.unitPrice || ''} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], unitPrice: Math.max(0, Number(e.target.value)) }
                        updateFormItems(newItems)
                      }} />
                      <Input placeholder="Unit" value={item.unit} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], unit: e.target.value }
                        updateFormItems(newItems)
                      }} />
                    </div>
                  </div>
                  {form.items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 shrink-0 mt-1" onClick={() => {
                      updateFormItems(form.items.filter((_, i) => i !== idx))
                    }}>
                      <MinusCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {/* Total preview */}
              {form.items.some((i) => i.name) && (
                <div className="flex justify-end pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estimated Total: </span>
                    <span className="font-bold">{formatNPR(form.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input placeholder="e.g., Net 30, COD" value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes or instructions..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.vendorId || !form.items.some((i) => i.name) || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create PO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View PO Details Dialog ────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>Full purchase order information.</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">PO #:</span>{' '}
                  <span className="font-mono font-medium">{selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span>{new Date(selectedPO.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendor:</span>{' '}
                  <span className="font-medium">{selectedPO.vendor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <Badge variant="outline" className={PRIORITY_COLORS[selectedPO.priority] ?? ''}>
                    <span className="capitalize">{selectedPO.priority}</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant="outline" className={STATUS_COLORS[selectedPO.status] ?? ''}>
                    <span className="capitalize">{selectedPO.status}</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Delivery:</span>{' '}
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    {selectedPO.expectedDelivery
                      ? new Date(selectedPO.expectedDelivery).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
                {selectedPO.terms && (
                  <div>
                    <span className="text-muted-foreground">Payment Terms:</span>{' '}
                    <span>{selectedPO.terms}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-2">Items ({selectedPO.items.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="hidden sm:table-cell">Unit</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{item.unit}</TableCell>
                        <TableCell className="text-right text-sm">{formatNPR(item.unitPrice)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatNPR(item.quantity * item.unitPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-2 border-t pt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="text-lg font-bold">{formatNPR(selectedPO.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedPO.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedPO.notes}</p>
                  </div>
                </>
              )}

              {(selectedPO.approvedBy || selectedPO.approvedAt) && (
                <>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <h4 className="font-medium">Approval History</h4>
                    {selectedPO.approvedBy && (
                      <p><span className="text-muted-foreground">Approved By:</span> {selectedPO.approvedBy}</p>
                    )}
                    {selectedPO.approvedAt && (
                      <p><span className="text-muted-foreground">Approved At:</span> {new Date(selectedPO.approvedAt).toLocaleString()}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve PO {selectedPO?.poNumber} for {selectedPO?.vendor}? This will move the order to &ldquo;Approved&rdquo; status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (selectedPO) updateStatusMutation.mutate({ id: selectedPO.id, status: 'approved', approvedBy: 'Admin' })
                setApproveOpen(false)
                setSelectedPO(null)
              }}
            >
              {updateStatusMutation.isPending ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reject Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject PO {selectedPO?.poNumber} for {selectedPO?.vendor}? This will cancel the purchase order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (selectedPO) updateStatusMutation.mutate({ id: selectedPO.id, status: 'cancelled' })
                setRejectOpen(false)
                setSelectedPO(null)
              }}
            >
              {updateStatusMutation.isPending ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Status Change Confirmation Dialog ──────────────────── */}
      <AlertDialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Purchase Order Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update PO {selectedPO?.poNumber} to &ldquo;{nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                nextStatus === 'cancelled' && 'bg-red-600 hover:bg-red-700',
                nextStatus === 'delivered' && 'bg-green-600 hover:bg-green-700',
                nextStatus !== 'cancelled' && nextStatus !== 'delivered' && '',
              )}
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (selectedPO) updateStatusMutation.mutate({ id: selectedPO.id, status: nextStatus })
                setStatusChangeOpen(false)
                setSelectedPO(null)
              }}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
