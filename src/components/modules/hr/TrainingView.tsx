'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Users, Clock, BookOpen, Calendar, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

interface Enrollment {
  id: string
  employeeId: string
  employeeName: string
  department: string
  status: string
  score: number | null
}

interface Session {
  id: string
  courseName: string
  instructor: string
  date: string
  duration: string
  enrolled: number
  maxCapacity: number
  status: string
  category: string
  description: string | null
  location: string | null
  enrollments: Enrollment[]
}

const CATEGORIES = [
  'All Categories',
  'Service Standards',
  'Safety & Compliance',
  'F&B Compliance',
  'Professional Development',
  'Soft Skills',
  'Technical Skills',
  'Operations',
  'F&B Skills',
]

const STATUS_OPTIONS = ['All Statuses', 'Upcoming', 'In Progress', 'Completed']

function TrainingStatusBadge({ status }: { status: string }) {
  const variant = status === 'Upcoming'
    ? 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300'
    : status === 'In Progress'
      ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
      : status === 'Completed'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
  return <Badge variant="outline" className={cn('font-medium text-xs', variant)}>{status}</Badge>
}

export function TrainingView() {
  const queryClient = useQueryClient()
  const [catFilter, setCatFilter] = useState('All Categories')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formInstructor, setFormInstructor] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formCapacity, setFormCapacity] = useState(20)
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formLocation, setFormLocation] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['training', statusFilter, catFilter],
    queryFn: () =>
      apiFetch<{ sessions: Session[]; stats: Record<string, number> }>(
        `/api/training?status=${statusFilter === 'All Statuses' ? '' : statusFilter}&category=${catFilter === 'All Categories' ? '' : catFilter}`,
      ),
  })

  const sessions = data?.sessions ?? []
  const stats = data?.stats ?? {}

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/training', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] })
      toast.success('Training session scheduled')
      setDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/training', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] })
      toast.success('Training status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() {
    setFormName('')
    setFormInstructor('')
    setFormDate('')
    setFormDuration('')
    setFormCapacity(20)
    setFormCategory('')
    setFormDescription('')
    setFormLocation('')
  }

  function handleCreate() {
    if (!formName || !formInstructor || !formDate || !formDuration || !formCategory) {
      toast.error('Please fill all required fields')
      return
    }
    createMutation.mutate({
      courseName: formName,
      instructor: formInstructor,
      date: formDate,
      duration: formDuration,
      maxCapacity: formCapacity,
      category: formCategory,
      description: formDescription || null,
      location: formLocation || null,
      status: 'Upcoming',
    })
  }

  function handleStatusToggle(session: Session) {
    const next = session.status === 'Upcoming' ? 'In Progress' : session.status === 'In Progress' ? 'Completed' : 'Upcoming'
    updateMutation.mutate({ id: session.id, status: next })
  }

  function handleViewEnrollments(session: Session) {
    setSelectedSession(session)
    setEnrollDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64 mt-1" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-2.5"><Skeleton className="h-12 w-full" /></Card>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-40 w-full" /></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Training & Development</h1>
          <p className="text-xs text-muted-foreground">Manage training sessions and employee development programs</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm">Schedule Training</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Course Name *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Guest Service Excellence" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Instructor *</Label>
                    <Input value={formInstructor} onChange={(e) => setFormInstructor(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Duration *</Label>
                    <Input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} className="h-8 text-xs" placeholder="e.g. 3 hours" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Date *</Label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Max Capacity *</Label>
                    <Input type="number" min={1} value={formCapacity} onChange={(e) => setFormCapacity(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Category *</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter(c => c !== 'All Categories').map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Location</Label>
                    <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="h-8 text-xs" placeholder="e.g. Conference Room A" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Schedule'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
              <p className="text-lg font-bold">{stats.totalSessions ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950">
              <Calendar className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="text-lg font-bold">{stats.upcoming ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-lg font-bold">{stats.inProgress ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-lg font-bold">{stats.completed ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <Users className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Enrolled</p>
              <p className="text-lg font-bold">{stats.totalEnrolled ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Training Cards Grid */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">No training sessions found</CardContent>
          </Card>
        ) : (
          sessions.map((session) => {
            const capacityPercent = session.maxCapacity > 0 ? Math.round((session.enrolled / session.maxCapacity) * 100) : 0
            const isFull = session.enrolled >= session.maxCapacity
            return (
              <Card key={session.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold leading-tight">{session.courseName}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                        {session.category}
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleStatusToggle(session)}
                      className="shrink-0 cursor-pointer"
                      title="Click to change status"
                    >
                      <TrainingStatusBadge status={session.status} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <BookOpen className="size-3 shrink-0" />
                      <span className="truncate">{session.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="size-3 shrink-0" />
                      {formatDate(session.date)}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      {session.duration}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3 shrink-0" />
                      {session.enrolled}/{session.maxCapacity}
                      {session.enrollments.length > 0 && (
                        <button
                          onClick={() => handleViewEnrollments(session)}
                          className="ml-auto text-sky-600 hover:text-sky-700"
                          title="View enrollments"
                        >
                          <Eye className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Capacity Bar */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className={isFull ? 'font-medium text-amber-600' : 'text-muted-foreground'}>{capacityPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isFull ? 'bg-amber-500' : capacityPercent >= 75 ? 'bg-amber-400' : 'bg-emerald-500',
                        )}
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Enrollment Detail Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Enrollments — {selectedSession?.courseName}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSession?.enrollments.map((enr) => (
                  <TableRow key={enr.id}>
                    <TableCell className="text-xs font-medium">{enr.employeeName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{enr.department}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        enr.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        enr.status === 'Absent' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-sky-100 text-sky-700 border-sky-200'
                      )}>{enr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">{enr.score ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {(!selectedSession?.enrollments || selectedSession.enrollments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">No enrollments yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
