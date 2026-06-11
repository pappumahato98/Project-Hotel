'use client'
import { toast } from 'sonner'

import React, { useState } from 'react'
import {
  Monitor, Clock, DollarSign, Users, Plus, CreditCard, Printer,
  Phone, Truck, DoorOpen, Wifi,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  usePosData, formatNPR, timeAgo,
  type BizService, type MeetingRoom, type ActiveRental,
} from './pos-types'

// ─── Category Icons ─────────────────────────────────────────────────
function CategoryIcon({ category }: { category: BizService['category'] }) {
  const icons: Record<string, React.ReactNode> = {
    workstation: <Monitor className="h-4 w-4" />,
    meeting_room: <Users className="h-4 w-4" />,
    printing: <Printer className="h-4 w-4" />,
    calls: <Phone className="h-4 w-4" />,
    courier: <Truck className="h-4 w-4" />,
  }
  return <>{icons[category] ?? <Monitor className="h-4 w-4" />}</>
}

const categoryColors: Record<string, string> = {
  workstation: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  meeting_room: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
  printing: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
  calls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  courier: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
}

// ─── Service Catalog ────────────────────────────────────────────────
function ServiceCatalog({
  services,
  onStartService,
}: {
  services: BizService[]
  onStartService: (service: BizService) => void
}) {
  const [category, setCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'workstation', label: 'Workstations' },
    { id: 'meeting_room', label: 'Meeting Rooms' },
    { id: 'printing', label: 'Printing' },
    { id: 'calls', label: 'Calls' },
    { id: 'courier', label: 'Courier' },
  ]

  const filtered = category === 'all' ? services : services.filter((s) => s.category === category)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Service Catalog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full h-7">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-[11px] flex-1">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-2">
            {filtered.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border p-2 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`rounded-lg p-1.5 flex-shrink-0 ${categoryColors[service.category]}`}>
                    <CategoryIcon category={service.category} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{service.description}</p>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-0.5">
                      {formatNPR(service.pricePerUnit)} / {service.unit}
                    </Badge>
                  </div>
                </div>
                {(service.category === 'workstation' || service.category === 'meeting_room') ? (
                  <Button size="sm" variant="outline" className="text-[11px] flex-shrink-0" onClick={() => onStartService(service)}>
                    Start
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-[11px] flex-shrink-0" onClick={() => onStartService(service)}>
                    Charge
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Meeting Room Availability ──────────────────────────────────────
function MeetingRoomGrid({ rooms }: { rooms: MeetingRoom[] }) {
  const statusConfig: Record<MeetingRoom['status'], { bg: string; border: string; dot: string; label: string }> = {
    available: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500', label: 'Available' },
    occupied: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-500', label: 'Occupied' },
    maintenance: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-300 dark:border-red-700', dot: 'bg-red-500', label: 'Maintenance' },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DoorOpen className="h-4 w-4" />
          Meeting Room Availability
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {rooms.map((room) => {
            const config = statusConfig[room.status]
            return (
              <div key={room.id} className={`rounded-lg border-2 p-2.5 ${config.bg} ${config.border}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{room.name}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    Capacity: {room.capacity} persons
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatNPR(room.hourlyRate)}/hr
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] mt-2 ${config.bg}`}>
                  {config.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Active Rentals ────────────────────────────────────────────────
function ActiveRentals({ rentals }: { rentals: ActiveRental[] }) {
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<ActiveRental | null>(null)

  const handleEndRental = (rental: ActiveRental) => {
    setSelectedRental(rental)
    setEndDialogOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4 text-blue-600" />
            Active Rentals ({rentals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rentals.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Monitor className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No active rentals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rentals.map((rental) => (
                <div key={rental.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                      {rental.serviceId.startsWith('ws') ? (
                        <Monitor className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rental.serviceName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {rental.guestName} {rental.roomNumber !== '—' ? `· Room ${rental.roomNumber}` : ''} · Started {timeAgo(rental.startedAt)} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatNPR(rental.charges)}</p>
                      <p className="text-[10px] text-muted-foreground">running</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px]"
                      onClick={() => handleEndRental(rental)}
                    >
                      End
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EndRentalDialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
        rental={selectedRental}
      />
    </>
  )
}

// ─── End Rental Dialog ──────────────────────────────────────────────
function EndRentalDialog({
  open,
  onClose,
  rental,
}: {
  open: boolean
  onClose: () => void
  rental: ActiveRental | null
}) {
  if (!rental) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> End Rental
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{rental.serviceName}</p>
            <p className="text-xs text-muted-foreground">{rental.guestName}</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span>{timeAgo(rental.startedAt)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span>Total Charges</span>
            <span>{formatNPR(rental.charges)}</span>
          </div>
          <Separator />
          <div>
            <Label className="text-sm font-medium">Charge To</Label>
            <Select defaultValue={`room-${rental.roomNumber}`}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={`room-${rental.roomNumber}`}>Room {rental.roomNumber} — {rental.guestName}</SelectItem>
                <SelectItem value="cash">Pay at Counter (Cash)</SelectItem>
                <SelectItem value="card">Pay at Counter (Card)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.success('Rental ended & charged to room'); onClose() }}>End & Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Charge Service Dialog ──────────────────────────────────
function ChargeServiceDialog({
  open,
  onClose,
  service,
}: {
  open: boolean
  onClose: () => void
  service: BizService | null
}) {
  if (!service) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Charge Service
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{service.name}</p>
            <p className="text-xs text-muted-foreground">{service.description}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Guest Name</Label>
            <Input placeholder="Enter guest name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Room Number</Label>
            <Input placeholder="e.g., 301" className="mt-1.5" />
          </div>
          {(service.category === 'printing' || service.category === 'calls') && (
            <div>
              <Label className="text-sm font-medium">
                Quantity ({service.unit}s)
              </Label>
              <Input type="number" placeholder="1" className="mt-1.5" defaultValue="1" />
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-2 border-t">
            <span>Estimated Total</span>
            <span>{formatNPR(service.pricePerUnit)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.success('Service charged successfully'); onClose() }}>Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main BusinessCenterView ───────────────────────────────────────
export default function BusinessCenterView() {
  const { data, isLoading } = usePosData('business-center')
  const [chargeDialog, setChargeDialog] = useState<BizService | null>(null)

  const services = data?.bizServices ?? []
  const meetingRooms = data?.meetingRooms ?? []
  const activeRentals = data?.activeRentals ?? []

  const handleStartService = (service: BizService) => {
    setChargeDialog(service)
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-blue-600"><Monitor className="h-4 w-4" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Active Rentals</p>
              <p className="text-sm font-bold">{activeRentals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-purple-600"><DoorOpen className="h-4 w-4" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Meeting Rooms</p>
              <p className="text-sm font-bold">{meetingRooms.filter(r => r.status === 'available').length}/{meetingRooms.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-emerald-600"><DollarSign className="h-4 w-4" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Running Charges</p>
              <p className="text-sm font-bold">{formatNPR(activeRentals.reduce((s, r) => s + r.charges, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Catalog + Meeting Rooms */}
      <div className="grid gap-2 lg:grid-cols-[1fr_380px]">
        <ServiceCatalog services={services} onStartService={handleStartService} />
        <MeetingRoomGrid rooms={meetingRooms} />
      </div>

      {/* Active Rentals */}
      <ActiveRentals rentals={activeRentals} />

      {/* Charge Dialog */}
      <ChargeServiceDialog
        open={!!chargeDialog}
        onClose={() => setChargeDialog(null)}
        service={chargeDialog}
      />
    </div>
  )
}
