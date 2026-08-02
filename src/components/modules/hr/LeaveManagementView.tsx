'use client'

import * as React from 'react'
import { Plus, Check, X, CalendarDays, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface LeaveEntry {
  id: string
  employeeId: string
  employeeName: string
  department: string
  leaveType: string
  startDate: string
  endDate: string
  duration: number
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  reason?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
}

interface LeaveStats {
  totalPending: number
  totalApproved: number
  totalRejected: number
  byDepartment: Record<string, { total: number; pending: number; approved: number; rejected: number }>
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  department: string
}

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave', 'Casual Leave', 'Unpaid Leave', 'Comp Off']

// ── Helpers ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeaveEntry['status'] }) {
  const variant = status === 'Approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : status === 'Rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : status === 'Cancelled'
        ? 'bg-gray-100 text-gray-600 border-gray-200'
        : 'bg-amber-100 text-amber-700 border-amber-200'

  return (
    <Badge variant="outline" className={`${variant} font-medium`}>
      {status}
    </Badge>
  )
}

function formatDuration(days: number): string {
  if (days === 1) return '1 day'
  if (days % 1 === 0) return `${days} days`
  return `${days} days`
}

// ── View ──────────────────────────────────────────────────────
export function LeaveManagementView() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [departmentFilter, setDepartmentFilter] = React.useState('all')
  const [showRequestDialog, setShowRequestDialog] = React.useState(false)
  const [rejectDialogId, setRejectDialogId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')

  // Form state for new leave request
  const [formEmployee, setFormEmployee] = React.useState('')
  const [formLeaveType, setFormLeaveType] = React.useState('')
  const [formStartDate, setFormStartDate] = React.useState('')
  const [formEndDate, setFormEndDate] = React.useState('')
  const [formReason, setFormReason] = React.useState('')

  // Fetch leave requests
  const { data, isLoading } = useQuery<{ requests: LeaveEntry[]; stats: LeaveStats }>({
    queryKey: ['leave', statusFilter, departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter === 'pending' ? 'Pending' : statusFilter === 'approved' ? 'Approved' : 'Rejected')
      if (departmentFilter !== 'all') params.set('department', departmentFilter)
      return apiFetch(`/api/leave?${params.toString()}`)
    },
  })

  // Fetch employees for dropdown
  const { data: employeesData } = useQuery<{ employees: Employee[] }>({
    queryKey: ['employees-for-leave'],
    queryFn: () => apiFetch('/api/employees'),
  })

  const employees = employeesData?.employees ?? []
  const requests = data?.requests ?? []
  const stats = data?.stats

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch('/api/leave', {
      method: 'PATCH',
      body: JSON.stringify({ id, status: 'Approved' }),
    }),
    onSuccess: () => {
      toast.success('Leave request approved')
      queryClient.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: () => toast.error('Failed to approve leave request'),
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      apiFetch('/api/leave', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'Rejected', rejectionReason }),
      }),
    onSuccess: () => {
      toast.success('Leave request rejected')
      setRejectDialogId(null)
      setRejectReason('')
      queryClient.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: () => toast.error('Failed to reject leave request'),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/leave', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Leave request submitted')
      setShowRequestDialog(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: () => toast.error('Failed to submit leave request'),
  })

  const resetForm = () => {
    setFormEmployee('')
    setFormLeaveType('')
    setFormStartDate('')
    setFormEndDate('')
    setFormReason('')
  }

  // Compute leave balances from approved requests
  const approvedRequests = requests.filter((r) => r.status === 'Approved')
  const annualUsed = approvedRequests.filter((r) => r.leaveType === 'Annual Leave').reduce((s, r) => s + r.duration, 0)
  const sickUsed = approvedRequests.filter((r) => r.leaveType === 'Sick Leave').reduce((s, r) => s + r.duration, 0)
  const personalUsed = approvedRequests.filter((r) => r.leaveType === 'Personal Leave').reduce((s, r) => s + r.duration, 0)
  const annualRemaining = 20 - annualUsed // Assuming 20 days annual leave
  const sickRemaining = 12 - sickUsed // Assuming 12 days sick leave
  const personalRemaining = 5 - personalUsed // Assuming 5 days personal leave

  // Compute duration from form dates
  const formDuration = formStartDate && formEndDate
    ? Math.max(1, Math.ceil((new Date(formEndDate).getTime() - new Date(formStartDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const departments = [...new Set(requests.map((d) => d.department))]

  const handleSubmitRequest = () => {
    const emp = employees.find((e) => e.id === formEmployee)
    if (!emp || !formLeaveType || !formStartDate || !formEndDate) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      leaveType: formLeaveType,
      startDate: formStartDate,
      endDate: formEndDate,
      duration: formDuration,
      reason: formReason || null,
    })
  }

  const handleReject = () => {
    if (rejectDialogId) {
      rejectMutation.mutate({ id: rejectDialogId, rejectionReason: rejectReason })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Leave Management</h2>
          <p className="text-xs text-muted-foreground">Review and manage employee leave requests</p>
        </div>
        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowRequestDialog(true)}>
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CalendarDays className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Annual Remaining</p>
              <p className="text-lg font-bold">{annualRemaining} <span className="text-xs font-normal text-muted-foreground">/ 20 days</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sick Used</p>
              <p className="text-lg font-bold">{sickUsed} <span className="text-xs font-normal text-muted-foreground">/ 12 days</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personal Remaining</p>
              <p className="text-lg font-bold">{personalRemaining} <span className="text-xs font-normal text-muted-foreground">/ 5 days</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300">
            {stats.totalPending} Pending
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
            {stats.totalApproved} Approved
          </Badge>
          <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            {stats.totalRejected} Rejected
          </Badge>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Department:</span>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="py-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="pl-4">Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="hidden md:table-cell">From</TableHead>
                  <TableHead className="hidden md:table-cell">To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="pl-4 font-medium">{entry.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.department}</TableCell>
                      <TableCell>{entry.leaveType}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(entry.startDate)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(entry.endDate)}</TableCell>
                      <TableCell>{formatDuration(entry.duration)}</TableCell>
                      <TableCell><StatusBadge status={entry.status} /></TableCell>
                      <TableCell className="pr-4 text-right">
                        {entry.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => approveMutation.mutate(entry.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRejectDialogId(entry.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select value={formLeaveType} onValueChange={setFormLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} min={formStartDate || undefined} />
              </div>
            </div>
            {formDuration > 0 && (
              <p className="text-xs text-muted-foreground">Duration: {formatDuration(formDuration)}</p>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Optional reason for leave" value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRequestDialog(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open) setRejectDialogId(null); setRejectReason('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <Textarea placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectReason('') }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
