'use client'
import { toast } from 'sonner'

import React, { useState } from 'react'
import {
  Flower2, Clock, User, Plus, CalendarDays, CheckCircle, XCircle,
  AlertCircle, DollarSign, Play,
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
  usePosData, formatNPR,
  type SpaService, type Therapist, type SpaAppointment,
} from './pos-types'

// ─── Time Slot Helpers ───────────────────────────────────────────────
const SPA_HOURS = Array.from({ length: 10 }, (_, i) => i + 9) // 9 AM to 6 PM
const TIME_SLOTS = SPA_HOURS.map((h) => `${h.toString().padStart(2, '0')}:00`)

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getHour(dateStr: string): number {
  return new Date(dateStr).getHours()
}

// ─── Appointment Status Badge ──────────────────────────────────────
function ApptStatusBadge({ status }: { status: SpaAppointment['status'] }) {
  const config: Record<SpaAppointment['status'], { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    scheduled: { variant: 'outline', className: 'border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40' },
    in_progress: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
    completed: { variant: 'secondary', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
    cancelled: { variant: 'destructive', className: '' },
  }
  const c = config[status]
  return (
    <Badge variant={c.variant} className={`text-[10px] ${c.className}`}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  )
}

// ─── Appointment Calendar ───────────────────────────────────────────
function AppointmentCalendar({
  appointments,
  services,
  onSelectAppt,
}: {
  appointments: SpaAppointment[]
  services: SpaService[]
  onSelectAppt: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-0.5 pr-2">
            {TIME_SLOTS.map((slot) => {
              const hour = parseInt(slot.split(':')[0])
              const hourAppts = appointments.filter((a) => getHour(a.startTime) === hour)
              return (
                <div key={slot} className="flex gap-2 min-h-[56px]">
                  <div className="w-14 flex-shrink-0 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">{slot}</span>
                  </div>
                  <div className="flex-1 border-l-2 border-muted pl-3 py-1">
                    {hourAppts.length > 0 ? (
                      <div className="space-y-1.5">
                        {hourAppts.map((appt) => (
                          <button
                            key={appt.id}
                            onClick={() => onSelectAppt(appt.id)}
                            className="flex items-center justify-between w-full rounded-lg border p-2 text-left transition-all hover:shadow-sm hover:border-primary/20"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white ${
                                appt.status === 'in_progress' ? 'bg-emerald-500' :
                                appt.status === 'scheduled' ? 'bg-blue-500' :
                                appt.status === 'completed' ? 'bg-gray-400' : 'bg-red-500'
                              }`}>
                                {appt.guestName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{appt.guestName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {appt.serviceName} · {appt.therapistName}
                                </p>
                              </div>
                            </div>
                            <ApptStatusBadge status={appt.status} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-8 flex items-center">
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Service Catalog ────────────────────────────────────────────────
function ServiceCatalog({ services }: { services: SpaService[] }) {
  const [category, setCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'massage', label: 'Massage' },
    { id: 'facial', label: 'Facials' },
    { id: 'body_treatment', label: 'Body' },
    { id: 'wellness', label: 'Wellness' },
  ]

  const filtered = category === 'all' ? services : services.filter((s) => s.category === category)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flower2 className="h-4 w-4" />
          Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full h-7">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs flex-1">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {filtered.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border p-2 transition-all hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{service.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {service.duration} min
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {service.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-bold text-primary">{formatNPR(service.price)}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Therapist Schedule ─────────────────────────────────────────────
function TherapistSchedule({ therapists }: { therapists: Therapist[] }) {
  const statusConfig: Record<Therapist['status'], { color: string; label: string }> = {
    available: { color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', label: 'Available' },
    busy: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40', label: 'In Session' },
    break: { color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40', label: 'On Break' },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Therapists
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {therapists.map((therapist) => {
            const config = statusConfig[therapist.status]
            return (
              <div
                key={therapist.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-white text-xs font-bold">
                    {therapist.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{therapist.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {therapist.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="text-[9px] px-1 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.color}`}>
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

// ─── Active Sessions ────────────────────────────────────────────────
function ActiveSessions({
  appointments,
}: {
  appointments: SpaAppointment[]
}) {
  const active = appointments.filter((a) => a.status === 'in_progress')

  if (active.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No active sessions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Play className="h-4 w-4 text-emerald-600" />
          Active Sessions ({active.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {active.map((appt) => (
            <div key={appt.id} className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{appt.guestName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {appt.serviceName} · {appt.therapistName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">{appt.room}</p>
                  <p className="text-xs font-bold text-emerald-600">{formatNPR(appt.serviceName.includes('Gold') ? 6000 : 4500)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Booking Dialog ──────────────────────────────────────────────────
function BookingDialog({
  open,
  onClose,
  services,
  therapists,
}: {
  open: boolean
  onClose: () => void
  services: SpaService[]
  therapists: Therapist[]
}) {
  const availableTherapists = therapists.filter((t) => t.status === 'available')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Booking
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Guest Name</Label>
            <Input placeholder="Enter guest name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Service</Label>
            <Select>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select service..." /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatNPR(s.price)} ({s.duration} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Therapist</Label>
            <Select>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select therapist..." /></SelectTrigger>
              <SelectContent>
                {availableTherapists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                {availableTherapists.length === 0 && (
                  <SelectItem value="any" disabled>No available therapists</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Time Slot</Label>
            <Select>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select time..." /></SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.success('Appointment booked successfully'); onClose() }}>Book Appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main SpaView ───────────────────────────────────────────
export default function SpaView() {
  const { data, isLoading } = usePosData('spa')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<string | null>(null)

  const services = data?.spaServices ?? []
  const therapists = data?.therapists ?? []
  const appointments = data?.appointments ?? []

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid gap-2 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[500px] rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-[300px] rounded-lg" />
            <Skeleton className="h-[200px] rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-rose-600"><CalendarDays className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Today&apos;s Appts</p>
              <p className="text-sm font-bold">{appointments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-emerald-600"><Play className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Active Now</p>
              <p className="text-sm font-bold">{appointments.filter(a => a.status === 'in_progress').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-blue-600"><User className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Available Staff</p>
              <p className="text-sm font-bold">{therapists.filter(t => t.status === 'available').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-amber-600"><DollarSign className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold">{formatNPR(appointments.filter(a => a.status !== 'cancelled').length * 4500)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout */}
      <div className="grid gap-2 lg:grid-cols-[1fr_320px]">
        {/* Left: Calendar */}
        <AppointmentCalendar
          appointments={appointments}
          services={services}
          onSelectAppt={setSelectedAppt}
        />
        {/* Right: Services + Therapists */}
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setBookingOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Booking
            </Button>
          </div>
          <ServiceCatalog services={services} />
          <TherapistSchedule therapists={therapists} />
        </div>
      </div>

      {/* Active Sessions */}
      <ActiveSessions appointments={appointments} />

      {/* Booking Dialog */}
      <BookingDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        therapists={therapists}
      />
    </div>
  )
}
