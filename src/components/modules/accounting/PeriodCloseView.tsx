'use client'

import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Lock, Unlock, CalendarDays, AlertTriangle, ShieldCheck, RefreshCw, FileText } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface AccountingPeriod {
  id: string
  period: string
  periodType: string
  startDate: string
  endDate: string
  status: 'open' | 'closed'
  notes?: string
  closedBy?: string
  closedAt?: string
  openingTrialBalance?: string
  postedEntryCount: number
  draftEntryCount: number
  createdAt: string
}

interface PeriodStats {
  total: number
  open: number
  closed: number
  latestOpenPeriod: AccountingPeriod | null
}

interface PeriodData {
  periods: AccountingPeriod[]
  stats: PeriodStats
}

// ── Config ───────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  closed: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
}

const typeLabels: Record<string, string> = {
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
}

export function PeriodCloseView() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [closeConfirm, setCloseConfirm] = useState<AccountingPeriod | null>(null)

  // Create form
  const [formPeriod, setFormPeriod] = useState('')
  const [formType, setFormType] = useState('month')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Fetch periods
  const { data, isLoading, error, refetch, isFetching } = useQuery<PeriodData>({
    queryKey: ['periods'],
    queryFn: () => apiFetch('/api/periods'),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Period opened successfully'); queryClient.invalidateQueries({ queryKey: ['periods'] }); closeCreateForm() },
    onError: (err: Error) => toast.error(err.message),
  })

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/periods', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Period closed successfully'); queryClient.invalidateQueries({ queryKey: ['periods'] }); setCloseConfirm(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const closeCreateForm = () => {
    setCreateOpen(false)
    setFormPeriod(''); setFormType('month'); setFormStartDate(''); setFormEndDate(''); setFormNotes('')
  }

  const handleCreate = () => {
    if (!formPeriod || !formStartDate || !formEndDate) { toast.error('Period, Start Date, and End Date are required'); return }
    createMutation.mutate({
      period: formPeriod,
      periodType: formType,
      startDate: formStartDate,
      endDate: formEndDate,
      notes: formNotes || undefined,
    })
  }

  const handleClose = () => {
    if (!closeConfirm) return
    closeMutation.mutate({ id: closeConfirm.id, action: 'close' })
  }

  // Auto-suggest period name based on type and start date
  const handleTypeChange = (type: string) => {
    setFormType(type)
    if (formStartDate && type === 'month') {
      const d = new Date(formStartDate)
      setFormPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    } else if (formStartDate && type === 'quarter') {
      const d = new Date(formStartDate)
      const q = Math.floor(d.getMonth() / 3) + 1
      setFormPeriod(`${d.getFullYear()}-Q${q}`)
    } else if (formStartDate && type === 'year') {
      const d = new Date(formStartDate)
      setFormPeriod(`${d.getFullYear()}`)
    }
  }

  const handleStartChange = (date: string) => {
    setFormStartDate(date)
    handleTypeChange(formType)
  }

  const stats = data?.stats

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Period Management</h1>
          <p className="text-xs text-muted-foreground">Month-end and year-end period closing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Open New Period
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>)}
        </div>
      ) : error ? (
        <Card className="p-4 flex items-center justify-between">
          <p className="text-xs text-red-500">Failed to load periods</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5"><CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Total Periods</p><p className="text-sm font-semibold truncate">{stats?.total ?? 0}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5"><Unlock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Open Periods</p><p className="text-sm font-semibold truncate text-green-600">{stats?.open ?? 0}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5"><Lock className="h-3.5 w-3.5 text-slate-500" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Closed Periods</p><p className="text-sm font-semibold truncate text-muted-foreground">{stats?.closed ?? 0}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-1.5"><ShieldCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Latest Open</p>
                <p className="text-sm font-semibold truncate">{stats?.latestOpenPeriod?.period ?? '—'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Period Calendar/List */}
      <Card className="p-3">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data?.periods.length ? (
          <div className="text-center py-8">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No accounting periods defined</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Open First Period
            </Button>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Period</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">Start Date</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">End Date</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Posted Entries</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Draft Entries</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Closed By</TableHead>
                  <TableHead className="text-xs h-8 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.periods.map(p => {
                  const isCurrent = stats?.latestOpenPeriod?.id === p.id
                  const hasDrafts = p.draftEntryCount > 0
                  return (
                    <TableRow key={p.id} className={cn('text-xs', isCurrent && p.status === 'open' && 'bg-green-50/50 dark:bg-green-950/10')}>
                      <TableCell className="font-medium py-1.5">
                        {p.period}
                        {isCurrent && p.status === 'open' && <span className="ml-1 text-[10px] text-green-600">(current)</span>}
                      </TableCell>
                      <TableCell className="py-1.5 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{typeLabels[p.periodType] ?? p.periodType}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{formatDateShort(p.startDate)}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{formatDateShort(p.endDate)}</TableCell>
                      <TableCell className="py-1.5 text-right hidden md:table-cell">{p.postedEntryCount}</TableCell>
                      <TableCell className={cn('py-1.5 text-right hidden md:table-cell', hasDrafts && p.status === 'open' && 'text-amber-600 font-medium')}>
                        {p.draftEntryCount}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', statusColors[p.status] ?? '')}>
                          {p.status === 'open' ? 'Open' : 'Closed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">
                        {p.closedBy || '—'}
                        {p.closedAt && <p className="text-[10px] text-muted-foreground/60">{formatDateShort(p.closedAt)}</p>}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {p.status === 'open' && (
                          <Button
                            size="sm"
                            variant={hasDrafts ? 'outline' : 'default'}
                            className={cn('h-6 text-xs', hasDrafts && 'text-amber-600 border-amber-300')}
                            onClick={() => setCloseConfirm(p)}
                          >
                            <Lock className="h-2.5 w-2.5 mr-1" />Close
                          </Button>
                        )}
                        {p.status === 'closed' && p.openingTrialBalance && (
                          <button className="p-1 rounded hover:bg-muted" title="View opening TB">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Audit Trail - Closed Periods History */}
      {data && data.periods.filter(p => p.status === 'closed').length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2">Audit Trail</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {data.periods.filter(p => p.status === 'closed').map(p => (
              <div key={p.id} className="flex justify-between text-xs py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{typeLabels[p.periodType]}</Badge>
                  <span className="font-medium">{p.period}</span>
                  <span className="text-muted-foreground">({formatDateShort(p.startDate)} — {formatDateShort(p.endDate)})</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{p.postedEntryCount} entries</span>
                  <span>by {p.closedBy || 'System'}</span>
                  <span>{p.closedAt ? formatDateShort(p.closedAt) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Open New Period</DialogTitle>
            <DialogDescription className="text-xs">Define a new accounting period for journal entry posting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={formType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Period Identifier *</Label>
                <Input className="h-7 text-xs" value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="e.g. 2025-08" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Start Date *</Label>
                <Input className="h-7 text-xs" type="date" value={formStartDate} onChange={e => handleStartChange(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">End Date *</Label>
                <Input className="h-7 text-xs" type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[50px]" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeCreateForm}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Open Period'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Period Confirmation Dialog */}
      <Dialog open={!!closeConfirm} onOpenChange={() => setCloseConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Close Period</DialogTitle>
            <DialogDescription className="text-xs">Confirm period closure</DialogDescription>
          </DialogHeader>
          {closeConfirm && (
            <div className="grid gap-3 py-2">
              {/* Warning for unposted entries */}
              {closeConfirm.draftEntryCount > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 rounded-md p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-amber-700 dark:text-amber-300">Unposted Entries Warning</p>
                    <p className="text-amber-600 dark:text-amber-400 mt-1">
                      This period has <strong>{closeConfirm.draftEntryCount} draft journal entries</strong>. It is recommended to post or void all draft entries before closing.
                    </p>
                  </div>
                </div>
              )}

              {/* Period summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Period: </span><span className="font-medium">{closeConfirm.period}</span></div>
                <div><span className="text-muted-foreground">Type: </span>{typeLabels[closeConfirm.periodType]}</div>
                <div><span className="text-muted-foreground">Start: </span>{formatDateShort(closeConfirm.startDate)}</div>
                <div><span className="text-muted-foreground">End: </span>{formatDateShort(closeConfirm.endDate)}</div>
                <div><span className="text-muted-foreground">Posted Entries: </span>{closeConfirm.postedEntryCount}</div>
                <div><span className="text-muted-foreground">Draft Entries: </span><span className={closeConfirm.draftEntryCount > 0 ? 'text-amber-600 font-medium' : ''}>{closeConfirm.draftEntryCount}</span></div>
              </div>

              <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 rounded-md p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  The system will verify the trial balance is balanced before closing. If the balance is off, the closure will be rejected.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCloseConfirm(null)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? 'Closing...' : 'Confirm Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
