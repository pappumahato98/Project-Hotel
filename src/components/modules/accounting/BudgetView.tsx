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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, XCircle, Wallet, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react'
import { useState } from 'react'
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
  status: string
  notes?: string
}

interface BudgetStats {
  totalBudgeted: number
  totalActual: number
  variance: number
  byDepartment: Record<string, { budgeted: number; actual: number; variance: number }>
}

interface BudgetData {
  budgets: Budget[]
  stats: BudgetStats
}

// ── Status config ────────────────────────────────────────────
const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  Closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

export function BudgetView() {
  const queryClient = useQueryClient()
  const [fiscalYear, setFiscalYear] = useState('2025')
  const [department, setDepartment] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formFiscalYear, setFormFiscalYear] = useState('2025')
  const [formPeriod, setFormPeriod] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formAccount, setFormAccount] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Fetch budgets
  const { data, isLoading } = useQuery<BudgetData>({
    queryKey: ['budgets', fiscalYear, department],
    queryFn: () => apiFetch(`/api/budget?fiscalYear=${fiscalYear}${department ? `&department=${department}` : ''}`),
  })

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

  // Update mutation (close budget)
  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/budget', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Budget updated successfully')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setEditBudget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resetForm = () => {
    setFormName(''); setFormFiscalYear('2025'); setFormPeriod('')
    setFormDepartment(''); setFormAccount(''); setFormAmount(''); setFormNotes('')
  }

  const closeForm = () => {
    setCreateOpen(false); resetForm()
  }

  const openEdit = (b: Budget) => {
    setEditBudget(b)
    setFormName(b.name); setFormFiscalYear(b.fiscalYear); setFormPeriod(b.period)
    setFormDepartment(b.department || ''); setFormAccount(b.accountName || '')
    setFormAmount(String(b.budgetedAmount)); setFormNotes(b.notes || '')
  }

  const handleCreate = () => {
    if (!formName || !formAmount) {
      toast.error('Name and Budgeted Amount are required')
      return
    }
    createMutation.mutate({
      name: formName,
      fiscalYear: formFiscalYear,
      period: formPeriod || `${formFiscalYear}-FY`,
      department: formDepartment || undefined,
      accountId: undefined,
      accountName: formAccount || undefined,
      budgetedAmount: parseFloat(formAmount),
      notes: formNotes || undefined,
    })
  }

  const handleEdit = () => {
    if (!editBudget) return
    updateMutation.mutate({
      id: editBudget.id,
      name: formName,
      fiscalYear: formFiscalYear,
      period: formPeriod,
      department: formDepartment || undefined,
      accountName: formAccount || undefined,
      budgetedAmount: parseFloat(formAmount),
      notes: formNotes || undefined,
    })
  }

  const handleCloseBudget = (b: Budget) => {
    updateMutation.mutate({ id: b.id, status: 'Closed' })
  }

  // Unique departments from data
  const departments = data ? [...new Set(data.budgets.map(b => b.department).filter(Boolean) as string[])] : []
  const byDept = data?.stats.byDepartment ?? {}
  const maxDeptBudget = Math.max(...Object.values(byDept).map(d => d.budgeted), 1)

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Budget Management</h1>
          <p className="text-xs text-muted-foreground">Track and manage departmental budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">FY 2024</SelectItem>
              <SelectItem value="2025">FY 2025</SelectItem>
              <SelectItem value="2026">FY 2026</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={() => { resetForm(); setCreateOpen(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Create Budget
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-2.5"><Skeleton className="h-12 w-full" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Budgeted</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.stats.totalBudgeted ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Actual</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.stats.totalActual ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'rounded-full p-1.5',
                (data?.stats.variance ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {(data?.stats.variance ?? 0) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Variance</p>
                <p className={cn('text-sm font-semibold truncate', (data?.stats.variance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data?.stats.variance ?? 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Active Budgets</p>
                <p className="text-sm font-semibold truncate">{data?.budgets.filter(b => b.status === 'Active').length ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Department filter + variance chart */}
      <div className="grid md:grid-cols-3 gap-2">
        <div className="md:col-span-2">
          <Card className="p-2.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Budget vs Actual by Department</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Budgeted</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500" />Actual</span>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(byDept).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No department data</p>
              )}
              {Object.entries(byDept).map(([dept, vals]) => (
                <div key={dept}>
                  <p className="text-xs text-muted-foreground mb-1 truncate">{dept}</p>
                  <div className="flex gap-1 items-center">
                    <span className="text-xs w-24 text-right text-muted-foreground shrink-0">{formatNPR(vals.budgeted)}</span>
                    <div className="flex-1 flex gap-0.5 h-4">
                      <div
                        className="bg-emerald-500 h-full rounded-sm transition-all"
                        style={{ width: `${Math.max((vals.budgeted / maxDeptBudget) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-xs w-24 text-right text-muted-foreground shrink-0">{formatNPR(vals.actual)}</span>
                    <div className="flex-1 flex gap-0.5 h-4">
                      <div
                        className="bg-orange-500 h-full rounded-sm transition-all"
                        style={{ width: `${Math.max((vals.actual / maxDeptBudget) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="p-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Filter by Department</p>
          <Select value={department} onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Showing</span>
              <span className="font-medium">{data?.budgets.length ?? 0} budgets</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Under budget</span>
              <span className="font-medium text-green-600">
                {data?.budgets.filter(b => b.budgetedAmount > b.actualAmount).length ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Over budget</span>
              <span className="font-medium text-red-600">
                {data?.budgets.filter(b => b.actualAmount > b.budgetedAmount).length ?? 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Budgets table */}
      <Card className="p-2.5">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Name</TableHead>
                  <TableHead className="text-xs h-8">Period</TableHead>
                  <TableHead className="text-xs h-8">Department</TableHead>
                  <TableHead className="text-xs h-8 text-right">Budgeted</TableHead>
                  <TableHead className="text-xs h-8 text-right">Actual</TableHead>
                  <TableHead className="text-xs h-8 text-right">Variance</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.budgets.length) && (
                  <TableRow><TableCell colSpan={8} className="text-xs text-center text-muted-foreground py-6">No budgets found</TableCell></TableRow>
                )}
                {data?.budgets.map(b => {
                  const variance = b.budgetedAmount - b.actualAmount
                  const isOver = variance < 0
                  return (
                    <TableRow key={b.id} className="text-xs">
                      <TableCell className="font-medium py-1.5">{b.name}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{b.period}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{b.department || '—'}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(b.budgetedAmount)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(b.actualAmount)}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium', isOver ? 'text-red-600' : 'text-green-600')}>
                        {isOver ? '-' : ''}{formatNPR(Math.abs(variance))}
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

      {/* Create Budget Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Budget</DialogTitle>
            <DialogDescription className="text-xs">Add a new budget allocation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Name *</Label>
              <Input className="h-8 text-xs" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Room Revenue Budget" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fiscal Year</Label>
                <Select value={formFiscalYear} onValueChange={setFormFiscalYear}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">FY 2024</SelectItem>
                    <SelectItem value="2025">FY 2025</SelectItem>
                    <SelectItem value="2026">FY 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Period</Label>
                <Input className="h-8 text-xs" value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="2025-01 or 2025-Q1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Department</Label>
                <Input className="h-8 text-xs" value={formDepartment} onChange={e => setFormDepartment(e.target.value)} placeholder="Optional" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Account</Label>
                <Input className="h-8 text-xs" value={formAccount} onChange={e => setFormAccount(e.target.value)} placeholder="Optional" />
              </div>
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
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeForm}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editBudget} onOpenChange={() => setEditBudget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Budget</DialogTitle>
            <DialogDescription className="text-xs">Update budget allocation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-xs" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fiscal Year</Label>
                <Select value={formFiscalYear} onValueChange={setFormFiscalYear}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">FY 2024</SelectItem>
                    <SelectItem value="2025">FY 2025</SelectItem>
                    <SelectItem value="2026">FY 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Period</Label>
                <Input className="h-8 text-xs" value={formPeriod} onChange={e => setFormPeriod(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Department</Label>
                <Input className="h-8 text-xs" value={formDepartment} onChange={e => setFormDepartment(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Account</Label>
                <Input className="h-8 text-xs" value={formAccount} onChange={e => setFormAccount(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Budgeted Amount (NPR)</Label>
              <Input className="h-8 text-xs" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[60px]" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditBudget(null)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
