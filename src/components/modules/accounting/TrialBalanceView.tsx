'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { AccountingError } from './AccountingErrorBoundary'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CheckCircle2, XCircle, RefreshCw, Download, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort, toDateOnly, fromDateOnly } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface TrialAccount {
  accountId: string
  accountCode: string
  accountName: string
  type: string
  subtype: string | null
  department: string | null
  debitTotal: number
  creditTotal: number
  netBalance: number
  balanceNature: 'debit' | 'credit' | 'zero'
}

interface TrialSection {
  type: string
  label: string
  accounts: TrialAccount[]
  totalDebit: number
  totalCredit: number
  totalNetBalance: number
}

interface TrialData {
  reportType: string
  generatedAt: string
  dateRange: { startDate: string | null; endDate: string | null }
  sections: TrialSection[]
  accounts: TrialAccount[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  balanceDifference: number
}

// ── Config ───────────────────────────────────────────────────
const typeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  liability: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expense: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const natureColors: Record<string, string> = {
  debit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  credit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  zero: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export function TrialBalanceView() {
  const now = new Date()
  // Default to all-time (empty strings) so the API returns all posted entries
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generated, setGenerated] = useState(true)

  const { data, isLoading, error, refetch, isFetching } = useQuery<TrialData>({
    queryKey: ['trial-balance', startDate, endDate],
    queryFn: () => apiFetch(`/api/trial-balance?startDate=${startDate}&endDate=${endDate}`),
    enabled: generated,
  })

  // CSV export
  const handleExportCSV = () => {
    if (!data) return
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit Total', 'Credit Total', 'Net Balance', 'Nature']
    const rows = data.accounts.map(a => [
      a.accountCode, a.accountName, a.type, a.debitTotal.toFixed(2), a.creditTotal.toFixed(2), a.netBalance.toFixed(2), a.balanceNature
    ])
    rows.push(['', '', 'GRAND TOTAL', data.totalDebit.toFixed(2), data.totalCredit.toFixed(2), '', data.isBalanced ? 'Balanced' : `Diff: ${data.balanceDifference.toFixed(2)}`])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `trial-balance-${startDate}-to-${endDate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Trial Balance</h1>
          <p className="text-xs text-muted-foreground">
            {data ? `Generated ${formatDateShort(data.generatedAt)}` : 'Set date range and click Generate'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching || !generated}>
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportCSV} disabled={isLoading || !data}>
            <Download className="h-3 w-3 mr-1" />Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="grid gap-1.5">
          <Label className="text-xs">Start Date</Label>
          <Input className="h-7 text-xs w-36" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setGenerated(false) }} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">End Date</Label>
          <Input className="h-7 text-xs w-36" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setGenerated(false) }} />
        </div>
        <div className="flex items-end">
          <Button size="sm" className="h-7 text-xs" onClick={() => setGenerated(true)} disabled={generated}>
            Generate
          </Button>
        </div>
      </div>

      {/* Balance indicator */}
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : error ? (
        <AccountingError error={error} onRetry={() => refetch()} title="Failed to generate trial balance" />
      ) : data && (
        <div className={cn(
          'flex items-center gap-3 rounded-md border p-3',
          data.isBalanced ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
        )}>
          {data.isBalanced
            ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
          <div className="text-xs">
            <Badge variant="outline" className={cn('text-xs mr-2', data.isBalanced ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200')}>
              {data.isBalanced ? 'Balanced' : 'Out of Balance'}
            </Badge>
            <span className="text-muted-foreground ml-1">
              Dr: {formatNPR(data.totalDebit)} / Cr: {formatNPR(data.totalCredit)}
              {!data.isBalanced && <span className="text-red-600 font-medium ml-2">Diff: {formatNPR(data.balanceDifference)}</span>}
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5"><ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Total Debit</p><p className="text-sm font-semibold truncate">{formatNPR(data.totalDebit)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5"><ArrowDownRight className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Total Credit</p><p className="text-sm font-semibold truncate">{formatNPR(data.totalCredit)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-1.5"><Scale className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Accounts</p><p className="text-sm font-semibold truncate">{data.accounts.length}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-1.5', data.isBalanced ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                <Scale className={cn('h-3.5 w-3.5', data.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Difference</p>
                <p className={cn('text-sm font-semibold truncate', data.isBalanced ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(Math.abs(data.balanceDifference))}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Trial Balance Table by Sections */}
      {isLoading ? (
        <Card className="p-3"><div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div></Card>
      ) : !data ? (
        <Card className="p-8 text-center">
          <Scale className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Select a date range and click Generate to view the trial balance</p>
        </Card>
      ) : (
        <Card className="p-3">
          <div className="max-h-[500px] overflow-y-auto">
            {data.sections.map(section => (
              <div key={section.type} className="mb-4">
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2 sticky top-0 z-10 bg-card py-1">
                  <Badge variant="outline" className={cn('text-xs', typeColors[section.type] ?? '')}>{section.label}</Badge>
                  <span className="text-xs text-muted-foreground">({section.accounts.length} accounts)</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-6 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                      <TableHead className="text-xs h-8">Account Code</TableHead>
                      <TableHead className="text-xs h-8">Account Name</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden md:table-cell">Debit Total</TableHead>
                      <TableHead className="text-xs h-8 text-right hidden md:table-cell">Credit Total</TableHead>
                      <TableHead className="text-xs h-8 text-right">Net Balance</TableHead>
                      <TableHead className="text-xs h-8 hidden sm:table-cell">Nature</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.accounts.map(a => (
                      <TableRow key={a.accountId} className="text-xs">
                        <TableCell className="font-mono py-1.5 text-muted-foreground">{a.accountCode}</TableCell>
                        <TableCell className="py-1.5 font-medium">{a.accountName}</TableCell>
                        <TableCell className="py-1.5 text-right hidden md:table-cell">{a.debitTotal > 0 ? formatNPR(a.debitTotal) : '—'}</TableCell>
                        <TableCell className="py-1.5 text-right hidden md:table-cell">{a.creditTotal > 0 ? formatNPR(a.creditTotal) : '—'}</TableCell>
                        <TableCell className={cn('py-1.5 text-right font-medium', a.balanceNature === 'debit' ? 'text-blue-600' : a.balanceNature === 'credit' ? 'text-amber-600' : 'text-muted-foreground')}>
                          {a.netBalance > 0 ? formatNPR(a.netBalance) : '—'}
                        </TableCell>
                        <TableCell className="py-1.5 hidden sm:table-cell">
                          <Badge variant="outline" className={cn('text-xs', natureColors[a.balanceNature] ?? '')}>
                            {a.balanceNature === 'debit' ? 'Dr' : a.balanceNature === 'credit' ? 'Cr' : '—'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Section subtotal */}
                    <TableRow className="text-xs font-semibold bg-muted/30">
                      <TableCell className="py-2" colSpan={2}><span className="text-muted-foreground">Subtotal — {section.label}</span></TableCell>
                      <TableCell className="py-2 text-right hidden md:table-cell">{formatNPR(section.totalDebit)}</TableCell>
                      <TableCell className="py-2 text-right hidden md:table-cell">{formatNPR(section.totalCredit)}</TableCell>
                      <TableCell className="py-2 text-right">{formatNPR(section.totalNetBalance)}</TableCell>
                      <TableCell className="py-2 hidden sm:table-cell" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}
            {/* Grand total row */}
            <div className="border-t-2 mt-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold px-2">
                <span>Grand Total</span>
                <div className="flex items-center gap-6">
                  <span className="hidden md:inline">Dr: {formatNPR(data.totalDebit)}</span>
                  <span className="hidden md:inline">Cr: {formatNPR(data.totalCredit)}</span>
                  <Badge variant="outline" className={cn(data.isBalanced ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200')}>
                    {data.isBalanced ? '✓ Balanced' : `✗ Diff: ${formatNPR(data.balanceDifference)}`}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
