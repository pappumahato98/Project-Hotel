'use client'
import { toast } from 'sonner'

import { useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidate } from '@/lib/queryKeys'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ShieldCheck, BedDouble, Camera, Check, X, ClipboardCheck,
  ChevronRight, BadgePercent, AlertCircle, History, User, Clock, FileText, Trash2,
  Loader2
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

interface AuditRecord {
  id: string
  hkTaskId: string
  roomId: string
  roomNumber: string
  action: string
  performedBy: string
  reason: string | null
  checklistJson: string | null
  photosJson: string | null
  createdAt: string
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

// ── Format helpers ────────────────────────────────────────────
function formatAuditAction(action: string): { label: string; color: string } {
  switch (action) {
    case 'reject_reassign': return { label: 'Rejected & Reassigned', color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800' }
    case 'approve': return { label: 'Approved', color: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800' }
    case 'force_mutation': return { label: 'Force Mutated', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800' }
    default: return { label: action, color: 'text-muted-foreground bg-muted border-border' }
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ── Single Room Inspection Card ───────────────────────────────
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

// ── Photo Capture Component ──────────────────────────────────
function PhotoCaptureSection({
  photos,
  onCapture,
  onRemove,
}: {
  photos: string[]
  onCapture: (dataUrl: string) => void
  onRemove: (index: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOpen(true)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Camera access denied or unavailable')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    onCapture(dataUrl)
    stopCamera()
  }, [onCapture, stopCamera])

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Photo Evidence</p>

      {/* Camera Preview */}
      {cameraOpen && (
        <div className="relative rounded-lg border overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 object-cover"
          />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-white text-black hover:bg-gray-200"
              onClick={capturePhoto}
            >
              <Camera className="h-4 w-4" /> Capture
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-white/90 text-black hover:bg-gray-200 border-gray-300"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {cameraError}
        </p>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group rounded-md border overflow-hidden aspect-square">
              <img src={photo} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Open Camera Button */}
      {!cameraOpen && (
        <Button variant="outline" className="w-full gap-2" onClick={startCamera}>
          <Camera className="h-4 w-4" />
          {photos.length > 0 ? `Add More Photo (${photos.length} captured)` : 'Capture Photo Evidence'}
        </Button>
      )}
    </div>
  )
}

// ── Audit Trail Section ──────────────────────────────────────
function AuditTrailSection({ roomId }: { roomId: string }) {
  const { data: audits, isLoading } = useQuery<AuditRecord[]>({
    queryKey: ['inspection-audit', roomId],
    queryFn: () => apiFetch(`/api/housekeeping?section=inspection-audit&roomId=${roomId}`) as Promise<AuditRecord[]>,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading audit history...
      </div>
    )
  }

  if (!audits || audits.length === 0) {
    return (
      <div className="py-3 text-center">
        <History className="h-6 w-6 mx-auto text-muted-foreground/30" />
        <p className="mt-1 text-xs text-muted-foreground">No inspection history for this room</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {audits.map((audit) => {
        const { label, color } = formatAuditAction(audit.action)
        return (
          <div key={audit.id} className="rounded-md border p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn('text-[10px] font-semibold', color)}>
                {label}
              </Badge>
              <span className="text-muted-foreground">{formatDateTime(audit.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {audit.performedBy}</span>
            </div>
            {audit.reason && (
              <div className="flex items-start gap-1 text-muted-foreground">
                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="italic">&quot;{audit.reason}&quot;</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
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
  const queryClient = useQueryClient()
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [photos, setPhotos] = useState<string[]>([])
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showAuditTrail, setShowAuditTrail] = useState(false)

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!task) return
      const checklist = Object.entries(checkedItems).reduce((acc, [k, v]) => {
        if (v) acc[k] = true
        return acc
      }, {} as Record<string, boolean>)
      return apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve-inspection',
          id: task.id,
          performedBy: 'Inspector',
          checklist,
          photos: photos.length > 0 ? photos : undefined,
        }),
      })
    },
    onSuccess: () => {
      invalidate.afterRoomStatusChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['inspection-audit'] })
      toast.success(`Room ${task?.room.number} inspection passed`)
      resetAndClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve inspection')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!task) return
      if (!rejectReason.trim()) {
        toast.error('Please provide a reason for rejection')
        throw new Error('Reason required')
      }
      const checklist = Object.entries(checkedItems).reduce((acc, [k, v]) => {
        if (v) acc[k] = true
        return acc
      }, {} as Record<string, boolean>)
      return apiFetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-inspection',
          id: task.id,
          performedBy: 'Inspector',
          reason: rejectReason.trim(),
          checklist,
          photos: photos.length > 0 ? photos : undefined,
        }),
      })
    },
    onSuccess: () => {
      invalidate.afterRoomStatusChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['inspection-audit'] })
      toast.info(`Room ${task?.room.number} rejected & reassigned for cleaning`)
      resetAndClose()
    },
    onError: (err: Error) => {
      if (err.message !== 'Reason required') {
        toast.error(err.message || 'Failed to reject inspection')
      }
    },
  })

  const resetAndClose = () => {
    setCheckedItems({})
    setPhotos([])
    setRejectReason('')
    setShowRejectForm(false)
    setShowAuditTrail(false)
    onOpenChange(false)
  }

  if (!task) return null

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  const checkedCount = Object.values(checkedItems).filter(Boolean).length
  const allChecked = checkedCount === INSPECTION_ITEMS.length
  const passCount = INSPECTION_ITEMS.length
  const passPercent = Math.round((checkedCount / passCount) * 100)

  const handleCapturePhoto = (dataUrl: string) => {
    setPhotos((prev) => [...prev, dataUrl])
    toast.success('Photo captured')
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(true) }}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[100dvh] sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 pt-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              Inspect Room {task.room.number}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Floor {task.room.floor}{task.room.wing ? ` · ${task.room.wing} Wing` : ''} · {task.room.type.name}
              {task.assignedTo ? ` · Cleaned by ${task.assignedTo}` : ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <div className="space-y-4 pr-2">
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

            {/* Photo Capture */}
            <PhotoCaptureSection
              photos={photos}
              onCapture={handleCapturePhoto}
              onRemove={handleRemovePhoto}
            />

            {/* Reject Reason (shown when Reject is clicked) */}
            {showRejectForm && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-3 space-y-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 inline mr-1.5" />
                  Reason for Rejection (required)
                </p>
                <Textarea
                  placeholder="Describe why this room failed inspection and needs to be recleaned..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
              </div>
            )}

            {/* Audit Trail Toggle */}
            <div>
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowAuditTrail(!showAuditTrail)}
              >
                <History className="h-4 w-4" />
                <span className="font-medium">Inspection History</span>
                <ChevronRight className={cn('h-4 w-4 transition-transform', showAuditTrail && 'rotate-90')} />
              </button>
              {showAuditTrail && (
                <div className="mt-2 rounded-lg border p-3">
                  <AuditTrailSection roomId={task.roomId} />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer Actions */}
        <div className="shrink-0 px-6 pb-6 pt-2">
          <Separator className="mb-3" />
          <div className="flex gap-3">
            {!showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                  Reject &amp; Reassign
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => approveMutation.mutate()}
                  disabled={isSubmitting}
                >
                  {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => rejectMutation.mutate()}
                  disabled={isSubmitting || !rejectReason.trim()}
                >
                  {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <AlertCircle className="h-4 w-4" />
                  Confirm Reject
                </Button>
              </>
            )}
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