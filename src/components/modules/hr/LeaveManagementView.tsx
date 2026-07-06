'use client'

import * as React from 'react'
import { Plus, Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface LeaveEntry {
  id: string
  employee: string
  department: string
  leaveType: string
  from: string
  to: string
  duration: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

const leaveData: LeaveEntry[] = [
  { id: 'LV-001', employee: 'Sarah Mitchell', department: 'Front Desk', leaveType: 'Annual Leave', from: '2025-01-20', to: '2025-01-24', duration: '5 days', status: 'Pending' },
  { id: 'LV-002', employee: 'James Chen', department: 'Housekeeping', leaveType: 'Sick Leave', from: '2025-01-18', to: '2025-01-19', duration: '2 days', status: 'Approved' },
  { id: 'LV-003', employee: 'Maria Gonzalez', department: 'F&B Service', leaveType: 'Personal Leave', from: '2025-01-22', to: '2025-01-23', duration: '2 days', status: 'Rejected' },
  { id: 'LV-004', employee: 'David Kim', department: 'Kitchen', leaveType: 'Annual Leave', from: '2025-01-27', to: '2025-02-02', duration: '7 days', status: 'Pending' },
  { id: 'LV-005', employee: 'Emily Watson', department: 'Front Desk', leaveType: 'Maternity Leave', from: '2025-02-01', to: '2025-04-30', duration: '89 days', status: 'Approved' },
  { id: 'LV-006', employee: 'Robert Taylor', department: 'Maintenance', leaveType: 'Sick Leave', from: '2025-01-15', to: '2025-01-16', duration: '2 days', status: 'Approved' },
  { id: 'LV-007', employee: 'Aisha Patel', department: 'Spa & Wellness', leaveType: 'Annual Leave', from: '2025-02-10', to: '2025-02-14', duration: '5 days', status: 'Pending' },
  { id: 'LV-008', employee: 'Thomas Brown', department: 'Security', leaveType: 'Comp Off', from: '2025-01-25', to: '2025-01-25', duration: '1 day', status: 'Pending' },
  { id: 'LV-009', employee: 'Lisa Nguyen', department: 'Reservations', leaveType: 'Annual Leave', from: '2025-01-28', to: '2025-01-30', duration: '3 days', status: 'Approved' },
  { id: 'LV-010', employee: 'Carlos Rivera', department: 'Concierge', leaveType: 'Personal Leave', from: '2025-02-05', to: '2025-02-06', duration: '2 days', status: 'Pending' },
]

function StatusBadge({ status }: { status: LeaveEntry['status'] }) {
  const variant = status === 'Approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : status === 'Rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'

  return (
    <Badge variant="outline" className={`${variant} font-medium`}>
      {status}
    </Badge>
  )
}

export function LeaveManagementView() {
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [departmentFilter, setDepartmentFilter] = React.useState('all')

  const departments = [...new Set(leaveData.map((d) => d.department))]

  const filtered = leaveData.filter((entry) => {
    if (statusFilter !== 'all' && entry.status.toLowerCase() !== statusFilter) return false
    if (departmentFilter !== 'all' && entry.department !== departmentFilter) return false
    return true
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Leave Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Review and manage employee leave requests</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Request Leave
        </Button>
      </div>

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{entry.id}</TableCell>
                    <TableCell className="font-medium">{entry.employee}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.department}</TableCell>
                    <TableCell>{entry.leaveType}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.from}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.to}</TableCell>
                    <TableCell>{entry.duration}</TableCell>
                    <TableCell><StatusBadge status={entry.status} /></TableCell>
                    <TableCell className="pr-4 text-right">
                      {entry.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <Check className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}