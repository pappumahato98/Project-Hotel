'use client'
import { toast } from 'sonner'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  ShieldCheck, BedDouble, Camera, Check, X, ClipboardCheck,
  ChevronRight, BadgePercent
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
  inspectedBy: string | null
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

// ── Inspection Checklist Items ────────────────────────────────
const INSPECTION_ITEMS = [
  { id: 'bed', label: 'Bed made properly' },
  { id: 'surfaces', label: 'Surfaces dusted & clean' },
  { id: 'bathroom', label: 'Bathroom sanitized' },
  { id: 'amenities', label: 'Amenities restocked' },
  { id: 'minibar', label: 'Minibar checked & restocked' },
  { id: 'ac_tv', label: 'AC/TV functional' },
  { id: 'floor', label: 'Floor swept & mopped' },
  { id: 'items', label: 'No personal items left' },
]

// ── Single Room Inspection ───────────────────────────────────
function RoomInspectionCard({
  task,
  onInspect,
}: {
  task: HkTask
  onInspect: (task: HkTask) => void
}) {
  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
      onClick={() => onInspect(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40">
              <BedDouble className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Room {task.room.number}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Floor {task.room.floor}</span>
                <span>·</span>
                <span>{task.room.type.name}</span>
                {task.assignedTo && (
                  <>
                    <span>·</span>
                    <span>{task.assignedTo}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Inspection Dialog ────────────────────────────────────────
function InspectionDialog({
  task,
  open,
  onOpenChange,
}: {
  task: HkTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  if (!task) return null

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  const checkedCount = Object.values(checkedItems).filter(Boolean).length
  const allChecked = checkedCount === INSPECTION_ITEMS.length
  const passCount = INSPECTION_ITEMS.length
  const passPercent = Math.round((checkedCount / passCount) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Inspect Room {task.room.number}
          </DialogTitle>
          <DialogDescription>
            Floor {task.room.floor}{task.room.wing ? ` · ${task.room.wing} Wing` : ''} · {task.room.type.name}
            {task.assignedTo ? ` · Cleaned by ${task.assignedTo}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Inspection Progress</p>
              <span className="text-sm text-muted-foreground">{checkedCount}/{passCount} items</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  allChecked ? 'bg-green-500' : passPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${passPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1">
            <p className="text-sm font-semibold mb-2">Inspection Checklist</p>
            <div className="rounded-lg border divide-y">
              {INSPECTION_ITEMS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={checkedItems[item.id] || false}
                    onCheckedChange={() => toggleCheck(item.id)}
                  />
                  <span className={cn(
                    'flex-1',
                    checkedItems[item.id] && 'text-green-700 dark:text-green-400'
                  )}>
                    {item.label}
                  </span>
                  {checkedItems[item.id] && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Photo capture placeholder */}
          <Button variant="outline" className="w-full gap-2">
            <Camera className="h-4 w-4" />
            Capture Photo Evidence
          </Button>

          {/* Actions */}
          <Separator />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => {
                toast.info(`Room ${task.room.number} rejected & reassigned for cleaning`)
                onOpenChange(false)
              }}
            >
              <X className="h-4 w-4" />
              Reject &amp; Reassign
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => {
                toast.success(`Room ${task.room.number} inspection passed`)
                onOpenChange(false)
              }}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ───────────────────────────────────────────
export function InspectionView() {
  const [selectedTask, setSelectedTask] = useState<HkTask | null>(null)

  const { data, isLoading } = useQuery<{
    tasks: HkTask[]
    summary: HkSummary
  }>({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => apiFetch('/api/housekeeping'),
  })

  const tasks = data?.tasks || []
  const summary = data?.summary
  const cleanedTasks = tasks.filter((t) => t.status === 'cleaned')
  const inspectedTasks = tasks.filter((t) => t.status === 'inspected')
  const totalInspectable = cleanedTasks.length + inspectedTasks.length
  const inspectionRate = totalInspectable > 0
    ? Math.round((inspectedTasks.length / totalInspectable) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Awaiting Inspection', value: cleanedTasks.length, icon: ShieldCheck, color: 'text-green-600' },
          { label: 'Inspected Today', value: inspectedTasks.length, icon: Check, color: 'text-purple-600' },
          { label: 'Inspection Rate', value: `${inspectionRate}%`, icon: BadgePercent, color: 'text-amber-600' },
          { label: 'Failed Today', value: summary?.failed ?? 0, icon: X, color: 'text-red-600' },
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

      {/* Awaiting Inspection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          Rooms Awaiting Inspection
          <Badge variant="secondary" className="text-xs">{cleanedTasks.length}</Badge>
        </h3>
        {cleanedTasks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto opacity-20" />
            <p className="mt-2 text-sm">No rooms awaiting inspection</p>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cleanedTasks.map((task) => (
              <RoomInspectionCard
                key={task.id}
                task={task}
                onInspect={setSelectedTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recently Inspected */}
      {inspectedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-green-600" />
            Recently Inspected
            <Badge variant="secondary" className="text-xs">{inspectedTasks.length}</Badge>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inspectedTasks.slice(0, 6).map((task) => (
              <RoomInspectionCard
                key={task.id}
                task={task}
                onInspect={setSelectedTask}
              />
            ))}
          </div>
        </div>
      )}

      <InspectionDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  )
}
