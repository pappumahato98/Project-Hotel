'use client'

import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { AccountingError } from './AccountingErrorBoundary'
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
import {
  Plus, Pencil, XCircle, Wallet, TrendingDown, TrendingUp, RefreshCw, Search,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatNPR, cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface Budget {
  id: string
  name: string
  fiscalYear: string
  period: string
  accountId?: string
  accountName?: string
  accountCode?: string
  department?: string
  budgetedAmount: number
  actualAmount: number
  variance: number
  variancePct: number
  isOverBudget?: boolean
  isUnderRevenue?: boolean
  status: string
  notes?: string
}

interface BudgetStats {
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  totalVariancePct: number
  totalBudgets: number
  byDepartment: Record<string, { budgeted: number; actual: number; variance: number; variancePct: number; count: number }>
  byFiscalYear: Record<string, { budgeted: number; actual: number; variance: number; count: number }>
}

interface BudgetData {
  budgets: Budget[]
  stats: BudgetStats
}

interface LedgerAccount {
  id: string
  code: string
  name: string
  type: string
  active: boolean
}

// ── Status config ────────────────────────────────────────────
const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  Closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

// ── Period months ────────────────────────────────────────────
const periodMonths = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, '0')
  return { value: `2025-${m}`, label: new Date(2025, i).toLocaleString('en', { month: 'long', year: 'numeric' }) }
})

export function BudgetView() {
  const queryClient = useQueryClient()
  const [fiscalYear, setFiscalYear] = useState('2025')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Form state
  const [formName, setFormName] = useState('')
  const [formFiscalYear, setFormFiscalYear] = useState('2025')
  const [formPeriod, setFormPeriod] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formAccountId, setFormAccountId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [accountSearch, setAccountSearch] = useState('')

  // Fetch budgets
  const params = new URLSearchParams()
  if (fiscalYear) params.set('fiscalYear', fiscalYear)
  if (department) params.set('department', department)
  if (statusFilter) params.set('status', statusFilter)

  const { data, isLoading, error, refetch, isFetching } = useQuery<BudgetData>({
    queryKey: ['budgets', fiscalYear, department, statusFilter],
    queryFn: () => apiFetch(`/api/budget?${params.toString()}`),
  })

  // Fetch accounts for searchable select
  const { data: accountsData } = useQuery<{ accounts: LedgerAccount[] }>({
    queryKey: ['accounts-list'],
    queryFn: () => apiFetch('/api/accounts?active=true&limit=500'),
  })

  const accounts = accountsData?.accounts ?? []

  // Filtered accounts for search
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts.slice(0, 50)
    const q = accountSearch.toLowerCase()
    return accounts.filter(a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 50)
  }, [accounts, accountSearch])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/budget', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Budget created successfully')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      closeForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/budget', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Budget updated successfully')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setEditBudget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Update Actuals mutation
  const updateActualsMutation = useMutation({
    mutationFn: (ids: string[]) => apiFetch('/api/budget', { method: 'PATCH', body: JSON.stringify({ action: 'update_actuals', ids }) }),
    onSuccess: () => {
      toast.success('Actuals updated successfully')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setSelectedIds(new Set())
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resetForm = () => {
    setFormName(''); setFormFiscalYear('2025'); setFormPeriod('')
    setFormDepartment(''); setFormAccountId(''); setFormAmount('');
    setFormNotes(''); setAccountSearch('')
  }

  const closeForm = () => { setCreateOpen(false); resetForm() }

  const openEdit = (b: Budget) => {
    setEditBudget(b)
    setFormName(b.name); setFormFiscalYear(b.fiscalYear); setFormPeriod(b.period)
    setFormDepartment(b.department || ''); setFormAccountId(b.accountId || '')
    setFormAmount(String(b.budgetedAmount)); setFormNotes(b.notes || '')
  }

  const handleCreate = () => {
    if (!formName || !formAmount || !formPeriod) {
      toast.error('Name, Period, and Budgeted Amount are required')
      return
    }
    const acct = accounts.find(a => a.id === formAccountId)
    createMutation.mutate({
      name: formName,
      fiscalYear: formFiscalYear,
      period: formPeriod,
      department: formDepartment || undefined,
      accountId: formAccountId || undefined,
      accountName: acct?.name || undefined,
      accountCode: acct?.code || undefined,
      budgetedAmount: parseFloat(formAmount),
      notes: formNotes || undefined,
    })
  }

  const handleEdit = () => {
    if (!editBudget) return
    const acct = accounts.find(a => a.id === formAccountId)
    updateMutation.mutate({
      id: editBudget.id,
      name: formName,
      fiscalYear: formFiscalYear,
      period: formPeriod,
      department: formDepartment || undefined,
      accountId: formAccountId || undefined,
      accountName: acct?.name || undefined,
      accountCode: acct?.code || undefined,
      budgetedAmount: parseFloat(formAmount),
      notes: formNotes || undefined,
    })
  }

  const handleCloseBudget = (b: Budget) => {
    updateMutation.mutate({ id: b.id, status: 'Closed' })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selectedIds.size === data.budgets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.budgets.map(b => b.id)))
    }
  }

  // Variance color logic
  const isFavorable = (b: Budget) => {
    if (b.variance <= 0) return true // under budget for expenses
    // For revenue accounts (4xxx), positive variance is favorable
    return b.accountCode?.startsWith('4') ? true : false
  }

  // Unique departments from data
  const departments = data ? [...new Set(data.budgets.map(b => b.department).filter(Boolean) as string[])] : []
  const stats = data?.stats
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Budget Management</h1>
          <p className="text-xs text-muted-foreground">Track and manage departmental budgets with variance analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => { resetForm(); setCreateOpen(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Create Budget
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={fiscalYear} onValueChange={setFiscalYear}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={String(currentYear - 1)}>{`FY ${currentYear - 1}`}</SelectItem>
            <SelectItem value={String(currentYear)}>{`FY ${currentYear}`}</SelectItem>
            <SelectItem value={String(currentYear + 1)}>{`FY ${currentYear + 1}`}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={department || 'all'} onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateActualsMutation.mutate([...selectedIds])} disabled={updateActualsMutation.isPending}>
            <RefreshCw className={cn('h-3 w-3 mr-1', updateActualsMutation.isPending && 'animate-spin')} />
            Update Actuals ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : error ? (
        <AccountingError error={error} onRetry={() => refetch()} title="Failed to load budgets" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Budgeted</p>
                <p className="text-sm font-semibold truncate">{formatNPR(stats?.totalBudgeted ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Actual</p>
                <p className="text-sm font-semibold truncate">{formatNPR(stats?.totalActual ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-1.5', (stats?.totalVariance ?? 0) <= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                {(stats?.totalVariance ?? 0) <= 0
                  ? <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Variance</p>
                <p className={cn('text-sm font-semibold truncate', (stats?.totalVariance ?? 0) <= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(stats?.totalVariance ?? 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-1.5', Math.abs(stats?.totalVariancePct ?? 0) <= 10 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
                <Wallet className={cn('h-3.5 w-3.5', Math.abs(stats?.totalVariancePct ?? 0) <= 10 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Variance %</p>
                <p className={cn('text-sm font-semibold truncate', Math.abs(stats?.totalVariancePct ?? 0) <= 10 ? 'text-green-600' : 'text-amber-600')}>
                  {(stats?.totalVariancePct ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Budgets table */}
      <Card className="p-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !data?.budgets.length ? (
          <div className="text-center py-8">
            <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No budgets found for the selected filters</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => { resetForm(); setCreateOpen(true) }}>
              <Plus className="h-3 w-3 mr-1" />Create First Budget
            </Button>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8 w-8">
                    <input type="checkbox" checked={selectedIds.size === data.budgets.length && data.budgets.length > 0} onChange={toggleSelectAll} className="rounded" />
                  </TableHead>
                  <TableHead className="text-xs h-8">Name</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">FY</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">Period</TableHead>
                  <TableHead className="text-xs h-8 hidden xl:table-cell">Account</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Dept</TableHead>
                  <TableHead className="text-xs h-8 text-right">Budgeted</TableHead>
                  <TableHead className="text-xs h-8 text-right">Actual</TableHead>
                  <TableHead className="text-xs h-8 text-right">Variance</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Var %</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.budgets.map(b => {
                  const favorable = isFavorable(b)
                  return (
                    <TableRow key={b.id} className="text-xs">
                      <TableCell className="py-1.5">
                        <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="rounded" />
                      </TableCell>
                      <TableCell className="font-medium py-1.5">{b.name}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">{b.fiscalYear}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{b.period}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden xl:table-cell">
                        {b.accountCode ? `${b.accountCode} - ${b.accountName || ''}` : '—'}
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">{b.department || '—'}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(b.budgetedAmount)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(b.actualAmount)}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium', favorable ? 'text-green-600' : 'text-red-600')}>
                        {b.variance >= 0 ? '+' : ''}{formatNPR(b.variance)}
                      </TableCell>
                      <TableCell className={cn('py-1.5 text-right hidden md:table-cell', Math.abs(b.variancePct) <= 10 ? 'text-green-600' : 'text-red-600')}>
                        {b.variancePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', statusColors[b.status] ?? '')}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-1">
                          {b.status === 'Active' && (
                            <button onClick={() => openEdit(b)} className="p-1 rounded hover:bg-muted" title="Edit">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                          {b.status === 'Active' && (
                            <button onClick={() => handleCloseBudget(b)} className="p-1 rounded hover:bg-muted" title="Close">
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create/Edit Budget Dialog */}
      <Dialog open={createOpen || !!editBudget} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditBudget(null); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editBudget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
            <DialogDescription className="text-xs">{editBudget ? 'Update budget allocation' : 'Add a new budget allocation'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Name *</Label>
              <Input className="h-8 text-xs" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Room Revenue Budget" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fiscal Year *</Label>
                <Select value={formFiscalYear} onValueChange={setFormFiscalYear}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(currentYear)}>{`FY ${currentYear}`}</SelectItem>
                    <SelectItem value={String(currentYear + 1)}>{`FY ${currentYear + 1}`}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Period *</Label>
                <Select value={formPeriod} onValueChange={setFormPeriod}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select period" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {periodMonths.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Account (optional)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search account by code or name..."
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                />
              </div>
              {accountSearch && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {filteredAccounts.length === 0 && <p className="text-xs text-muted-foreground p-2">No accounts found</p>}
                  {filteredAccounts.slice(0, 10).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={cn('w-full text-left text-xs px-2 py-1.5 hover:bg-muted flex items-center gap-2', formAccountId === a.id && 'bg-muted')}
                      onClick={() => { setFormAccountId(a.id); setAccountSearch(a.code) }}
                    >
                      <span className="font-mono text-muted-foreground">{a.code}</span>
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {formAccountId && !accountSearch && (
                <Badge variant="outline" className="text-xs">
                  {accounts.find(a => a.id === formAccountId)?.code} — {accounts.find(a => a.id === formAccountId)?.name}
                  <button onClick={() => setFormAccountId('')} className="ml-1 hover:text-red-500">×</button>
                </Badge>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Department</Label>
              <Input className="h-8 text-xs" value={formDepartment} onChange={e => setFormDepartment(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Budgeted Amount (NPR) *</Label>
              <Input className="h-8 text-xs" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[60px]" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setCreateOpen(false); setEditBudget(null); resetForm() }}>Cancel</Button>
            {editBudget ? (
              <Button size="sm" className="h-7 text-xs" onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
