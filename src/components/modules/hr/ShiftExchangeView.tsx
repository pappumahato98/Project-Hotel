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
import {
  AlertTriangle, Check, Plus, X, ArrowRightLeft, Clock, Ban, ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

interface Exchange {
  id: string
  requesterId: string
  requesterName: string
  requesterDept: string
  fromShift: string
  toShift: string
  targetId: string | null
  targetName: string | null
  exchangeDate: string
  reason: string
  status: string
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  department: string
  position: string
}

const SHIFT_OPTIONS = [
  { label: 'Morning', value: 'Morning (07:00-15:00)' },
  { label: 'Evening', value: 'Evening (15:00-23:00)' },
  { label: 'Night', value: 'Night (23:00-07:00)' },
]

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
    : status === 'Rejected'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
      : status === 'Cancelled'
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
  return <Badge variant="outline" className={cn('font-medium text-xs', variant)}>{status}</Badge>
}

export function ShiftExchangeView() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [formRequesterId, setFormRequesterId] = useState('')
  const [formFromShift, setFormFromShift] = useState('')
  const [formToShift, setFormToShift] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTargetId, setFormTargetId] = useState('')
  const [formReason, setFormReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['shift-exchange', statusFilter],
    queryFn: () =>
      apiFetch<{ exchanges: Exchange[]; stats: Record<string, number> }>(
        `/api/shift-exchange?status=${statusFilter === 'all' ? '' : statusFilter}`,
      ),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch<Employee[]>('/api/employees'),
  })

  const exchanges = data?.exchanges ?? []
  const stats = data?.stats ?? {}

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/shift-exchange', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-exchange'] })
      toast.success('Shift exchange request submitted')
      setDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch('/api/shift-exchange', { method: 'PATCH', body: JSON.stringify({ id, status: 'Approved' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-exchange'] })
      toast.success('Exchange approved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch('/api/shift-exchange', { method: 'PATCH', body: JSON.stringify({ id, status: 'Rejected' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-exchange'] })
      toast.success('Exchange rejected')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() {
    setFormRequesterId('')
    setFormFromShift('')
    setFormToShift('')
    setFormDate('')
    setFormTargetId('')
    setFormReason('')
  }

  function handleCreate() {
    if (!formRequesterId || !formFromShift || !formToShift || !formDate || !formReason) {
      toast.error('Please fill all required fields')
      return
    }
    const emp = employees?.find((e) => e.id === formRequesterId)
    const target = employees?.find((e) => e.id === formTargetId)
    createMutation.mutate({
      requesterId: formRequesterId,
      requesterName: emp ? `${emp.firstName} ${emp.lastName}` : '',
      requesterDept: emp?.department ?? '',
      fromShift: formFromShift,
      toShift: formToShift,
      exchangeDate: formDate,
      targetId: formTargetId || null,
      targetName: target ? `${target.firstName} ${target.lastName}` : null,
      reason: formReason,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-64 mt-1" /></div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-2.5"><Skeleton className="h-10 w-full" /></Card>
          ))}
        </div>
        <Card><Skeleton className="h-64 w-full" /></Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Shift Exchange</h1>
          <p className="text-xs text-muted-foreground">Manage and approve shift exchange requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Request Exchange
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-sm">Request Shift Exchange</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Requester *</Label>
                  <Select value={formRequesterId} onValueChange={setFormRequesterId}>
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
                    <Label className="text-xs">From Shift *</Label>
                    <Select value={formFromShift} onValueChange={setFormFromShift}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Current shift" /></SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">To Shift *</Label>
                    <Select value={formToShift} onValueChange={setFormToShift}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Desired shift" /></SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Exchange Date *</Label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Target Employee</Label>
                    <Select value={formTargetId} onValueChange={setFormTargetId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {employees?.filter(e => e.id !== formRequesterId).map((e) => (
                          <SelectItem key={e.id} value={e.id} className="text-xs">
                            {e.firstName} {e.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Reason *</Label>
                  <Textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} className="text-xs min-h-[60px]" placeholder="Why do you need this exchange?" />
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">{stats.totalPending ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-lg font-bold">{stats.totalApproved ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-lg font-bold">{stats.totalRejected ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <ArrowRightLeft className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{exchanges.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Exchange Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="pl-4">ID</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>From Shift</TableHead>
                  <TableHead>To Shift</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      No exchange requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  exchanges.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="pl-4 font-mono text-[10px] text-muted-foreground">{entry.id.slice(-6)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{entry.requesterName}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.requesterDept}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.fromShift}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.toShift}</TableCell>
                      <TableCell className="text-xs">{entry.targetName || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(entry.exchangeDate)}</TableCell>
                      <TableCell><StatusBadge status={entry.status} /></TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={entry.reason}>
                        {entry.reason}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {entry.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => approveMutation.mutate(entry.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectMutation.mutate(entry.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        )}
                        {entry.status === 'Rejected' && entry.rejectionReason && (
                          <span className="text-[10px] text-red-500" title={entry.rejectionReason}>
                            <AlertTriangle className="size-3 inline" />
                          </span>
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
    </div>
  )
}
