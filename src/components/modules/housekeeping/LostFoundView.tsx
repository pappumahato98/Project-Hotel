'use client'
import { toast } from 'sonner'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  PackageOpen, Plus, Search, Filter, Package, Hand, Gift, Trash2,
  CalendarDays, MapPin, User, Warehouse, Eye, Camera, X, Check, AlertCircle,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ── Types ────────────────────────────────────────────────────
interface LostFoundItem {
  id: string
  roomId: string | null
  itemName: string
  category: string
  description: string | null
  storageLocation: string | null
  foundBy: string
  foundDate: string
  claimedBy: string | null
  claimDate: string | null
  status: string
  identityVerified: boolean
  claimAttachment: string | null
  createdAt: string
}

// ── Category Options ─────────────────────────────────────────
const CATEGORIES = [
  'electronics', 'clothing', 'jewelry', 'documents', 'keys', 'bags', 'books', 'other',
]

function formatCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  found: Package,
  claimed: Hand,
  donated: Gift,
  disposed: Trash2,
}

// ── View Item Dialog ─────────────────────────────────────────
function ViewItemDialog({ item, open, onOpenChange }: { item: LostFoundItem | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!item) return null
  const StatusIcon = STATUS_ICON[item.status] || Package
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5 text-primary" />
              {item.itemName}
            </DialogTitle>
            <DialogDescription>
              {formatCategory(item.category)} · {item.status === 'found' ? 'Unclaimed' : item.status === 'claimed' ? 'Claimed' : item.status}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          <div className="space-y-4 text-sm pb-4 pr-1">
            {/* Description */}
            {item.description && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p>{item.description}</p>
              </div>
            )}

            {/* Found Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Found By</p>
                <p className="font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {item.foundBy}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Found Date & Time</p>
                <p className="font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(item.foundDate), 'MMM d, yyyy · hh:mm a')}
                </p>
              </div>
              {item.roomId && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Room</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.roomId}
                  </p>
                </div>
              )}
              {item.storageLocation && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Storage Location</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5" />
                    {item.storageLocation}
                  </p>
                </div>
              )}
            </div>

            {/* Claim Details (if claimed) */}
            {item.status === 'claimed' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="font-semibold text-green-600 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Claim Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Claimed By</p>
                      <p className="font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {item.claimedBy}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Claim Date</p>
                      <p className="font-medium flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {item.claimDate ? format(new Date(item.claimDate), 'MMM d, yyyy · hh:mm a') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 rounded-lg border p-3',
                    item.identityVerified ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                  )}>
                    {item.identityVerified ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className={cn('text-sm font-medium', item.identityVerified ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400')}>
                      {item.identityVerified ? 'Identity verified with ID' : 'Identity NOT verified'}
                    </span>
                  </div>
                  {item.identityVerified && item.claimAttachment && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">ID Proof Attachment</p>
                      <div className="rounded-lg border overflow-hidden">
                        <img src={item.claimAttachment} alt="ID Proof" className="w-full h-auto max-h-40 object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ───────────────────────────────────────────
export function LostFoundView() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null)

  // Add form state
  const [addForm, setAddForm] = useState({
    itemName: '',
    category: 'other',
    roomId: '',
    storageLocation: '',
    foundBy: '',
    description: '',
  })

  // Claim form state
  const [claimForm, setClaimForm] = useState({
    claimedBy: '',
    identityVerified: false,
    claimAttachment: '' as string, // base64 of ID photo
  })

  const { data, isLoading } = useQuery<LostFoundItem[]>({
    queryKey: ['lost-found'],
    queryFn: () => apiFetch('/api/housekeeping?section=lost-found'),
  })

  const items = data || []

  // Computed stats
  const totalItems = items.length
  const unclaimedItems = items.filter((i) => i.status === 'found').length
  const claimedThisMonth = items.filter((i) => {
    if (i.status !== 'claimed' || !i.claimDate) return false
    return new Date(i.claimDate).getMonth() === new Date().getMonth()
  }).length

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.foundBy.toLowerCase().includes(q) ||
        item.roomId?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const addMutation = useMutation({
    mutationFn: (params: typeof addForm) =>
      apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-lost-found', ...params }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] })
      toast.success(`Found item "${addForm.itemName}" reported successfully`)
      setAddOpen(false)
      setAddForm({ itemName: '', category: 'other', roomId: '', storageLocation: '', foundBy: '', description: '' })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to report item')
    },
  })

  const claimMutation = useMutation({
    mutationFn: (params: { id: string; claimedBy: string; identityVerified: boolean; claimAttachment: string }) =>
      apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim-lost-found', ...params }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] })
      toast.success(`Item "${selectedItem?.itemName}" claimed successfully`)
      setClaimOpen(false)
      setClaimForm({ claimedBy: '', identityVerified: false, claimAttachment: '' })
      setSelectedItem(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to claim item')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: 'Total Items', value: totalItems, icon: PackageOpen, color: 'text-foreground' },
          { label: 'Unclaimed', value: unclaimedItems, icon: Package, color: 'text-yellow-600' },
          { label: 'Claimed This Month', value: claimedThisMonth, icon: Hand, color: 'text-green-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className={cn('h-8 w-8 opacity-20', stat.color)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + Add Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[120px] h-7 text-xs">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="found">Found</SelectItem>
              <SelectItem value="claimed">Claimed</SelectItem>
              <SelectItem value="donated">Donated</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-[120px] h-7 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Report Found Item
        </Button>
      </div>

      {/* Items Table */}
      <Card className="py-0">
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[100px]">Date Found</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Room</TableHead>
                <TableHead className="hidden lg:table-cell">Found By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    <PackageOpen className="h-8 w-8 mx-auto opacity-20 mb-2" />
                    <p>No items found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const StatusIcon = STATUS_ICON[item.status] || Package
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onDoubleClick={() => { setSelectedItem(item); setViewOpen(true) }}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => { setSelectedItem(item); setViewOpen(true) }} title="View Details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {item.status === 'found' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => { setSelectedItem(item); setClaimOpen(true) }}>
                              Claim
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                        {format(new Date(item.foundDate), 'MMM d')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-xs">{item.itemName}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {formatCategory(item.category)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        {item.roomId || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {item.foundBy}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {item.storageLocation || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* View Item Dialog */}
      <ViewItemDialog item={selectedItem} open={viewOpen} onOpenChange={setViewOpen} />

      {/* Add Found Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-w-[calc(100vw-1rem)]">
          <DialogHeader>
            <DialogTitle>Report Found Item</DialogTitle>
            <DialogDescription>
              Record details about an item found in the hotel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  placeholder="e.g., iPhone 15 Pro"
                  value={addForm.itemName}
                  onChange={(e) => setAddForm((f) => ({ ...f, itemName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={addForm.category} onValueChange={(v) => setAddForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  placeholder="e.g., 301"
                  value={addForm.roomId}
                  onChange={(e) => setAddForm((f) => ({ ...f, roomId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Found By *</Label>
                <Input
                  placeholder="Staff name"
                  value={addForm.foundBy}
                  onChange={(e) => setAddForm((f) => ({ ...f, foundBy: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                placeholder="e.g., Storage Room A, Shelf 3"
                value={addForm.storageLocation}
                onChange={(e) => setAddForm((f) => ({ ...f, storageLocation: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the item, color, condition..."
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(addForm)} disabled={!addForm.itemName || !addForm.foundBy || addMutation.isPending}>
              {addMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Item Dialog */}
      {selectedItem && <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-1rem)] max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="shrink-0 px-6 pt-6 pb-2">
            <DialogHeader>
              <DialogTitle>Claim Item</DialogTitle>
              <DialogDescription>
                {`Process claim for "${selectedItem.itemName}"`}
              </DialogDescription>
            </DialogHeader>
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="space-y-4 py-4 pr-1">
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedItem.itemName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>Found: {format(new Date(selectedItem.foundDate), 'MMM d, yyyy')}</span>
                  {selectedItem.roomId && (
                    <>
                      <span>·</span>
                      <span>Room {selectedItem.roomId}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Claimed By *</Label>
                <Input
                  placeholder="Guest / person name"
                  value={claimForm.claimedBy}
                  onChange={(e) => setClaimForm((f) => ({ ...f, claimedBy: e.target.value }))}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={claimForm.identityVerified}
                    onCheckedChange={(checked) =>
                      setClaimForm((f) => ({ ...f, identityVerified: !!checked }))
                    }
                  />
                  <span className="text-sm">Identity verified with ID</span>
                </label>
              </div>

              {claimForm.identityVerified && (
              <div className="space-y-2">
                <Label>ID Proof Attachment</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="claim-attachment"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setClaimForm((f) => ({ ...f, claimAttachment: reader.result as string }))
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                  <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById('claim-attachment')?.click()}>
                    <Camera className="h-4 w-4" />
                    {claimForm.claimAttachment ? 'Change Photo' : 'Capture/Upload ID'}
                  </Button>
                  {claimForm.claimAttachment && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-500"
                      onClick={() => setClaimForm((f) => ({ ...f, claimAttachment: '' }))}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                {claimForm.claimAttachment && (
                  <div className="rounded-md border overflow-hidden">
                    <img src={claimForm.claimAttachment} alt="ID Proof" className="w-full h-auto max-h-32 object-contain bg-muted/30" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Take a photo or upload the claimant&apos;s ID for verification</p>
              </div>
              )}
            </div>
          </ScrollArea>
          <div className="shrink-0 px-6 pb-4 pt-2 border-t">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setClaimOpen(false)}>Cancel</Button>
              <Button onClick={() => claimMutation.mutate({
                id: selectedItem.id,
                claimedBy: claimForm.claimedBy,
                identityVerified: claimForm.identityVerified,
                claimAttachment: claimForm.claimAttachment,
              })} disabled={!claimForm.claimedBy || !claimForm.identityVerified || claimMutation.isPending}>
                {claimMutation.isPending ? 'Processing...' : 'Confirm Claim'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>}
    </div>
  )
}