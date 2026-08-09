'use client'

import { useState, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'
import { toast } from 'sonner'
import { AccountingError } from './AccountingErrorBoundary'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Search, X, Plus, MoreHorizontal, Pencil, Ban, CheckCircle2,
  Download, Printer, FileText, ChevronDown, ChevronRight, ArrowUpDown,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface AccountBalance {
  totalDebit: number
  totalCredit: number
  balance: number
}

interface Account {
  id: string
  code: string
  name: string
  type: string
  subtype?: string | null
  description?: string | null
  department?: string | null
  active: boolean
  createdAt: string
  _count: { journalLines: number }
}

interface AccountsResponse {
  accounts: Account[]
  grouped: Record<string, Account[]>
  balanceMap: Record<string, AccountBalance>
  typeBreakdown: Record<string, number>
  totalCount: number
}

interface StatementLine {
  id: string
  date: string
  entryId: string
  description: string
  reference?: string | null
  sourceModule?: string | null
  debit: number
  credit: number
  narration?: string | null
  balanceChange: number
  runningBalance: number
}

interface StatementResponse {
  account: { id: string; code: string; name: string; type: string }
  period: { startDate: string | null; endDate: string | null }
  openingBalance: number
  closingBalance: number
  totalDebits: number
  totalCredits: number
  lineCount: number
  lines: StatementLine[]
}

// ─── Constants ───────────────────────────────────────────────────
const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const

const TYPE_BADGE_CLASSES: Record<string, string> = {
  asset: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  liability: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  equity: 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  revenue: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  expense: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const TYPE_ORDER: Record<string, number> = {
  asset: 0,
  liability: 1,
  equity: 2,
  revenue: 3,
  expense: 4,
}

const SUBTYPES: Record<string, string[]> = {
  asset: ['current', 'non_current', 'cash', 'bank', 'receivable', 'inventory', 'fixed_asset', 'contra_asset', 'prepayment'],
  liability: ['current', 'non_current', 'payable', 'tax', 'advance', 'accrued', 'long_term_loan'],
  equity: ['equity_account', 'retained_earnings', 'share_capital'],
  revenue: ['room', 'food_beverage', 'spa', 'laundry', 'events', 'other_revenue'],
  expense: ['salary', 'cogs', 'utilities', 'maintenance', 'depreciation', 'marketing', 'admin', 'other_expense'],
}

// ─── Helpers ─────────────────────────────────────────────────────
function getAccountBalance(account: Account, balanceMap: Record<string, AccountBalance>): number {
  const b = balanceMap[account.id]
  if (!b) return 0
  // asset/expense: DR-CR; liability/equity/revenue: CR-DR
  if (account.type === 'asset' || account.type === 'expense') {
    return b.totalDebit - b.totalCredit
  }
  return b.totalCredit - b.totalDebit
}

function computeNextCode(accounts: Account[], type: string): string {
  const typeAccounts = accounts.filter((a) => a.type === type)
  if (typeAccounts.length === 0) {
    const prefixes: Record<string, string> = {
      asset: '1000', liability: '2000', equity: '3000', revenue: '4000', expense: '5000',
    }
    return prefixes[type] ?? '9999'
  }
  const maxCode = Math.max(...typeAccounts.map((a) => parseInt(a.code, 10) || 0))
  return String(maxCode + 1)
}
// ─── Component ───────────────────────────────────────────────────
export function LedgerView() {
  const queryClient = useQueryClient()

  // ── Chart of Accounts state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(ACCOUNT_TYPES)
  )
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // ── Account Statements state ──
  const [statementAccountId, setStatementAccountId] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Form state ──
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('')
  const [formSubtype, setFormSubtype] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formDescription, setFormDescription] = useState('')

  // ── Queries ──
  const { data, isLoading, error, refetch } = useQuery<AccountsResponse>({
    queryKey: ['accounts', filterType, searchQuery, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus) params.set('active', filterStatus)
      const qs = params.toString()
      return apiFetch<AccountsResponse>(`/api/accounts${qs ? `?${qs}` : ''}`)
    },
    staleTime: 30_000,
  })

  const { data: accountsForDropdown } = useQuery<Account[]>({
    queryKey: ['accounts-dropdown'],
    queryFn: () => apiFetch<{ accounts: Account[] }>('/api/accounts?active=true').then((r) => r.accounts),
    staleTime: 60_000,
  })

  const { data: statementData, isLoading: statementLoading, error: statementError, refetch: statementRefetch } = useQuery<StatementResponse>({
    queryKey: ['account-statement', statementAccountId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({ accountId: statementAccountId, startDate, endDate })
      return apiFetch<StatementResponse>(`/api/accounting/statement?${params}`)
    },
    enabled: !!statementAccountId,
    staleTime: 10_000,
  })

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      toast.success('Account created successfully')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-dropdown'] })
      resetForm()
      setShowAddDialog(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/accounts', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      toast.success('Account updated successfully')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-dropdown'] })
      setEditingAccount(null)
      setShowEditDialog(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/accounts?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Account deactivated')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-dropdown'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => apiFetch('/api/accounts', { method: 'PATCH', body: JSON.stringify({ id, active: true }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      toast.success('Account reactivated')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts-dropdown'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Derived data ──
  const accounts = data?.accounts ?? []
  const balanceMap = data?.balanceMap ?? {}
  const typeBreakdown = data?.typeBreakdown ?? {}
  const totalCount = data?.totalCount ?? 0

  // Unique departments from accounts
  const departments = useMemo(() => {
    const depts = new Set<string>()
    accounts.forEach((a) => { if (a.department) depts.add(a.department) })
    return Array.from(depts).sort()
  }, [accounts])

  // Client-side department filter
  const filteredAccounts = useMemo(() => {
    if (!filterDepartment) return accounts
    return accounts.filter((a) => a.department === filterDepartment)
  }, [accounts, filterDepartment])

  // Group filtered accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {}
    for (const a of filteredAccounts) {
      if (!groups[a.type]) groups[a.type] = []
      groups[a.type].push(a)
    }
    return groups
  }, [filteredAccounts])

  // ── Handlers ──
  function resetForm() {
    setFormCode('')
    setFormName('')
    setFormType('')
    setFormSubtype('')
    setFormDepartment('')
    setFormDescription('')
  }

  function openAddDialog() {
    resetForm()
    setShowAddDialog(true)
  }

  function handleTypeChange(newType: string) {
    setFormType(newType)
    setFormSubtype('')
    if (newType && accounts.length > 0) {
      setFormCode(computeNextCode(accounts, newType))
    }
  }

  function handleCreate() {
    if (!formCode.trim() || !formName.trim() || !formType) {
      toast.error('Code, name, and type are required')
      return
    }
    createMutation.mutate({
      code: formCode.trim(),
      name: formName.trim(),
      type: formType,
      subtype: formSubtype || null,
      department: formDepartment || null,
      description: formDescription || null,
    })
  }

  function openEditDialog(account: Account) {
    setEditingAccount(account)
    setFormCode(account.code)
    setFormName(account.name)
    setFormType(account.type)
    setFormSubtype(account.subtype ?? '')
    setFormDepartment(account.department ?? '')
    setFormDescription(account.description ?? '')
    setShowEditDialog(true)
  }

  function handleUpdate() {
    if (!editingAccount || !formName.trim()) {
      toast.error('Name is required')
      return
    }
    updateMutation.mutate({
      id: editingAccount.id,
      name: formName.trim(),
      subtype: formSubtype || null,
      department: formDepartment || null,
      description: formDescription || null,
    })
  }

  function toggleTypeExpand(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function exportStatementCSV() {
    if (!statementData) return
    const a = statementData.account
    const header = 'Date,Reference,Description,Narration,Debit,Credit,Balance\n'
    const rows = statementData.lines.map((l) => {
      const desc = (l.description || '').replace(/,/g, ';')
      const narration = (l.narration || '').replace(/,/g, ';')
      return `${formatDateShort(l.date)},${l.reference || ''},"${desc}","${narration}",${l.debit || ''},${l.credit || ''},${l.runningBalance}`
    }).join('\n')
    const csv = `Account: ${a.code} - ${a.name}\nPeriod: ${statementData.period.startDate || 'All'} to ${statementData.period.endDate || 'All'}\nOpening Balance: ${statementData.openingBalance}\n\n${header}${rows}\n\nClosing Balance: ${statementData.closingBalance}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statement-${a.code}-${startDate}-to-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Statement exported')
  }

  function handlePrint() {
    window.print()
  }

  const hasActiveFilters = searchQuery || filterType || filterDepartment || filterStatus

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">
            Chart of Accounts & General Ledger
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage accounts and view account statements
          </p>
        </div>
      </div>

      <Tabs defaultValue="chart" className="flex flex-col gap-2">
        <TabsList>
          <TabsTrigger value="chart" className="text-xs gap-1.5">
            <FileText className="size-3.5" /> Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="statements" className="text-xs gap-1.5">
            <ArrowUpDown className="size-3.5" /> Account Statements
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: Chart of Accounts
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="chart" className="flex flex-col gap-2">
          {/* KPI Cards */}
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-3"><Skeleton className="h-4 w-12 mb-1" /><Skeleton className="h-6 w-8" /></Card>
              ))
              : (
                <>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{totalCount}</p>
                  </Card>
                  {ACCOUNT_TYPES.map((t) => (
                    <Card key={t} className="p-3">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', TYPE_BADGE_CLASSES[t])}>
                        {TYPE_LABELS[t] ?? t}
                      </Badge>
                      <p className="text-lg font-bold mt-1">{typeBreakdown[t] ?? 0}</p>
                    </Card>
                  ))}
                </>
              )
            }
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('pl-9 h-7 text-xs', searchQuery && 'pr-7')}
              />
              {searchQuery && (
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors" onClick={() => setSearchQuery('')}>
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{TYPE_LABELS[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={(v) => setFilterDepartment(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <SelectValue placeholder="All Depts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSearchQuery(''); setFilterType(''); setFilterDepartment(''); setFilterStatus('') }}>
                <X className="size-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs ml-auto" onClick={openAddDialog}>
              <Plus className="size-3.5 mr-1" /> Add Account
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <AccountingError error={error} onRetry={() => refetch()} title="Failed to load accounts" />
          )}

          {/* Accounts Table — grouped by type */}
          {!error && (
            <Card className="py-0">
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Subtype</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Department</TableHead>
                        <TableHead className="text-xs text-right">Balance</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-center hidden sm:table-cell">Lines</TableHead>
                        <TableHead className="text-xs w-10">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 10 }).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-[60px]" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                        : filteredAccounts.length === 0
                          ? (
                            <TableRow>
                              <TableCell colSpan={10} className="h-32 text-center">
                                <p className="text-sm text-muted-foreground">No accounts found</p>
                                <Button variant="link" size="sm" className="text-xs" onClick={openAddDialog}>
                                  Add your first account
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                          : ACCOUNT_TYPES.map((type) => {
                            const group = groupedAccounts[type]
                            if (!group || group.length === 0) return null
                            const isExpanded = expandedTypes.has(type)
                            return (
                              <Fragment key={type}>
                                {/* Type group header row */}
                                <TableRow
                                  className="cursor-pointer hover:bg-muted/50 bg-muted/20"
                                  onClick={() => toggleTypeExpand(type)}
                                >
                                  <TableCell className="w-8">
                                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                  </TableCell>
                                  <TableCell colSpan={9} className="font-semibold text-xs">
                                    <Badge variant="outline" className={cn('mr-2', TYPE_BADGE_CLASSES[type])}>
                                      {TYPE_LABELS[type] ?? type}
                                    </Badge>
                                    <span className="text-muted-foreground font-normal">({group.length} account{group.length !== 1 ? 's' : ''})</span>
                                  </TableCell>
                                </TableRow>
                                {/* Account rows */}
                                {isExpanded && group.map((account) => {
                                  const balance = getAccountBalance(account, balanceMap)
                                  const bal = balanceMap[account.id]
                                  return (
                                    <TableRow key={account.id} className={!account.active ? 'opacity-50' : ''}>
                                      <TableCell />
                                      <TableCell className="font-mono text-xs">{account.code}</TableCell>
                                      <TableCell className="font-medium text-xs">{account.name}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', TYPE_BADGE_CLASSES[account.type])}>
                                          <span className="capitalize">{account.type}</span>
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell capitalize">
                                        {account.subtype ? account.subtype.replace(/_/g, ' ') : '—'}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                                        {account.department || '—'}
                                      </TableCell>
                                      <TableCell className="text-xs text-right font-mono">
                                        <div className={cn(balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                                          {formatNPR(Math.abs(balance))}
                                          {balance < 0 && <span className="text-[10px] ml-0.5">DR</span>}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className={cn(
                                          'text-[10px] px-1.5 py-0',
                                          account.active
                                            ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                                            : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                                        )}>
                                          {account.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs text-center hidden sm:table-cell">
                                        {account._count.journalLines}
                                      </TableCell>
                                      <TableCell>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                              <MoreHorizontal className="size-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(account)}>
                                              <Pencil className="size-3.5 mr-2" /> Edit
                                            </DropdownMenuItem>
                                            {account.active ? (
                                              <DropdownMenuItem onClick={() => deleteMutation.mutate(account.id)}>
                                                <Ban className="size-3.5 mr-2" /> Deactivate
                                              </DropdownMenuItem>
                                            ) : (
                                              <DropdownMenuItem onClick={() => reactivateMutation.mutate(account.id)}>
                                                <CheckCircle2 className="size-3.5 mr-2" /> Reactivate
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </Fragment>
                            )
                          })
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: Account Statements
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="statements" className="flex flex-col gap-2">
          {/* Selector Bar */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Account</Label>
              <Select value={statementAccountId} onValueChange={setStatementAccountId}>
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {(accountsForDropdown ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-[150px]"
              />
            </div>
            <div className="flex gap-1.5 ml-auto">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportStatementCSV} disabled={!statementData || statementData.lines.length === 0}>
                <Download className="size-3.5 mr-1" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handlePrint} disabled={!statementData}>
                <Printer className="size-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>

          {/* Statement Content */}
          {!statementAccountId
            ? (
              <Card className="p-12 text-center">
                <FileText className="size-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Select an account to view its statement</p>
              </Card>
            )
            : statementLoading
              ? (
                <Card className="p-6 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-2 mt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </Card>
              )
              : statementError
                ? (
                  <AccountingError error={statementError} onRetry={() => statementRefetch()} title="Failed to load statement" />
                )
                : statementData && (
                  <Card className="print:shadow-none print:border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {statementData.account.code} — {statementData.account.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Period: {statementData.period.startDate || 'Beginning'} to {statementData.period.endDate || 'Present'}
                        {' · '}
                        <span className="capitalize">{statementData.account.type}</span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Balance Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-md border p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opening Balance</p>
                          <p className={cn('text-sm font-semibold font-mono', statementData.openingBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                            {formatNPR(statementData.openingBalance)}
                          </p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Debits</p>
                          <p className="text-sm font-semibold font-mono">{formatNPR(statementData.totalDebits)}</p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Credits</p>
                          <p className="text-sm font-semibold font-mono">{formatNPR(statementData.totalCredits)}</p>
                        </div>
                        <div className="rounded-md border p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Closing Balance</p>
                          <p className={cn('text-sm font-semibold font-mono', statementData.closingBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                            {formatNPR(statementData.closingBalance)}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Lines Table */}
                      {statementData.lines.length === 0
                        ? (
                          <div className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">No transactions found for this period</p>
                          </div>
                        )
                        : (
                          <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
                                <TableRow>
                                  <TableHead className="text-xs">Date</TableHead>
                                  <TableHead className="text-xs">Reference</TableHead>
                                  <TableHead className="text-xs">Description</TableHead>
                                  <TableHead className="text-xs text-right">Debit</TableHead>
                                  <TableHead className="text-xs text-right">Credit</TableHead>
                                  <TableHead className="text-xs text-right">Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {statementData.lines.map((line) => (
                                  <TableRow key={line.id}>
                                    <TableCell className="text-xs whitespace-nowrap">{formatDateShort(line.date)}</TableCell>
                                    <TableCell className="text-xs font-mono whitespace-nowrap">{line.reference || '—'}</TableCell>
                                    <TableCell className="text-xs">
                                      <div>{line.description}</div>
                                      {line.narration && (
                                        <div className="text-muted-foreground text-[10px] mt-0.5">{line.narration}</div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-mono">
                                      {line.debit > 0 ? formatNPR(line.debit) : ''}
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-mono">
                                      {line.credit > 0 ? formatNPR(line.credit) : ''}
                                    </TableCell>
                                    <TableCell className={cn(
                                      'text-xs text-right font-mono font-medium',
                                      line.runningBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                                    )}>
                                      {formatNPR(line.runningBalance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )
                      }

                      {/* Footer totals */}
                      {statementData.lines.length > 0 && (
                        <>
                          <Separator />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{statementData.lineCount} transaction{statementData.lineCount !== 1 ? 's' : ''}</span>
                            <span>
                              Net: {formatNPR(statementData.totalDebits - statementData.totalCredits)}
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
          }
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          ADD ACCOUNT DIALOG
         ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add New Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Account Type *</Label>
              <Select value={formType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{TYPE_LABELS[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Account Code *</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. 1010" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Subtype</Label>
                <Select value={formSubtype} onValueChange={setFormSubtype} disabled={!formType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(SUBTYPES[formType] ?? []).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Account Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Cash on Hand" className="h-8 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="e.g. Front Office" className="h-8 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          EDIT ACCOUNT DIALOG
         ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Code</Label>
                <Input value={formCode} disabled className="h-8 text-xs bg-muted" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Type</Label>
                <Input value={formType} disabled className="h-8 text-xs bg-muted capitalize" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Subtype</Label>
                <Select value={formSubtype} onValueChange={setFormSubtype}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(SUBTYPES[formType] ?? []).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Department</Label>
                <Input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Account Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
