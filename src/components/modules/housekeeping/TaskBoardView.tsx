'use client'
import { toast } from 'sonner'

import { useState, useMemo, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Search, Filter, X, ChevronDown, BedDouble, Clock, User, AlertTriangle, Star,
  ClipboardCheck, Users, CheckCircle2, Circle, Sparkles, Eye, Trash2,
  LayoutGrid, List
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'

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
                'w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors',
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

// ── Task Detail Dialog ───────────────────────────────────────
function TaskDetailDialog({ task, open, onOpenChange }: { task: HkTask | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: (body: { id: string; status: string; inspectedBy?: string }) =>
      apiFetch('/api/housekeeping', { method: 'POST', body }),
    onSuccess: () => {
      toast.success('Task status updated')
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] })
      onOpenChange(false)
    },
  })

  if (!task) return null

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }))
  }
  const checkedCount = Object.values(checkedItems).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Room {task.room.number} — {formatTaskType(task.taskType)}
          </DialogTitle>
          <DialogDescription>
            Floor {task.room.floor}{task.room.wing ? ` · ${task.room.wing} Wing` : ''} · {task.room.type.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Priority</p>
              <Badge variant="outline" className={cn(priorityColor(task.priority))}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={task.status} />
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Assigned To</p>
              <p className="text-sm font-medium">{task.assignedTo || 'Unassigned'}</p>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Est. Time</p>
              <p className="text-sm font-medium">{task.estimatedMinutes} min</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Cleaning Checklist</p>
              <span className="text-xs text-muted-foreground">{checkedCount}/{CLEANING_CHECKLIST.length}</span>
            </div>
            <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
              {CLEANING_CHECKLIST.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={checkedItems[item] || false}
                    onCheckedChange={() => toggleCheck(item)}
                  />
                  <span className={checkedItems[item] ? 'line-through text-muted-foreground' : ''}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {task.notes && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{task.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="flex gap-2 pt-2">
            {task.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'in_progress' })}
                disabled={updateStatusMutation.isPending}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Start Cleaning
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'cleaned' })}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Cleaned
              </Button>
            )}
            {task.status === 'cleaned' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'inspected', inspectedBy: 'Admin' })}
                disabled={updateStatusMutation.isPending}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Mark Inspected
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Attendant View ───────────────────────────────────────────
function AttendantView({ tasks }: { tasks: HkTask[] }) {
  const attendants = new Map<string, HkTask[]>()
  tasks.forEach((task) => {
    const name = task.assignedTo || 'Unassigned'
    if (!attendants.has(name)) attendants.set(name, [])
    attendants.get(name)!.push(task)
  })

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from(attendants.entries()).map(([name, attTasks]) => (
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

// ── Board View (Kanban - old) ────────────────────────────────
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Kanban expanded state
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(KANBAN_COLUMNS.map((c) => c.id))
  )

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

  const tableRows = tableData?.rows || []
  const kanbanTasks = kanbanData?.tasks || []
  const summary = kanbanData?.summary

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
    if (selectedRows.size === tableRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(tableRows.map((r) => r.roomId)))
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

  // Loading state
  if ((viewMode === 'table' && tableLoading) || (viewMode !== 'table' && kanbanLoading)) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-8 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  // ─── TABLE VIEW ──────────────────────────────────────────
  const TableView = () => (
    <div className="space-y-3">
      {/* Toolbar: Search + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by room, type, guest..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterDropdown
            label="HK Status"
            value={filterHkStatus}
            onValueChange={setFilterHkStatus}
            options={[
              { value: 'clean', label: 'Clean' },
              { value: 'dirty', label: 'Dirty' },
              { value: 'cleaning', label: 'Cleaning' },
              { value: 'cleaned', label: 'Cleaned' },
              { value: 'change_over', label: 'Change Over' },
              { value: 'pending', label: 'Pending' },
              { value: 'inspected', label: 'Inspected' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
          <FilterDropdown
            label="Priority"
            value={filterPriority}
            onValueChange={setFilterPriority}
            options={[
              { value: 'vip', label: 'VIP' },
              { value: 'rush', label: 'Rush' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <FilterDropdown
            label="Floor"
            value={filterFloor}
            onValueChange={setFilterFloor}
            options={floors.map((f) => ({ value: String(f), label: `Floor ${f}` }))}
          />
          {(filterHkStatus || filterPriority || filterFloor) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setFilterHkStatus('')
                setFilterPriority('')
                setFilterFloor('')
              }}
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count + batch info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{tableRows.length} room{tableRows.length !== 1 ? 's' : ''}</span>
        {selectedRows.size > 0 && (
          <span className="font-medium text-foreground">{selectedRows.size} selected</span>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={tableRows.length > 0 && selectedRows.size === tableRows.length}
                    onCheckedChange={toggleAllRows}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Room</TableHead>
                <TableHead className="text-xs font-semibold">Room Type</TableHead>
                <TableHead className="text-xs font-semibold">HK Status</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Floor</TableHead>
                <TableHead className="text-xs font-semibold">Reservation</TableHead>
                <TableHead className="text-xs font-semibold">Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                    No rooms found
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row, idx) => (
                  <TableRow
                    key={row.roomId}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedRows.has(row.roomId) && 'bg-primary/5',
                      idx % 2 === 1 && !selectedRows.has(row.roomId) && 'bg-muted/20'
                    )}
                    onClick={() => toggleRow(row.roomId)}
                  >
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
                        {row.guestName || row.taskNotes || row.specialRequests || '—'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )

  // ─── KANBAN VIEW ─────────────────────────────────────────
  const KanbanView = () => (
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
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total Rooms', value: viewMode === 'table' ? tableRows.length : summary?.total ?? 0, icon: ClipboardCheck, color: 'text-foreground' },
          { label: 'Needs Attention', value: viewMode === 'table' ? tableRows.filter((r) => ['dirty', 'pending', 'failed'].includes(r.hkDisplayStatus)).length : (summary?.pending ?? 0) + (summary?.failed ?? 0), icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Clean / Inspected', value: viewMode === 'table' ? tableRows.filter((r) => ['clean', 'cleaned', 'inspected'].includes(r.hkDisplayStatus)).length : (summary?.cleaned ?? 0) + (summary?.inspected ?? 0), icon: CheckCircle2, color: 'text-green-600' },
          { label: 'VIP Priority', value: viewMode === 'table' ? tableRows.filter((r) => r.priority === 'vip').length : kanbanTasks.filter((t) => t.priority === 'vip').length, icon: Star, color: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className={cn('h-8 w-8 opacity-20', stat.color)} />
            </div>
          </Card>
        ))}
      </div>

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
      {viewMode === 'table' && <TableView />}
      {viewMode === 'kanban' && <KanbanView />}
      {viewMode === 'attendant' && <AttendantView tasks={kanbanTasks} />}

      {/* Task Detail Dialog (for Kanban/Attendant) */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  )
}