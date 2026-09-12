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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus, Pencil, RefreshCw, Search, FileCheck, CheckCircle2,
  Landmark, Receipt, AlertTriangle, IndianRupee,
} from 'lucide-react'
import { formatNPR, cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface TaxReturn {
  id: string
  period: string
  periodType: string
  totalSales: number
  totalPurchases: number
  vatOutput: number
  vatInput: number
  vatPayable: number
  tdsWithheld: number
  tdsDeposited: number
  status: string
  filedDate?: string
  paidDate?: string
  notes?: string
}

interface TdsDeduction {
  id: string
  deducteeName: string
  panNumber?: string
  section: string
  amount: number
  tdsRate: number
  tdsAmount: number
  deposited: boolean
  depositDate?: string
  period: string
  notes?: string
}

interface TaxReturnStats {
  totalVatPayable: number
  totalTdsPending: number
  overdueCount: number
  filedCount: number
  totalReturns: number
}

interface TdsDeductionStats {
  totalTdsAmount: number
  pendingDeposit: number
  depositedAmount: number
  pendingCount: number
  totalDeductions: number
}

interface TaxReturnData {
  returns: TaxReturn[]
  stats: TaxReturnStats
}

interface TdsDeductionData {
  deductions: TdsDeduction[]
  stats: TdsDeductionStats
}

// ── Status badge config ──────────────────────────────────────
const taxStatusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  filed: {
    label: 'Filed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
}

const tdsSections = ['194C', '194H', '194I', '194J', '194A', '194B', '194D', '194F', '194K', '194L', '194M', '194N', '194O', '194Q']

// ── Component ────────────────────────────────────────────────
export function TaxManagementView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('returns')

  // Filters
  const [returnStatusFilter, setReturnStatusFilter] = useState('')
  const [returnPeriodTypeFilter, setReturnPeriodTypeFilter] = useState('')
  const [tdsSectionFilter, setTdsSectionFilter] = useState('')
  const [tdsDepositedFilter, setTdsDepositedFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Tax Return form
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [editingReturn, setEditingReturn] = useState<TaxReturn | null>(null)
  const [rPeriod, setRPeriod] = useState('')
  const [rPeriodType, setRPeriodType] = useState('monthly')
  const [rTotalSales, setRTotalSales] = useState('')
  const [rTotalPurchases, setRTotalPurchases] = useState('')
  const [rVatOutput, setRVatOutput] = useState('')
  const [rVatInput, setRVatInput] = useState('')
  const [rVatPayable, setRVatPayable] = useState('')
  const [rTdsWithheld, setRTdsWithheld] = useState('')
  const [rTdsDeposited, setRTdsDeposited] = useState('')
  const [rNotes, setRNotes] = useState('')

  // TDS Deduction form
  const [tdsDialogOpen, setTdsDialogOpen] = useState(false)
  const [editingTds, setEditingTds] = useState<TdsDeduction | null>(null)
  const [tDeducteeName, setTDeducteeName] = useState('')
  const [tPanNumber, setTPanNumber] = useState('')
  const [tSection, setTSection] = useState('194C')
  const [tAmount, setTAmount] = useState('')
  const [tTdsRate, setTTdsRate] = useState('')
  const [tTdsAmount, setTTdsAmount] = useState('')
  const [tPeriod, setTPeriod] = useState('')
  const [tNotes, setTNotes] = useState('')

  // ── Fetch Tax Returns ───────────────────────────────────────
  const returnParams = new URLSearchParams()
  if (returnStatusFilter) returnParams.set('status', returnStatusFilter)
  if (returnPeriodTypeFilter) returnParams.set('periodType', returnPeriodTypeFilter)

  const {
    data: returnData, isLoading: returnsLoading, error: returnsError,
    refetch: refetchReturns, isFetching: returnsFetching,
  } = useQuery<TaxReturnData>({
    queryKey: ['tax-returns', returnStatusFilter, returnPeriodTypeFilter],
    queryFn: () => apiFetch(`/api/tax-returns?${returnParams.toString()}`),
  })

  // ── Fetch TDS Deductions ────────────────────────────────────
  const tdsParams = new URLSearchParams()
  if (tdsSectionFilter) tdsParams.set('section', tdsSectionFilter)
  if (tdsDepositedFilter) tdsParams.set('deposited', tdsDepositedFilter)

  const {
    data: tdsData, isLoading: tdsLoading, error: tdsError,
    refetch: refetchTds, isFetching: tdsFetching,
  } = useQuery<TdsDeductionData>({
    queryKey: ['tds-deductions', tdsSectionFilter, tdsDepositedFilter],
    queryFn: () => apiFetch(`/api/tds-deductions?${tdsParams.toString()}`),
  })

  // ── Mutations ───────────────────────────────────────────────
  const createReturnMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/tax-returns', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Tax return created')
      queryClient.invalidateQueries({ queryKey: ['tax-returns'] })
      closeReturnDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateReturnMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/tax-returns', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Tax return updated')
      queryClient.invalidateQueries({ queryKey: ['tax-returns'] })
      closeReturnDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createTdsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/tds-deductions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('TDS deduction created')
      queryClient.invalidateQueries({ queryKey: ['tds-deductions'] })
      closeTdsDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTdsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/tds-deductions', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('TDS deduction updated')
      queryClient.invalidateQueries({ queryKey: ['tds-deductions'] })
      closeTdsDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Form helpers ────────────────────────────────────────────
  const resetReturnForm = () => {
    setRPeriod(''); setRPeriodType('monthly'); setRTotalSales('')
    setRTotalPurchases(''); setRVatOutput(''); setRVatInput('')
    setRVatPayable(''); setRTdsWithheld(''); setRTdsDeposited('')
    setRNotes('')
  }

  const closeReturnDialog = () => {
    setReturnDialogOpen(false); setEditingReturn(null); resetReturnForm()
  }

  const openEditReturn = (r: TaxReturn) => {
    setEditingReturn(r)
    setRPeriod(r.period); setRPeriodType(r.periodType)
    setRTotalSales(String(r.totalSales)); setRTotalPurchases(String(r.totalPurchases))
    setRVatOutput(String(r.vatOutput)); setRVatInput(String(r.vatInput))
    setRVatPayable(String(r.vatPayable)); setRTdsWithheld(String(r.tdsWithheld))
    setRTdsDeposited(String(r.tdsDeposited)); setRNotes(r.notes || '')
  }

  const handleSaveReturn = () => {
    if (!rPeriod) { toast.error('Period is required'); return }
    const body = {
      period: rPeriod,
      periodType: rPeriodType,
      totalSales: rTotalSales,
      totalPurchases: rTotalPurchases,
      vatOutput: rVatOutput,
      vatInput: rVatInput,
      vatPayable: rVatPayable,
      tdsWithheld: rTdsWithheld,
      tdsDeposited: rTdsDeposited,
      notes: rNotes || undefined,
    }
    if (editingReturn) {
      updateReturnMutation.mutate({ id: editingReturn.id, ...body })
    } else {
      createReturnMutation.mutate(body)
    }
  }

  const resetTdsForm = () => {
    setTDeducteeName(''); setTPanNumber(''); setTSection('194C')
    setTAmount(''); setTTdsRate(''); setTTdsAmount('')
    setTPeriod(''); setTNotes('')
  }

  const closeTdsDialog = () => {
    setTdsDialogOpen(false); setEditingTds(null); resetTdsForm()
  }

  const openEditTds = (d: TdsDeduction) => {
    setEditingTds(d)
    setTDeducteeName(d.deducteeName); setTPanNumber(d.panNumber || '')
    setTSection(d.section); setTAmount(String(d.amount))
    setTTdsRate(String(d.tdsRate)); setTTdsAmount(String(d.tdsAmount))
    setTPeriod(d.period); setTNotes(d.notes || '')
  }

  const handleSaveTds = () => {
    if (!tDeducteeName || !tSection || !tPeriod) {
      toast.error('Deductee name, section, and period are required')
      return
    }
    const body = {
      deducteeName: tDeducteeName,
      panNumber: tPanNumber || undefined,
      section: tSection,
      amount: tAmount,
      tdsRate: tTdsRate,
      tdsAmount: tTdsAmount,
      period: tPeriod,
      notes: tNotes || undefined,
    }
    if (editingTds) {
      updateTdsMutation.mutate({ id: editingTds.id, ...body })
    } else {
      createTdsMutation.mutate(body)
    }
  }

  // ── Action handlers ─────────────────────────────────────────
  const handleFileReturn = (r: TaxReturn) => {
    updateReturnMutation.mutate({ id: r.id, action: 'file' })
  }

  const handleMarkPaid = (r: TaxReturn) => {
    updateReturnMutation.mutate({ id: r.id, action: 'mark_paid' })
  }

  const handleMarkDeposited = (d: TdsDeduction) => {
    updateTdsMutation.mutate({ id: d.id, deposited: true })
  }

  // Auto-calc VAT payable
  const handleAutoCalcVat = () => {
    const output = parseFloat(rVatOutput) || 0
    const input = parseFloat(rVatInput) || 0
    setRVatPayable(String(Math.round((output - input) * 100) / 100))
  }

  // Auto-calc TDS amount
  const handleAutoCalcTds = () => {
    const amt = parseFloat(tAmount) || 0
    const rate = parseFloat(tTdsRate) || 0
    setTTdsAmount(String(Math.round(amt * rate / 100 * 100) / 100))
  }

  // ── Filtered data ───────────────────────────────────────────
  const filteredReturns = returnData?.returns.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.period.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)
  }) ?? []

  const filteredDeductions = tdsData?.deductions.filter(d => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return d.deducteeName.toLowerCase().includes(q) ||
      d.section.toLowerCase().includes(q) ||
      (d.panNumber?.toLowerCase().includes(q) ?? false)
  }) ?? []

  const returnStats = returnData?.stats
  const tdsStats = tdsData?.stats

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">
            Tax Management
          </h1>
          <p className="text-xs text-muted-foreground">
            VAT returns, TDS deductions &amp; tax compliance tracking
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
            onClick={() => { refetchReturns(); refetchTds() }}
            disabled={returnsFetching || tdsFetching}
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', (returnsFetching || tdsFetching) && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm" className="h-7 text-xs"
            onClick={() => { resetReturnForm(); setReturnDialogOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />New Return
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {(returnsLoading || tdsLoading) ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : (returnsError || tdsError) ? (
        <AccountingError
          error={returnsError || tdsError}
          onRetry={() => { refetchReturns(); refetchTds() }}
          title="Failed to load tax data"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">VAT Payable</p>
                <p className="text-sm font-semibold truncate">{formatNPR(returnStats?.totalVatPayable ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5">
                <Landmark className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">TDS Pending Deposit</p>
                <p className="text-sm font-semibold truncate text-amber-600">{formatNPR(returnStats?.totalTdsPending ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Overdue Returns</p>
                <p className="text-sm font-semibold truncate text-red-600">{returnStats?.overdueCount ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Filed / Paid</p>
                <p className="text-sm font-semibold truncate text-green-600">{returnStats?.filedCount ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-7">
          <TabsTrigger value="returns" className="text-xs h-5 px-3">
            <Receipt className="h-3 w-3 mr-1" />VAT Returns
          </TabsTrigger>
          <TabsTrigger value="tds" className="text-xs h-5 px-3">
            <Landmark className="h-3 w-3 mr-1" />TDS Deductions
          </TabsTrigger>
        </TabsList>

        {/* ─── VAT Returns Tab ─────────────────────────────────── */}
        <TabsContent value="returns" className="mt-2 space-y-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={returnStatusFilter || 'all'} onValueChange={v => setReturnStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={returnPeriodTypeFilter || 'all'} onValueChange={v => setReturnPeriodTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="p-3">
            {returnsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !filteredReturns.length ? (
              <div className="text-center py-8">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No tax returns found</p>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs mt-2"
                  onClick={() => { resetReturnForm(); setReturnDialogOpen(true) }}
                >
                  <Plus className="h-3 w-3 mr-1" />Create First Return
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableHead className="text-xs h-8">Period</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Type</TableHead>
                      <TableHead className="text-xs h-8 text-right">Sales</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden md:table-cell">Purchases</TableHead>
                      <TableHead className="text-xs h-8 text-right">VAT Out</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden lg:table-cell">VAT In</TableHead>
                      <TableHead className="text-xs h-8 text-right font-medium">VAT Payable</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden xl:table-cell">TDS W/H</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden xl:table-cell">TDS Dep</TableHead>
                      <TableHead className="text-xs h-8">Status</TableHead>
                      <TableHead className="text-xs h-8 w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.map(r => {
                      const sc = taxStatusConfig[r.status] ?? taxStatusConfig.draft
                      return (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="font-medium py-1.5">{r.period}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell capitalize">{r.periodType}</TableCell>
                          <TableCell className="py-1.5 text-right">{formatNPR(r.totalSales)}</TableCell>
                          <TableCell className="py-1.5 text-right hidden md:table-cell">{formatNPR(r.totalPurchases)}</TableCell>
                          <TableCell className="py-1.5 text-right">{formatNPR(r.vatOutput)}</TableCell>
                          <TableCell className="py-1.5 text-right hidden lg:table-cell">{formatNPR(r.vatInput)}</TableCell>
                          <TableCell className={cn('py-1.5 text-right font-medium', r.vatPayable > 0 ? 'text-orange-600' : 'text-green-600')}>
                            {formatNPR(r.vatPayable)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right hidden xl:table-cell">{formatNPR(r.tdsWithheld)}</TableCell>
                          <TableCell className="py-1.5 text-right hidden xl:table-cell">{formatNPR(r.tdsDeposited)}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className={cn('text-xs', sc.className)}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-0.5">
                              {r.status === 'draft' && (
                                <>
                                  <button onClick={() => openEditReturn(r)} className="p-1 rounded hover:bg-muted" title="Edit">
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => handleFileReturn(r)} className="p-1 rounded hover:bg-muted" title="File">
                                    <FileCheck className="h-3 w-3 text-blue-500" />
                                  </button>
                                </>
                              )}
                              {r.status === 'filed' && (
                                <button onClick={() => handleMarkPaid(r)} className="p-1 rounded hover:bg-muted" title="Mark Paid">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                </button>
                              )}
                              {r.status === 'overdue' && (
                                <button onClick={() => handleFileReturn(r)} className="p-1 rounded hover:bg-muted" title="File Now">
                                  <FileCheck className="h-3 w-3 text-red-500" />
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
        </TabsContent>

        {/* ─── TDS Deductions Tab ──────────────────────────────── */}
        <TabsContent value="tds" className="mt-2 space-y-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={tdsSectionFilter || 'all'} onValueChange={v => setTdsSectionFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {tdsSections.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tdsDepositedFilter || 'all'} onValueChange={v => setTdsDepositedFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Deposit Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Pending</SelectItem>
                <SelectItem value="true">Deposited</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm" className="h-7 text-xs ml-auto"
              onClick={() => { resetTdsForm(); setTdsDialogOpen(true) }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />New TDS
            </Button>
          </div>

          {/* TDS summary row */}
          {tdsStats && (
            <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-xs">Total TDS: {formatNPR(tdsStats.totalTdsAmount)}</Badge>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">Pending: {formatNPR(tdsStats.pendingDeposit)}</Badge>
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">Deposited: {formatNPR(tdsStats.depositedAmount)}</Badge>
            </div>
          )}

          {/* Table */}
          <Card className="p-3">
            {tdsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !filteredDeductions.length ? (
              <div className="text-center py-8">
                <Landmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No TDS deductions found</p>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs mt-2"
                  onClick={() => { resetTdsForm(); setTdsDialogOpen(true) }}
                >
                  <Plus className="h-3 w-3 mr-1" />Add First Deduction
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableHead className="text-xs h-8">Deductee</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">PAN</TableHead>
                      <TableHead className="text-xs h-8">Section</TableHead>
                      <TableHead className="text-xs h-8 text-right">Amount</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden md:table-cell">Rate</TableHead>
                      <TableHead className="text-xs h-8 text-right font-medium">TDS Amt</TableHead>
                      <TableHead className="text-xs h-8 hidden md:table-cell">Period</TableHead>
                      <TableHead className="text-xs h-8">Deposited</TableHead>
                      <TableHead className="text-xs h-8 w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeductions.map(d => (
                      <TableRow key={d.id} className="text-xs">
                        <TableCell className="font-medium py-1.5">{d.deducteeName}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground font-mono hidden md:table-cell">{d.panNumber || '—'}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className="text-xs">{d.section}</Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">{formatNPR(d.amount)}</TableCell>
                        <TableCell className="py-1.5 text-right hidden md:table-cell">{d.tdsRate}%</TableCell>
                        <TableCell className="py-1.5 text-right font-medium">{formatNPR(d.tdsAmount)}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">{d.period}</TableCell>
                        <TableCell className="py-1.5">
                          {d.deposited ? (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-0.5">
                            {!d.deposited && (
                              <button onClick={() => openEditTds(d)} className="p-1 rounded hover:bg-muted" title="Edit">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                            )}
                            {!d.deposited && (
                              <button onClick={() => handleMarkDeposited(d)} className="p-1 rounded hover:bg-muted" title="Mark Deposited">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              </button>
                            )}
                          </div>
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

      {/* ─── Create/Edit Tax Return Dialog ────────────────────── */}
      <Dialog
        open={returnDialogOpen || !!editingReturn}
        onOpenChange={open => { if (!open) closeReturnDialog() }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingReturn ? 'Edit Tax Return' : 'New Tax Return'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingReturn ? 'Update VAT return details' : 'Create a new VAT return for a period'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Period *</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. 2025-01 or 2025-Q1"
                  value={rPeriod}
                  onChange={e => setRPeriod(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Period Type *</Label>
                <Select value={rPeriodType} onValueChange={setRPeriodType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Total Sales</Label>
                <Input className="h-8 text-xs" type="number" value={rTotalSales} onChange={e => setRTotalSales(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Total Purchases</Label>
                <Input className="h-8 text-xs" type="number" value={rTotalPurchases} onChange={e => setRTotalPurchases(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">VAT Output</Label>
                <Input className="h-8 text-xs" type="number" value={rVatOutput} onChange={e => setRVatOutput(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">VAT Input</Label>
                <Input className="h-8 text-xs" type="number" value={rVatInput} onChange={e => setRVatInput(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">VAT Payable</Label>
                <Input className="h-8 text-xs" type="number" value={rVatPayable} onChange={e => setRVatPayable(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">TDS Withheld</Label>
                <Input className="h-8 text-xs" type="number" value={rTdsWithheld} onChange={e => setRTdsWithheld(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">TDS Deposited</Label>
                <Input className="h-8 text-xs" type="number" value={rTdsDeposited} onChange={e => setRTdsDeposited(e.target.value)} placeholder="0" />
              </div>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs w-fit"
              onClick={handleAutoCalcVat}
            >
              Auto-calc VAT Payable (Output − Input)
            </Button>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[50px]" value={rNotes} onChange={e => setRNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeReturnDialog}>Cancel</Button>
            <Button
              size="sm" className="h-7 text-xs"
              onClick={handleSaveReturn}
              disabled={createReturnMutation.isPending || updateReturnMutation.isPending}
            >
              {createReturnMutation.isPending || updateReturnMutation.isPending
                ? 'Saving...'
                : editingReturn ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create/Edit TDS Deduction Dialog ─────────────────── */}
      <Dialog
        open={tdsDialogOpen || !!editingTds}
        onOpenChange={open => { if (!open) closeTdsDialog() }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingTds ? 'Edit TDS Deduction' : 'New TDS Deduction'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingTds ? 'Update TDS deduction details' : 'Record a new TDS deduction'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Deductee Name *</Label>
              <Input className="h-8 text-xs" value={tDeducteeName} onChange={e => setTDeducteeName(e.target.value)} placeholder="Vendor or payee name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">PAN Number</Label>
                <Input className="h-8 text-xs" value={tPanNumber} onChange={e => setTPanNumber(e.target.value)} placeholder="Optional" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Section *</Label>
                <Select value={tSection} onValueChange={setTSection}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tdsSections.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Amount *</Label>
                <Input className="h-8 text-xs" type="number" value={tAmount} onChange={e => setTAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">TDS Rate %</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={tTdsRate} onChange={e => setTTdsRate(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">TDS Amount</Label>
                <Input className="h-8 text-xs" type="number" value={tTdsAmount} onChange={e => setTTdsAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs w-fit"
              onClick={handleAutoCalcTds}
            >
              Auto-calc TDS Amount (Amount × Rate%)
            </Button>
            <div className="grid gap-1.5">
              <Label className="text-xs">Period *</Label>
              <Input className="h-8 text-xs" value={tPeriod} onChange={e => setTPeriod(e.target.value)} placeholder="e.g. 2025-01" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[50px]" value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeTdsDialog}>Cancel</Button>
            <Button
              size="sm" className="h-7 text-xs"
              onClick={handleSaveTds}
              disabled={createTdsMutation.isPending || updateTdsMutation.isPending}
            >
              {createTdsMutation.isPending || updateTdsMutation.isPending
                ? 'Saving...'
                : editingTds ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
