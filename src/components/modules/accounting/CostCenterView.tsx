'use client'

import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus, Pencil, RefreshCw, Search, Building2, FolderTree,
  Wallet, Activity, IndianRupee, ArrowRightLeft,
} from 'lucide-react'
import { formatNPR, cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface CostCenter {
  id: string
  code: string
  name: string
  type: string
  parentId?: string
  department?: string
  budgetAllocated: number
  budgetUsed: number
  active: boolean
  utilizationPct: number
  allocations?: CostAllocationItem[]
}

interface CostAllocationItem {
  id: string
  costCenterId: string
  account?: string
  amount: number
  date: string
  sourceType?: string
  description?: string
  costCenter?: { id: string; code: string; name: string }
}

interface CostCenterStats {
  totalCenters: number
  totalBudgetAllocated: number
  totalBudgetUsed: number
  activeCount: number
}

interface CostAllocationStats {
  totalAmount: number
  totalAllocations: number
  bySourceType: Record<string, number>
}

interface CostCenterData {
  centers: CostCenter[]
  stats: CostCenterStats
}

interface CostAllocationData {
  allocations: CostAllocationItem[]
  stats: CostAllocationStats
}

// ── Utilization color logic ───────────────────────────────────
function utilizationColor(pct: number): string {
  if (pct > 90) return 'text-red-600'
  if (pct > 70) return 'text-amber-600'
  return 'text-green-600'
}

function utilizationBarClass(pct: number): string {
  if (pct > 90) return '[&>div]:bg-red-500'
  if (pct > 70) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-green-500'
}

// ── Type badge config ─────────────────────────────────────────
const typeConfig: Record<string, { label: string; className: string }> = {
  department: {
    label: 'Dept',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  project: {
    label: 'Project',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  property: {
    label: 'Property',
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  },
  activity: {
    label: 'Activity',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
}

const sourceTypeLabels: Record<string, string> = {
  journal: 'Journal',
  invoice: 'Invoice',
  payroll: 'Payroll',
  manual: 'Manual',
}

// ── Component ────────────────────────────────────────────────
export function CostCenterView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('centers')

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Cost Center form
  const [ccDialogOpen, setCcDialogOpen] = useState(false)
  const [editingCc, setEditingCc] = useState<CostCenter | null>(null)
  const [ccCode, setCcCode] = useState('')
  const [ccName, setCcName] = useState('')
  const [ccType, setCcType] = useState('department')
  const [ccParentId, setCcParentId] = useState('')
  const [ccDepartment, setCcDepartment] = useState('')
  const [ccBudget, setCcBudget] = useState('')
  const [ccActive, setCcActive] = useState(true)

  // Cost Allocation form
  const [allocDialogOpen, setAllocDialogOpen] = useState(false)
  const [editingAlloc, setEditingAlloc] = useState<CostAllocationItem | null>(null)
  const [aCostCenterId, setACostCenterId] = useState('')
  const [aAccount, setAAccount] = useState('')
  const [aAmount, setAAmount] = useState('')
  const [aDate, setADate] = useState('')
  const [aSourceType, setASourceType] = useState('manual')
  const [aDescription, setADescription] = useState('')

  // ── Fetch Cost Centers ──────────────────────────────────────
  const ccParams = new URLSearchParams()
  if (typeFilter) ccParams.set('type', typeFilter)
  if (activeFilter) ccParams.set('active', activeFilter)

  const {
    data: ccData, isLoading: ccLoading, error: ccError,
    refetch: refetchCc, isFetching: ccFetching,
  } = useQuery<CostCenterData>({
    queryKey: ['cost-centers', typeFilter, activeFilter],
    queryFn: () => apiFetch(`/api/cost-centers?${ccParams.toString()}`),
  })

  // ── Fetch Cost Allocations ──────────────────────────────────
  const {
    data: allocData, isLoading: allocLoading, error: allocError,
    refetch: refetchAlloc, isFetching: allocFetching,
  } = useQuery<CostAllocationData>({
    queryKey: ['cost-allocations'],
    queryFn: () => apiFetch('/api/cost-allocations'),
  })

  // ── Mutations ───────────────────────────────────────────────
  const createCcMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/cost-centers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Cost center created')
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      closeCcDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateCcMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/cost-centers', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Cost center updated')
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      closeCcDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createAllocMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/cost-allocations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Allocation created')
      queryClient.invalidateQueries({ queryKey: ['cost-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      closeAllocDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateAllocMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/cost-allocations', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Allocation updated')
      queryClient.invalidateQueries({ queryKey: ['cost-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] })
      closeAllocDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Form helpers ────────────────────────────────────────────
  const resetCcForm = () => {
    setCcCode(''); setCcName(''); setCcType('department')
    setCcParentId(''); setCcDepartment(''); setCcBudget(''); setCcActive(true)
  }

  const closeCcDialog = () => {
    setCcDialogOpen(false); setEditingCc(null); resetCcForm()
  }

  const openEditCc = (c: CostCenter) => {
    setEditingCc(c)
    setCcCode(c.code); setCcName(c.name); setCcType(c.type)
    setCcParentId(c.parentId || ''); setCcDepartment(c.department || '')
    setCcBudget(String(c.budgetAllocated)); setCcActive(c.active)
  }

  const handleSaveCc = () => {
    if (!ccCode || !ccName) { toast.error('Code and Name are required'); return }
    const body = {
      code: ccCode,
      name: ccName,
      type: ccType,
      parentId: ccParentId || undefined,
      department: ccDepartment || undefined,
      budgetAllocated: ccBudget,
      active: ccActive,
    }
    if (editingCc) {
      updateCcMutation.mutate({ id: editingCc.id, ...body })
    } else {
      createCcMutation.mutate(body)
    }
  }

  const resetAllocForm = () => {
    setACostCenterId(''); setAAccount(''); setAAmount('')
    setADate(''); setASourceType('manual'); setADescription('')
  }

  const closeAllocDialog = () => {
    setAllocDialogOpen(false); setEditingAlloc(null); resetAllocForm()
  }

  const openEditAlloc = (a: CostAllocationItem) => {
    setEditingAlloc(a)
    setACostCenterId(a.costCenterId); setAAccount(a.account || '')
    setAAmount(String(a.amount)); setADate(a.date)
    setASourceType(a.sourceType || 'manual'); setADescription(a.description || '')
  }

  const handleSaveAlloc = () => {
    if (!aCostCenterId || !aDate) {
      toast.error('Cost center and date are required')
      return
    }
    const body = {
      costCenterId: aCostCenterId,
      account: aAccount || undefined,
      amount: aAmount,
      date: aDate,
      sourceType: aSourceType,
      description: aDescription || undefined,
    }
    if (editingAlloc) {
      updateAllocMutation.mutate({ id: editingAlloc.id, ...body })
    } else {
      createAllocMutation.mutate(body)
    }
  }

  // ── Filtered data ───────────────────────────────────────────
  const filteredCenters = ccData?.centers.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.department?.toLowerCase().includes(q) ?? false)
  }) ?? []

  const filteredAllocations = allocData?.allocations.filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (a.costCenter?.code?.toLowerCase().includes(q) ?? false) ||
      (a.costCenter?.name?.toLowerCase().includes(q) ?? false) ||
      (a.account?.toLowerCase().includes(q) ?? false) ||
      (a.description?.toLowerCase().includes(q) ?? false)
  }) ?? []

  const ccStats = ccData?.stats
  const allocStats = allocData?.stats

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">
            Cost Centers
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage cost centers, budgets &amp; allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-7 w-40 text-xs pl-7"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => { refetchCc(); refetchAlloc() }}
            disabled={ccFetching || allocFetching}
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', (ccFetching || allocFetching) && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm" className="h-7 text-xs"
            onClick={() => { resetCcForm(); setCcDialogOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />New Center
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {(ccLoading) ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : ccError ? (
        <AccountingError error={ccError} onRetry={() => refetchCc()} title="Failed to load cost centers" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <FolderTree className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Centers</p>
                <p className="text-sm font-semibold truncate">{ccStats?.totalCenters ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Budget Allocated</p>
                <p className="text-sm font-semibold truncate">{formatNPR(ccStats?.totalBudgetAllocated ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Budget Utilized</p>
                <p className="text-sm font-semibold truncate">{formatNPR(ccStats?.totalBudgetUsed ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5">
                <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Active Centers</p>
                <p className="text-sm font-semibold truncate text-green-600">{ccStats?.activeCount ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-7">
          <TabsTrigger value="centers" className="text-xs h-5 px-3">
            <Building2 className="h-3 w-3 mr-1" />Cost Centers
          </TabsTrigger>
          <TabsTrigger value="allocations" className="text-xs h-5 px-3">
            <ArrowRightLeft className="h-3 w-3 mr-1" />Allocations
          </TabsTrigger>
        </TabsList>

        {/* ─── Cost Centers Tab ─────────────────────────────────── */}
        <TabsContent value="centers" className="mt-2 space-y-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter || 'all'} onValueChange={v => setActiveFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="p-3">
            {ccLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !filteredCenters.length ? (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No cost centers found</p>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs mt-2"
                  onClick={() => { resetCcForm(); setCcDialogOpen(true) }}
                >
                  <Plus className="h-3 w-3 mr-1" />Create First Center
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableHead className="text-xs h-8">Code</TableHead>
                      <TableHead className="text-xs h-8">Name</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Type</TableHead>
                      <TableHead className="text-xs h-8 hidden lg:table-cell">Department</TableHead>
                      <TableHead className="text-xs h-8 text-right">Allocated</TableHead>
                      <TableHead className="text-xs h-8 text-right">Used</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Utilization</TableHead>
                      <TableHead className="text-xs h-8">Active</TableHead>
                      <TableHead className="text-xs h-8 w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCenters.map(c => {
                      const tc = typeConfig[c.type] ?? typeConfig.department
                      return (
                        <TableRow key={c.id} className="text-xs">
                          <TableCell className="font-mono font-medium py-1.5">{c.code}</TableCell>
                          <TableCell className="font-medium py-1.5">{c.name}</TableCell>
                          <TableCell className="py-1.5 hidden md:table-cell">
                            <Badge variant="outline" className={cn('text-xs', tc.className)}>{tc.label}</Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">
                            {c.department || '—'}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">{formatNPR(c.budgetAllocated)}</TableCell>
                          <TableCell className="py-1.5 text-right">{formatNPR(c.budgetUsed)}</TableCell>
                          <TableCell className="py-1.5 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Progress
                                value={Math.min(c.utilizationPct, 100)}
                                className={cn('h-1.5 w-16', utilizationBarClass(c.utilizationPct))}
                              />
                              <span className={cn('text-xs font-medium w-10 text-right', utilizationColor(c.utilizationPct))}>
                                {c.utilizationPct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5">
                            {c.active ? (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <button onClick={() => openEditCc(c)} className="p-1 rounded hover:bg-muted" title="Edit">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── Allocations Tab ─────────────────────────────────── */}
        <TabsContent value="allocations" className="mt-2 space-y-2">
          {/* Header with create button */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm" className="h-7 text-xs ml-auto"
              onClick={() => { resetAllocForm(); setAllocDialogOpen(true) }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />New Allocation
            </Button>
          </div>

          {/* Allocation summary */}
          {allocStats && (
            <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-xs">Total: {formatNPR(allocStats.totalAmount)}</Badge>
              <Badge variant="outline" className="text-xs">{allocStats.totalAllocations} entries</Badge>
              {Object.entries(allocStats.bySourceType).map(([type, amt]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {sourceTypeLabels[type] || type}: {formatNPR(amt)}
                </Badge>
              ))}
            </div>
          )}

          {/* Table */}
          <Card className="p-3">
            {allocLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !filteredAllocations.length ? (
              <div className="text-center py-8">
                <ArrowRightLeft className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No allocations found</p>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs mt-2"
                  onClick={() => { resetAllocForm(); setAllocDialogOpen(true) }}
                >
                  <Plus className="h-3 w-3 mr-1" />Add First Allocation
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableHead className="text-xs h-8">Cost Center</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Account</TableHead>
                      <TableHead className="text-xs h-8 text-right">Amount</TableHead>
                      <TableHead className="text-xs h-8">Date</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-xs h-8 hidden lg:table-cell">Description</TableHead>
                      <TableHead className="text-xs h-8 w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllocations.map(a => (
                      <TableRow key={a.id} className="text-xs">
                        <TableCell className="font-medium py-1.5">
                          {a.costCenter ? `${a.costCenter.code} — ${a.costCenter.name}` : '—'}
                        </TableCell>
                        <TableCell className="py-1.5 text-muted-foreground font-mono hidden md:table-cell">
                          {a.account || '—'}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-medium">{formatNPR(a.amount)}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground">{a.date}</TableCell>
                        <TableCell className="py-1.5 hidden md:table-cell">
                          {a.sourceType ? (
                            <Badge variant="outline" className="text-xs">
                              {sourceTypeLabels[a.sourceType] || a.sourceType}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell max-w-[150px] truncate">
                          {a.description || '—'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <button onClick={() => openEditAlloc(a)} className="p-1 rounded hover:bg-muted" title="Edit">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create/Edit Cost Center Dialog ───────────────────── */}
      <Dialog
        open={ccDialogOpen || !!editingCc}
        onOpenChange={open => { if (!open) closeCcDialog() }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingCc ? 'Edit Cost Center' : 'New Cost Center'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingCc ? 'Update cost center details' : 'Create a new cost center'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Code *</Label>
                <Input className="h-8 text-xs" value={ccCode} onChange={e => setCcCode(e.target.value)} placeholder="e.g. CC-001" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Name *</Label>
                <Input className="h-8 text-xs" value={ccName} onChange={e => setCcName(e.target.value)} placeholder="e.g. Front Office" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={ccType} onValueChange={setCcType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Department</Label>
                <Input className="h-8 text-xs" value={ccDepartment} onChange={e => setCcDepartment(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Budget Allocated (NPR)</Label>
              <Input className="h-8 text-xs" type="number" value={ccBudget} onChange={e => setCcBudget(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Parent Cost Center</Label>
              <Select value={ccParentId || 'none'} onValueChange={v => setCcParentId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {ccData?.centers
                    .filter(c => !editingCc || c.id !== editingCc.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {editingCc && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Active</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ccActive}
                  onClick={() => setCcActive(!ccActive)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    ccActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                >
                  <span className={cn(
                    'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                    ccActive ? 'translate-x-4' : 'translate-x-0',
                  )} />
                </button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeCcDialog}>Cancel</Button>
            <Button
              size="sm" className="h-7 text-xs"
              onClick={handleSaveCc}
              disabled={createCcMutation.isPending || updateCcMutation.isPending}
            >
              {createCcMutation.isPending || updateCcMutation.isPending
                ? 'Saving...'
                : editingCc ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create/Edit Cost Allocation Dialog ───────────────── */}
      <Dialog
        open={allocDialogOpen || !!editingAlloc}
        onOpenChange={open => { if (!open) closeAllocDialog() }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingAlloc ? 'Edit Allocation' : 'New Allocation'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingAlloc ? 'Update allocation details' : 'Create a new cost allocation'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Cost Center *</Label>
              <Select value={aCostCenterId} onValueChange={setACostCenterId}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select cost center" /></SelectTrigger>
                <SelectContent>
                  {ccData?.centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Amount (NPR) *</Label>
                <Input className="h-8 text-xs" type="number" value={aAmount} onChange={e => setAAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Date *</Label>
                <Input className="h-8 text-xs" type="date" value={aDate} onChange={e => setADate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Account</Label>
                <Input className="h-8 text-xs" value={aAccount} onChange={e => setAAccount(e.target.value)} placeholder="e.g. 5100-Rent" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Source Type</Label>
                <Select value={aSourceType} onValueChange={setASourceType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-xs min-h-[50px]" value={aDescription} onChange={e => setADescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeAllocDialog}>Cancel</Button>
            <Button
              size="sm" className="h-7 text-xs"
              onClick={handleSaveAlloc}
              disabled={createAllocMutation.isPending || updateAllocMutation.isPending}
            >
              {createAllocMutation.isPending || updateAllocMutation.isPending
                ? 'Saving...'
                : editingAlloc ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
