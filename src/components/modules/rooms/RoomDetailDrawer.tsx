'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  BedDouble,
  Building2,
  Eye,
  MapPin,
  Phone,
  Globe,
  Sparkles,
  Wrench,
  FileText,
  UserPlus,
  ArrowRightLeft,
  Ban,
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigationStore } from '@/lib/store'

// ─── Types (same as RoomBoard) ───────────────────────────────
interface RoomGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
  phone: string | null
  nationality: string | null
}

interface RoomReservation {
  id: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number
  adults: number
  children: number
  source: string | null
}

interface RoomType {
  id: string
  name: string
  code: string
  baseOccupancy: number
  maxOccupancy: number
  bedConfig: string
  areaSqFt: number | null
  view: string | null
  amenities: string | null
}

interface RoomData {
  id: string
  number: string
  floor: number
  wing: string | null
  view: string | null
  status: string
  typeId: string
  type: RoomType
  guest: RoomGuest | null
  reservation: RoomReservation | null
}

// ─── Status Config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  vacant_clean: { label: 'Vacant Clean', dot: 'bg-green-500' },
  occupied: { label: 'Occupied', dot: 'bg-blue-500' },
  vacant_dirty: { label: 'Vacant Dirty', dot: 'bg-yellow-500' },
  cleaning: { label: 'Cleaning', dot: 'bg-amber-500' },
  inspected: { label: 'Inspected', dot: 'bg-purple-500' },
  out_of_order: { label: 'Out of Order', dot: 'bg-red-500' },
  on_change: { label: 'On Change', dot: 'bg-gray-400' },
}

// Next logical status transitions
const STATUS_TRANSITIONS: Record<string, Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }> }>> = {
  vacant_clean: [
    { to: 'occupied', label: 'Mark Occupied', icon: Users },
    { to: 'out_of_order', label: 'Out of Order', icon: Ban },
  ],
  occupied: [
    { to: 'on_change', label: 'Guest Departing', icon: ArrowRightLeft },
    { to: 'out_of_order', label: 'Out of Order', icon: Ban },
  ],
  vacant_dirty: [
    { to: 'cleaning', label: 'Send for Cleaning', icon: CheckCircle2 },
    { to: 'out_of_order', label: 'Out of Order', icon: Ban },
  ],
  cleaning: [
    { to: 'inspected', label: 'Ready for Inspection', icon: Eye },
    { to: 'vacant_clean', label: 'Mark Clean', icon: CheckCircle2 },
  ],
  inspected: [
    { to: 'vacant_clean', label: 'Mark Available', icon: CheckCircle2 },
    { to: 'occupied', label: 'Mark Occupied', icon: Users },
  ],
  out_of_order: [
    { to: 'vacant_dirty', label: 'Return to Service', icon: CheckCircle2 },
  ],
  on_change: [
    { to: 'vacant_dirty', label: 'Mark Dirty', icon: AlertTriangle },
    { to: 'cleaning', label: 'Send for Cleaning', icon: CheckCircle2 },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────
function formatNpr(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function nightsBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Props ─────────────────────────────────────────────────────
interface RoomDetailDrawerProps {
  room: RoomData
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ────────────────────────────────────────────────
export function RoomDetailDrawer({ room, open, onOpenChange }: RoomDetailDrawerProps) {
  const [oooOpen, setOooOpen] = useState(false)
  const [oooReason, setOooReason] = useState('')
  const { navigateTo } = useNavigationStore()

  const statusConfig = STATUS_CONFIG[room.status] || STATUS_CONFIG.vacant_clean
  const transitions = STATUS_TRANSITIONS[room.status] || []
  const amenities: string[] = room.type.amenities ? JSON.parse(room.type.amenities) : []

  const handleStatusChange = (newStatus: string, label: string) => {
    toast.success(`Room ${room.number} status changed to ${label}`)
    onOpenChange(false)
  }

  const handleOOO = () => {
    if (!oooReason.trim()) {
      toast.error('Please provide a reason for marking room out of order')
      return
    }
    toast.success(`Room ${room.number} marked as Out of Order: ${oooReason}`)
    setOooOpen(false)
    setOooReason('')
    onOpenChange(false)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'assign':
        onOpenChange(false)
        navigateTo('front-desk', 'reservations')
        break
      case 'work-order':
        toast.info(`Create work order for Room ${room.number} — Feature coming soon`)
        break
      case 'folio':
        onOpenChange(false)
        navigateTo('front-desk', 'folio')
        break
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 overflow-hidden">
          <SheetHeader className="p-4 pb-0 shrink-0">
            {/* Room number header with status */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-2xl">Room {room.number}</SheetTitle>
                  <div className={cn('size-2.5 rounded-full mt-1.5', statusConfig.dot)} />
                </div>
                <SheetDescription className="mt-1">
                  {room.type.name} · Floor {room.floor}
                  {room.wing && ` · ${room.wing} Wing`}
                </SheetDescription>
              </div>
              <StatusBadge status={room.status} />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
            <div className="p-4 pt-2 space-y-3">
              {/* ── Room Info ─────────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Room Information
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: BedDouble, label: 'Type', value: `${room.type.name} (${room.type.code})` },
                    { icon: Building2, label: 'Floor / Wing', value: `F${room.floor}${room.wing ? ` · ${room.wing}` : ''}` },
                    { icon: Users, label: 'Occupancy', value: `${room.type.baseOccupancy} – ${room.type.maxOccupancy} guests` },
                    { icon: BedDouble, label: 'Bed Config', value: room.type.bedConfig },
                    ...(room.type.areaSqFt ? [{ icon: MapPin, label: 'Area', value: `${room.type.areaSqFt} sq ft` }] : []),
                    ...(room.view ? [{ icon: Eye, label: 'View', value: room.view }] : []),
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="rounded-md border bg-muted/30 p-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          <Icon className="size-3" />
                          {item.label}
                        </div>
                        <p className="text-xs font-medium mt-0.5">{item.value}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Amenities</p>
                    <div className="flex flex-wrap gap-1">
                      {amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              {/* ── Guest Info (if occupied) ─────────────── */}
              {room.status === 'occupied' && room.guest && room.reservation && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Current Guest
                  </h3>
                  <div className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {room.guest.firstName.charAt(0)}{room.guest.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {room.guest.firstName} {room.guest.lastName}
                          </p>
                          {room.guest.vipLevel !== 'none' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                              <Sparkles className="size-2.5" />
                              {room.guest.vipLevel.charAt(0).toUpperCase() + room.guest.vipLevel.slice(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      {room.guest.nationality && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="size-3" />
                          <span>{room.guest.nationality}</span>
                        </div>
                      )}
                      {room.guest.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="size-3" />
                          <span>{room.guest.phone}</span>
                        </div>
                      )}
                    </div>
                    <Separator className="my-1" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Confirmation</p>
                        <p className="font-medium">{room.reservation.confirmationNo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Rate</p>
                        <p className="font-medium">{formatNpr(room.reservation.roomRate)}/night</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Check-in</p>
                        <p className="font-medium">{formatDate(room.reservation.checkIn)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatTime(room.reservation.checkIn)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Check-out</p>
                        <p className="font-medium">{formatDate(room.reservation.checkOut)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatTime(room.reservation.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Guests</p>
                        <p className="font-medium">{room.reservation.adults} adults{room.reservation.children > 0 ? `, ${room.reservation.children} children` : ''}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Nights</p>
                        <p className="font-medium">{nightsBetween(room.reservation.checkIn, room.reservation.checkOut)}</p>
                      </div>
                      {room.reservation.source && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-muted-foreground font-medium">Source</p>
                          <p className="font-medium capitalize">{room.reservation.source.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {room.status === 'occupied' && <Separator />}

              {/* ── Status Timeline ───────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Status Timeline
                </h3>
                <div className="relative space-y-3 pl-4 border-l-2 border-muted">
                  {/* Current status */}
                  <div className="relative">
                    <div className={cn(
                      'absolute -left-[21px] top-0.5 size-3 rounded-full border-2 border-background',
                      statusConfig.dot
                    )} />
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{statusConfig.label}</p>
                      <span className="text-[10px] text-muted-foreground">Current</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  {/* Previous status (mock) */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 size-3 rounded-full border-2 border-background bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      {room.status === 'occupied' ? 'Checked In' :
                       room.status === 'cleaning' ? 'Vacant Dirty' :
                       room.status === 'inspected' ? 'Cleaning Complete' :
                       room.status === 'vacant_dirty' ? 'Guest Checked Out' :
                       room.status === 'on_change' ? 'Guest Departed' :
                       room.status === 'out_of_order' ? 'Reported Issue' :
                       'Inspected'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 size-3 rounded-full border-2 border-background bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      {room.status === 'occupied' ? 'Vacant Clean' : 'Inspected'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Yesterday, 10:00 AM
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Quick Actions ────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>

                {/* Change Status */}
                {transitions.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs font-medium">Change Status</Label>
                    <Select onValueChange={(value) => {
                      const target = transitions.find(t => t.to === value)
                      if (target) handleStatusChange(target.to, target.label)
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select new status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map((t) => {
                          const Icon = t.icon
                          return (
                            <SelectItem key={t.to} value={t.to}>
                              <div className="flex items-center gap-2">
                                <Icon className="size-3.5" />
                                {t.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleQuickAction('assign')}
                  >
                    <UserPlus className="size-3.5" />
                    Assign Reservation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleQuickAction('work-order')}
                  >
                    <Wrench className="size-3.5" />
                    Work Order
                  </Button>
                  {room.status === 'occupied' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs gap-1.5 col-span-2"
                      onClick={() => handleQuickAction('folio')}
                    >
                      <FileText className="size-3.5" />
                      View Guest Folio
                    </Button>
                  )}
                  <Dialog open={oooOpen} onOpenChange={setOooOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-9 text-xs gap-1.5 col-span-2"
                      >
                        <Ban className="size-3.5" />
                        Mark Out of Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Room {room.number} Out of Order</DialogTitle>
                        <DialogDescription>
                          Please provide a reason for taking this room out of service.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="ooo-reason">Reason</Label>
                          <Textarea
                            id="ooo-reason"
                            placeholder="Describe the issue (e.g., plumbing leak, AC broken, maintenance required)"
                            value={oooReason}
                            onChange={(e) => setOooReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOooOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleOOO}>
                          Confirm Out of Order
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </section>

              {/* Bottom spacing */}
              <div className="h-4" />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
