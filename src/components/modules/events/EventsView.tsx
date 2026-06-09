'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Search, DollarSign, CalendarDays, Users, MapPin } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNPR } from '@/lib/utils'

interface EventItem {
  id: string
  name: string
  organizerName: string
  organizerPhone?: string
  organizerEmail?: string
  eventType: string
  venue?: string
  startDate: string
  endDate: string
  expectedPax: number
  status: string
  totalRevenue: number
  depositAmount: number
  depositPaid: number
  notes?: string
}

const eventTypeColors: Record<string, string> = {
  corporate: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  wedding: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
  birthday: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  conference: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300',
  meeting: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

async function fetchEvents(status?: string, eventType?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (eventType) params.set('eventType', eventType)
  const res = await fetch(`/api/events?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export function EventsView() {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['events', filterStatus, filterType],
    queryFn: () => fetchEvents(filterStatus || undefined, filterType || undefined),
  })

  const filteredEvents = data?.events?.filter((event: EventItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      event.name.toLowerCase().includes(q) ||
      event.organizerName.toLowerCase().includes(q) ||
      event.eventType.toLowerCase().includes(q)
    )
  })

  const depositSchedule = [
    { milestone: 'Booking Confirmation', dueDate: 'At booking', percentage: 30, amount: 0 },
    { milestone: '30 Days Before Event', dueDate: '30 days prior', percentage: 40, amount: 0 },
    { milestone: 'Event Day', dueDate: 'On event day', percentage: 30, amount: 0 },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events & Banquet</h1>
          <p className="text-sm text-muted-foreground">Manage hotel events, conferences, and celebrations</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.total ?? 0} events
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalRevenue) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deposits Paid</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalDepositsPaid) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Deposits</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalDepositsPending) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Events</p>
              <p className="text-2xl font-bold">{data?.events?.filter((e: EventItem) => e.status === 'confirmed').length ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="tentative">Tentative</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Types</option>
          <option value="corporate">Corporate</option>
          <option value="wedding">Wedding</option>
          <option value="birthday">Birthday</option>
          <option value="conference">Conference</option>
          <option value="meeting">Meeting</option>
        </select>
      </div>

      {/* Events Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead className="hidden md:table-cell">Venue</TableHead>
                  <TableHead className="hidden lg:table-cell">Dates</TableHead>
                  <TableHead className="text-center">Pax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Deposit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEvents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents?.map((event: EventItem) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={eventTypeColors[event.eventType] ?? ''}>
                          <span className="capitalize">{event.eventType}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{event.organizerName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{event.venue ?? '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell className="text-center">{event.expectedPax}</TableCell>
                      <TableCell>
                        <StatusBadge status={event.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatNPR(event.totalRevenue)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className={event.depositPaid >= event.depositAmount ? 'text-green-600' : 'text-amber-600'}>
                          {formatNPR(event.depositPaid)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={eventTypeColors[selectedEvent.eventType] ?? ''}>
                  <span className="capitalize">{selectedEvent.eventType}</span>
                </Badge>
                <StatusBadge status={selectedEvent.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Organizer:</span>
                  <span className="font-medium">{selectedEvent.organizerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Venue:</span>
                  <span className="font-medium">{selectedEvent.venue ?? 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">{new Date(selectedEvent.startDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">{new Date(selectedEvent.endDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Pax: </span>
                  <span className="font-bold">{selectedEvent.expectedPax}</span>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Revenue Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">{formatNPR(selectedEvent.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Deposit Required</span>
                    <span className="font-medium">{formatNPR(selectedEvent.depositAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Paid</span>
                    <span className="font-medium text-green-600">{formatNPR(selectedEvent.depositPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="font-medium text-amber-600">
                      {formatNPR(selectedEvent.depositAmount - selectedEvent.depositPaid)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Deposit Schedule</h3>
                <div className="space-y-2 text-sm">
                  {depositSchedule.map((ds, idx) => {
                    const amt = Math.round(selectedEvent.depositAmount * ds.percentage / 100)
                    return (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{ds.milestone}</span>
                          <span className="text-muted-foreground ml-2">({ds.dueDate})</span>
                        </div>
                        <span className="font-medium">{formatNPR(amt)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
