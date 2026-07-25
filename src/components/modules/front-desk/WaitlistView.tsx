'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { toast } from 'sonner'
import {
  Clock, AlertTriangle, Crown, Phone, Plus, Search, Trash2,
  BedDouble, UserPlus, Users, CheckCircle2, Filter, X, Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

type Priority = 'High' | 'Normal' | 'Low'
type WaitlistStatus = 'Waiting' | 'Assigned' | 'Cancelled'

interface WaitlistEntry {
  id: string
  guestName: string
  contactPhone: string | null
  contactEmail: string | null
  roomPreference: string | null
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  priority: string
  status: string
  notes: string | null
  createdAt: string
}

interface ApiResult {
  entries: WaitlistEntry[]
}

// ─── Priority / Status Helpers ──────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { High: 0, Normal: 1, Low: 2 }

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'High':
      return <Badge variant="destructive" className="text-[10px] gap-0.5"><AlertTriangle className="size-3" />High</Badge>
    case 'Low':
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Low</Badge>
    default:
      return <Badge className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Normal</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Assigned':
      return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 gap-0.5"><CheckCircle2 className="size-3" />Assigned</Badge>
    case 'Cancelled':
      return <Badge variant="outline" className="text-[10px] text-muted-foreground line-through">Cancelled</Badge>
    default:
      return <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 gap-0.5"><Clock className="size-3" />Waiting</Badge>
  }
}

const ROOM_TYPE_OPTIONS = [
  { value: 'Deluxe King', label: 'Deluxe King' },
  { value: 'Deluxe Twin', label: 'Deluxe Twin' },
  { value: 'Standard Double', label: 'Standard Double' },
  { value: 'Standard Single', label: 'Standard Single' },
  { value: 'Suite', label: 'Suite' },
  { value: 'Family Room', label: 'Family Room' },
]

// ─── Main Component ────────────────────────────────────────────────────

export function WaitlistView() {
  const queryClient = useQueryClient()

  // Fetch waitlist
  const { data: apiData, isLoading, error, refetch } = useQuery<ApiResult>({
    queryKey: qk.waitlist(),
    queryFn: () => apiFetch('/api/waitlist'),
  })

  const entries = apiData?.entries ?? []

  // ─── Local state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Dialog states
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selected, setSelected] = useState<WaitlistEntry | null>(null)

  // Form state
  const [formGuestName, setFormGuestName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRoomPref, setFormRoomPref] = useState('')
  const [formCheckIn, setFormCheckIn] = useState('')
  const [formCheckOut, setFormCheckOut] = useState('')
  const [formAdults, setFormAdults] = useState(2)
  const [formChildren, setFormChildren] = useState(0)
  const [formPriority, setFormPriority] = useState<string>('Normal')
  const [formNotes, setFormNotes] = useState('')
  const [assignRoom, setAssignRoom] = useState('')

  // ─── Mutations ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/waitlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.waitlist() })
      toast.success('Added to waitlist')
      setAddOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch(`/api/waitlist/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.waitlist() })
      toast.success('Waitlist updated')
      setEditOpen(false)
      setAssignOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/waitlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.waitlist() })
      toast.success('Removed from waitlist')
      setDeleteOpen(false)
      setSelected(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Form helpers ─────────────────────────────────────────────
  function resetForm() {
    setFormGuestName(''); setFormPhone(''); setFormEmail('')
    setFormRoomPref(''); setFormCheckIn(''); setFormCheckOut('')
    setFormAdults(2); setFormChildren(0); setFormPriority('Normal')
    setFormNotes('')
  }

  function openAdd() { resetForm(); setAddOpen(true) }

  function openEdit(entry: WaitlistEntry) {
    setSelected(entry)
    setFormGuestName(entry.guestName)
    setFormPhone(entry.contactPhone || '')
    setFormEmail(entry.contactEmail || '')
    setFormRoomPref(entry.roomPreference || '')
    setFormCheckIn(entry.checkInDate)
    setFormCheckOut(entry.checkOutDate)
    setFormAdults(entry.adults)
    setFormChildren(entry.children)
    setFormPriority(entry.priority)
    setFormNotes(entry.notes || '')
    setEditOpen(true)
  }

  function openAssign(entry: WaitlistEntry) {
    setSelected(entry)
    setAssignRoom(entry.roomPreference || '')
    setAssignOpen(true)
  }

  function openDelete(entry: WaitlistEntry) {
    setSelected(entry)
    setDeleteOpen(true)
  }

  function handleCreate() {
    if (!formGuestName || !formCheckIn || !formCheckOut) {
      toast.error('Guest name, check-in, and check-out dates are required')
      return
    }
    createMutation.mutate({
      guestName: formGuestName,
      contactPhone: formPhone || undefined,
      contactEmail: formEmail || undefined,
      roomPreference: formRoomPref || undefined,
      checkInDate: formCheckIn,
      checkOutDate: formCheckOut,
      adults: formAdults,
      children: formChildren,
      priority: formPriority,
      notes: formNotes || undefined,
    })
  }

  function handleEditSave() {
    if (!selected) return
    updateMutation.mutate({
      id: selected.id,
      data: {
        guestName: formGuestName,
        contactPhone: formPhone || null,
        contactEmail: formEmail || null,
        roomPreference: formRoomPref || null,
        checkInDate: formCheckIn,
        checkOutDate: formCheckOut,
        adults: formAdults,
        children: formChildren,
        priority: formPriority,
        notes: formNotes || null,
      },
    })
  }

  function handleAssign() {
    if (!selected) return
    updateMutation.mutate({
      id: selected.id,
      data: { status: 'Assigned', roomPreference: assignRoom || null },
    })
  }

  function handleCancel(entry: WaitlistEntry) {
    updateMutation.mutate({
      id: entry.id,
      data: { status: 'Cancelled' },
    })
  }

  function handleDelete() {
    if (!selected) return
    deleteMutation.mutate(selected.id)
  }

  // ─── Filtered list ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = entries
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter(e => e.priority === priorityFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.guestName.toLowerCase().includes(q) ||
        (e.contactPhone || '').includes(q) ||
        (e.contactEmail || '').toLowerCase().includes(q) ||
        (e.roomPreference || '').toLowerCase().includes(q),
      )
    }
    // Assign position numbers based on filtered order
    return result.map((e, i) => ({ ...e, position: i + 1 }))
  }, [entries, statusFilter, priorityFilter, searchQuery])

  // Stats
  const totalWaiting = entries.filter(e => e.status === 'Waiting').length
  const totalAssigned = entries.filter(e => e.status === 'Assigned').length
  const highPriority = entries.filter(e => e.status === 'Waiting' && e.priority === 'High').length

  // ─── Render ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="size-8 mb-2" />
          <p className="text-sm font-medium">Failed to load waitlist</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <Users className="size-3.5 mr-1.5" />Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Room Waitlist</h2>
          <p className="text-xs text-muted-foreground">
            Manage guests waiting for room availability
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="size-3.5" />
          Add to Waitlist
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{totalWaiting}</p>
              <p className="text-[10px] text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{totalAssigned}</p>
              <p className="text-[10px] text-muted-foreground">Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{highPriority}</p>
              <p className="text-[10px] text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Waiting">Waiting</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Search guest, phone, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No waitlist entries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Guest</TableHead>
                  <TableHead className="text-xs">Room Pref</TableHead>
                  <TableHead className="text-xs">Dates</TableHead>
                  <TableHead className="text-xs">Guests</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Added</TableHead>
                  <TableHead className="w-[100px] text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id} className={cn(
                    'group',
                    entry.status === 'Cancelled' && 'opacity-50',
                  )}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{entry.position}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{entry.guestName}</p>
                        {entry.contactPhone && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Phone className="size-2.5" />{entry.contactPhone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{entry.roomPreference || '—'}</TableCell>
                    <TableCell>
                      <div className="text-[10px]">
                        <p>{formatDate(entry.checkInDate)}</p>
                        <p className="text-muted-foreground">→ {formatDate(entry.checkOutDate)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center">{entry.adults + entry.children}</TableCell>
                    <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {entry.status === 'Waiting' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-1.5" onClick={() => openAssign(entry)} title="Assign Room">
                              <BedDouble className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5 text-amber-600" onClick={() => openEdit(entry)} title="Edit">
                              <UserPlus className="size-3" />
                            </Button>
                          </>
                        )}
                        {entry.status !== 'Cancelled' && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5 text-red-500" onClick={() => openDelete(entry)} title="Remove">
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Dialog ─────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="size-5" />Add to Waitlist</DialogTitle>
            <DialogDescription>Add a guest to the room waitlist when no suitable rooms are available.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Guest Name *</Label>
              <Input value={formGuestName} onChange={(e) => setFormGuestName(e.target.value)} placeholder="Full name" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+977-..." className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Room Preference</Label>
              <Select value={formRoomPref} onValueChange={setFormRoomPref}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any room type" /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Check-In *</Label>
                <Input type="date" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Check-Out *</Label>
                <Input type="date" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Adults</Label>
                <Input type="number" min={1} max={10} value={formAdults} onChange={(e) => setFormAdults(parseInt(e.target.value) || 1)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Children</Label>
                <Input type="number" min={0} max={10} value={formChildren} onChange={(e) => setFormChildren(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Special requests, VIP notes..." rows={2} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Waitlist Entry</DialogTitle>
            <DialogDescription>Update guest details or preferences.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Guest Name *</Label>
              <Input value={formGuestName} onChange={(e) => setFormGuestName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Room Preference</Label>
              <Select value={formRoomPref} onValueChange={setFormRoomPref}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any room type" /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Check-In</Label>
                <Input type="date" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Check-Out</Label>
                <Input type="date" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Adults</Label>
                <Input type="number" min={1} max={10} value={formAdults} onChange={(e) => setFormAdults(parseInt(e.target.value) || 1)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Children</Label>
                <Input type="number" min={0} max={10} value={formChildren} onChange={(e) => setFormChildren(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Room Dialog ─────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BedDouble className="size-5" />Assign Room</DialogTitle>
            <DialogDescription>
              Assign a room to <span className="font-semibold">{selected?.guestName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label className="text-xs">Room Type / Number *</Label>
            <Select value={assignRoom} onValueChange={setAssignRoom}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {ROOM_TYPE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={updateMutation.isPending || !assignRoom}>
              {updateMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from Waitlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold">{selected?.guestName}</span> from the waitlist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}