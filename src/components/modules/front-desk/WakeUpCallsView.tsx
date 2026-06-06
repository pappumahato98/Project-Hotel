'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Bell, BellRing, Clock, Plus, Search, CheckCircle2, AlertTriangle,
  RefreshCw, AlarmClock, XCircle, Phone, BedDouble, User,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

type CallStatus = 'Pending' | 'Called' | 'Snoozed' | 'Missed' | 'Completed'

interface WakeUpCall {
  id: string
  roomNumber: string
  guestName: string
  scheduledTime: string // HH:mm format
  status: CallStatus
  phoneExtension: string
  notes: string
  snoozeCount: number
}

// ─── Static Mock Data ───────────────────────────────────────────────────

const INITIAL_CALLS: WakeUpCall[] = [
  {
    id: 'wuc-1',
    roomNumber: '201',
    guestName: 'Rajesh Sharma',
    scheduledTime: '05:00',
    status: 'Completed',
    phoneExtension: '201',
    notes: 'Early airport departure flight to Delhi at 8:00 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-2',
    roomNumber: '305',
    guestName: 'Sarah Mitchell',
    scheduledTime: '06:00',
    status: 'Completed',
    phoneExtension: '305',
    notes: 'Honeymoon couple — sunrise tour at Nagarkot',
    snoozeCount: 0,
  },
  {
    id: 'wuc-3',
    roomNumber: '102',
    guestName: 'Bikash Thapa',
    scheduledTime: '06:30',
    status: 'Called',
    phoneExtension: '102',
    notes: 'Business meeting at 9 AM',
    snoozeCount: 1,
  },
  {
    id: 'wuc-4',
    roomNumber: '401',
    guestName: 'Emily Johnson',
    scheduledTime: '07:00',
    status: 'Pending',
    phoneExtension: '401',
    notes: 'Conference registration at 9 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-5',
    roomNumber: '210',
    guestName: 'Aarav Poudel',
    scheduledTime: '07:00',
    status: 'Pending',
    phoneExtension: '210',
    notes: 'Trekking departure at 8 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-6',
    roomNumber: '308',
    guestName: 'David Chen',
    scheduledTime: '07:30',
    status: 'Pending',
    phoneExtension: '308',
    notes: 'Photography tour at 8:30 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-7',
    roomNumber: '115',
    guestName: 'Priya Koirala',
    scheduledTime: '06:00',
    status: 'Missed',
    phoneExtension: '115',
    notes: 'No answer after 3 attempts — sent SMS',
    snoozeCount: 2,
  },
  {
    id: 'wuc-8',
    roomNumber: '203',
    guestName: 'Suman Lama',
    scheduledTime: '08:00',
    status: 'Pending',
    phoneExtension: '203',
    notes: 'Anniversary breakfast at 9 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-9',
    roomNumber: '410',
    guestName: 'Anita Gurung',
    scheduledTime: '05:30',
    status: 'Completed',
    phoneExtension: '410',
    notes: 'Mountain flight at 6:30 AM',
    snoozeCount: 0,
  },
  {
    id: 'wuc-10',
    roomNumber: '106',
    guestName: 'Deepak Maharjan',
    scheduledTime: '07:30',
    status: 'Snoozed',
    phoneExtension: '106',
    notes: 'Requested snooze — moved to 07:45',
    snoozeCount: 1,
  },
]

const ROOM_OPTIONS = [
  { number: '102', guestName: 'Bikash Thapa' },
  { number: '106', guestName: 'Deepak Maharjan' },
  { number: '115', guestName: 'Priya Koirala' },
  { number: '201', guestName: 'Rajesh Sharma' },
  { number: '203', guestName: 'Suman Lama' },
  { number: '210', guestName: 'Aarav Poudel' },
  { number: '305', guestName: 'Sarah Mitchell' },
  { number: '308', guestName: 'David Chen' },
  { number: '401', guestName: 'Emily Johnson' },
  { number: '410', guestName: 'Anita Gurung' },
]

// ─── Status Helpers ────────────────────────────────────────────────────

function getStatusStyles(status: CallStatus): { bg: string; border: string; text: string } {
  const map: Record<CallStatus, { bg: string; border: string; text: string }> = {
    Pending: { bg: 'bg-sky-100 dark:bg-sky-950', border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-700 dark:text-sky-300' },
    Called: { bg: 'bg-emerald-100 dark:bg-emerald-950', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300' },
    Completed: { bg: 'bg-green-100 dark:bg-green-950', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
    Snoozed: { bg: 'bg-amber-100 dark:bg-amber-950', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
    Missed: { bg: 'bg-red-100 dark:bg-red-950', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300' },
  }
  return map[status]
}

function CallStatusBadge({ status }: { status: CallStatus }) {
  const styles = getStatusStyles(status)
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', styles.bg, styles.border, styles.text)}>
      {status === 'Pending' && <Clock className="size-3 mr-0.5" />}
      {status === 'Called' && <Phone className="size-3 mr-0.5" />}
      {status === 'Completed' && <CheckCircle2 className="size-3 mr-0.5" />}
      {status === 'Snoozed' && <AlarmClock className="size-3 mr-0.5" />}
      {status === 'Missed' && <XCircle className="size-3 mr-0.5" />}
      {status}
    </Badge>
  )
}

function CardBorderByStatus(status: CallStatus): string {
  switch (status) {
    case 'Pending': return 'border-l-4 border-l-sky-500'
    case 'Called': return 'border-l-4 border-l-emerald-500'
    case 'Completed': return 'border-l-4 border-l-green-500'
    case 'Snoozed': return 'border-l-4 border-l-amber-500'
    case 'Missed': return 'border-l-4 border-l-red-500'
  }
}

// ─── Time Comparison Helper ─────────────────────────────────────────────

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function isUpcoming(timeStr: string, nowMinutes: number, windowMinutes: number = 30): boolean {
  const callMinutes = parseTime(timeStr)
  return callMinutes > nowMinutes && callMinutes <= nowMinutes + windowMinutes
}

// ─── Main Component ────────────────────────────────────────────────────

export function WakeUpCallsView() {
  const [calls, setCalls] = useState<WakeUpCall[]>(INITIAL_CALLS)
  const [filterTab, setFilterTab] = useState<string>('all')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formRoom, setFormRoom] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const nowMinutes = parseTime(
    `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`,
  )

  // ─── Computed values ──────────────────────────────────────────

  const filteredCalls = useMemo(() => {
    let filtered = calls
    if (filterTab === 'pending') {
      filtered = filtered.filter((c) => c.status === 'Pending' || c.status === 'Snoozed' || c.status === 'Called')
    } else if (filterTab === 'completed') {
      filtered = filtered.filter((c) => c.status === 'Completed')
    } else if (filterTab === 'missed') {
      filtered = filtered.filter((c) => c.status === 'Missed')
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.guestName.toLowerCase().includes(q) ||
          c.roomNumber.includes(q) ||
          c.notes.toLowerCase().includes(q),
      )
    }
    // Sort: upcoming pending first, then by time
    return [...filtered].sort((a, b) => {
      const statusOrder: Record<CallStatus, number> = {
        Pending: 0, Snoozed: 1, Called: 2, Missed: 3, Completed: 4,
      }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      return parseTime(a.scheduledTime) - parseTime(b.scheduledTime)
    })
  }, [calls, filterTab, searchQuery])

  const totalScheduled = calls.length
  const completedCount = calls.filter((c) => c.status === 'Completed').length
  const pendingCount = calls.filter((c) => c.status === 'Pending' || c.status === 'Snoozed' || c.status === 'Called').length
  const missedCount = calls.filter((c) => c.status === 'Missed').length

  // ─── Handlers ────────────────────────────────────────────────

  function handleMarkCalled(call: WakeUpCall) {
    setCalls((prev) =>
      prev.map((c) => (c.id === call.id ? { ...c, status: 'Called' as CallStatus } : c)),
    )
    toast.success(`Called Room ${call.roomNumber} — ${call.guestName}`, {
      description: `Wake-up call at ${formatTimeDisplay(call.scheduledTime)}`,
    })
  }

  function handleMarkCompleted(call: WakeUpCall) {
    setCalls((prev) =>
      prev.map((c) => (c.id === call.id ? { ...c, status: 'Completed' as CallStatus } : c)),
    )
    toast.success(`Wake-up call completed for ${call.guestName}`, {
      description: `Room ${call.roomNumber}`,
    })
  }

  function handleAlarmClock(call: WakeUpCall) {
    const [h, m] = call.scheduledTime.split(':').map(Number)
    const newMinutes = h * 60 + m + 15
    const newH = Math.floor(newMinutes / 60) % 24
    const newM = newMinutes % 60
    const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`

    setCalls((prev) =>
      prev.map((c) =>
        c.id === call.id
          ? { ...c, scheduledTime: newTime, status: 'Snoozed' as CallStatus, snoozeCount: c.snoozeCount + 1 }
          : c,
      ),
    )
    toast.info(`Snoozed wake-up call for ${call.guestName}`, {
      description: `Moved to ${formatTimeDisplay(newTime)} (+15 min)`,
    })
  }

  function handleMarkMissed(call: WakeUpCall) {
    setCalls((prev) =>
      prev.map((c) => (c.id === call.id ? { ...c, status: 'Missed' as CallStatus } : c)),
    )
    toast.error(`Missed wake-up call for ${call.guestName}`, {
      description: `Room ${call.roomNumber} — ${formatTimeDisplay(call.scheduledTime)}`,
    })
  }

  function handleAddCall() {
    if (!formRoom || !formTime) {
      toast.error('Please select a room and time')
      return
    }
    const roomInfo = ROOM_OPTIONS.find((r) => r.number === formRoom)
    const newCall: WakeUpCall = {
      id: `wuc-${Date.now()}`,
      roomNumber: formRoom,
      guestName: roomInfo?.guestName || 'Guest',
      scheduledTime: formTime,
      status: 'Pending',
      phoneExtension: formRoom,
      notes: formNotes || '',
      snoozeCount: 0,
    }
    setCalls((prev) => [...prev, newCall])
    setAddDialogOpen(false)
    setFormRoom('')
    setFormTime('')
    setFormNotes('')
    toast.success(`Wake-up call added for ${newCall.guestName}`, {
      description: `Room ${newCall.roomNumber} at ${formatTimeDisplay(newCall.scheduledTime)}`,
    })
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wake-Up Calls</h2>
          <p className="text-sm text-muted-foreground">
            Manage scheduled wake-up calls for today —{' '}
            <span className="font-medium text-foreground">
              Current time: {formatTimeDisplay(
                `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`,
              )}
            </span>
          </p>
        </div>
        <Button onClick={() => { setFormRoom(''); setFormTime(''); setFormNotes(''); setAddDialogOpen(true) }} className="gap-2 shrink-0">
          <Plus className="size-4" />
          New Wake-up Call
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950">
              <BellRing className="size-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalScheduled}</p>
              <p className="text-xs text-muted-foreground">Total Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{missedCount}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
            <TabsTrigger value="missed" className="text-xs sm:text-sm">Missed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search guest or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Call Cards Grid */}
      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="size-8 mb-2 opacity-40" />
            <p className="text-sm">No wake-up calls match your filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCalls.map((call) => {
            const upcoming = call.status === 'Pending' && isUpcoming(call.scheduledTime, nowMinutes, 60)

            return (
              <Card
                key={call.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  CardBorderByStatus(call.status),
                  upcoming && 'ring-2 ring-sky-400 dark:ring-sky-600 shadow-sky-100 dark:shadow-sky-950',
                  call.status === 'Completed' && 'opacity-60',
                )}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex size-8 items-center justify-center rounded-lg',
                        call.status === 'Pending' ? 'bg-sky-100 dark:bg-sky-950' :
                        call.status === 'Completed' ? 'bg-green-100 dark:bg-green-950' :
                        call.status === 'Missed' ? 'bg-red-100 dark:bg-red-950' :
                        call.status === 'Snoozed' ? 'bg-amber-100 dark:bg-amber-950' :
                        'bg-emerald-100 dark:bg-emerald-950',
                      )}>
                        <Bell className={cn(
                          'size-4',
                          call.status === 'Pending' ? 'text-sky-600 dark:text-sky-400' :
                          call.status === 'Completed' ? 'text-green-600 dark:text-green-400' :
                          call.status === 'Missed' ? 'text-red-600 dark:text-red-400' :
                          call.status === 'Snoozed' ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400',
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-bold font-mono">Room {call.roomNumber}</p>
                        <p className="text-xs text-muted-foreground">{call.guestName}</p>
                      </div>
                    </div>
                    <CallStatusBadge status={call.status} />
                  </div>

                  {/* Time Display */}
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span className={cn(
                      'text-lg font-bold',
                      upcoming && 'text-sky-600 dark:text-sky-400',
                    )}>
                      {formatTimeDisplay(call.scheduledTime)}
                    </span>
                    {upcoming && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700">
                        Upcoming
                      </Badge>
                    )}
                  </div>

                  {/* Phone & Notes */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3" />
                      <span className="font-mono">Ext. {call.phoneExtension}</span>
                    </div>
                    {call.notes && (
                      <p className="italic truncate">{call.notes}</p>
                    )}
                    {call.snoozeCount > 0 && (
                      <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlarmClock className="size-3" />
                        Snoozed {call.snoozeCount} time{call.snoozeCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {(call.status === 'Pending' || call.status === 'Snoozed' || call.status === 'Called') && (
                    <div className="flex items-center gap-1.5 pt-1 border-t">
                      {call.status === 'Pending' || call.status === 'Snoozed' ? (
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-7 gap-1"
                          onClick={() => handleMarkCalled(call)}
                        >
                          <Phone className="size-3" />
                          Call
                        </Button>
                      ) : null}
                      {(call.status === 'Pending' || call.status === 'Snoozed') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 gap-1"
                            onClick={() => handleAlarmClock(call)}
                          >
                            <AlarmClock className="size-3" />
                            AlarmClock
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleMarkMissed(call)}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </>
                      )}
                      {call.status === 'Called' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7 gap-1"
                          onClick={() => handleMarkCompleted(call)}
                        >
                          <CheckCircle2 className="size-3" />
                          Complete
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Missed — retry button */}
                  {call.status === 'Missed' && (
                    <div className="flex items-center gap-1.5 pt-1 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7 gap-1"
                        onClick={() => {
                          setCalls((prev) =>
                            prev.map((c) => (c.id === call.id ? { ...c, status: 'Pending' as CallStatus } : c)),
                          )
                          toast.info(`Retry scheduled for ${call.guestName}`, {
                            description: `Room ${call.roomNumber}`,
                          })
                        }}
                      >
                        <RefreshCw className="size-3" />
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── Add Wake-up Call Dialog ────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              New Wake-Up Call
            </DialogTitle>
            <DialogDescription>
              Schedule a wake-up call for an in-house guest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Room *</Label>
              <Select value={formRoom} onValueChange={setFormRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_OPTIONS.map((room) => (
                    <SelectItem key={room.number} value={room.number}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span className="flex items-center gap-2">
                          <BedDouble className="size-3.5" />
                          Room {room.number}
                        </span>
                        <span className="text-xs opacity-60">{room.guestName}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Scheduled Time *</Label>
              <Input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Airport departure, trekking tour..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCall} disabled={!formRoom || !formTime}>
              <BellRing className="size-4 mr-1.5" />
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
