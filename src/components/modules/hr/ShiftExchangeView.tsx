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

interface ShiftExchange {
  id: string
  requester: string
  fromShift: string
  toShift: string
  withEmployee: string
  date: string
  status: 'Pending' | 'Approved' | 'Rejected'
  reason: string
}

const exchangeData: ShiftExchange[] = [
  { id: 'SE-001', requester: 'Sarah Mitchell', fromShift: 'Morning (07:00–15:00)', toShift: 'Evening (15:00–23:00)', withEmployee: 'Lisa Nguyen', date: '2025-01-22', status: 'Pending', reason: 'Medical appointment in the morning' },
  { id: 'SE-002', requester: 'James Chen', fromShift: 'Evening (15:00–23:00)', toShift: 'Morning (07:00–15:00)', withEmployee: 'Carlos Rivera', date: '2025-01-23', status: 'Approved', reason: 'Family commitment in the evening' },
  { id: 'SE-003', requester: 'Maria Gonzalez', fromShift: 'Morning (07:00–15:00)', toShift: 'Night (23:00–07:00)', withEmployee: 'Robert Taylor', date: '2025-01-24', status: 'Rejected', reason: 'Transportation issues' },
  { id: 'SE-004', requester: 'David Kim', fromShift: 'Night (23:00–07:00)', toShift: 'Morning (07:00–15:00)', withEmployee: 'Thomas Brown', date: '2025-01-25', status: 'Pending', reason: 'Personal emergency' },
  { id: 'SE-005', requester: 'Emily Watson', fromShift: 'Evening (15:00–23:00)', toShift: 'Morning (07:00–15:00)', withEmployee: 'Aisha Patel', date: '2025-01-26', status: 'Pending', reason: 'Attending evening class' },
  { id: 'SE-006', requester: 'Robert Taylor', fromShift: 'Morning (07:00–15:00)', toShift: 'Evening (15:00–23:00)', withEmployee: 'James Chen', date: '2025-01-27', status: 'Approved', reason: 'Dental appointment' },
  { id: 'SE-007', requester: 'Lisa Nguyen', fromShift: 'Morning (07:00–15:00)', toShift: 'Night (23:00–07:00)', withEmployee: 'David Kim', date: '2025-01-28', status: 'Pending', reason: 'Need to cover for a colleague on leave' },
  { id: 'SE-008', requester: 'Thomas Brown', fromShift: 'Evening (15:00–23:00)', toShift: 'Morning (07:00–15:00)', withEmployee: 'Sarah Mitchell', date: '2025-01-29', status: 'Approved', reason: 'Childcare responsibilities' },
  { id: 'SE-009', requester: 'Carlos Rivera', fromShift: 'Night (23:00–07:00)', toShift: 'Evening (15:00–23:00)', withEmployee: 'Maria Gonzalez', date: '2025-01-30', status: 'Pending', reason: 'Prefer earlier shift for commute' },
]

function StatusBadge({ status }: { status: ShiftExchange['status'] }) {
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

export function ShiftExchangeView() {
  const [statusFilter, setStatusFilter] = React.useState('all')

  const filtered = exchangeData.filter((entry) => {
    if (statusFilter !== 'all' && entry.status.toLowerCase() !== statusFilter) return false
    return true
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Shift Exchange</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and approve shift exchange requests between staff</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Request Exchange
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Exchange Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">ID</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>From Shift</TableHead>
                  <TableHead>To Shift</TableHead>
                  <TableHead>With Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{entry.id}</TableCell>
                    <TableCell className="font-medium">{entry.requester}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.fromShift}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.toShift}</TableCell>
                    <TableCell>{entry.withEmployee}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.date}</TableCell>
                    <TableCell><StatusBadge status={entry.status} /></TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={entry.reason}>
                      {entry.reason}
                    </TableCell>
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
                      No exchange requests found.
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