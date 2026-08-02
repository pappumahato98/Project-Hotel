'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp, UserCheck, Clock, Star, Award, Target,
  BarChart3, Plus, Users, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  employeeId: string
  employeeName: string
  department: string
  position: string
  reviewPeriod: string
  reviewDate: string
  reviewerName: string
  attendanceScore: number
  taskScore: number
  guestSatScore: number
  punctualityScore: number
  overallScore: number
  strengths: string | null
  improvements: string | null
  goals: string | null
  status: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  department: string
  position: string
}

interface PerfStats {
  totalReviews: number
  avgScore: number
  byDepartment: Record<string, { count: number; avgScore: number }>
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
]

const REVIEW_PERIODS = ['All Periods', '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2025-H1', '2025-H2', '2025']

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 80) return 'text-teal-600 dark:text-teal-400'
  if (score >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500'
  if (score >= 80) return 'bg-teal-500'
  if (score >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">🥇 1st</Badge>
  if (rank === 2) return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 text-xs">🥈 2nd</Badge>
  if (rank === 3) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs">🥉 3rd</Badge>
  return <Badge variant="outline" className="text-xs">#{rank}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : status === 'Submitted'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200'
  return <Badge variant="outline" className={cn('font-medium text-xs', variant)}>{status}</Badge>
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-28 truncate text-right">{item.label}</span>
          <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
            <div
              className={cn('h-full rounded-md transition-all duration-500 flex items-center px-2', item.color)}
              style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            >
              <span className="text-[10px] font-medium text-white ml-auto">{item.value}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function PerformanceView() {
  const queryClient = useQueryClient()
  const [filterDept, setFilterDept] = useState('All Departments')
  const [reviewPeriod, setReviewPeriod] = useState('All Periods')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formDept, setFormDept] = useState('')
  const [formPosition, setFormPosition] = useState('')
  const [formPeriod, setFormPeriod] = useState('')
  const [formReviewer, setFormReviewer] = useState('')
  const [formAttendance, setFormAttendance] = useState(0)
  const [formTasks, setFormTasks] = useState(0)
  const [formGuestSat, setFormGuestSat] = useState(0)
  const [formPunctuality, setFormPunctuality] = useState(0)
  const [formStrengths, setFormStrengths] = useState('')
  const [formImprovements, setFormImprovements] = useState('')
  const [formGoals, setFormGoals] = useState('')

  // Fetch performance data
  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['performance', filterDept, reviewPeriod],
    queryFn: () =>
      apiFetch<{ reviews: Review[]; stats: PerfStats }>(
        `/api/performance?department=${filterDept === 'All Departments' ? '' : filterDept}&reviewPeriod=${reviewPeriod === 'All Periods' ? '' : reviewPeriod}`,
      ),
  })

  // Fetch employees for dialog
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch<Employee[]>('/api/employees'),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/performance', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] })
      toast.success('Performance review created successfully')
      setDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reviews = data?.reviews ?? []
  const stats = data?.stats

  const filteredReviews = useMemo(() => {
    const approved = reviews.filter((r) => r.status === 'Approved')
    return approved.sort((a, b) => b.overallScore - a.overallScore)
  }, [reviews])

  // Department summary (from all approved reviews)
  const deptPerformance = useMemo(() => {
    const approved = reviews.filter((r) => r.status === 'Approved')
    const map = new Map<string, Review[]>()
    for (const r of approved) {
      if (!map.has(r.department)) map.set(r.department, [])
      map.get(r.department)!.push(r)
    }
    const result: { department: string; avgAttendance: number; avgTasks: number; avgSatisfaction: number; avgPunctuality: number; avgOverall: number; employeeCount: number }[] = []
    for (const [department, rs] of map) {
      const n = rs.length
      result.push({
        department,
        avgAttendance: Math.round(rs.reduce((s, r) => s + r.attendanceScore, 0) / n),
        avgTasks: Math.round(rs.reduce((s, r) => s + r.taskScore, 0) / n),
        avgSatisfaction: Math.round((rs.reduce((s, r) => s + r.guestSatScore, 0) / n) * 10) / 10,
        avgPunctuality: Math.round(rs.reduce((s, r) => s + r.punctualityScore, 0) / n),
        avgOverall: Math.round(rs.reduce((s, r) => s + r.overallScore, 0) / n),
        employeeCount: n,
      })
    }
    result.sort((a, b) => b.avgOverall - a.avgOverall)
    return result
  }, [reviews])

  const topPerformers = filteredReviews.slice(0, 3)
  const topPerformer = filteredReviews.length > 0 ? filteredReviews[0] : null

  const deptChartData = deptPerformance.map((d) => ({
    label: d.department,
    value: d.avgAttendance,
    color: d.avgAttendance >= 95 ? 'bg-emerald-500' : d.avgAttendance >= 90 ? 'bg-teal-500' : 'bg-amber-500',
  }))

  const overallComputed = (formAttendance + formTasks + (formGuestSat * 20) + formPunctuality) / 4

  function resetForm() {
    setFormEmployeeId('')
    setFormDept('')
    setFormPosition('')
    setFormPeriod('')
    setFormReviewer('')
    setFormAttendance(0)
    setFormTasks(0)
    setFormGuestSat(0)
    setFormPunctuality(0)
    setFormStrengths('')
    setFormImprovements('')
    setFormGoals('')
  }

  function handleEmployeeSelect(empId: string) {
    setFormEmployeeId(empId)
    const emp = employees?.find((e) => e.id === empId)
    if (emp) {
      setFormDept(emp.department)
      setFormPosition(emp.position)
    }
  }

  function handleSubmit(status: string) {
    if (!formEmployeeId || !formPeriod || !formReviewer) {
      toast.error('Please fill all required fields')
      return
    }
    const emp = employees?.find((e) => e.id === formEmployeeId)
    createMutation.mutate({
      employeeId: formEmployeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
      department: formDept,
      position: formPosition,
      reviewPeriod: formPeriod,
      reviewerName: formReviewer,
      attendanceScore: formAttendance,
      taskScore: formTasks,
      guestSatScore: formGuestSat,
      punctualityScore: formPunctuality,
      overallScore: Math.round(overallComputed * 100) / 100,
      strengths: formStrengths || null,
      improvements: formImprovements || null,
      goals: formGoals || null,
      status,
    })
  }

  if (dataLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60 mt-1" />
          </div>
        </div>
        <SummarySkeleton />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Staff Performance</h1>
          <p className="text-xs text-muted-foreground">Employee performance metrics and rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm">New Performance Review</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Employee *</Label>
                  <Select value={formEmployeeId} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id} className="text-xs">
                          {e.firstName} {e.lastName} — {e.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Department</Label>
                    <Input value={formDept} readOnly className="h-8 text-xs bg-muted" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Position</Label>
                    <Input value={formPosition} readOnly className="h-8 text-xs bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Review Period *</Label>
                    <Input placeholder="e.g. 2025-Q1" value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Reviewer Name *</Label>
                    <Input value={formReviewer} onChange={(e) => setFormReviewer(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-2">Scores</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Attendance (0-100)</Label>
                      <Input type="number" min={0} max={100} value={formAttendance} onChange={(e) => setFormAttendance(Number(e.target.value))} className="h-8 text-xs" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Tasks (0-100)</Label>
                      <Input type="number" min={0} max={100} value={formTasks} onChange={(e) => setFormTasks(Number(e.target.value))} className="h-8 text-xs" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Guest Satisfaction (0-5)</Label>
                      <Input type="number" min={0} max={5} step={0.1} value={formGuestSat} onChange={(e) => setFormGuestSat(Number(e.target.value))} className="h-8 text-xs" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Punctuality (0-100)</Label>
                      <Input type="number" min={0} max={100} value={formPunctuality} onChange={(e) => setFormPunctuality(Number(e.target.value))} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-xs text-muted-foreground">Auto Overall Score</span>
                    <span className={cn('text-sm font-bold', getScoreColor(overallComputed))}>{Math.round(overallComputed * 100) / 100}%</span>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Strengths</Label>
                  <Textarea value={formStrengths} onChange={(e) => setFormStrengths(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Areas for Improvement</Label>
                  <Textarea value={formImprovements} onChange={(e) => setFormImprovements(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Goals</Label>
                  <Textarea value={formGoals} onChange={(e) => setFormGoals(e.target.value)} className="text-xs min-h-[60px]" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSubmit('Draft')} disabled={createMutation.isPending}>
                  Save as Draft
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => handleSubmit('Submitted')} disabled={createMutation.isPending}>
                  Submit for Approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={reviewPeriod}
            onChange={(e) => setReviewPeriod(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {REVIEW_PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
              <p className="text-lg font-bold">{stats?.totalReviews ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <UserCheck className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className={cn('text-lg font-bold', getScoreColor(Math.round(stats?.avgScore ?? 0)))}>{Math.round(stats?.avgScore ?? 0)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Departments</p>
              <p className="text-lg font-bold">{stats ? Object.keys(stats.byDepartment).length : 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Performer</p>
              <p className="text-sm font-bold truncate max-w-[120px]">{topPerformer?.employeeName ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {topPerformers.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border p-4">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold',
                    idx === 0 && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                    idx === 1 && 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                    idx === 2 && 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
                  )}>
                    {r.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{r.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{r.position}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-sm font-bold', getScoreColor(r.overallScore))}>{Math.round(r.overallScore)}%</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getScoreBg(r.overallScore))} style={{ width: `${r.overallScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 lg:grid-cols-2">
        {/* Performance by Department Bar Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Attendance by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptChartData.length > 0 ? (
              <BarChart data={deptChartData} maxValue={100} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No department data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Department Performance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Department Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Satisfaction</TableHead>
                    <TableHead className="text-center">Punctuality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">No data</TableCell>
                    </TableRow>
                  ) : (
                    deptPerformance.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium text-xs">{dept.department}</TableCell>
                        <TableCell className="text-center text-xs">{dept.employeeCount}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn('font-medium text-xs', getScoreColor(dept.avgAttendance))}>{dept.avgAttendance}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-xs">{dept.avgSatisfaction}/5</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('font-medium text-xs', getScoreColor(dept.avgPunctuality))}>{dept.avgPunctuality}%</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Employee Ranking Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            Employee Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Tasks</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Guest Sat.</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Punctuality</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                      No approved performance reviews yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((r, idx) => {
                    const rank = idx + 1
                    const initials = r.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{getRankBadge(rank)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                              r.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              r.overallScore >= 80 ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            )}>
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-xs">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{r.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{r.department}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-xs font-medium', getScoreColor(r.attendanceScore))}>{Math.round(r.attendanceScore)}%</span>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell text-xs">{Math.round(r.taskScore)}</TableCell>
                        <TableCell className="text-center hidden lg:table-cell text-xs">
                          <span className="font-medium">{r.guestSatScore}</span>
                          <Star className="inline h-3 w-3 text-amber-400 ml-0.5" />
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          <span className={cn('text-xs font-medium', getScoreColor(r.punctualityScore))}>{Math.round(r.punctualityScore)}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', getScoreBg(r.overallScore))}
                                style={{ width: `${r.overallScore}%` }}
                              />
                            </div>
                            <span className={cn('text-xs font-bold min-w-[32px]', getScoreColor(r.overallScore))}>
                              {Math.round(r.overallScore)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><StatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
