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
import { Plus, Briefcase, Clock, Users, Calendar, Eye, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'
import { formatNPR } from '@/lib/utils'

interface Application {
  id: string
  applicantName: string
  applicantEmail: string | null
  applicantPhone: string | null
  status: string
  appliedAt: string
}

interface Posting {
  id: string
  position: string
  department: string
  employmentType: string
  description: string | null
  requirements: string | null
  salaryMin: number | null
  salaryMax: number | null
  status: string
  postedAt: string | null
  deadline: string | null
  appliedCount: number
  screeningCount: number
  interviewCount: number
  offerCount: number
  applications: Application[]
  createdAt: string
}

const DEPARTMENTS = [
  'All Departments',
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Kitchen',
  'Engineering',
  'Security',
  'Spa & Wellness',
  'Events & Banquet',
]

const STATUS_OPTIONS = ['All Statuses', 'Draft', 'Open', 'Closed']

const pipelineSteps = [
  { key: 'applied' as const, label: 'Applied', color: 'bg-sky-500', countKey: 'appliedCount' as keyof Posting },
  { key: 'screening' as const, label: 'Screening', color: 'bg-amber-500', countKey: 'screeningCount' as keyof Posting },
  { key: 'interview' as const, label: 'Interview', color: 'bg-violet-500', countKey: 'interviewCount' as keyof Posting },
  { key: 'offer' as const, label: 'Offer', color: 'bg-emerald-500', countKey: 'offerCount' as keyof Posting },
]

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Open'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
    : status === 'Closed'
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
  return <Badge variant="outline" className={cn('font-medium text-xs', variant)}>{status}</Badge>
}

function TypeBadge({ type }: { type: string }) {
  const variant = type === 'Full-time'
    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300'
    : type === 'Part-time'
      ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300'
      : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
  return <Badge variant="outline" className={cn('text-[10px]', variant)}>{type}</Badge>
}

export function RecruitmentView() {
  const queryClient = useQueryClient()
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [appDialogOpen, setAppDialogOpen] = useState(false)
  const [selectedPosting, setSelectedPosting] = useState<Posting | null>(null)

  // Form state
  const [formPosition, setFormPosition] = useState('')
  const [formDept, setFormDept] = useState('')
  const [formType, setFormType] = useState('Full-time')
  const [formDesc, setFormDesc] = useState('')
  const [formReqs, setFormReqs] = useState('')
  const [formSalaryMin, setFormSalaryMin] = useState('')
  const [formSalaryMax, setFormSalaryMax] = useState('')
  const [formDeadline, setFormDeadline] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['recruitment', deptFilter, statusFilter],
    queryFn: () =>
      apiFetch<{ postings: Posting[]; stats: Record<string, number> }>(
        `/api/recruitment?department=${deptFilter === 'All Departments' ? '' : deptFilter}&status=${statusFilter === 'All Statuses' ? '' : statusFilter}`,
      ),
  })

  const { data: appData } = useQuery({
    queryKey: ['recruitment-applications', selectedPosting?.id],
    queryFn: () => apiFetch<{ applications: Application[] }>(`/api/recruitment/applications?postingId=${selectedPosting?.id}`),
    enabled: !!selectedPosting?.id && appDialogOpen,
  })

  const postings = data?.postings ?? []
  const stats = data?.stats ?? {}

  const applications = appData?.applications ?? []

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/recruitment', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      toast.success('Job posting created')
      setDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/recruitment', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment'] })
      toast.success('Job posting updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() {
    setFormPosition('')
    setFormDept('')
    setFormType('Full-time')
    setFormDesc('')
    setFormReqs('')
    setFormSalaryMin('')
    setFormSalaryMax('')
    setFormDeadline('')
  }

  function handleCreate() {
    if (!formPosition || !formDept || !formType) {
      toast.error('Please fill required fields')
      return
    }
    createMutation.mutate({
      position: formPosition,
      department: formDept,
      employmentType: formType,
      description: formDesc || null,
      requirements: formReqs || null,
      salaryMin: formSalaryMin ? Number(formSalaryMin) : null,
      salaryMax: formSalaryMax ? Number(formSalaryMax) : null,
      deadline: formDeadline || null,
      status: 'Draft',
    })
  }

  function handleStatusToggle(posting: Posting) {
    const next = posting.status === 'Draft' ? 'Open' : posting.status === 'Open' ? 'Closed' : 'Draft'
    updateMutation.mutate({ id: posting.id, status: next })
  }

  function handleViewApplications(posting: Posting) {
    setSelectedPosting(posting)
    setAppDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-56 mt-1" /></div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-2.5"><Skeleton className="h-12 w-full" /></Card>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-44 w-full" /></Card>
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
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Recruitment</h1>
          <p className="text-xs text-muted-foreground">Manage job openings and track applicant pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Post Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm">New Job Posting</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Position *</Label>
                    <Input value={formPosition} onChange={(e) => setFormPosition(e.target.value)} className="h-8 text-xs" placeholder="e.g. Front Desk Agent" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Department *</Label>
                    <Select value={formDept} onValueChange={setFormDept}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.filter(d => d !== 'All Departments').map((d) => (
                          <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Employment Type *</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time" className="text-xs">Full-time</SelectItem>
                        <SelectItem value="Part-time" className="text-xs">Part-time</SelectItem>
                        <SelectItem value="Contract" className="text-xs">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Deadline</Label>
                    <Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Salary Min (NPR)</Label>
                    <Input type="number" value={formSalaryMin} onChange={(e) => setFormSalaryMin(e.target.value)} className="h-8 text-xs" placeholder="e.g. 25000" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Salary Max (NPR)</Label>
                    <Input type="number" value={formSalaryMax} onChange={(e) => setFormSalaryMax(e.target.value)} className="h-8 text-xs" placeholder="e.g. 40000" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Requirements</Label>
                  <Textarea value={formReqs} onChange={(e) => setFormReqs(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Draft'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Briefcase className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Positions</p>
              <p className="text-lg font-bold">{stats.totalOpen ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950">
              <Users className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Applicants</p>
              <p className="text-lg font-bold">{stats.totalApplicants ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <Calendar className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interviews</p>
              <p className="text-lg font-bold">
                {postings.reduce((s, p) => s + p.interviewCount, 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <UserCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Offers Extended</p>
              <p className="text-lg font-bold">
                {postings.reduce((s, p) => s + p.offerCount, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Job Cards Grid */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {postings.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">No job postings found</CardContent>
          </Card>
        ) : (
          postings.map((job) => {
            const maxPipeline = Math.max(job.appliedCount, job.screeningCount, job.interviewCount, job.offerCount)
            return (
              <Card key={job.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold leading-tight truncate">{job.position}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.department}</p>
                    </div>
                    <button
                      onClick={() => handleStatusToggle(job)}
                      className="shrink-0 cursor-pointer"
                      title="Click to toggle status"
                    >
                      <StatusBadge status={job.status} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <TypeBadge type={job.employmentType} />
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3" />
                      {job.appliedCount} applicants
                    </span>
                    {job.postedAt && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDateShort(job.postedAt)}
                      </span>
                    )}
                    {job.applications.length > 0 && (
                      <button
                        onClick={() => handleViewApplications(job)}
                        className="ml-auto text-sky-600 hover:text-sky-700 flex items-center gap-0.5"
                        title="View applicants"
                      >
                        <Eye className="size-3" />
                        <span className="text-[10px]">View</span>
                      </button>
                    )}
                  </div>

                  {/* Salary range */}
                  {(job.salaryMin || job.salaryMax) && (
                    <p className="text-xs font-medium">
                      {job.salaryMin && formatNPR(job.salaryMin)}
                      {job.salaryMin && job.salaryMax && ' – '}
                      {job.salaryMax && formatNPR(job.salaryMax)}
                    </p>
                  )}

                  {/* Pipeline Progress */}
                  {job.status !== 'Draft' && maxPipeline > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Applicant Pipeline</span>
                        <span className="font-medium text-foreground">{job.offerCount} offers</span>
                      </div>
                      <div className="space-y-1">
                        {pipelineSteps.map((step) => {
                          const count = job[step.countKey] as number
                          const width = maxPipeline > 0 ? (count / maxPipeline) * 100 : 0
                          return (
                            <div key={step.key} className="flex items-center gap-2">
                              <span className="w-16 text-[10px] text-muted-foreground shrink-0">{step.label}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', step.color)}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <span className="w-6 text-[10px] font-medium text-right tabular-nums">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Applicants Dialog */}
      <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Applicants — {selectedPosting?.position}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="text-xs font-medium">{app.applicantName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {app.applicantEmail || app.applicantPhone || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        app.status === 'Hired' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        app.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        app.status === 'Offer' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        app.status === 'Interview' ? 'bg-violet-100 text-violet-700 border-violet-200' :
                        'bg-sky-100 text-sky-700 border-sky-200'
                      )}>{app.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateShort(app.appliedAt)}</TableCell>
                  </TableRow>
                ))}
                {applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">No applicants yet</TableCell>
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
