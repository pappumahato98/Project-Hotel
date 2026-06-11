'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Clock, AlertTriangle, Crown, Phone, Plus, Search, Trash2,
  BedDouble, UserPlus, Users, CheckCircle2, Filter, X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  position: number
  guestName: string
  roomPreference: string
  checkInDate: string
  checkOutDate: string
  guestsCount: number
  priority: Priority
  status: WaitlistStatus
  contactPhone: string
  notes: string
  addedDate: string
}

// ─── Static Mock Data ───────────────────────────────────────────────────

const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: 'wl-1',
    position: 1,
    guestName: 'Rajesh Sharma',
    roomPreference: 'Deluxe King',
    checkInDate: '2025-07-20',
    checkOutDate: '2025-07-23',
    guestsCount: 2,
    priority: 'High',
    status: 'Waiting',
    contactPhone: '+977-9841-234567',
    notes: 'Returning guest, corporate account with Nepal Telecom',
    addedDate: '2025-07-18',
  },
  {
    id: 'wl-2',
    position: 2,
    guestName: 'Sarah Mitchell',
    roomPreference: 'Suite',
    checkInDate: '2025-07-20',
    checkOutDate: '2025-07-25',
    guestsCount: 2,
    priority: 'High',
    status: 'Waiting',
    contactPhone: '+1-555-012-3456',
    notes: 'Honeymoon couple, wants mountain view',
    addedDate: '2025-07-17',
  },
  {
    id: 'wl-3',
    position: 3,
    guestName: 'Bikash Thapa',
    roomPreference: 'Standard Double',
    checkInDate: '2025-07-21',
    checkOutDate: '2025-07-22',
    guestsCount: 1,
    priority: 'Normal',
    status: 'Waiting',
    contactPhone: '+977-9851-345678',
    notes: 'Business traveler, needs early check-in',
    addedDate: '2025-07-19',
  },
  {
    id: 'wl-4',
    position: 4,
    guestName: 'Priya Koirala',
    roomPreference: 'Deluxe Twin',
    checkInDate: '2025-07-20',
    checkOutDate: '2025-07-24',
    guestsCount: 3,
    priority: 'Normal',
    status: 'Assigned',
    contactPhone: '+977-9861-456789',
    notes: 'Family with one child, needs extra bed',
    addedDate: '2025-07-16',
  },
  {
    id: 'wl-5',
    position: 5,
    guestName: 'David Chen',
    roomPreference: 'Superior King',
    checkInDate: '2025-07-21',
    checkOutDate: '2025-07-23',
    guestsCount: 1,
    priority: 'Low',
    status: 'Waiting',
    contactPhone: '+86-138-0012-3456',
    notes: 'Tourist, flexible on dates',
    addedDate: '2025-07-19',
  },
  {
    id: 'wl-6',
    position: 6,
    guestName: 'Aarav Poudel',
    roomPreference: 'Standard Single',
    checkInDate: '2025-07-22',
    checkOutDate: '2025-07-24',
    guestsCount: 1,
    priority: 'Low',
    status: 'Cancelled',
    contactPhone: '+977-9842-567890',
    notes: 'Cancelled — found alternative hotel',
    addedDate: '2025-07-15',
  },
  {
    id: 'wl-7',
    position: 7,
    guestName: 'Emily Johnson',
    roomPreference: 'Premium Suite',
    checkInDate: '2025-07-21',
    checkOutDate: '2025-07-26',
    guestsCount: 2,
    priority: 'High',
    status: 'Waiting',
    contactPhone: '+44-7700-900123',
    notes: 'Conference attendee, booking.com reservation',
    addedDate: '2025-07-18',
  },
  {
    id: 'wl-8',
    position: 8,
    guestName: 'Suman Lama',
    roomPreference: 'Deluxe King',
    checkInDate: '2025-07-22',
    checkOutDate: '2025-07-23',
    guestsCount: 2,
    priority: 'Normal',
    status: 'Assigned',
    contactPhone: '+977-9852-678901',
    notes: 'Anniversary celebration, requested fruit basket',
    addedDate: '2025-07-17',
  },
]

const AVAILABLE_ROOMS = [
  { id: 'room-101', number: '101', type: 'Standard Double', floor: 1 },
  { id: 'room-205', number: '205', type: 'Deluxe King', floor: 2 },
  { id: 'room-301', number: '301', type: 'Suite', floor: 3 },
  { id: 'room-310', number: '310', type: 'Premium Suite', floor: 3 },
  { id: 'room-108', number: '108', type: 'Deluxe Twin', floor: 1 },
]

// ─── Priority Badge Component ──────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    High: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-700',
    Normal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    Low: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
  }
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', styles[priority])}>
      {priority === 'High' && <AlertTriangle className="size-3 mr-0.5" />}
      {priority}
    </Badge>
  )
}

function StatusBadge({ status }: { status: WaitlistStatus }) {
  const styles: Record<WaitlistStatus, string> = {
    Waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    Assigned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-600',
  }
  const icons: Record<WaitlistStatus, React.ReactNode> = {
    Waiting: <Clock className="size-3 mr-0.5" />,
    Assigned: <CheckCircle2 className="size-3 mr-0.5" />,
    Cancelled: <Trash2 className="size-3 mr-0.5" />,
  }
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', styles[status])}>
      {icons[status]}
      {status}
    </Badge>
  )
}

// ─── Main Component ────────────────────────────────────────────────────

export function WaitlistView() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState('')

  // Add form state
  const [formGuestName, setFormGuestName] = useState('')
  const [formRoomPref, setFormRoomPref] = useState('')
  const [formCheckIn, setFormCheckIn] = useState('')
  const [formCheckOut, setFormCheckOut] = useState('')
  const [formGuestsCount, setFormGuestsCount] = useState('1')
  const [formPriority, setFormPriority] = useState<Priority>('Normal')
  const [formPhone, setFormPhone] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // ─── Computed values ──────────────────────────────────────────

  const filteredWaitlist = useMemo(() => {
    let filtered = waitlist
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.guestName.toLowerCase().includes(q) ||
          e.contactPhone.includes(q) ||
          e.roomPreference.toLowerCase().includes(q),
      )
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((e) => e.priority === priorityFilter)
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter)
    }
    return filtered
  }, [waitlist, searchQuery, priorityFilter, statusFilter])

  const totalWaitlisted = waitlist.filter((e) => e.status === 'Waiting').length
  const avgWaitDays = useMemo(() => {
    const waiting = waitlist.filter((e) => e.status === 'Waiting')
    if (waiting.length === 0) return 0
    const totalDays = waiting.reduce((sum, e) => {
      const added = new Date(e.addedDate)
      const now = new Date()
      return sum + Math.max(1, Math.ceil((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)))
    }, 0)
    return (totalDays / waiting.length).toFixed(1)
  }, [waitlist])
  const highPriorityCount = waitlist.filter((e) => e.priority === 'High' && e.status === 'Waiting').length
  const assignedToday = waitlist.filter((e) => e.status === 'Assigned').length

  // ─── Handlers ────────────────────────────────────────────────

  function handleAddToWaitlist() {
    if (!formGuestName.trim() || !formCheckIn || !formCheckOut) {
      toast.error('Please fill in guest name and dates')
      return
    }
    const newEntry: WaitlistEntry = {
      id: `wl-${Date.now()}`,
      position: waitlist.length + 1,
      guestName: formGuestName.trim(),
      roomPreference: formRoomPref || 'No preference',
      checkInDate: formCheckIn,
      checkOutDate: formCheckOut,
      guestsCount: parseInt(formGuestsCount) || 1,
      priority: formPriority,
      status: 'Waiting',
      contactPhone: formPhone || 'N/A',
      notes: formNotes || '',
      addedDate: new Date().toISOString().split('T')[0],
    }
    setWaitlist((prev) => [...prev, newEntry])
    setAddDialogOpen(false)
    resetAddForm()
    toast.success(`${newEntry.guestName} added to waitlist`, {
      description: `Position #${newEntry.position}`,
    })
  }

  function resetAddForm() {
    setFormGuestName('')
    setFormRoomPref('')
    setFormCheckIn('')
    setFormCheckOut('')
    setFormGuestsCount('1')
    setFormPriority('Normal')
    setFormPhone('')
    setFormNotes('')
  }

  function handleAssignRoom() {
    if (!selectedEntry || !selectedRoomId) return
    const room = AVAILABLE_ROOMS.find((r) => r.id === selectedRoomId)
    setWaitlist((prev) =>
      prev.map((e) => (e.id === selectedEntry.id ? { ...e, status: 'Assigned' as WaitlistStatus } : e)),
    )
    setAssignDialogOpen(false)
    setSelectedRoomId('')
    setSelectedEntry(null)
    toast.success(`Room ${room?.number || selectedRoomId} assigned to ${selectedEntry.guestName}`, {
      description: `${selectedEntry.roomPreference} → Room ${room?.number || ''}`,
    })
  }

  function handleRemoveFromWaitlist(entry: WaitlistEntry) {
    setWaitlist((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: 'Cancelled' as WaitlistStatus } : e)),
    )
    toast.info(`${entry.guestName} removed from waitlist`, {
      description: 'Status set to Cancelled',
    })
  }

  function handleCallGuest(entry: WaitlistEntry) {
    toast.success(`Calling ${entry.guestName}...`, {
      description: entry.contactPhone,
      duration: 4000,
    })
  }

  function openAssignDialog(entry: WaitlistEntry) {
    setSelectedEntry(entry)
    setSelectedRoomId('')
    setAssignDialogOpen(true)
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Waitlist Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage guests waiting for room availability
          </p>
        </div>
        <Button onClick={() => { resetAddForm(); setAddDialogOpen(true) }} className="gap-2 shrink-0">
          <UserPlus className="size-3.5" />
          Add to Waitlist
        </Button>
      </div>

      {/* Filters */}
      <Card className="py-0">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Filter className="size-3.5" />
              Filters
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder="Search by guest name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn('pl-8 h-7 text-xs', searchQuery && 'pr-7')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className={cn('w-[110px] h-7 data-[size=default]:h-7 text-xs', priorityFilter !== 'all' && 'pr-8')}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                {priorityFilter !== 'all' && (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                    onClick={(e) => { e.stopPropagation(); setPriorityFilter('all') }}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn('w-[110px] h-7 data-[size=default]:h-7 text-xs', statusFilter !== 'all' && 'pr-8')}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Waiting">Waiting</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                    onClick={(e) => { e.stopPropagation(); setStatusFilter('all') }}
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
            {(searchQuery || priorityFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPriorityFilter('all'); setStatusFilter('all') }}
                className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0"
                title="Clear all filters"
              >
                <X className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredWaitlist.length} of {waitlist.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Table */}
      <Card className="py-0">
        <CardContent className="p-0 overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Guest Name</TableHead>
                <TableHead className="hidden md:table-cell">Room Preference</TableHead>
                <TableHead className="hidden sm:table-cell">Check-in</TableHead>
                <TableHead className="hidden lg:table-cell">Check-out</TableHead>
                <TableHead className="w-[50px] hidden sm:table-cell">Pax</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWaitlist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    <Clock className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                    No waitlisted guests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWaitlist.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      entry.status === 'Cancelled' && 'opacity-50',
                      entry.priority === 'High' && entry.status === 'Waiting' && 'bg-red-50/50 dark:bg-red-950/10',
                    )}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.position}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-xs">{entry.guestName}</span>
                      {entry.notes && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">
                          {entry.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BedDouble className="size-3" />
                        {entry.roomPreference}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      {formatDate(entry.checkInDate)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {formatDate(entry.checkOutDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="size-3 text-muted-foreground" />
                        {entry.guestsCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={entry.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground font-mono">{entry.contactPhone}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.status === 'Waiting' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => openAssignDialog(entry)}
                          >
                            <BedDouble className="size-3" />
                            <span className="hidden xl:inline">Assign</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => handleCallGuest(entry)}
                            title={`Call ${entry.contactPhone}`}
                          >
                            <Phone className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleRemoveFromWaitlist(entry)}
                            title="Remove from waitlist"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── Add to Waitlist Dialog ────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Add to Waitlist
            </DialogTitle>
            <DialogDescription>
              Add a guest to the waitlist when rooms are fully booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Guest Name *</Label>
                <Input
                  value={formGuestName}
                  onChange={(e) => setFormGuestName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Check-in Date *</Label>
                  <Input
                    type="date"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Check-out Date *</Label>
                  <Input
                    type="date"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Room Preference</Label>
                  <Input
                    value={formRoomPref}
                    onChange={(e) => setFormRoomPref(e.target.value)}
                    placeholder="e.g. Deluxe King"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Guests Count</Label>
                  <Select value={formGuestsCount} onValueChange={setFormGuestsCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Guest</SelectItem>
                      <SelectItem value="2">2 Guests</SelectItem>
                      <SelectItem value="3">3 Guests</SelectItem>
                      <SelectItem value="4">4 Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+977-98XX-XXXXXX"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any special notes or requests..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToWaitlist} disabled={!formGuestName.trim() || !formCheckIn || !formCheckOut}>
              <Plus className="size-4 mr-1.5" />
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Room Dialog ───────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="size-5" />
              Assign Room
            </DialogTitle>
            <DialogDescription>
              {selectedEntry
                ? `Select a room for ${selectedEntry.guestName} (Preferred: ${selectedEntry.roomPreference})`
                : 'Select a room to assign'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto">
            <div className="space-y-1">
              {AVAILABLE_ROOMS.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    selectedRoomId === room.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  <BedDouble className="size-4 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">Room {room.number}</span>
                    <span className="text-xs opacity-70 ml-2">{room.type}</span>
                  </div>
                  <span className="text-xs opacity-70">Floor {room.floor}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignRoom} disabled={!selectedRoomId}>
              <CheckCircle2 className="size-4 mr-1.5" />
              Assign Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
