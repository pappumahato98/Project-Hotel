'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'

import {
  CalendarCheck, Users, Clock, Phone, Plus, PartyPopper,
  UserCheck, UserX, CheckCircle2, AlertCircle, MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNPR } from './pos-types'

// ─── Types ────────────────────────────────────────────────────────────
interface Reservation {
  id: string
  guestName: string
  phone: string
  tableNumber: number
  seats: number
  timeSlot: string // e.g. "12:00 PM"
  endTimeSlot: string
  partySize: number
  status: 'confirmed' | 'seated' | 'completed' | 'no_show'
  specialRequests: string
  date: string
}

// ─── Mock Data ─────────────────────────────────────────────────────────
const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'R-001', guestName: 'Rajesh Sharma', phone: '+977-9841234567', tableNumber: 5, seats: 4, timeSlot: '12:00 PM', endTimeSlot: '1:00 PM', partySize: 3, status: 'seated', specialRequests: 'Birthday celebration — bring cake', date: '2025-01-15' },
  { id: 'R-002', guestName: 'Sarah Mitchell', phone: '+1-555-0123', tableNumber: 12, seats: 2, timeSlot: '12:30 PM', endTimeSlot: '1:30 PM', partySize: 2, status: 'confirmed', specialRequests: 'Vegetarian menu please', date: '2025-01-15' },
  { id: 'R-003', guestName: 'David Chen', phone: '+86-139-5555-1234', tableNumber: 8, seats: 6, timeSlot: '1:00 PM', endTimeSlot: '2:00 PM', partySize: 5, status: 'confirmed', specialRequests: 'Highchair needed for toddler', date: '2025-01-15' },
  { id: 'R-004', guestName: 'Priya Patel', phone: '+91-9876543210', tableNumber: 3, seats: 4, timeSlot: '6:00 PM', endTimeSlot: '7:00 PM', partySize: 4, status: 'confirmed', specialRequests: 'Window seat preferred', date: '2025-01-15' },
  { id: 'R-005', guestName: 'Michael Johnson', phone: '+1-555-9876', tableNumber: 7, seats: 2, timeSlot: '7:00 PM', endTimeSlot: '8:30 PM', partySize: 2, status: 'confirmed', specialRequests: 'Anniversary dinner — champagne on arrival', date: '2025-01-15' },
  { id: 'R-006', guestName: 'Anita Gurung', phone: '+977-9856789012', tableNumber: 14, seats: 8, timeSlot: '7:30 PM', endTimeSlot: '9:00 PM', partySize: 7, status: 'confirmed', specialRequests: '', date: '2025-01-15' },
  { id: 'R-007', guestName: 'Yuki Tanaka', phone: '+81-90-1234-5678', tableNumber: 2, seats: 2, timeSlot: '8:00 PM', endTimeSlot: '9:00 PM', partySize: 1, status: 'no_show', specialRequests: '', date: '2025-01-15' },
  { id: 'R-008', guestName: 'Emma Wilson', phone: '+44-7911-123456', tableNumber: 10, seats: 4, timeSlot: '12:00 PM', endTimeSlot: '1:00 PM', partySize: 3, status: 'completed', specialRequests: 'Nut allergy', date: '2025-01-15' },
  { id: 'R-009', guestName: 'Arjun Thapa', phone: '+977-9840000000', tableNumber: 6, seats: 4, timeSlot: '1:00 PM', endTimeSlot: '2:00 PM', partySize: 4, status: 'completed', specialRequests: '', date: '2025-01-15' },
  { id: 'R-010', guestName: 'Lisa Park', phone: '+82-10-1234-5678', tableNumber: 9, seats: 6, timeSlot: '6:30 PM', endTimeSlot: '8:00 PM', partySize: 6, status: 'confirmed', specialRequests: 'Separate bills per couple', date: '2025-01-15' },
  { id: 'R-011', guestName: 'Tom Baker', phone: '+61-4-1234-5678', tableNumber: 15, seats: 2, timeSlot: '9:00 PM', endTimeSlot: '10:00 PM', partySize: 2, status: 'confirmed', specialRequests: 'Quiet corner table', date: '2025-01-15' },
  { id: 'R-012', guestName: 'Sunita Rai', phone: '+977-9845678901', tableNumber: 11, seats: 4, timeSlot: '7:00 PM', endTimeSlot: '8:00 PM', partySize: 3, status: 'no_show', specialRequests: 'Allergic to shellfish', date: '2025-01-15' },
]

const HOURS = [
  '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM',
  '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM',
]

function slotToHour(slot: string): string {
  const h = slot.replace(/\s*(AM|PM)\s*/, '$1')
  return h
}

// ─── Status Config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<Reservation['status'], { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  seated: { label: 'Seated', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  completed: { label: 'Completed', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-200 dark:border-gray-700' },
  no_show: { label: 'No Show', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800' },
}

// ─── Summary Cards ───────────────────────────────────────────────────
function SummaryCards({ reservations }: { reservations: Reservation[] }) {
  const total = reservations.length
  const seated = reservations.filter((r) => r.status === 'seated').length
  const upcoming = reservations.filter((r) => r.status === 'confirmed').length
  const noShows = reservations.filter((r) => r.status === 'no_show').length

  const cards = [
    { label: 'Total Reservations', value: total, icon: CalendarCheck, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    { label: 'Seated Now', value: seated, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Upcoming', value: upcoming, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'No-Shows', value: noShows, icon: UserX, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
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

// ─── Reservation Card ─────────────────────────────────────────────────
function ReservationCard({
  reservation,
  onStatusChange,
}: {
  reservation: Reservation
  onStatusChange: (id: string, status: Reservation['status']) => void
}) {
  const config = STATUS_CONFIG[reservation.status]

  return (
    <Card className={`rounded-lg border ${config.border} ${config.bg}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 ${config.color} ${config.border}`}>
              T-{reservation.tableNumber}
            </Badge>
            <Badge className={`text-[10px] ${config.color} bg-white dark:bg-gray-900 border ${config.border}`}>
              {config.label}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <PartyPopper className="h-3 w-3" />
            {reservation.partySize} guests
          </span>
        </div>
        <CardTitle className="text-sm mt-1">{reservation.guestName}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {reservation.timeSlot} – {reservation.endTimeSlot}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {reservation.phone}
          </span>
        </div>

        {reservation.specialRequests && (
          <div className="rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 p-1.5 flex items-start gap-1.5">
            <MessageSquare className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">{reservation.specialRequests}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1.5 pt-1">
          {reservation.status === 'confirmed' && (
            <Button
              size="sm"
              className="flex-1 gap-1 text-[11px] h-7"
              onClick={() => onStatusChange(reservation.id, 'seated')}
            >
              <UserCheck className="h-3 w-3" />
              Seat
            </Button>
          )}
          {reservation.status === 'seated' && (
            <Button
              size="sm"
              className="flex-1 gap-1 text-[11px] h-7"
              onClick={() => onStatusChange(reservation.id, 'completed')}
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Button>
          )}
          {(reservation.status === 'confirmed' || reservation.status === 'seated') && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1 text-[11px] h-7"
              onClick={() => onStatusChange(reservation.id, 'no_show')}
            >
              <UserX className="h-3 w-3" />
              No Show
            </Button>
          )}
          {reservation.status === 'completed' && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Finished
            </Badge>
          )}
          {reservation.status === 'no_show' && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertCircle className="h-3 w-3" />
              No Show
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── New Reservation Dialog ──────────────────────────────────────────
function NewReservationDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (reservation: Omit<Reservation, 'id'>) => void
}) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [partySize, setPartySize] = useState('2')
  const [tablePref, setTablePref] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  const handleSubmit = () => {
    if (!guestName || !phone || !timeSlot) {
      toast.error('Please fill in all required fields')
      return
    }
    onSubmit({
      guestName,
      phone,
      tableNumber: tablePref ? Number(tablePref) : Math.floor(Math.random() * 15) + 1,
      seats: Number(partySize) + 1,
      timeSlot,
      endTimeSlot: '',
      partySize: Number(partySize),
      status: 'confirmed',
      specialRequests,
      date: new Date().toISOString().split('T')[0],
    })
    setGuestName('')
    setPhone('')
    setTimeSlot('')
    setPartySize('2')
    setTablePref('')
    setSpecialRequests('')
    onClose()
  }

  const timeOptions = HOURS.map((h) => ({ value: `${h} PM`.replace('AM PM', 'AM').replace('PM PM', 'PM'), label: h }))
  const validTimes = [
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            New Reservation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Guest Name *</Label>
            <Input placeholder="Enter guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Phone Number *</Label>
            <Input placeholder="+977-98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm font-medium">Time Slot *</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {validTimes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Party Size</Label>
              <Select value={partySize} onValueChange={setPartySize}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '10', '12'].map((n) => (
                    <SelectItem key={n} value={n}>{n} {n === '1' ? 'Guest' : 'Guests'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Table Preference</Label>
            <Select value={tablePref} onValueChange={setTablePref}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Auto-assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-assign</SelectItem>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>Table {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Special Requests</Label>
            <Input placeholder="Any special requests..." value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!guestName || !phone || !timeSlot}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Timeline View ─────────────────────────────────────────────────────
function TimelineView({
  reservations,
  onStatusChange,
}: {
  reservations: Reservation[]
  onStatusChange: (id: string, status: Reservation['status']) => void
}) {
  const [activeHour, setActiveHour] = useState('all')

  const filtered = useMemo(() => {
    if (activeHour === 'all') return reservations
    return reservations.filter((r) => {
      const hour = r.timeSlot.replace(/:\d{2}\s*/, '').replace('AM', ' AM').replace('PM', ' PM').trim()
      return hour === activeHour
    })
  }, [reservations, activeHour])

  return (
    <div className="space-y-2">
      {/* Hour tabs */}
      <div className="overflow-x-auto">
        <Tabs value={activeHour} onValueChange={setActiveHour}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {HOURS.map((h) => (
              <TabsTrigger key={h} value={h} className="text-xs px-2">
                {h}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Reservation Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {activeHour === 'all' ? 'No reservations for today' : `No reservations at ${activeHour}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map((res) => (
            <ReservationCard
              key={res.id}
              reservation={res}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Seated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> No Show
        </span>
      </div>
    </div>
  )
}

// ─── Main TableReservationsView ──────────────────────────────────────
export default function TableReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS)
  const [newResOpen, setNewResOpen] = useState(false)

  const handleStatusChange = (id: string, newStatus: Reservation['status']) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
    const labels: Record<string, string> = {
      seated: 'Guest has been seated',
      completed: 'Dining completed',
      no_show: 'Marked as no-show',
    }
    toast.success(labels[newStatus] ?? 'Reservation updated')
  }

  const handleNewReservation = (reservation: Omit<Reservation, 'id'>) => {
    const newRes: Reservation = {
      ...reservation,
      id: `R-${String(reservations.length + 1).padStart(3, '0')}`,
    }
    setReservations((prev) => [...prev, newRes])
    toast.success(`Reservation added for ${reservation.guestName} at ${reservation.timeSlot}`)
  }

  return (
    <div className="space-y-2">
      {/* Summary Cards */}
      <SummaryCards reservations={reservations} />

      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Today&apos;s Reservation Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button className="gap-1 text-[11px] h-7" onClick={() => setNewResOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Reservation
        </Button>
      </div>

      {/* Timeline */}
      <TimelineView
        reservations={reservations}
        onStatusChange={handleStatusChange}
      />

      {/* New Reservation Dialog */}
      <NewReservationDialog
        open={newResOpen}
        onClose={() => setNewResOpen(false)}
        onSubmit={handleNewReservation}
      />
    </div>
  )
}
