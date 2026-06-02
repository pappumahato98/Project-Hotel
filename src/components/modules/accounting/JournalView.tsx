'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Search, FileText } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

async function fetchAccounting() {
  const res = await fetch('/api/accounting')
  if (!res.ok) throw new Error('Failed to fetch accounting data')
  return res.json()
}

export function JournalView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [showNewEntry, setShowNewEntry] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['accounting'],
    queryFn: fetchAccounting,
  })

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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-sm text-muted-foreground">Double-entry bookkeeping journal</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowNewEntry(true)}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Journal Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
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
                      <>
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        >
                          <TableCell className="w-8">
                            <span className={cn(
                              'inline-block transition-transform text-xs',
                              isExpanded && 'rotate-90'
                            )}>▶</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="font-medium">{entry.description}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
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
                            <TableCell colSpan={7} className="px-8 py-3">
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
                                        <TableCell className="font-mono text-sm">
                                          {line.account.code} - {line.account.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
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
                      </>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Create a new double-entry journal entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Enter description" />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input placeholder="Optional reference" />
            </div>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Debit Lines</p>
              <Input className="mt-2" placeholder="Account code" />
              <Input className="mt-2" placeholder="Amount" type="number" />
            </div>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Credit Lines</p>
              <Input className="mt-2" placeholder="Account code" />
              <Input className="mt-2" placeholder="Amount" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEntry(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Journal entry saved as draft'); setShowNewEntry(false) }}>Save as Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
