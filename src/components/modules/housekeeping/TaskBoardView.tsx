'use client'
import { toast } from 'sonner'

import { useState, useMemo, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import {
  Search, Filter, X, ChevronDown, BedDouble, Clock, User, AlertTriangle, Star,
  ClipboardCheck, Users, CheckCircle2, Circle, Sparkles, Eye, Trash2,
  LayoutGrid, List, MoreHorizontal, PlayCircle, CheckCircle, ShieldCheck,
  ArrowUpCircle, XCircle, ShieldAlert, Camera, RotateCcw, Ban
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
interface HkTask {
  id: string
  roomId: string
  taskType: string
  status: string
  priority: string
  assignedTo: string | null
  scheduledTime: string
  completedTime: string | null
  estimatedMinutes: number
  notes: string | null
  room: {
    id: string
    number: string
    floor: number
    wing: string | null
    status: string
    type: { name: string; code: string }
  }
}

interface HkSummary {
  total: number
  pending: number
  assigned: number
  inProgress: number
  cleaned: number
  inspected: number
  failed: number
}


interface RoomRow {
  roomId: string
  roomNumber: string
  floor: number
  wing: string | null
  roomTypeName: string
  roomTypeCode: string
  bedConfig: string
  maxOccupancy: number
  roomStatus: string
  hkDisplayStatus: string
  hkTaskId: string | null
  priority: string
  assignedTo: string | null
  taskNotes: string | null
  scheduledTime: string | null
  estimatedMinutes: number | null
  reservationStatus: string
  guestName: string | null
  specialRequests: string | null
  confirmationNo: string | null
  hasTask: boolean
}

// ── HK Status Colors ─────────────────────────────────────────
function hkStatusBadge(status: string) {
  const map: Record<string, { classes: string; label: string }> = {
    clean: { classes: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', label: 'Clean' },
    dirty: { classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', label: 'Dirty' },
    cleaning: { classes: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Cleaning' },
    cleaned: { classes: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800', label: 'Cleaned' },
    change_over: { classes: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', label: 'Change Over' },
    pending: { classes: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800', label: 'Pending' },
    assigned: { classes: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800', label: 'Assigned' },
    inspected: { classes: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800', label: 'Inspected' },
    failed: { classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', label: 'Failed' },
    occupied: { classes: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Occupied' },
    out_of_order: { classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', label: 'Out of Order' },
  }
  const s = map[status] || { classes: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: status }
  return <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0', s.classes)}>{s.label}</Badge>
}

// ── Reservation Status Colors ────────────────────────────────
function resStatusBadge(status: string) {
  const map: Record<string, { classes: string; label: string }> = {
    occupied: { classes: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Occupied' },
    vacant: { classes: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800', label: 'Vacant' },
    due_in: { classes: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800', label: 'Due In' },
    confirmed: { classes: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800', label: 'Confirmed' },
    checked_out: { classes: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: 'Checked Out' },
    no_show: { classes: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', label: 'No Show' },
  }
  const s = map[status] || { classes: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', label: status }
  return <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0', s.classes)}>{s.label}</Badge>
}

// ── Priority Indicator ───────────────────────────────────────
function PriorityDot({ priority }: { priority: string }) {
  const config: Record<string, { dot: string; label: string }> = {
    vip: { dot: 'bg-amber-500', label: 'VIP' },
    rush: { dot: 'bg-red-500', label: 'Rush' },
    high: { dot: 'bg-orange-500', label: 'High' },
    normal: { dot: 'bg-emerald-500', label: 'Normal' },
    low: { dot: 'bg-gray-400', label: 'Low' },
  }
  const c = config[priority] || config.normal
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', c.dot)} />
      <span className="text-xs text-muted-foreground">{c.label}</span>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────
function formatTaskType(type: string): string {
  const map: Record<string, string> = {
    checkout: 'Checkout', stayover: 'Stayover', turndown: 'Turndown',
    deep_clean: 'Deep Clean', maintenance: 'Maintenance',
  }
  return map[type] || type
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'vip': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'rush': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  }
}

const CLEANING_CHECKLIST = [
  'Strip bed linens', 'Replace with fresh linens', 'Empty trash bins', 'Clean bathroom surfaces',
  'Restock towels & amenities', 'Dust all surfaces', 'Vacuum/sweep floors', 'Clean windows & mirrors',
  'Check minibar & restock', 'Verify AC/TV functionality', 'Remove personal items left behind', 'Report any damages',
]

// ── Occupied Room Warning Dialog ──────────────────────────────
function OccupiedWarningDialog({
  open,
  onOpenChange,
  occupiedRooms,
  actionLabel,
  onForce,
  onCancel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  occupiedRooms: { roomId: string; roomNumber: string; guestName: string | null }[]
  actionLabel: string
  onForce: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            Occupied Room Warning
          </DialogTitle>
          <DialogDescription>
            The following rooms are currently occupied by guests.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {occupiedRooms.map((r) => (
                <div key={r.roomId} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Room {r.roomNumber}</span>
                  <span className="text-muted-foreground text-xs">{r.guestName || 'Guest'}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Changing housekeeping status on occupied rooms may disturb guests. If you force this action, future mutations on these rooms will require a guest check-out or room transfer first.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            <Ban className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
          <Button variant="destructive" onClick={onForce}>
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Force {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Force-Mutated Room Blocked Dialog ─────────────────────────
function ForceMutatedBlockDialog({
  open,
  onOpenChange,
  roomNumber,
  guestName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomNumber: string
  guestName: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="h-5 w-5" />
            Action Blocked
          </DialogTitle>
          <DialogDescription>
            Room {roomNumber} was previously force-mutated while occupied.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3 space-y-2">
          <p className="text-sm text-red-700 dark:text-red-300">
            {guestName ? `Guest "${guestName}" is still checked in.` : 'A guest is currently checked in.'}
          </p>
          <p className="text-xs text-muted-foreground">
            You must perform a <strong>Check-Out</strong> or <strong>Room Transfer</strong> for this room before making further housekeeping changes.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Inline Row Action Buttons ─────────────────────────────────
function InlineRowActions({
  row,
  onStatusChange,
  onViewDetail,
  isForceMutated,
}: {
  row: RoomRow
  onStatusChange: (roomId: string, taskId: string | null, newStatus: string) => void
  onViewDetail: (roomId: string) => void
  isForceMutated: boolean
}) {
  const s = row.hkDisplayStatus
  const canProgress = s === 'pending' || s === 'assigned'
  const canMarkCleaned = s === 'cleaning' || s === 'in_progress'
  const canInspect = s === 'cleaned'
  const canReset = s === 'failed'
  const canFail = s === 'cleaning' || s === 'in_progress' || s === 'cleaned'

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {/* View Details — primary quick action */}
      <Button
        variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => onViewDetail(row.roomId)}
        title="View Details"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>

      {/* Three-dot menu for all status actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Start Cleaning */}
          {canProgress && (
            <DropdownMenuItem
              onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'in_progress')}
              disabled={isForceMutated}
              className="gap-2 text-sky-600 focus:text-sky-600 focus:bg-sky-50 dark:text-sky-400 dark:focus:bg-sky-950/40"
            >
              <PlayCircle className="h-4 w-4" /> Start Cleaning
            </DropdownMenuItem>
          )}

          {/* Mark Cleaned */}
          {canMarkCleaned && (
            <DropdownMenuItem
              onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'cleaned')}
              disabled={isForceMutated}
              className="gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400 dark:focus:bg-emerald-950/40"
            >
              <CheckCircle className="h-4 w-4" /> Mark Cleaned
            </DropdownMenuItem>
          )}

          {/* Mark Inspected */}
          {canInspect && (
            <DropdownMenuItem
              onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'inspected')}
              disabled={isForceMutated}
              className="gap-2 text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:text-purple-400 dark:focus:bg-purple-950/40"
            >
              <ShieldCheck className="h-4 w-4" /> Mark Inspected
            </DropdownMenuItem>
          )}

          {/* Reset to Pending */}
          {canReset && (
            <DropdownMenuItem
              onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'pending')}
              disabled={isForceMutated}
              className="gap-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:text-amber-400 dark:focus:bg-amber-950/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset to Pending
            </DropdownMenuItem>
          )}

          {/* Separator before rush/fail actions */}
          <>
              <DropdownMenuSeparator />
              {/* Set Rush — always available */}
              <DropdownMenuItem
                onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'rush')}
                className="gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:text-orange-400 dark:focus:bg-orange-950/40"
              >
                <AlertTriangle className="h-4 w-4" /> Set Rush Priority
              </DropdownMenuItem>

              {/* Mark Failed */}
              {canFail && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(row.roomId, row.hkTaskId, 'failed')}
                  disabled={isForceMutated}
                  className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/40"
                >
                  <XCircle className="h-4 w-4" /> Mark Failed
                </DropdownMenuItem>
              )}
            </>
        </DropdownMenuContent>
      </DropdownMenu>

      {isForceMutated && (
        <Badge variant="outline" className="text-[9px] text-red-500 border-red-300 dark:border-red-700 shrink-0">
          <Ban className="h-2.5 w-2.5 mr-0.5" /> Locked
        </Badge>
      )}
    </div>
  )
}

// ── Filter Dropdown Component ────────────────────────────────
function FilterDropdown({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onValueChange: (v: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
          {label}
          {value && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="space-y-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={cn(
                'w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors',
                value === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => onValueChange(value === opt.value ? '' : opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Room Number Filter ────────────────────────────────────────
function RoomFilterDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold">
          Room
          {value && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-2" align="start">
        <Input
          placeholder="Room #..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onChange(input); setOpen(false) } }}
          className="h-7 text-xs"
          autoFocus
        />
        <div className="flex gap-1 mt-2">
          <Button size="sm" className="h-6 flex-1 text-[10px]" onClick={() => { onChange(input); setOpen(false) }}>Apply</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setInput(''); onChange(''); setOpen(false) }}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Task Detail Dialog ────────────────────────────────────────
function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: HkTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; status: string; inspectedBy?: string }) =>
      apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-task-status', ...params }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })
      toast.success('Status updated')
      onOpenChange(false)
    },
  })

  if (!task) return null

  const canStart = task.status === 'pending' || task.status === 'assigned'
  const canClean = task.status === 'in_progress' || task.status === 'cleaning'
  const canInspect = task.status === 'cleaned'
  const canReset = task.status === 'failed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Room {task.room.number} — Task Details
          </DialogTitle>
          <DialogDescription>
            Floor {task.room.floor}{task.room.wing ? ` · ${task.room.wing} Wing` : ''} · {task.room.type.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1">{formatTaskType(task.taskType)}</span></div>
            <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className={cn('ml-1 text-xs', priorityColor(task.priority))}>{task.priority}</Badge></div>
            <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium ml-1">{task.assignedTo || '—'}</span></div>
            <div><span className="text-muted-foreground">Est.:</span> <span className="font-medium ml-1">{task.estimatedMinutes} min</span></div>
          </div>

          {task.notes && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Notes</p>
              <p>{task.notes}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold mb-2">Cleaning Checklist</p>
            <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
              {CLEANING_CHECKLIST.map((item, i) => (
                <label key={i} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={checked[i] || false} onCheckedChange={() => setChecked((p) => ({ ...p, [i]: !p[i] }))} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button className="gap-1.5" onClick={() => updateMutation.mutate({ id: task.id, status: 'in_progress' })} disabled={updateMutation.isPending}>
                <PlayCircle className="h-4 w-4" /> Start Cleaning
              </Button>
            )}
            {canClean && (
              <Button className="gap-1.5" onClick={() => updateMutation.mutate({ id: task.id, status: 'cleaned' })} disabled={updateMutation.isPending}>
                <CheckCircle className="h-4 w-4" /> Mark Cleaned
              </Button>
            )}
            {canInspect && (
              <Button className="gap-1.5" onClick={() => updateMutation.mutate({ id: task.id, status: 'inspected', inspectedBy: 'Admin' })} disabled={updateMutation.isPending}>
                <ShieldCheck className="h-4 w-4" /> Mark Inspected
              </Button>
            )}
            {canReset && (
              <Button variant="outline" className="gap-1.5" onClick={() => updateMutation.mutate({ id: task.id, status: 'pending' })} disabled={updateMutation.isPending}>
                <ArrowUpCircle className="h-4 w-4" /> Reset to Pending
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Kanban / Attendant sub-components (unchanged) ─────────────
function AttendantView({ tasks }: { tasks: HkTask[] }) {
  const byAttendant = useMemo(() => {
    const m = new Map<string, HkTask[]>()
    tasks.forEach((t) => {
      const name = t.assignedTo || 'Unassigned'
      if (!m.has(name)) m.set(name, [])
      m.get(name)!.push(t)
    })
    return m
  }, [tasks])

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from(byAttendant.entries()).map(([name, attTasks]) => (
        <Card key={name}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">{attTasks.length} tasks assigned</p>
              </div>
            </div>
            {attTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">Room {task.room.number}</span>
                </div>
                <StatusBadge status={task.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const KANBAN_COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: 'border-yellow-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
  { id: 'cleaned', label: 'Cleaned', color: 'border-green-400' },
  { id: 'inspected', label: 'Inspected', color: 'border-purple-400' },
  { id: 'failed', label: 'Failed', color: 'border-red-400' },
]

function TaskCard({ task, onClick }: { task: HkTask; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 group" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Room {task.room.number}</span>
            <Badge variant="outline" className="text-xs font-normal">{formatTaskType(task.taskType)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignedTo}</span>
            </div>
          )}
          <Badge variant="outline" className={cn('text-xs', priorityColor(task.priority))}>
            {task.priority === 'vip' && <Star className="h-3 w-3 mr-0.5 fill-current" />}
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{task.estimatedMinutes} min</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{formatTime(task.scheduledTime)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────
export function TaskBoardView() {
  const [selectedTask, setSelectedTask] = useState<HkTask | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'attendant'>('table')

  // Table view filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterHkStatus, setFilterHkStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterFloor, setFilterFloor] = useState('')
  const [filterRoomType, setFilterRoomType] = useState('')
  const [filterRoomNumber, setFilterRoomNumber] = useState('')
  const [filterReservation, setFilterReservation] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Kanban expanded state
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(KANBAN_COLUMNS.map((c) => c.id))
  )

  // Occupied room protection state
  const [occupiedWarning, setOccupiedWarning] = useState<{
    open: boolean
    rooms: { roomId: string; roomNumber: string; guestName: string | null }[]
    pendingAction: string
  }>({ open: false, rooms: [], pendingAction: '' })
  const [forceMutatedRooms, setForceMutatedRooms] = useState<Set<string>>(new Set())
  const [blockedDialog, setBlockedDialog] = useState<{
    open: boolean
    roomNumber: string
    guestName: string | null
  }>({ open: false, roomNumber: '', guestName: null })

  // Ref to store pending single-row action
  const pendingSingleAction = useRef<{ roomId: string; taskId: string | null; newStatus: string } | null>(null)
  const pendingBulkAction = useRef<{ roomIds: string[]; status: string } | null>(null)

  // Debounce search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((v: string) => {
    setSearchQuery(v)
    if (searchTimer) clearTimeout(searchTimer)
    const timer = setTimeout(() => setDebouncedSearch(v), 300)
    setSearchTimer(timer)
  }, [searchTimer])

  // Table data query
  const { data: tableData, isLoading: tableLoading } = useQuery<{ rows: RoomRow[] }>({
    queryKey: ['housekeeping-rooms', filterHkStatus, filterPriority, filterFloor, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterHkStatus) params.set('hkStatus', filterHkStatus)
      if (filterPriority) params.set('priority', filterPriority)
      if (filterFloor) params.set('floor', filterFloor)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const qs = params.toString()
      return apiFetch(`/api/housekeeping/rooms${qs ? `?${qs}` : ''}`) as Promise<{ rows: RoomRow[] }>
    },
    enabled: viewMode === 'table',
  })

  // Kanban data query
  const { data: kanbanData, isLoading: kanbanLoading } = useQuery<{
    tasks: HkTask[]
    summary: HkSummary
  }>({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => apiFetch('/api/housekeeping') as Promise<{ tasks: HkTask[]; summary: HkSummary }>,
    enabled: viewMode !== 'table',
  })

  const queryClient = useQueryClient()

  const tableRows = tableData?.rows || []
  const kanbanTasks = kanbanData?.tasks || []

  // ── Check for occupied rooms in a set of roomIds ──────────
  const getOccupiedInSet = useCallback((roomIds: string[]) => {
    return roomIds
      .map(id => tableRows.find(r => r.roomId === id))
      .filter((r): r is NonNullable<typeof r> => !!r && r.reservationStatus === 'occupied')
      .map(r => ({ roomId: r.roomId, roomNumber: r.roomNumber, guestName: r.guestName }))
  }, [tableRows])

  // Row status change mutation (standard)
  const rowStatusMutation = useMutation({
    mutationFn: ({ taskId, status, priority }: { taskId: string | null; status: string; priority?: string }) => {
      if (!taskId) return Promise.reject(new Error('No active task'))
      return apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status, priority, action: 'update-task-status' }),
      })
    },
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status')
    },
  })

  // Force mutation (for occupied rooms)
  const forceMutation = useMutation({
    mutationFn: ({ taskId, status, reason }: { taskId: string; status: string; reason: string }) => {
      return apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force-mutation',
          id: taskId,
          status,
          performedBy: 'Admin',
          reason,
        }),
      })
    },
    onSuccess: (_data, vars) => {
      // Find which room was forced and lock it
      const row = tableRows.find(r => r.hkTaskId === vars.taskId)
      if (row) {
        setForceMutatedRooms(prev => new Set([...prev, row.roomId]))
        toast.warning(`Room ${row.roomNumber} force-mutated. Future changes require check-out/transfer first.`, { duration: 5000 })
      }
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to force-mutate room')
    },
  })

  // Bulk status mutation (with occupied check)
  const bulkStatusMutation = useMutation({
    mutationFn: ({ roomIds, status, force }: { roomIds: string[]; status: string; force?: boolean }) => {
      if (status === 'rush') {
        // Priority change
        const tasks = roomIds.map(id => tableRows.find(r => r.roomId === id))
          .filter((r): r is NonNullable<typeof r> => !!r?.hkTaskId)
        if (tasks.length === 0) return Promise.reject(new Error('No tasks to update'))
        return Promise.all(tasks.map(row =>
          apiFetch('/api/housekeeping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: row.hkTaskId, priority: 'rush', action: 'update-task-status' }),
          })
        ))
      }

      const tasks = roomIds.map(id => tableRows.find(r => r.roomId === id))
        .filter((r): r is NonNullable<typeof r> => !!r?.hkTaskId)
      if (tasks.length === 0) return Promise.reject(new Error('No tasks to update'))

      if (force) {
        // Force mutation for occupied rooms
        const occupiedIds = new Set(
          roomIds
            .map(id => tableRows.find(r => r.roomId === id))
            .filter((r): r is NonNullable<typeof r> => !!r && r.reservationStatus === 'occupied')
            .map(r => r.roomId)
        )
        const normalTasks = tasks.filter(t => !occupiedIds.has(t.roomId))
        const occupiedTasks = tasks.filter(t => occupiedIds.has(t.roomId))

        const promises = [
          ...normalTasks.map(row =>
            apiFetch('/api/housekeeping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: row.hkTaskId, status, action: 'update-task-status' }),
            })
          ),
          ...occupiedTasks.map(row =>
            apiFetch('/api/housekeeping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'force-mutation',
                id: row.hkTaskId,
                status,
                performedBy: 'Admin',
                reason: `Bulk forced ${status} on occupied room ${row.roomNumber}`,
              }),
            })
          ),
        ]

        // Lock force-mutated rooms
        occupiedIds.forEach(id => {
          setForceMutatedRooms(prev => new Set([...prev, id]))
        })

        return Promise.all(promises)
      }

      return Promise.all(tasks.map(row => apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.hkTaskId, status, action: 'update-task-status' }),
      })))
    },
    onSuccess: (_data, vars) => {
      const occupiedCount = getOccupiedInSet(vars.roomIds).length
      if (occupiedCount > 0 && vars.force) {
        toast.warning(`${occupiedCount} occupied room(s) force-mutated. Future changes require check-out/transfer.`, { duration: 5000 })
      } else {
        toast.success(`${vars.roomIds.length} rooms updated`)
      }
      setSelectedRows(new Set())
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update room statuses')
    },
  })

  // ── Execute a single room status change (with occupied check) ──
  const executeSingleStatusChange = useCallback((roomId: string, taskId: string | null, newStatus: string, force = false) => {
    // Check if this room was previously force-mutated and is STILL occupied
    if (!force && forceMutatedRooms.has(roomId)) {
      const row = tableRows.find(r => r.roomId === roomId)
      if (row?.reservationStatus === 'occupied') {
        setBlockedDialog({ open: true, roomNumber: row.roomNumber, guestName: row.guestName })
        return
      }
      // Room is no longer occupied — clear the force-mutated lock
      setForceMutatedRooms(prev => { const next = new Set(prev); next.delete(roomId); return next })
    }

    if (!force && newStatus !== 'rush') {
      const occupied = getOccupiedInSet([roomId])
      if (occupied.length > 0) {
        pendingSingleAction.current = { roomId, taskId, newStatus }
        setOccupiedWarning({ open: true, rooms: occupied, pendingAction: newStatus })
        return
      }
    }

    // Rush is just a priority change, no occupied check needed
    if (newStatus === 'rush') {
      rowStatusMutation.mutate({ taskId, status: '', priority: 'rush' })
      const row = tableRows.find(r => r.roomId === roomId)
      toast.info(`Priority set to Rush for room ${row?.roomNumber}`)
      return
    }

    if (!taskId) { toast.info('No active task for this room'); return }

    if (force) {
      // Use force-mutation API action
      forceMutation.mutate({ taskId, status: newStatus, reason: `Forced ${newStatus} on occupied room` })
    } else {
      rowStatusMutation.mutate({ taskId, status: newStatus })
    }
  }, [forceMutatedRooms, getOccupiedInSet, tableRows, rowStatusMutation, forceMutation])

  // ── Handle single row status change (entry point) ─────────
  const handleRowStatusChange = (roomId: string, taskId: string | null, newStatus: string) => {
    executeSingleStatusChange(roomId, taskId, newStatus)
  }

  // ── Handle bulk action (entry point with occupied check) ──
  const handleBulkAction = (status: string) => {
    const ids = Array.from(selectedRows)
    if (status !== 'rush') {
      const occupied = getOccupiedInSet(ids)
      if (occupied.length > 0) {
        pendingBulkAction.current = { roomIds: ids, status }
        setOccupiedWarning({ open: true, rooms: occupied, pendingAction: status })
        return
      }
    }
    bulkStatusMutation.mutate({ roomIds: ids, status })
  }

  // ── Handle occupied warning force action ──────────────────
  const handleForceFromWarning = () => {
    setOccupiedWarning(prev => ({ ...prev, open: false }))

    if (pendingSingleAction.current) {
      const { roomId, taskId, newStatus } = pendingSingleAction.current
      pendingSingleAction.current = null
      executeSingleStatusChange(roomId, taskId, newStatus, true)
    } else if (pendingBulkAction.current) {
      const { roomIds, status } = pendingBulkAction.current
      pendingBulkAction.current = null
      bulkStatusMutation.mutate({ roomIds, status, force: true })
    }
  }

  const handleCancelWarning = () => {
    setOccupiedWarning(prev => ({ ...prev, open: false }))
    pendingSingleAction.current = null
    pendingBulkAction.current = null
  }

  // Handle row detail view
  const handleViewDetail = (roomId: string) => {
    const row = tableRows.find((r) => r.roomId === roomId)
    if (row?.hkTaskId) {
      // Find task in kanban data or set from row data
      const kanbanTask = kanbanTasks.find(t => t.roomId === roomId)
      if (kanbanTask) {
        setSelectedTask(kanbanTask)
      } else {
        // Open with row-based data
        setSelectedTask({
          id: row.hkTaskId!,
          roomId: row.roomId,
          taskType: 'checkout',
          status: row.hkDisplayStatus,
          priority: row.priority,
          assignedTo: row.assignedTo,
          scheduledTime: row.scheduledTime || new Date().toISOString(),
          completedTime: null,
          estimatedMinutes: row.estimatedMinutes || 30,
          notes: row.taskNotes,
          room: { id: row.roomId, number: row.roomNumber, floor: row.floor, wing: row.wing, status: row.roomStatus, type: { name: row.roomTypeName, code: row.roomTypeCode } },
        })
      }
    } else {
      toast.info(`Room ${row?.roomNumber} — No active task`)
    }
  }

  // Get unique floors for filter
  const floors = useMemo(() => {
    const f = new Set(tableRows.map((r) => r.floor))
    return Array.from(f).sort((a, b) => a - b)
  }, [tableRows])

  // Get unique room types for filter
  const roomTypes = useMemo(() => {
    const m = new Map<string, string>()
    tableRows.forEach((r) => {
      if (!m.has(r.roomTypeCode)) m.set(r.roomTypeCode, r.roomTypeName)
    })
    return Array.from(m.entries()).map(([code, name]) => ({ value: code, label: name }))
  }, [tableRows])

  // Get unique reservation statuses
  const uniqueResStatuses = useMemo(() => {
    const s = new Set(tableRows.map((r) => r.reservationStatus))
    return Array.from(s)
  }, [tableRows])

  // Toggle row selection
  const toggleRow = (roomId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId)
      else next.add(roomId)
      return next
    })
  }

  const toggleAllRows = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRows.map((r) => r.roomId)))
    }
  }

  const toggleColumn = (id: string) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Client-side filtered rows
  const filteredRows = (() => {
    let rows = tableRows
    if (filterRoomType) rows = rows.filter((r) => r.roomTypeCode === filterRoomType)
    if (filterRoomNumber) rows = rows.filter((r) => r.roomNumber.includes(filterRoomNumber))
    if (filterReservation) rows = rows.filter((r) => r.reservationStatus === filterReservation)
    return rows
  })()

  // Unique values derived from tableRows (not filtered)
  const uniqueHkStatuses = useMemo(() => {
    const s = new Set(tableRows.map((r) => r.hkDisplayStatus))
    return Array.from(s)
  }, [tableRows])

  const uniquePriorities = useMemo(() => {
    const s = new Set(tableRows.map((r) => r.priority))
    return Array.from(s)
  }, [tableRows])

  const hasAnyFilter = filterHkStatus || filterPriority || filterFloor || filterRoomType || filterRoomNumber || filterReservation

  // Loading state
  if ((viewMode === 'table' && tableLoading) || (viewMode !== 'table' && kanbanLoading)) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  // ─── TABLE VIEW ──────────────────────────────────────────
  const renderTableView = () => (
    <div className="space-y-2">
      {/* Toolbar: Search */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by guest, reservation..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-3">
          <span>{filteredRows.length} room{filteredRows.length !== 1 ? 's' : ''}</span>
          {selectedRows.size > 0 && (
            <span className="font-medium text-foreground">· {selectedRows.size} selected</span>
          )}
          {forceMutatedRooms.size > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700 gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5" /> {forceMutatedRooms.size} locked
            </Badge>
          )}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() => {
                setFilterHkStatus(''); setFilterPriority(''); setFilterFloor('')
                setFilterRoomType(''); setFilterRoomNumber(''); setFilterReservation('')
              }}
            >
              <X className="w-2.5 h-2.5 mr-0.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (2+ selected) */}
      {selectedRows.size >= 2 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex-wrap">
          <span className="text-xs font-medium text-primary mr-1">{selectedRows.size} rooms selected</span>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => handleBulkAction('in_progress')}
            disabled={bulkStatusMutation.isPending}
          >
            <PlayCircle className="h-3 w-3" /> Start Cleaning
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => handleBulkAction('cleaned')}
            disabled={bulkStatusMutation.isPending}
          >
            <CheckCircle className="h-3 w-3" /> Mark Cleaned
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => handleBulkAction('inspected')}
            disabled={bulkStatusMutation.isPending}
          >
            <ShieldCheck className="h-3 w-3" /> Mark Inspected
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => handleBulkAction('rush')}
            disabled={bulkStatusMutation.isPending}
          >
            <AlertTriangle className="h-3 w-3" /> Set Rush
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => handleBulkAction('pending')}
            disabled={bulkStatusMutation.isPending}
          >
            <ArrowUpCircle className="h-3 w-3" /> Reset to Pending
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-red-600 hover:text-red-600"
            onClick={() => handleBulkAction('failed')}
            disabled={bulkStatusMutation.isPending}
          >
            <XCircle className="h-3 w-3" /> Mark Failed
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost" size="sm" className="h-7 text-[11px]"
            onClick={() => setSelectedRows(new Set())}
          >
            <X className="h-3 w-3 mr-1" /> Deselect All
          </Button>
        </div>
      )}

      {/* Data Table with sticky header */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-10" />
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredRows.length > 0 && selectedRows.size === filteredRows.length}
                    onCheckedChange={toggleAllRows}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  <RoomFilterDropdown value={filterRoomNumber} onChange={setFilterRoomNumber} />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label="Room Type"
                    value={filterRoomType}
                    onValueChange={setFilterRoomType}
                    options={roomTypes.map((rt) => ({ value: rt.value, label: rt.label }))}
                  />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label="HK Status"
                    value={filterHkStatus}
                    onValueChange={setFilterHkStatus}
                    options={uniqueHkStatuses.map((s) => ({ value: s, label: s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                  />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label="Priority"
                    value={filterPriority}
                    onValueChange={setFilterPriority}
                    options={uniquePriorities.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                  />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label="Floor"
                    value={filterFloor}
                    onValueChange={setFilterFloor}
                    options={floors.map((f) => ({ value: String(f), label: `Floor ${f}` }))}
                  />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label="Reservation"
                    value={filterReservation}
                    onValueChange={setFilterReservation}
                    options={uniqueResStatuses.map((s) => ({ value: s, label: s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-sm">
                      No rooms found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => (
                    <TableRow
                      key={row.roomId}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedRows.has(row.roomId) && 'bg-primary/5',
                        idx % 2 === 1 && !selectedRows.has(row.roomId) && 'bg-muted/20',
                        forceMutatedRooms.has(row.roomId) && 'border-l-2 border-l-amber-400'
                      )}
                      onClick={() => toggleRow(row.roomId)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineRowActions
                          row={row}
                          onStatusChange={handleRowStatusChange}
                          onViewDetail={handleViewDetail}
                          isForceMutated={forceMutatedRooms.has(row.roomId)}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(row.roomId)}
                          onCheckedChange={() => toggleRow(row.roomId)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BedDouble className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold">{row.roomNumber}</span>
                          {row.wing && (
                            <span className="text-[10px] text-muted-foreground">({row.wing})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium">{row.roomTypeName}</span>
                          <span className="text-muted-foreground ml-1">({row.roomTypeCode})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hkStatusBadge(row.hkDisplayStatus)}
                      </TableCell>
                      <TableCell>
                        <PriorityDot priority={row.priority} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{row.floor}</span>
                      </TableCell>
                      <TableCell>
                        {resStatusBadge(row.reservationStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {row.taskNotes || '—'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  // ─── KANBAN VIEW ─────────────────────────────────────────
  const renderKanbanView = () => (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = kanbanTasks.filter((t) => t.status === column.id)
        const isExpanded = expandedColumns.has(column.id)

        return (
          <div
            key={column.id}
            className={cn('rounded-lg border-2 border-t-4 bg-card', column.color)}
          >
            <button
              className="flex w-full items-center justify-between p-3 text-left"
              onClick={() => toggleColumn(column.id)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{column.label}</span>
                <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
              </div>
            </button>

            {isExpanded && (
              <ScrollArea className="h-[500px] px-3 pb-3">
                <div className="space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <ClipboardCheck className="h-8 w-8 opacity-20" />
                      <p className="mt-2 text-xs">No tasks</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
          className="gap-1.5"
        >
          <List className="h-4 w-4" />
          Board
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('kanban')}
          className="gap-1.5"
        >
          <LayoutGrid className="h-4 w-4" />
          Kanban
        </Button>
        <Button
          variant={viewMode === 'attendant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('attendant')}
          className="gap-1.5"
        >
          <Users className="h-4 w-4" />
          Attendant
        </Button>
      </div>

      {/* Views */}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'kanban' && renderKanbanView()}
      {viewMode === 'attendant' && <AttendantView tasks={kanbanTasks} />}

      {/* Task Detail Dialog (for Kanban/Attendant/Table) */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />

      {/* Occupied Room Warning Dialog */}
      <OccupiedWarningDialog
        open={occupiedWarning.open}
        onOpenChange={(open) => !open && handleCancelWarning()}
        occupiedRooms={occupiedWarning.rooms}
        actionLabel={occupiedWarning.pendingAction.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        onForce={handleForceFromWarning}
        onCancel={handleCancelWarning}
      />

      {/* Force-Mutated Room Blocked Dialog */}
      <ForceMutatedBlockDialog
        open={blockedDialog.open}
        onOpenChange={(open) => setBlockedDialog(prev => ({ ...prev, open }))}
        roomNumber={blockedDialog.roomNumber}
        guestName={blockedDialog.guestName}
      />
    </div>
  )
}