'use client'

import { useState, useMemo, useCallback, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { formatNPR, cn } from '@/lib/utils'
import { getTodayString, formatDateShort, formatDateTime } from '@/lib/format'
import {
  Plus, Search, X, Trash2, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Eye, Pencil, Upload, Ban,
  Building2, UtensilsCrossed, Users, Package, PartyPopper,
  Moon, Receipt, ArrowRightLeft, Filter, FileText,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'

import { AccountingError } from './AccountingErrorBoundary'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ── Types ────────────────────────────────────────────────────────
interface Account {
  id: string; code: string; name: string; type: string;
}

interface JournalLine {
  id: string
  account: Account
  debit: number
  credit: number
  narration?: string | null
}

interface JournalEntry {
  id: string
  date: string
  description: string
  reference?: string | null
  status: string
  sourceModule?: string | null
  createdBy?: string | null
  postedBy?: string | null
  postedAt?: string | null
  createdAt: string
  lines: JournalLine[]
  totalDebit?: number
  totalCredit?: number
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

interface EntryFormLine {
  tempId: string
  lineId?: string
  accountId: string
  debit: string
  credit: string
  narration: string
}

// ── Constants ────────────────────────────────────────────────────
const SOURCE_MODULES = [
  { value: 'all', label: 'All Modules' },
  { value: 'manual', label: 'Manual' },
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'pos', label: 'POS (F&B)' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'events', label: 'Events' },
  { value: 'night_audit', label: 'Night Audit' },
  { value: 'invoice_payment', label: 'Invoice Payment' },
  { value: 'folio_settlement', label: 'Folio Settlement' },
] as const

const SOURCE_MODULE_LABELS: Record<string, string> = {
  manual: 'Manual', front_desk: 'Front Desk', pos: 'POS', payroll: 'Payroll',
  inventory: 'Inventory', events: 'Events', night_audit: 'Night Audit',
  invoice_payment: 'Invoice', folio_settlement: 'Folio Settlement',
}

const AUTO_POST_MODULES = [
  { key: 'front_desk', label: 'Room Revenue', icon: Building2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { key: 'pos', label: 'F&B', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { key: 'payroll', label: 'Payroll', icon: Users, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  { key: 'inventory', label: 'Inventory', icon: Package, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { key: 'events', label: 'Events', icon: PartyPopper, color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  { key: 'night_audit', label: 'Night Audit', icon: Moon, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
] as const

function createEmptyLine(): EntryFormLine {
  return { tempId: crypto.randomUUID(), accountId: '', debit: '', credit: '', narration: '' }
}

// ── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    posted: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    voided: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', config[status] || 'bg-gray-100 text-gray-800')}>
      {status}
    </span>
  )
}

// ── Source Module Badge ──────────────────────────────────────────
function SourceBadge({ module }: { module?: string | null }) {
  if (!module) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className="text-[10px] font-normal gap-1">
      {SOURCE_MODULE_LABELS[module] || module}
    </Badge>
  )
}

// ── Main Component ───────────────────────────────────────────────
export function JournalView() {
  const queryClient = useQueryClient()

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sourceModule, setSourceModule] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const [autoPostOpen, setAutoPostOpen] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(getTodayString())
  const [formDesc, setFormDesc] = useState('')
  const [formRef, setFormRef] = useState('')
  const [formSource, setFormSource] = useState('manual')
  const [formStatus, setFormStatus] = useState<'draft' | 'posted'>('draft')
  const [formLines, setFormLines] = useState<EntryFormLine[]>([createEmptyLine(), createEmptyLine()])

  // ── Queries ─────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (statusFilter !== 'all') p.set('status', statusFilter)
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    if (sourceModule !== 'all') p.set('sourceModule', sourceModule)
    if (search) p.set('search', search)
    p.set('page', String(page))
    p.set('limit', String(limit))
    return p.toString()
  }, [statusFilter, startDate, endDate, sourceModule, search, page])

  const { data, isLoading, isError, error } = useQuery<{ entries: JournalEntry[]; pagination: Pagination }>({
    queryKey: ['journal-entries', queryParams],
    queryFn: () => apiFetch(`/api/accounting?${queryParams}`),
  })

  const { data: accountsData } = useQuery<{ accounts: Account[] }>({
    queryKey: ['accounts-list', 'active'],
    queryFn: () => apiFetch('/api/accounts?active=true'),
    staleTime: 5 * 60 * 1000,
  })
  const accounts = accountsData?.accounts ?? []

  const entries = data?.entries ?? []
  const pagination = data?.pagination

  // Auto-posting summary: count entries per module from current data
  const autoPostSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) {
      if (e.sourceModule && e.sourceModule !== 'manual') {
        counts[e.sourceModule] = (counts[e.sourceModule] || 0) + 1
      }
    }
    return counts
  }, [entries])

  // ── Balance computation for form ──────────────────────────
  const totalDebit = formLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = formLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanceDiff = Math.abs(totalDebit - totalCredit)
  const isBalanced = balanceDiff <= 0.01

  // ── Line helpers ──────────────────────────────────────────
  const addLine = useCallback(() => setFormLines(prev => [...prev, createEmptyLine()]), [])
  const removeLine = useCallback((tempId: string) => {
    setFormLines(prev => prev.length <= 2 ? prev : prev.filter(l => l.tempId !== tempId))
  }, [])
  const updateLine = useCallback((tempId: string, field: keyof EntryFormLine, value: string) => {
    setFormLines(prev => prev.map(l => l.tempId === tempId ? { ...l, [field]: value } : l))
  }, [])

  const resetForm = useCallback(() => {
    setFormDate(getTodayString())
    setFormDesc('')
    setFormRef('')
    setFormSource('manual')
    setFormStatus('draft')
    setFormLines([createEmptyLine(), createEmptyLine()])
  }, [])

  const populateFormFromEntry = useCallback((entry: JournalEntry) => {
    setFormDate(entry.date ? entry.date.split('T')[0] : getTodayString())
    setFormDesc(entry.description)
    setFormRef(entry.reference || '')
    setFormSource(entry.sourceModule || 'manual')
    setFormStatus('draft')
    setFormLines(entry.lines.map(l => ({
      tempId: l.id,
      lineId: l.id,
      accountId: l.account.id,
      debit: l.debit > 0 ? String(l.debit) : '',
      credit: l.credit > 0 ? String(l.credit) : '',
      narration: l.narration || '',
    })))
  }, [])

  // ── Mutations ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<{id: string}>('/api/accounting', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (newEntry) => {
      toast.success('Journal entry created')
      setShowCreate(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      if (formStatus === 'posted' && newEntry?.id) {
        return apiFetch(`/api/accounting/${newEntry.id}`, { method: 'POST' })
          .then(() => { toast.success('Entry posted') })
          .catch(() => toast.error('Entry created but posting failed'))
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create entry'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/accounting/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Journal entry updated')
      setEditingEntry(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update entry'),
  })

  const postMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/accounting/${id}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Journal entry posted')
      setViewingEntry(null)
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to post entry'),
  })

  const voidMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/accounting/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Journal entry voided')
      setViewingEntry(null)
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to void entry'),
  })

  // ── Handlers ──────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!formDesc.trim()) { toast.error('Description is required'); return }
    const validLines = formLines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) { toast.error('At least 2 lines with account and amount required'); return }
    if (!isBalanced) { toast.error(`Entry unbalanced (off by ${formatNPR(balanceDiff)})`); return }

    const lines = validLines.map(l => ({
      ...(l.lineId ? { id: l.lineId } : {}),
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      narration: l.narration || null,
    }))

    const body = { date: formDate, description: formDesc, reference: formRef || null, sourceModule: formSource, lines }

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, body })
    } else {
      createMutation.mutate(body)
    }
  }, [formDesc, formLines, formDate, formRef, formSource, isBalanced, balanceDiff, editingEntry, createMutation, updateMutation])

  const handleEdit = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry)
    populateFormFromEntry(entry)
  }, [populateFormFromEntry])

  const handleAutoPostFilter = useCallback((mod: string) => {
    setSourceModule(mod)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setStatusFilter('all'); setStartDate(''); setEndDate(''); setSourceModule('all'); setSearch(''); setPage(1)
  }, [])

  const hasActiveFilters = statusFilter !== 'all' || startDate || endDate || sourceModule !== 'all' || !!search

  // ── Render ────────────────────────────────────────────────
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Journal Entries</h1>
          <p className="text-xs text-muted-foreground">Double-entry bookkeeping journal</p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { resetForm(); setShowCreate(true) }}>
          <Plus className="h-3.5 w-3.5" /> New Journal Entry
        </Button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <Card className="py-0">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', startDate && 'border-primary/50 bg-primary/5')}>
                  <Filter className="h-3 w-3" />
                  {startDate ? formatDateShort(startDate) : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" className="h-8 text-xs" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" className="h-8 text-xs" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
                  {(startDate || endDate) && (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}>Clear dates</Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={sourceModule} onValueChange={v => { setSourceModule(v); setPage(1) }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                {SOURCE_MODULES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search description / reference..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className={cn('pl-8 h-8 text-xs', search && 'pr-6')}
              />
              {search && (
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 hover:bg-red-200 transition-colors" onClick={() => { setSearch(''); setPage(1) }}>
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-[11px] text-muted-foreground" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-Posting Integration Panel ─────────────────── */}
      <Collapsible open={autoPostOpen} onOpenChange={setAutoPostOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground w-fit">
            {autoPostOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Auto-Posted by Module
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-wrap gap-2 mt-1 mb-1">
            {AUTO_POST_MODULES.map(m => {
              const count = autoPostSummary[m.key] || 0
              if (count === 0) return null
              const Icon = m.icon
              return (
                <Tooltip key={m.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleAutoPostFilter(m.key)}
                      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors hover:ring-2 hover:ring-primary/30', m.color)}
                    >
                      <Icon className="h-3 w-3" />
                      {m.label}
                      <Badge variant="secondary" className="ml-1 h-4 min-w-[18px] text-[10px] px-1 justify-center">{count}</Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Filter by {m.label}</TooltipContent>
                </Tooltip>
              )
            })}
            {Object.keys(autoPostSummary).length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No auto-posted entries in current view</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Entries Table ──────────────────────────────────── */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[calc(100vh-380px)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Source</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Created By</TableHead>
                  <TableHead className="text-xs w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-[70px]" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <AccountingError error={error} onRetry={() => queryClient.invalidateQueries({ queryKey: ['journal-entries'] })} title="Failed to load journal entries" />
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No journal entries found</p>
                      {hasActiveFilters && (
                        <Button variant="link" size="sm" className="h-7 text-xs" onClick={clearFilters}>Clear filters</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => {
                    const isExpanded = expandedId === entry.id
                    const totalAmt = entry.totalDebit ?? entry.lines.reduce((s, l) => s + l.debit, 0)
                    return (
                      <Fragment key={entry.id}>
                        <TableRow className={cn('cursor-pointer hover:bg-muted/50', isExpanded && 'bg-muted/30')}>
                          <TableCell className="w-8" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                            <span className={cn('inline-block transition-transform text-[10px] text-muted-foreground', isExpanded && 'rotate-90')}>▶</span>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap" onClick={() => setViewingEntry(entry)}>
                            {formatDateShort(entry.date)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono" onClick={() => setViewingEntry(entry)}>
                            {entry.reference || '—'}
                          </TableCell>
                          <TableCell className="font-medium text-xs max-w-[200px] truncate" onClick={() => setViewingEntry(entry)}>
                            {entry.description}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell" onClick={() => setViewingEntry(entry)}>
                            <SourceBadge module={entry.sourceModule} />
                          </TableCell>
                          <TableCell onClick={() => setViewingEntry(entry)}><StatusBadge status={entry.status} /></TableCell>
                          <TableCell className="text-right font-mono text-xs whitespace-nowrap" onClick={() => setViewingEntry(entry)}>
                            {formatNPR(totalAmt)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground" onClick={() => setViewingEntry(entry)}>
                            {entry.createdBy || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewingEntry(entry)}><Eye className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger><TooltipContent>View details</TooltipContent></Tooltip>
                              {entry.status === 'draft' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleEdit(entry)}><Pencil className="h-3.5 w-3.5" /></Button>
                                </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row: inline lines preview */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={9} className="px-6 py-3">
                              <div className="rounded-lg border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-[11px]">Account</TableHead>
                                      <TableHead className="text-[11px] hidden sm:table-cell">Narration</TableHead>
                                      <TableHead className="text-[11px] text-right">Debit</TableHead>
                                      <TableHead className="text-[11px] text-right">Credit</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entry.lines.map(line => (
                                      <TableRow key={line.id}>
                                        <TableCell className="font-mono text-[11px]">
                                          {line.account.code} — {line.account.name}
                                        </TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground hidden sm:table-cell">
                                          {line.narration || '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[11px]">
                                          {line.debit > 0 ? formatNPR(line.debit) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[11px]">
                                          {line.credit > 0 ? formatNPR(line.credit) : '—'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* ── Pagination ─────────────────────────────────── */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t">
                <p className="text-[11px] text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-7" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs px-2">Page {pagination.page} / {pagination.totalPages}</span>
                  <Button variant="outline" size="icon" className="size-7" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* ── Create / Edit Dialog ──────────────────────────── */}
      <Dialog open={showCreate || !!editingEntry} onOpenChange={open => { if (!open) { setShowCreate(false); setEditingEntry(null); resetForm() } }}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
            <DialogDescription>{editingEntry ? 'Modify the journal entry lines and details' : 'Create a new double-entry journal entry'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" className="h-8 text-xs" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Description *</Label>
                <Input placeholder="Enter description" className="h-8 text-xs" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Reference</Label>
                <Input placeholder="e.g. INV-001" className="h-8 text-xs" value={formRef} onChange={e => setFormRef(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Source Module</Label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_MODULES.filter(m => m.value !== 'all').map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Save As</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as 'draft' | 'posted')}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="posted">Post Immediately</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lines table */}
            <div className="rounded-md border">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <p className="text-xs font-semibold">Entry Lines</p>
                <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={addLine}>
                  <Plus className="h-3 w-3" /> Add Line
                </Button>
              </div>
              <ScrollArea className="max-h-[280px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-[40%]">Account</TableHead>
                      <TableHead className="text-[11px] text-right w-[15%]">Debit</TableHead>
                      <TableHead className="text-[11px] text-right w-[15%]">Credit</TableHead>
                      <TableHead className="text-[11px] hidden sm:table-cell">Narration</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formLines.map((line, idx) => (
                      <TableRow key={line.tempId}>
                        <TableCell className="p-1.5">
                          <Select value={line.accountId} onValueChange={v => updateLine(line.tempId, 'accountId', v)}>
                            <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.code} — {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input type="number" min="0" step="0.01" placeholder="0.00" className="h-7 text-[11px] text-right font-mono" value={line.debit} onChange={e => updateLine(line.tempId, 'debit', e.target.value)} />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input type="number" min="0" step="0.01" placeholder="0.00" className="h-7 text-[11px] text-right font-mono" value={line.credit} onChange={e => updateLine(line.tempId, 'credit', e.target.value)} />
                        </TableCell>
                        <TableCell className="p-1.5 hidden sm:table-cell">
                          <Input placeholder="Narration" className="h-7 text-[11px]" value={line.narration} onChange={e => updateLine(line.tempId, 'narration', e.target.value)} />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Button variant="ghost" size="icon" className="size-6 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30" onClick={() => removeLine(line.tempId)} disabled={formLines.length <= 2}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Balance indicator */}
              <div className="flex items-center justify-between px-3 py-2.5 border-t">
                <div className="flex items-center gap-4 text-[11px]">
                  <span>Total Debit: <strong className="font-mono">{formatNPR(totalDebit)}</strong></span>
                  <span>Total Credit: <strong className="font-mono">{formatNPR(totalCredit)}</strong></span>
                </div>
                {isBalanced ? (
                  <Badge variant="outline" className="text-[11px] gap-1 text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-3 w-3" /> Balanced
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[11px] gap-1">
                    <XCircle className="h-3 w-3" /> Off by {formatNPR(balanceDiff)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-8 text-xs" onClick={() => { setShowCreate(false); setEditingEntry(null); resetForm() }}>Cancel</Button>
            <Button className="h-8 text-xs" onClick={handleSave} disabled={isSaving || !isBalanced}>
              {isSaving && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {editingEntry ? 'Update Entry' : formStatus === 'posted' ? 'Save & Post' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Sheet ─────────────────────────────── */}
      <Sheet open={!!viewingEntry} onOpenChange={open => { if (!open) setViewingEntry(null) }}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto p-0">
          {viewingEntry && (
            <>
              <SheetHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-sm">Journal Entry Detail</SheetTitle>
                  <StatusBadge status={viewingEntry.status} />
                </div>
                <SheetDescription className="text-xs">
                  {formatDateShort(viewingEntry.date)}
                  {viewingEntry.reference && <span className="ml-2 font-mono">Ref: {viewingEntry.reference}</span>}
                </SheetDescription>
              </SheetHeader>

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium">{viewingEntry.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <SourceBadge module={viewingEntry.sourceModule} />
                    <span className="text-[11px] text-muted-foreground">by {viewingEntry.createdBy || 'Unknown'}</span>
                  </div>
                </div>

                <Separator />

                {/* Lines table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Account</TableHead>
                        <TableHead className="text-[11px] text-right">Debit</TableHead>
                        <TableHead className="text-[11px] text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingEntry.lines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div className="text-[11px] font-mono">{line.account.code}</div>
                            <div className="text-[11px]">{line.account.name}</div>
                            {line.narration && <div className="text-[10px] text-muted-foreground mt-0.5">{line.narration}</div>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px]">
                            {line.debit > 0 ? formatNPR(line.debit) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px]">
                            {line.credit > 0 ? formatNPR(line.credit) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-[11px]">Total Debit: <strong className="font-mono">{formatNPR(viewingEntry.totalDebit ?? 0)}</strong></p>
                    <p className="text-[11px]">Total Credit: <strong className="font-mono">{formatNPR(viewingEntry.totalCredit ?? 0)}</strong></p>
                  </div>
                  {(viewingEntry.totalDebit ?? 0) === (viewingEntry.totalCredit ?? 0) ? (
                    <Badge variant="outline" className="text-[11px] gap-1 text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle2 className="h-3 w-3" /> Balanced
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[11px] gap-1">
                      <XCircle className="h-3 w-3" /> Imbalanced
                    </Badge>
                  )}
                </div>

                {/* Posting audit info */}
                {viewingEntry.postedBy && (
                  <div className="rounded-md border bg-muted/20 px-3 py-2 space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">Posted by: <span className="font-medium text-foreground">{viewingEntry.postedBy}</span></p>
                    {viewingEntry.postedAt && (
                      <p className="text-[11px] text-muted-foreground">Posted at: <span className="font-medium text-foreground">{formatDateTime(viewingEntry.postedAt)}</span></p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingEntry.status === 'draft' && (
                    <>
                      <Tooltip><TooltipTrigger asChild>
                        <Button size="sm" variant="default" className="h-8 text-xs gap-1.5" disabled={postMutation.isPending} onClick={() => postMutation.mutate(viewingEntry.id)}>
                          {postMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Post Entry
                        </Button>
                      </TooltipTrigger><TooltipContent>Post this entry to the ledger</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setViewingEntry(null); handleEdit(viewingEntry) }}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </TooltipTrigger><TooltipContent>Edit this draft entry</TooltipContent></Tooltip>
                    </>
                  )}
                  {viewingEntry.status === 'posted' && (
                    <Tooltip><TooltipTrigger asChild>
                      <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" disabled={voidMutation.isPending} onClick={() => voidMutation.mutate(viewingEntry.id)}>
                        {voidMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                        Void Entry
                      </Button>
                    </TooltipTrigger><TooltipContent>Void this posted entry</TooltipContent></Tooltip>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  )
}