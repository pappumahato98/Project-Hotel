'use client'
import { toast } from 'sonner'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Search, X, Trash2 } from 'lucide-react'
import { useState, Fragment } from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getTodayString } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface JournalLine {
  id: string
  account: { id: string; code: string; name: string; type: string }
  debit: number
  credit: number
  narration?: string
}

interface JournalEntry {
  id: string
  date: string
  description: string
  reference?: string
  status: string
  createdBy?: string
  lines: JournalLine[]
}

interface LedgerAccount {
  id: string
  code: string
  name: string
  type: string
}

// ── Form line type ──────────────────────────────────────────
interface NewLine {
  tempId: string
  accountId: string
  debit: string
  credit: string
  narration: string
}

function createEmptyLine(): NewLine {
  return { tempId: crypto.randomUUID(), accountId: '', debit: '', credit: '', narration: '' }
}

// ── Data fetching ────────────────────────────────────────────
function fetchAccounting() {
  return apiFetch('/api/accounting')
}

export function JournalView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [showNewEntry, setShowNewEntry] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(getTodayString())
  const [formDescription, setFormDescription] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formLines, setFormLines] = useState<NewLine[]>([createEmptyLine(), createEmptyLine()])

  const { data, isLoading } = useQuery<{ accounts: LedgerAccount[]; journalEntries: JournalEntry[] }>({
    queryKey: ['accounting'],
    queryFn: fetchAccounting,
  })

  const accounts: LedgerAccount[] = data?.accounts ?? []

  const filteredEntries = data?.journalEntries?.filter((entry: JournalEntry) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      entry.description.toLowerCase().includes(q) ||
      (entry.reference?.toLowerCase().includes(q) ?? false)
    )
  })

  const getDebitTotal = (entry: JournalEntry) => entry.lines.reduce((s, l) => s + l.debit, 0)
  const getCreditTotal = (entry: JournalEntry) => entry.lines.reduce((s, l) => s + l.credit, 0)

  // Computed totals for the new entry form
  const totalDebit = formLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = formLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanceDiff = Math.abs(totalDebit - totalCredit)
  const isBalanced = balanceDiff <= 0.01

  // Line management
  const addLine = () => setFormLines((prev) => [...prev, createEmptyLine()])
  const removeLine = (tempId: string) => {
    if (formLines.length <= 2) {
      toast.error('Journal entry must have at least 2 lines')
      return
    }
    setFormLines((prev) => prev.filter((l) => l.tempId !== tempId))
  }
  const updateLine = (tempId: string, field: keyof NewLine, value: string) => {
    setFormLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, [field]: value } : l)),
    )
  }

  // Reset form
  const resetForm = () => {
    setFormDate(getTodayString())
    setFormDescription('')
    setFormReference('')
    setFormLines([createEmptyLine(), createEmptyLine()])
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/accounting', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Journal entry created')
      setShowNewEntry(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
    onError: () => toast.error('Failed to create journal entry'),
  })

  const handleSubmit = () => {
    if (!formDescription.trim()) {
      toast.error('Description is required')
      return
    }

    const validLines = formLines.filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) {
      toast.error('At least 2 lines with account and amount are required')
      return
    }

    if (!isBalanced) {
      toast.error(`Debits and credits must balance (difference: ${formatNPR(balanceDiff)})`)
      return
    }

    const lines = validLines.map((l) => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      narration: l.narration || null,
    }))

    createMutation.mutate({
      date: formDate,
      description: formDescription,
      reference: formReference || null,
      status: 'draft',
      lines,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Journal Entries</h1>
          <p className="text-xs text-muted-foreground">Double-entry bookkeeping journal</p>
        </div>
        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowNewEntry(true)}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9', searchQuery && 'pr-7')}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Journal Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden md:table-cell">Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Debit Total</TableHead>
                  <TableHead className="text-right">Credit Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEntries?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No journal entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries?.map((entry: JournalEntry) => {
                    const isExpanded = expandedEntry === entry.id
                    const isBalanced = getDebitTotal(entry) === getCreditTotal(entry)
                    return (
                      <Fragment key={entry.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        >
                          <TableCell className="w-8">
                            <span className={cn(
                              'inline-block transition-transform text-xs',
                              isExpanded && 'rotate-90'
                            )}>▶</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="font-medium">{entry.description}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {entry.reference ?? '—'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={entry.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNPR(getDebitTotal(entry))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNPR(getCreditTotal(entry))}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${entry.id}-lines`} className="bg-muted/30">
                            <TableCell colSpan={7} className="px-4 py-2.5">
                              <div className="space-y-1">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Account</TableHead>
                                      <TableHead>Narration</TableHead>
                                      <TableHead className="text-right">Debit</TableHead>
                                      <TableHead className="text-right">Credit</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {entry.lines.map((line: JournalLine) => (
                                      <TableRow key={line.id}>
                                        <TableCell className="font-mono text-xs">
                                          {line.account.code} - {line.account.name}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {line.narration ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {line.debit > 0 ? formatNPR(line.debit) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {line.credit > 0 ? formatNPR(line.credit) : '—'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant={isBalanced ? 'outline' : 'destructive'} className="text-xs">
                                    {isBalanced ? '✓ Balanced' : '✗ Imbalanced'}
                                  </Badge>
                                </div>
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
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={showNewEntry} onOpenChange={(open) => { if (!open) { setShowNewEntry(false); resetForm() } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Create a new double-entry journal entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description *</Label>
                <Input placeholder="Enter description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input placeholder="Optional reference (e.g. INV-001)" value={formReference} onChange={(e) => setFormReference(e.target.value)} />
            </div>

            {/* Lines */}
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Entry Lines</p>
                <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={addLine}>
                  <Plus className="h-3 w-3" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {formLines.map((line, idx) => (
                  <div key={line.tempId} className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 items-start">
                    <Select value={line.accountId} onValueChange={(v) => updateLine(line.tempId, 'accountId', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Debit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(line.tempId, 'debit', e.target.value)}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="Credit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(line.tempId, 'credit', e.target.value)}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="Narration"
                      value={line.narration}
                      onChange={(e) => updateLine(line.tempId, 'narration', e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => removeLine(line.tempId)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Balance validation */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-3 text-xs">
                  <span>Total Debit: <strong>{formatNPR(totalDebit)}</strong></span>
                  <span>Total Credit: <strong>{formatNPR(totalCredit)}</strong></span>
                </div>
                <Badge variant={isBalanced ? 'outline' : 'destructive'} className="text-[11px]">
                  {isBalanced ? '✓ Balanced' : `✗ Off by ${formatNPR(balanceDiff)}`}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewEntry(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
