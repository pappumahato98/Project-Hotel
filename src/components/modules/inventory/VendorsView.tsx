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
import { Switch } from '@/components/ui/switch'
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
import { Search, Star, Truck, Plus, Pencil, Trash2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
interface Vendor {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  category: string
  rating: number
  status: string
  lastOrderDate: string
  totalOrders: number
  address?: string
  notes?: string
}

const VENDOR_CATEGORIES = [
  'F&B', 'Linen', 'Amenities', 'HK Supplies', 'Maintenance', 'Technology', 'Miscellaneous',
]

const EMPTY_VENDOR_FORM = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  category: 'Miscellaneous',
  rating: 3,
  status: 'active' as string,
  address: '',
  notes: '',
}

type VendorForm = typeof EMPTY_VENDOR_FORM

// ── API helper ────────────────────────────────────────────────
async function fetchVendors() {
  const res = await fetch('/api/vendors')
  if (!res.ok) throw new Error('Failed to fetch vendors')
  return res.json()
}

// ── Rating Stars ──────────────────────────────────────────────
function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
            )}
          />
        </button>
      ))}
    </div>
  )
}

import { cn } from '@/lib/utils'

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────
export function VendorsView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(EMPTY_VENDOR_FORM)

  // ── Query ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })

  const filteredVendors = data?.vendors?.filter((v: Vendor) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.contact?.toLowerCase().includes(q)
  })

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (body: VendorForm) => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create vendor')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor created successfully')
      setCreateOpen(false)
      setForm(EMPTY_VENDOR_FORM)
    },
    onError: () => toast.error('Failed to create vendor'),
  })

  const updateMutation = useMutation({
    mutationFn: async (body: VendorForm & { id: string }) => {
      const { id, ...data } = body
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (!res.ok) throw new Error('Failed to update vendor')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor updated successfully')
      setEditOpen(false)
      setSelectedVendor(null)
      setForm(EMPTY_VENDOR_FORM)
    },
    onError: () => toast.error('Failed to update vendor'),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'inactive' }),
      })
      if (!res.ok) throw new Error('Failed to deactivate vendor')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor deactivated successfully')
      setDeleteOpen(false)
      setSelectedVendor(null)
    },
    onError: () => toast.error('Failed to deactivate vendor'),
  })

  // ── Helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_VENDOR_FORM)
    setCreateOpen(true)
  }

  const openEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setForm({
      name: vendor.name,
      contact: vendor.contact || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      category: vendor.category,
      rating: vendor.rating,
      status: vendor.status,
      address: vendor.address || '',
      notes: vendor.notes || '',
    })
    setEditOpen(true)
  }

  const openDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setDeleteOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Directory</h1>
          <p className="text-sm text-muted-foreground">Suppliers and vendor management</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {data?.active ?? 0} active
          </Badge>
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{data?.total ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-bold">
                {data?.vendors
                  ? (data.vendors.reduce((s: number, v: Vendor) => s + v.rating, 0) / data.vendors.length).toFixed(1)
                  : '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">
                {data?.vendors?.reduce((s: number, v: Vendor) => s + v.totalOrders, 0) ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Vendor Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Rating</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Order</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredVendors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors?.map((vendor: Vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-xs text-muted-foreground">{vendor.phone || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{vendor.contact || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{vendor.category}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <RatingStars rating={vendor.rating} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {vendor.lastOrderDate
                          ? new Date(vendor.lastOrderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center font-medium">{vendor.totalOrders}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          vendor.status === 'active'
                            ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                            : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                        }>
                          {vendor.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(vendor)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {vendor.status === 'active' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => openDelete(vendor)}>
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* ── Create Vendor Dialog ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Add a new vendor to the directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Vendor Name *</Label>
                <Input placeholder="e.g., ABC Supplies" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input placeholder="e.g., John Doe" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="e.g., +977-1234567890" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="e.g., vendor@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input placeholder="Vendor address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Rating</Label>
                <RatingInput value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status === 'active'} onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked ? 'active' : 'inactive' }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Vendor Dialog ───────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Vendor Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Rating</Label>
                <RatingInput value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status === 'active'} onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked ? 'active' : 'inactive' }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedVendor && updateMutation.mutate({ id: selectedVendor.id, ...form })} disabled={!form.name || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation Dialog ────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &ldquo;{selectedVendor?.name}&rdquo;? The vendor will be marked as inactive but can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedVendor && deactivateMutation.mutate(selectedVendor.id)}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
