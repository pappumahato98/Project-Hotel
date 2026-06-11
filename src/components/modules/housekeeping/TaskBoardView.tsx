'use client'
import { toast } from 'sonner'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  BedDouble, Clock, User, AlertTriangle, Star, GripVertical, Users,
  ClipboardCheck, ChevronDown, ChevronUp
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

// ── Helpers ──────────────────────────────────────────────────
function formatTaskType(type: string): string {
  const map: Record<string, string> = {
    checkout: 'Checkout',
    stayover: 'Stayover',
    turndown: 'Turndown',
    deep_clean: 'Deep Clean',
    maintenance: 'Maintenance',
  }
  return map[type] || type
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'vip':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'rush':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  }
}

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: 'border-yellow-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
  { id: 'cleaned', label: 'Cleaned', color: 'border-green-400' },
  { id: 'inspected', label: 'Inspected', color: 'border-purple-400' },
  { id: 'failed', label: 'Failed', color: 'border-red-400' },
]

const CLEANING_CHECKLIST = [
  'Strip bed linens',
  'Replace with fresh linens',
  'Empty trash bins',
  'Clean bathroom surfaces',
  'Restock towels & amenities',
  'Dust all surfaces',
  'Vacuum/sweep floors',
  'Clean windows & mirrors',
  'Check minibar & restock',
  'Verify AC/TV functionality',
  'Remove personal items left behind',
  'Report any damages',
]

// ── Task Card Component ──────────────────────────────────────
function TaskCard({ task, onClick }: { task: HkTask; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 group"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Room + Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Room {task.room.number}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {formatTaskType(task.taskType)}
            </Badge>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Assigned + Priority */}
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

        {/* Footer: Time + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{task.estimatedMinutes} min</span>
            <span className="text-muted-foreground/60">·</span>
            <span>{formatTime(task.scheduledTime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Task Detail Dialog ───────────────────────────────────────
function TaskDetailDialog({ task, open, onOpenChange }: { task: HkTask | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

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
          {/* Info Grid */}
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

          {/* Cleaning Checklist */}
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
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-sm">{name}</CardTitle>
                <p className="text-xs text-muted-foreground">{attTasks.length} tasks assigned</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
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

// ── Main Component ───────────────────────────────────────────
export function TaskBoardView() {
  const [selectedTask, setSelectedTask] = useState<HkTask | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'attendant'>('board')
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(COLUMNS.map((c) => c.id))
  )

  const { data, isLoading } = useQuery<{
    tasks: HkTask[]
    summary: HkSummary
  }>({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => fetch('/api/housekeeping').then((r) => r.json()),
  })

  const tasks = data?.tasks || []
  const summary = data?.summary

  const toggleColumn = (id: string) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total Tasks', value: summary?.total ?? 0, icon: ClipboardCheck, color: 'text-foreground' },
          { label: 'In Progress', value: summary?.inProgress ?? 0, icon: Clock, color: 'text-amber-600' },
          { label: 'Cleaned', value: summary?.cleaned ?? 0, icon: BedDouble, color: 'text-green-600' },
          { label: 'VIP Priority', value: tasks.filter((t) => t.priority === 'vip').length, icon: Star, color: 'text-amber-600' },
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
          variant={viewMode === 'board' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('board')}
          className="gap-2"
        >
          <ClipboardCheck className="h-4 w-4" />
          Board View
        </Button>
        <Button
          variant={viewMode === 'attendant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('attendant')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Attendant View
        </Button>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id)
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
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
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
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Attendant View */}
      {viewMode === 'attendant' && <AttendantView tasks={tasks} />}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  )
}
