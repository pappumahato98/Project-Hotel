'use client'

import React, { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  Ban,
  CalendarArrowDown,
  CalendarArrowUp,
  CalendarRange,
  Plus,
  ShieldAlert,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, startOfDay } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────
interface RestrictionData {
  id: string
  roomTypeId: string
  date: string
  restrictionType: string
  value: number | null
  reason: string | null
  roomType: {
    id: string
    name: string
    code: string
  }
}

interface RestrictionsResponse {
  restrictions: RestrictionData[]
  roomTypes: Array<{
    id: string
    name: string
    code: string
    roomCount: number
  }>
}

// ─── Restriction Type Config ──────────────────────────────────
const RESTRICTION_TYPES: Record<string, { label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  stop_sell: {
    label: 'Stop Sell',
    shortLabel: 'SS',
    icon: Ban,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950/50 border-red-200 dark:border-red-800',
  },
  cta: {
    label: 'Close To Arrival',
    shortLabel: 'CTA',
    icon: CalendarArrowDown,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
  },
  ctd: {
    label: 'Close To Departure',
    shortLabel: 'CTD',
    icon: CalendarArrowUp,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
  },
  min_los: {
    label: 'Min Length of Stay',
    shortLabel: 'Min',
    icon: CalendarRange,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
  },
  max_los: {
    label: 'Max Length of Stay',
    shortLabel: 'Max',
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
  },
}

// ─── Helpers ──────────────────────────────────────────────────
function generateDates(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i))
}

// ─── Restriction Cell ──────────────────────────────────────────
function RestrictionCell({
  restriction,
  onRemove,
}: {
  restriction: RestrictionData
  onRemove: () => void
}) {
  const config = RESTRICTION_TYPES[restriction.restrictionType]
  if (!config) return null

  const Icon = config.icon

  return (
    <button
      onClick={onRemove}
      className={cn(
        'group flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1 text-center transition-all hover:scale-105 hover:shadow-sm cursor-pointer min-w-[44px]',
        config.bgColor,
      )}
      title={`${config.label}${restriction.value ? `: ${restriction.value}` : ''}${restriction.reason ? ` — ${restriction.reason}` : ''}`}
    >
      <Icon className={cn('size-3', config.color)} />
      <span className={cn('text-[10px] font-bold leading-none', config.color)}>
        {config.shortLabel}
      </span>
      {restriction.value !== null && restriction.value !== undefined && restriction.value > 0 && (
        <span className="text-[9px] font-bold text-foreground">
          {restriction.value}
        </span>
      )}
    </button>
  )
}

// ─── Add Restriction Dialog ────────────────────────────────────
function AddRestrictionDialog({
  roomTypes,
  selectedDate,
}: {
  roomTypes: Array<{ id: string; name: string; code: string }>
  selectedDate: Date
}) {
  const [open, setOpen] = useState(false)
  const [roomTypeId, setRoomTypeId] = useState('')
  const [restrictionType, setRestrictionType] = useState('')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!roomTypeId || !restrictionType) {
      toast.error('Please select room type and restriction type')
      return
    }
    const config = RESTRICTION_TYPES[restrictionType]
    toast.success(
      `Restriction added: ${roomTypes.find(rt => rt.id === roomTypeId)?.name} — ${config?.label}${value ? ` (${value})` : ''} on ${format(selectedDate, 'MMM d, yyyy')}`
    )
    setOpen(false)
    setRoomTypeId('')
    setRestrictionType('')
    setValue('')
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3" />
          Add Restriction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Room Restriction</DialogTitle>
          <DialogDescription>
            Add a restriction for {format(selectedDate, 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} ({rt.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Restriction Type</Label>
            <Select value={restrictionType} onValueChange={setRestrictionType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select restriction type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESTRICTION_TYPES).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5" />
                        {config.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {(restrictionType === 'min_los' || restrictionType === 'max_los') && (
            <div className="space-y-2">
              <Label>Value (nights)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g., Festival period, Maintenance, Group booking"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Restriction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────
function RestrictionsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export function RestrictionsView() {
  const [dateOffset, setDateOffset] = useState(0)
  const [viewDays] = useState(14)

  const { data, isLoading, error, refetch } = useQuery<RestrictionsResponse>({
    queryKey: qk.rooms(),
    queryFn: () => apiFetch('/api/rooms'),
    staleTime: 60_000,
  })

  if (isLoading) return <RestrictionsSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load restrictions</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const startDate = addDays(startOfDay(new Date()), dateOffset)
  const dates = generateDates(startDate, viewDays)
  const weekStart = format(addDays(startDate, 0), 'MMM d')
  const weekEnd = format(addDays(startDate, viewDays - 1), 'MMM d, yyyy')

  // Build a lookup: `${roomTypeId}-${dateStr}` -> restriction
  const restrictionMap = new Map<string, RestrictionData>()
  for (const r of data.restrictions) {
    const dateKey = format(new Date(r.date), 'yyyy-MM-dd')
    restrictionMap.set(`${r.roomTypeId}-${dateKey}`, r)
  }

  const handleRemoveRestriction = (r: RestrictionData) => {
    toast.info(
      `Removed restriction: ${RESTRICTION_TYPES[r.restrictionType]?.label} on ${format(new Date(r.date), 'MMM d')} for ${r.roomType.name}`
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <ShieldAlert className="size-4 text-muted-foreground" />
                Room Restrictions
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage availability restrictions by room type and date
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AddRestrictionDialog roomTypes={data.roomTypes} selectedDate={startDate} />
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2.5">
            <span className="text-xs font-medium text-muted-foreground">Legend:</span>
            {Object.entries(RESTRICTION_TYPES).map(([key, config]) => {
              const Icon = config.icon
              return (
                <div key={key} className="flex items-center gap-1">
                  <Icon className={cn('size-3.5', config.color)} />
                  <span className="text-[11px] font-medium">{config.label}</span>
                </div>
              )
            })}
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between rounded-lg border bg-card px-2 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateOffset(prev => Math.max(0, prev - viewDays))}
              disabled={dateOffset === 0}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center">
              <p className="text-xs font-semibold">{weekStart} — {weekEnd}</p>
              <p className="text-[10px] text-muted-foreground">
                {viewDays} days · {data.restrictions.length} active restrictions
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateOffset(prev => prev + viewDays)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Restrictions Grid */}
          <div className="rounded-lg border overflow-hidden">
            {/* Date headers row */}
            <div className="flex bg-muted/50 border-b">
              {/* Room type column */}
              <div className="w-36 shrink-0 p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r">
                Room Type
              </div>
              {/* Date columns */}
              <div className="flex flex-1 overflow-x-auto">
                {dates.map((date) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'flex-1 min-w-[52px] p-1.5 text-center border-r last:border-r-0',
                        isToday && 'bg-primary/5',
                        isWeekend && 'bg-amber-50/50 dark:bg-amber-950/20',
                      )}
                    >
                      <p className={cn(
                        'text-[10px] font-medium',
                        isToday ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {format(date, 'EEE').slice(0, 3)}
                      </p>
                      <p className={cn(
                        'text-xs font-bold',
                        isToday ? 'text-primary' : ''
                      )}>
                        {format(date, 'd')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Room type rows */}
            {data.roomTypes.map((roomType) => (
              <div key={roomType.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                {/* Room type label */}
                <div className="w-36 shrink-0 p-2.5 border-r flex flex-col justify-center">
                  <p className="text-xs font-semibold truncate">{roomType.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {roomType.code} · {roomType.roomCount} rooms
                  </p>
                </div>

                {/* Date cells */}
                <div className="flex flex-1 overflow-x-auto">
                  {dates.map((date) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    const restriction = restrictionMap.get(`${roomType.id}-${dateKey}`)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    const isToday = date.toDateString() === new Date().toDateString()

                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          'flex-1 min-w-[52px] p-1.5 flex items-center justify-center border-r last:border-r-0',
                          isToday && 'bg-primary/5',
                          isWeekend && 'bg-amber-50/30 dark:bg-amber-950/10',
                        )}
                      >
                        {restriction ? (
                          <RestrictionCell
                            restriction={restriction}
                            onRemove={() => handleRemoveRestriction(restriction)}
                          />
                        ) : (
                          <div className="size-3 rounded-full bg-muted/50" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Click on a restriction badge to remove it. Use &quot;Add Restriction&quot; to create new ones.
            </p>
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}
