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
import { Plus, RefreshCw, CheckCircle2, AlertTriangle, Clock, Landmark, Eye, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface RecAccount {
  id: string
  code: string
  name: string
  type: string
  subtype?: string
}

interface Reconciliation {
  id: string
  accountId?: string
  accountName?: string
  accountCode?: string
  account?: RecAccount
  bankName?: string
  statementDate: string
  statementBalance: number
  bookBalance: number
  difference: number
  status: 'pending' | 'reconciled' | 'discrepancy'
 notes?: string
  adjustments?: string
  reconciledBy?: string
  reconciledAt?: string
  createdAt: string
}

interface ReconciliationStats {
  total: number
  pending: number
  reconciled: number
  discrepancy: number
  totalDiscrepancy: number
}

interface RecData {
  reconciliations: Reconciliation[]
  stats: ReconciliationStats
}

// ── Config ───────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  reconciled: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  discrepancy: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  reconciled: 'Reconciled',
  discrepancy: 'Discrepancy',
}

interface AdjustmentItem {
  description: string
  amount: string
}

export function ReconciliationView() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [accountIdFilter, setAccountIdFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewRec, setViewRec] = useState<Reconciliation | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Create form
  const [formAccountId, setFormAccountId] = useState('')
  const [formBankName, setFormBankName] = useState('')
  const [formStatementDate, setFormStatementDate] = useState(new Date().toISOString().split('T')[0])
  const [formStatementBalance, setFormStatementBalance] = useState('')

  // View/Edit form
  const [editNotes, setEditNotes] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editStatementBalance, setEditStatementBalance] = useState('')
  const [adjustmentDesc, setAdjustmentDesc] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')

  // Fetch reconciliations
  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (accountIdFilter) params.set('accountId', accountIdFilter)

  const { data, isLoading, error, refetch, isFetching } = useQuery<RecData>({
    queryKey: ['reconciliations', statusFilter, accountIdFilter],
    queryFn: () => apiFetch(`/api/reconciliation?${params.toString()}`),
  })

  // Fetch accounts for dropdown
  const { data: accountsData } = useQuery<{ accounts: RecAccount[] }>({
    queryKey: ['accounts-rec'],
    queryFn: () => apiFetch('/api/accounts?active=true&limit=200'),
  })
  const accounts = accountsData?.accounts ?? []
  const bankLikeAccounts = useMemo(() => accounts.filter(a => a.type === 'asset' && a.code.startsWith('1')), [accounts])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/reconciliation', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Reconciliation created'); queryClient.invalidateQueries({ queryKey: ['reconciliations'] }); closeCreateForm() },
    onError: (err: Error) => toast.error(err.message),
  })

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/reconciliation', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Reconciliation completed'); queryClient.invalidateQueries({ queryKey: ['reconciliations'] }); setViewRec(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const closeCreateForm = () => {
    setCreateOpen(false)
    setFormAccountId(''); setFormBankName(''); setFormStatementDate(new Date().toISOString().split('T')[0]); setFormStatementBalance('')
  }

  const handleCreate = () => {
    if (!formAccountId || !formStatementBalance) { toast.error('Account and Statement Balance are required'); return }
    createMutation.mutate({
      accountId: formAccountId,
      bankName: formBankName || undefined,
      statementDate: formStatementDate,
      statementBalance: parseFloat(formStatementBalance),
    })
  }

  const handleOpenView = (rec: Reconciliation) => {
    setViewRec(rec)
    setEditNotes(rec.notes || '')
    setEditBankName(rec.bankName || '')
    setEditStatementBalance(String(rec.statementBalance))
  }

  const handleAddAdjustment = () => {
    if (!adjustmentDesc || !adjustmentAmount) { toast.error('Description and amount required'); return }
    if (!viewRec) return
    let existing: AdjustmentItem[] = []
    try { existing = viewRec.adjustments ? JSON.parse(viewRec.adjustments) : [] } catch { /* empty */ }
    const newAdj = [...existing, { description: adjustmentDesc, amount: adjustmentAmount }]
    completeMutation.mutate({
      id: viewRec.id,
      adjustments: newAdj,
      bankName: editBankName || undefined,
      notes: editNotes || undefined,
      statementBalance: parseFloat(editStatementBalance) || undefined,
    })
    setAdjustmentDesc(''); setAdjustmentAmount('')
  }

  const handleMarkComplete = () => {
    if (!viewRec) return
    let existing: AdjustmentItem[] = []
    try { existing = viewRec.adjustments ? JSON.parse(viewRec.adjustments) : [] } catch { /* empty */ }
    completeMutation.mutate({
      id: viewRec.id,
      action: 'complete',
      adjustments: existing.length > 0 ? existing : undefined,
      bankName: editBankName || undefined,
      statementBalance: parseFloat(editStatementBalance) || undefined,
    })
  }

  const toggleRow = (_id: string) => {
    // unused, kept for potential expandable rows
  }

  const stats = data?.stats

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Bank Reconciliation</h1>
          <p className="text-xs text-muted-foreground">Reconcile bank statements with book balances</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => { setFormStatementDate(new Date().toISOString().split('T')[0]); setCreateOpen(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />New Reconciliation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="discrepancy">Discrepancy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountIdFilter || 'all'} onValueChange={(v) => setAccountIdFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="All Accounts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {bankLikeAccounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>)}
        </div>
      ) : error ? (
        <Card className="p-4 flex items-center justify-between">
          <p className="text-xs text-red-500">Failed to load reconciliations</p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Reconciled</p><p className="text-sm font-semibold truncate text-green-600">{stats?.reconciled ?? 0}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5"><Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Pending</p><p className="text-sm font-semibold truncate text-amber-600">{stats?.pending ?? 0}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Discrepancies</p>
                <p className="text-sm font-semibold truncate text-red-600">{stats?.discrepancy ?? 0}</p>
                {stats && stats.totalDiscrepancy > 0 && <p className="text-[10px] text-red-400 truncate">{formatNPR(stats.totalDiscrepancy)}</p>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Reconciliations Table */}
      <Card className="p-3">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data?.reconciliations.length ? (
          <div className="text-center py-8">
            <Landmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No reconciliations found</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Create First Reconciliation
            </Button>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Account</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Bank</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">Statement Date</TableHead>
                  <TableHead className="text-xs h-8 text-right">Statement Bal</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Book Bal</TableHead>
                  <TableHead className="text-xs h-8 text-right">Difference</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reconciliations.map(rec => (
                  <TableRow key={rec.id} className="text-xs">
                    <TableCell className="font-medium py-1.5">{rec.accountCode || '—'} {rec.accountName || ''}</TableCell>
                    <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">{rec.bankName || rec.accountName || '—'}</TableCell>
                    <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{formatDateShort(rec.statementDate)}</TableCell>
                    <TableCell className="py-1.5 text-right">{formatNPR(rec.statementBalance)}</TableCell>
                    <TableCell className="py-1.5 text-right hidden md:table-cell">{formatNPR(rec.bookBalance)}</TableCell>
                    <TableCell className={cn('py-1.5 text-right font-medium', Math.abs(rec.difference) < 0.01 ? 'text-green-600' : 'text-red-600')}>
                      {formatNPR(rec.difference)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={cn('text-xs', statusColors[rec.status] ?? '')}>{statusLabels[rec.status] ?? rec.status}</Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <button onClick={() => handleOpenView(rec)} className="p-1 rounded hover:bg-muted" title="View">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Reconciliation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">New Reconciliation</DialogTitle>
            <DialogDescription className="text-xs">Select account and enter bank statement details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Account *</Label>
              <Select value={formAccountId} onValueChange={setFormAccountId}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {bankLikeAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Bank Name</Label>
              <Input className="h-8 text-xs" value={formBankName} onChange={e => setFormBankName(e.target.value)} placeholder="e.g. Nabil Bank" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Statement Date *</Label>
                <Input className="h-8 text-xs" type="date" value={formStatementDate} onChange={e => setFormStatementDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Statement Balance (NPR) *</Label>
                <Input className="h-8 text-xs" type="number" value={formStatementBalance} onChange={e => setFormStatementBalance(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeCreateForm}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Reconciliation Dialog */}
      <Dialog open={!!viewRec} onOpenChange={() => setViewRec(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Reconciliation — {viewRec?.bankName || viewRec?.accountName}</DialogTitle>
            <DialogDescription className="text-xs flex items-center gap-2">
              {viewRec && <Badge variant="outline" className={cn('text-xs', statusColors[viewRec.status] ?? '')}>{statusLabels[viewRec.status]}</Badge>}
              <span>{viewRec ? formatDateShort(viewRec.statementDate) : ''}</span>
            </DialogDescription>
          </DialogHeader>
          {viewRec && (
            <div className="grid gap-3 py-2">
              {/* Balance Summary */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Card className="p-2 text-center">
                  <p className="text-muted-foreground">Statement</p>
                  <p className="font-semibold">{formatNPR(viewRec.statementBalance)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-muted-foreground">Book</p>
                  <p className="font-semibold">{formatNPR(viewRec.bookBalance)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-muted-foreground">Difference</p>
                  <p className={cn('font-semibold', Math.abs(viewRec.difference) < 0.01 ? 'text-green-600' : 'text-red-600')}>
                    {formatNPR(viewRec.difference)}
                  </p>
                </Card>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Bank Name</Label>
                  <Input className="h-8 text-xs" value={editBankName} onChange={e => setEditBankName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Statement Balance</Label>
                  <Input className="h-8 text-xs" type="number" value={editStatementBalance} onChange={e => setEditStatementBalance(e.target.value)} />
                </div>
              </div>

              {/* Existing Adjustments */}
              {viewRec.adjustments && (() => {
                try {
                  const adj: AdjustmentItem[] = JSON.parse(viewRec.adjustments)
                  if (adj.length === 0) return null
                  return (
                    <div>
                      <p className="text-xs font-medium mb-1">Adjustments</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {adj.map((a, idx) => (
                          <div key={idx} className="flex justify-between text-xs bg-muted/50 rounded px-2 py-1">
                            <span>{a.description}</span>
                            <span className="font-medium">{formatNPR(parseFloat(a.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}

              {/* Add Adjustment (only for pending/discrepancy) */}
              {viewRec.status !== 'reconciled' && (
                <div>
                  <p className="text-xs font-medium mb-2">Add Adjustment</p>
                  <div className="flex gap-2">
                    <Input className="h-7 text-xs flex-1" placeholder="Description" value={adjustmentDesc} onChange={e => setAdjustmentDesc(e.target.value)} />
                    <Input className="h-7 text-xs w-24" type="number" placeholder="Amount" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} />
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddAdjustment} disabled={completeMutation.isPending}>Add</Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea className="text-xs min-h-[50px]" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>

              {/* Audit info */}
              {viewRec.reconciledAt && (
                <p className="text-[10px] text-muted-foreground">
                  Reconciled by {viewRec.reconciledBy || 'System'} at {formatDateShort(viewRec.reconciledAt)}
                </p>
              )}

              {/* Actions */}
              {viewRec.status !== 'reconciled' && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                    completeMutation.mutate({ id: viewRec.id, notes: editNotes || undefined, bankName: editBankName || undefined, statementBalance: parseFloat(editStatementBalance) || undefined })
                  }} disabled={completeMutation.isPending}>
                    Save Changes
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleMarkComplete} disabled={completeMutation.isPending}>
                    {completeMutation.isPending ? 'Processing...' : 'Mark as Complete'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
