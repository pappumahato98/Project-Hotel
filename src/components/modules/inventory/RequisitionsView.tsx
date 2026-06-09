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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ClipboardList, AlertTriangle, CheckCircle, Plus, Eye, Pencil,
  ThumbsUp, ThumbsDown, PackageCheck, Trash2, Search, X, MinusCircle, PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface RequisitionItem {
  name: string
  quantity: string
  unit: string
}

interface Requisition {
  id: string
  requestDate: string
  department: string
  requestor: string
  items: RequisitionItem[]
  status: string
  priority: string
  totalItems: number
  notes?: string
  approvedBy?: string
  approvedAt?: string
}

const DEPARTMENTS = [
  'Kitchen', 'Housekeeping', 'Front Desk', 'Engineering', 'F&B', 'Spa', 'Laundry',
]

const PRIORITIES = ['High', 'Normal', 'Low']

const EMPTY_REQ_ITEM = { name: '', quantity: '', unit: 'pcs' }

const EMPTY_REQ_FORM = {
  department: 'Kitchen',
  requestor: '',
  priority: 'Normal',
  notes: '',
  items: [{ ...EMPTY_REQ_ITEM }],
}

type ReqForm = typeof EMPTY_REQ_FORM

// ── API helpers ──────────────────────────────────────────────
async function fetchRequisitions() {
  const res = await fetch('/api/requisitions')
  if (!res.ok) throw new Error('Failed to fetch requisitions')
  return res.json()
}

// ── Component ────────────────────────────────────────────────
export function RequisitionsView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null)
  const [form, setForm] = useState<ReqForm>(EMPTY_REQ_FORM)

  // ── Query ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: fetchRequisitions,
  })

  const filteredReqs = data?.requisitions?.filter((req: Requisition) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      req.requestor.toLowerCase().includes(q) ||
      req.department.toLowerCase().includes(q) ||
      req.id.toLowerCase().includes(q)
    )
  })

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (body: ReqForm) => {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: body.department,
          requestor: body.requestor,
          priority: body.priority.toLowerCase(),
          notes: body.notes,
          items: body.items.filter((i) => i.name && i.quantity),
          totalItems: body.items.filter((i) => i.name && i.quantity).length,
        }),
      })
      if (!res.ok) throw new Error('Failed to create requisition')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success('Requisition created successfully')
      setCreateOpen(false)
      setForm(EMPTY_REQ_FORM)
    },
    onError: () => toast.error('Failed to create requisition'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: unknown }) => {
      const res = await fetch('/api/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      if (!res.ok) throw new Error('Failed to update requisition')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      setEditOpen(false)
      setSelectedReq(null)
      setForm(EMPTY_REQ_FORM)
    },
    onError: () => toast.error('Failed to update requisition'),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('/api/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success(`Requisition ${variables.status === 'approved' ? 'approved' : variables.status === 'rejected' ? 'rejected' : 'marked as received'}`)
      setSelectedReq(null)
    },
    onError: () => toast.error('Failed to update requisition status'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected', notes: 'Deleted by user' }),
      })
      if (!res.ok) throw new Error('Failed to delete requisition')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success('Requisition deleted')
      setDeleteOpen(false)
      setSelectedReq(null)
    },
    onError: () => toast.error('Failed to delete requisition'),
  })

  // ── Helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_REQ_FORM)
    setCreateOpen(true)
  }

  const openEdit = (req: Requisition) => {
    setSelectedReq(req)
    setForm({
      department: req.department,
      requestor: req.requestor,
      priority: req.priority.charAt(0).toUpperCase() + req.priority.slice(1),
      notes: req.notes || '',
      items: req.items.length > 0 ? req.items : [{ ...EMPTY_REQ_ITEM }],
    })
    setEditOpen(true)
  }

  const openView = (req: Requisition) => {
    setSelectedReq(req)
    setViewOpen(true)
  }

  const openDelete = (req: Requisition) => {
    setSelectedReq(req)
    setDeleteOpen(true)
  }

  const updateFormItems = (newItems: RequisitionItem[]) => {
    setForm((f) => ({ ...f, items: newItems }))
  }

  // ── Colors ────────────────────────────────────────────────────
  const statusColors: Record<string, string> = {
    pending: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    approved: 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
    rejected: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    received: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  }

  const priorityColors: Record<string, string> = {
    high: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    normal: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
    low: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requisitions</h1>
          <p className="text-sm text-muted-foreground">Purchase requisitions and supply requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {data?.total ?? 0} requisitions
          </Badge>
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Requisition
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{data?.summary?.pending ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{data?.summary?.approved ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received</p>
              <p className="text-2xl font-bold">{data?.summary?.received ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by requestor or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requisitions Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredReqs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No requisitions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReqs?.map((req: Requisition) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">{req.id.slice(-8)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(req.requestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell className="text-sm">{req.department}</TableCell>
                      <TableCell className="text-sm">{req.requestor}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {req.items.slice(0, 2).map((item, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              {item.name} ({item.quantity} {item.unit})
                            </p>
                          ))}
                          {req.items.length > 2 && (
                            <p className="text-xs text-muted-foreground">+{req.items.length - 2} more</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[req.priority] ?? ''}>
                          <span className="capitalize">{req.priority}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[req.status] ?? ''}>
                          <span className="capitalize">{req.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(req)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {req.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(req)} title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => statusMutation.mutate({ id: req.id, status: 'approved' })} title="Approve">
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => statusMutation.mutate({ id: req.id, status: 'rejected' })} title="Reject">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => openDelete(req)} title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => statusMutation.mutate({ id: req.id, status: 'received' })} title="Mark Received">
                              <PackageCheck className="h-3.5 w-3.5" />
                            </Button>
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

      {/* ── Create Requisition Dialog ────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Requisition</DialogTitle>
            <DialogDescription>Create a new supply requisition.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Requestor *</Label>
                <Input placeholder="e.g., Chef Raj" value={form.requestor} onChange={(e) => setForm((f) => ({ ...f, requestor: e.target.value }))} />
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
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Items *</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateFormItems([...form.items, { ...EMPTY_REQ_ITEM }])}>
                  <PlusCircle className="h-3 w-3" /> Add Item
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_70px_60px] gap-2">
                      <Input placeholder="Item name" value={item.name} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], name: e.target.value }
                        updateFormItems(newItems)
                      }} />
                      <Input placeholder="Qty" value={item.quantity} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], quantity: e.target.value }
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
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.requestor || !form.department || form.items.every((i) => !i.name) || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Submit Requisition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Requisition Dialog ────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Requisition</DialogTitle>
            <DialogDescription>Update items, priority, or notes for a pending requisition.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Items</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateFormItems([...form.items, { ...EMPTY_REQ_ITEM }])}>
                  <PlusCircle className="h-3 w-3" /> Add Item
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_70px_60px] gap-2">
                      <Input placeholder="Item name" value={item.name} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], name: e.target.value }
                        updateFormItems(newItems)
                      }} />
                      <Input placeholder="Qty" value={item.quantity} onChange={(e) => {
                        const newItems = [...form.items]
                        newItems[idx] = { ...newItems[idx], quantity: e.target.value }
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
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!selectedReq) return
              toast.success('Requisition updated successfully')
              updateMutation.mutate({
                id: selectedReq.id,
                items: form.items.filter((i) => i.name && i.quantity),
                priority: form.priority.toLowerCase(),
                notes: form.notes,
                totalItems: form.items.filter((i) => i.name && i.quantity).length,
              })
            }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Requisition Dialog ────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>Full requisition information.</DialogDescription>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>{' '}
                  <span className="font-mono">{selectedReq.id.slice(-8)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span>{new Date(selectedReq.requestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>{' '}
                  <span className="font-medium">{selectedReq.department}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Requestor:</span>{' '}
                  <span className="font-medium">{selectedReq.requestor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <Badge variant="outline" className={priorityColors[selectedReq.priority] ?? ''}>
                    <span className="capitalize">{selectedReq.priority}</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant="outline" className={statusColors[selectedReq.status] ?? ''}>
                    <span className="capitalize">{selectedReq.status}</span>
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Items ({selectedReq.items.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReq.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-center text-sm font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedReq.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedReq.notes}</p>
                  </div>
                </>
              )}

              {(selectedReq.approvedBy || selectedReq.approvedAt) && (
                <>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <h4 className="font-medium">Approval History</h4>
                    {selectedReq.approvedBy && (
                      <p><span className="text-muted-foreground">Approved By:</span> {selectedReq.approvedBy}</p>
                    )}
                    {selectedReq.approvedAt && (
                      <p><span className="text-muted-foreground">Approved At:</span> {new Date(selectedReq.approvedAt).toLocaleString()}</p>
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

      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requisition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this requisition from {selectedReq?.department}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedReq && deleteMutation.mutate(selectedReq.id)}
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
