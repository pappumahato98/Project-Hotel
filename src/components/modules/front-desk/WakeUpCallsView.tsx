'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { toast } from 'sonner'
import {
  Bell, BellRing, Clock, Plus, Search, CheckCircle2, AlertTriangle,
  RefreshCw, AlarmClock, XCircle, Phone, BedDouble, User, Loader2,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

type CallStatus = 'Pending' | 'Called' | 'Snoozed' | 'Missed' | 'Completed'

interface WakeUpCall {
  id: string
  reservationId: string | null
  roomId: string | null
  roomNumber: string
  guestName: string
  scheduledTime: string // HH:mm
  status: CallStatus
  phoneExtension: string | null
  notes: string | null
  snoozeCount: number
  calledAt: string | null
  completedAt: string | null
  date: string
  createdAt: string
}

interface InHouseRoom {
  id: string
  number: string
  guestName: string
}

// ─── Status Helpers ────────────────────────────────────────────────────

function getStatusStyles(status: CallStatus) {
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

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Main Component ────────────────────────────────────────────────────

export function WakeUpCallsView() {
  const queryClient = useQueryClient()

  // ─── Queries ────────────────────────────────────────────────
  const todayStr = getTodayStr()

  const { data: callsData, isLoading, error, refetch } = useQuery<{ calls: WakeUpCall[] }>({
    queryKey: qk.wakeUpCalls(todayStr),
    queryFn: () => apiFetch(`/api/wake-up-calls?date=${todayStr}`),
  })

  // Fetch in-house rooms for the "add" dialog
  const { data: inHouseData } = useQuery<{ reservations: Array<{ id: string; room: { id: string; number: string }; guest: { firstName: string; lastName: string } }> }>({
    queryKey: qk.inHouse(),
    queryFn: () => apiFetch(`/api/reservations?status=checked_in&checkOutDate=${todayStr}`),
  })

  const calls = callsData?.calls ?? []

  // Build room options from in-house guests
  const roomOptions: InHouseRoom[] = useMemo(() => {
    if (!inHouseData?.reservations) return []
    return inHouseData.reservations
      .filter(r => r.room?.number && r.guest)
      .map(r => ({
        id: r.room.id,
        number: r.room.number,
        guestName: `${r.guest.firstName || ''} ${r.guest.lastName || ''}`.trim(),
      }))
      .sort((a, b) => a.number.localeCompare(b.number))
  }, [inHouseData])

  // ─── Local state ────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<string>('all')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formRoomId, setFormRoomId] = useState('')
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

  // ─── Mutations ──────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch(`/api/wake-up-calls/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wakeUpCalls(todayStr) })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/wake-up-calls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.wakeUpCalls(todayStr) })
      toast.success('Wake-up call scheduled')
      setAddDialogOpen(false)
      setFormRoomId(''); setFormTime(''); setFormNotes('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Handlers ────────────────────────────────────────────────
  function handleMarkCalled(call: WakeUpCall) {
    updateMutation.mutate({
      id: call.id,
      data: { status: 'Called' },
    })
    toast.success(`Called Room ${call.roomNumber} — ${call.guestName}`, {
      description: `Wake-up call at ${formatTimeDisplay(call.scheduledTime)}`,
    })
  }

  function handleMarkCompleted(call: WakeUpCall) {
    updateMutation.mutate({
      id: call.id,
      data: { status: 'Completed' },
    })
    toast.success(`Wake-up call completed for ${call.guestName}`, {
      description: `Room ${call.roomNumber}`,
    })
  }

  function handleSnooze(call: WakeUpCall) {
    const [h, m] = call.scheduledTime.split(':').map(Number)
    const newMinutes = h * 60 + m + 15
    const newH = Math.floor(newMinutes / 60) % 24
    const newM = newMinutes % 60
    const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`

    updateMutation.mutate({
      id: call.id,
      data: {
        scheduledTime: newTime,
        status: 'Snoozed',
        snoozeCount: call.snoozeCount + 1,
      },
    })
    toast.info(`Snoozed wake-up call for ${call.guestName}`, {
      description: `Moved to ${formatTimeDisplay(newTime)} (+15 min)`,
    })
  }

  function handleMarkMissed(call: WakeUpCall) {
    updateMutation.mutate({
      id: call.id,
      data: { status: 'Missed' },
    })
    toast.error(`Missed wake-up call for ${call.guestName}`, {
      description: `Room ${call.roomNumber} — ${formatTimeDisplay(call.scheduledTime)}`,
    })
  }

  function handleRetry(call: WakeUpCall) {
    updateMutation.mutate({
      id: call.id,
      data: { status: 'Pending' },
    })
    toast.info(`Retry scheduled for ${call.guestName}`, {
      description: `Room ${call.roomNumber}`,
    })
  }

  function handleAddCall() {
    if (!formRoomId || !formTime) {
      toast.error('Please select a room and time')
      return
    }
    const roomInfo = roomOptions.find(r => r.id === formRoomId)
    if (!roomInfo) return

    createMutation.mutate({
      roomId: roomInfo.id,
      roomNumber: roomInfo.number,
      guestName: roomInfo.guestName,
      scheduledTime: formTime,
      phoneExtension: roomInfo.number,
      notes: formNotes || undefined,
      date: todayStr,
    })
  }

  // ─── Computed values ────────────────────────────────────────
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
          (c.notes || '').toLowerCase().includes(q),
      )
    }
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

  // ─── Loading / Error states ─────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="size-8 mb-2" />
          <p className="text-sm font-medium">Failed to load wake-up calls</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-1.5" />Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Wake-Up Calls</h2>
          <p className="text-xs text-muted-foreground">
            Manage scheduled wake-up calls for today —{' '}
            <span className="font-medium text-foreground">
              Current time: {formatTimeDisplay(
                `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`,
              )}
            </span>
          </p>
        </div>
        <Button onClick={() => { setFormRoomId(''); setFormTime(''); setFormNotes(''); setAddDialogOpen(true) }} className="gap-2 shrink-0">
          <Plus className="size-3.5" />
          New Wake-up Call
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="missed" className="text-xs">Missed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Search guest or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs"
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <CardContent className="p-2.5 flex flex-col gap-2">
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
                        <p className="text-xs font-bold font-mono">Room {call.roomNumber}</p>
                        <p className="text-xs text-muted-foreground">{call.guestName}</p>
                      </div>
                    </div>
                    <CallStatusBadge status={call.status} />
                  </div>

                  {/* Time Display */}
                  <div className="flex items-center gap-2">
                    <Clock className="size-3 text-muted-foreground" />
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
                      <span className="font-mono">Ext. {call.phoneExtension || call.roomNumber}</span>
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
                      {(call.status === 'Pending' || call.status === 'Snoozed') && (
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-7 gap-1"
                          onClick={() => handleMarkCalled(call)}
                          disabled={updateMutation.isPending}
                        >
                          <Phone className="size-3" />
                          Call
                        </Button>
                      )}
                      {(call.status === 'Pending' || call.status === 'Snoozed') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-7 gap-1"
                            onClick={() => handleSnooze(call)}
                            disabled={updateMutation.isPending}
                          >
                            <AlarmClock className="size-3" />
                            Snooze
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleMarkMissed(call)}
                            disabled={updateMutation.isPending}
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
                          disabled={updateMutation.isPending}
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
                        onClick={() => handleRetry(call)}
                        disabled={updateMutation.isPending}
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
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {roomOptions.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
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
            <Button onClick={handleAddCall} disabled={!formRoomId || !formTime || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              <BellRing className="size-4 mr-1.5" />
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}