'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import {
  LogIn, BedDouble, Bell, Clock, Star, AlertTriangle, Users, CheckCircle2, UserCheck, Crown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatTime, formatCurrency, getTodayString } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

interface ArrivalGuest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  vipLevel: string
}

interface ArrivalRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  type: { name: string; code: string }
}

interface Arrival {
  id: string
  confirmationNo: string
  status: string
  adults: number
  children: number
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  specialRequests: string | null
  source: string | null
  guaranteed: boolean
  guest: ArrivalGuest | null
  room: ArrivalRoom | null
}

interface AvailableRoom {
  id: string
  number: string
  floor: number
  wing: string | null
  type: { name: string; code: string }
}

// ─── Component ──────────────────────────────────────────────────────────

export function ArrivalsView() {
  const queryClient = useQueryClient()
  const today = getTodayString()
  const [roomPickerOpen, setRoomPickerOpen] = useState(false)
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  // Fetch today's confirmed arrivals
  const { data, isLoading } = useQuery({
    queryKey: ['arrivals', today],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'confirmed', checkInDate: today })
      const res = await fetch(`/api/reservations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch arrivals')
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Fetch available rooms for room picker
  const { data: roomsData } = useQuery({
    queryKey: ['rooms', 'vacant'],
    queryFn: async () => {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      return res.json()
    },
  })

  const arrivals: Arrival[] = data?.reservations || []
  const allRooms: AvailableRoom[] = roomsData?.rooms || []
  const availableRooms = allRooms.filter((r) => r.number && r.type)

  // Stats
  const totalArrivals = arrivals.length
  const vipArrivals = arrivals.filter((a) => a.guest?.vipLevel && a.guest.vipLevel !== 'none').length
  const unassignedArrivals = arrivals.filter((a) => !a.room).length
  const pendingArrivals = arrivals.filter((a) => a.status === 'confirmed').length

  // Assign room mutation
  const assignRoomMutation = useMutation({
    mutationFn: async ({ reservationId, roomId }: { reservationId: string; roomId: string }) => {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, status: 'checked_in' }),
      })
      if (!res.ok) throw new Error('Failed to assign room')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setRoomPickerOpen(false)
      setCheckInDialogOpen(false)
      setSelectedArrival(null)
      setSelectedRoomId('')
    },
  })

  // Quick check-in (no room assignment)
  const checkInMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_in' }),
      })
      if (!res.ok) throw new Error('Failed to check in')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      setCheckInDialogOpen(false)
    },
  })

  const handleAssignRoom = (arrival: Arrival) => {
    setSelectedArrival(arrival)
    setRoomPickerOpen(true)
  }

  const handleQuickCheckIn = (arrival: Arrival) => {
    if (!arrival.room) {
      setSelectedArrival(arrival)
      setRoomPickerOpen(true)
      return
    }
    setSelectedArrival(arrival)
    setCheckInDialogOpen(true)
  }

  const confirmCheckIn = () => {
    if (selectedArrival) {
      if (selectedRoomId) {
        assignRoomMutation.mutate({ reservationId: selectedArrival.id, roomId: selectedRoomId })
      } else if (selectedArrival.room) {
        checkInMutation.mutate(selectedArrival.id)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Today&apos;s Arrivals</h2>
        <p className="text-sm text-muted-foreground">
          Guest check-ins scheduled for {formatDate(today)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Users className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalArrivals}</p>
              <p className="text-xs text-muted-foreground">Total Arrivals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalArrivals - pendingArrivals}</p>
              <p className="text-xs text-muted-foreground">Checked In</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unassignedArrivals}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Crown className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vipArrivals}</p>
              <p className="text-xs text-muted-foreground">VIP Guests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arrivals List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : arrivals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LogIn className="size-8 mb-2 opacity-50" />
              <p className="text-sm">No arrivals scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y">
              {arrivals.map((arrival) => {
                const isUnassigned = !arrival.room
                const isVip = arrival.guest?.vipLevel && arrival.guest.vipLevel !== 'none'
                return (
                  <div
                    key={arrival.id}
                    className={cn(
                      'p-4 transition-colors hover:bg-muted/50',
                      isUnassigned && 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Guest Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">
                            {arrival.guest ? `${arrival.guest.firstName} ${arrival.guest.lastName}` : 'Unknown Guest'}
                          </span>
                          {isVip && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                              <Crown className="size-3 mr-0.5" />
                              {arrival.guest?.vipLevel?.toUpperCase()}
                            </Badge>
                          )}
                          {isUnassigned && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="size-3 mr-0.5" />
                              Unassigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{arrival.confirmationNo}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BedDouble className="size-3" />
                            {arrival.room ? (
                              <span>Room {arrival.room.number} ({arrival.room.type.name})</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">No room assigned</span>
                            )}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {arrival.adults} adults{arrival.children > 0 ? `, ${arrival.children} children` : ''}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{arrival.source?.replace('_', ' ')}</span>
                        </div>
                        {arrival.specialRequests && (
                          <p className="text-xs text-muted-foreground mt-1 italic truncate">
                            📋 {arrival.specialRequests}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignRoom(arrival)}
                          className="text-xs"
                        >
                          <BedDouble className="size-3.5 mr-1" />
                          {isUnassigned ? 'Assign Room' : 'Change Room'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleQuickCheckIn(arrival)}
                          className="text-xs"
                        >
                          <UserCheck className="size-3.5 mr-1" />
                          Check In
                        </Button>
                        <Button size="sm" variant="ghost" className="size-8 p-0">
                          <Bell className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Picker Dialog */}
      <Dialog open={roomPickerOpen} onOpenChange={setRoomPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Room — {selectedArrival?.guest ? `${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName}` : 'Guest'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto">
            <div className="space-y-1">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    selectedRoomId === room.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  <BedDouble className="size-4 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">Room {room.number}</span>
                    <span className="text-xs opacity-70 ml-2">{room.type.name}</span>
                  </div>
                  <span className="text-xs opacity-70">Floor {room.floor}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomPickerOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmCheckIn}
              disabled={!selectedRoomId || assignRoomMutation.isPending}
            >
              {assignRoomMutation.isPending ? 'Assigning...' : 'Assign & Check In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Confirmation Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Check-In</DialogTitle>
          </DialogHeader>
          {selectedArrival && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">
                  {selectedArrival.guest ? `${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName}` : 'Guest'}
                </p>
                <p className="text-muted-foreground">
                  Room {selectedArrival.room?.number} • {selectedArrival.room?.type.name}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(selectedArrival.checkIn)} → {formatDate(selectedArrival.checkOut)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will change the reservation status to <strong>Checked In</strong> and update the room status to <strong>Occupied</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmCheckIn}
              disabled={checkInMutation.isPending}
            >
              <UserCheck className="size-4 mr-1.5" />
              {checkInMutation.isPending ? 'Checking in...' : 'Confirm Check-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
