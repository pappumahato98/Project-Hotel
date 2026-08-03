'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { CheckCircle2, XCircle, RefreshCw, Download, Scale, Hash, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface TrialAccount {
  code: string
  name: string
  type: string
  debitTotal: number
  creditTotal: number
  balance: number
}

interface TrialData {
  generatedAt: string
  accounts: TrialAccount[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
}

// ── Config ───────────────────────────────────────────────────
const typeColors: Record<string, string> = {
  Asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Liability: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Expense: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const debitNormalTypes = ['Asset', 'Expense']

export function TrialBalanceView() {
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery<TrialData>({
    queryKey: ['trial-balance'],
    queryFn: () => apiFetch('/api/trial-balance'),
  })

  // Filter accounts
  const filteredAccounts = data?.accounts.filter(a => {
    if (typeFilter && a.type !== typeFilter) return false
    // Only show accounts with activity
    return a.debitTotal > 0 || a.creditTotal > 0
  }) ?? []

  // Type summary
  const typeSummary = filteredAccounts.reduce<Record<string, { debit: number; credit: number; balance: number; count: number }>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = { debit: 0, credit: 0, balance: 0, count: 0 }
    acc[a.type].debit += a.debitTotal
    acc[a.type].credit += a.creditTotal
    acc[a.type].balance += a.balance
    acc[a.type].count++
    return acc
  }, {})

  // CSV export
  const handleExportCSV = () => {
    if (!data) return
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit Total', 'Credit Total', 'Balance']
    const rows = filteredAccounts.map(a => [
      a.code, a.name, a.type, a.debitTotal.toFixed(2), a.creditTotal.toFixed(2), a.balance.toFixed(2)
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Trial Balance</h1>
          <p className="text-xs text-muted-foreground">
            {data ? `Generated ${formatDateTime(data.generatedAt)}` : 'Computing...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportCSV} disabled={isLoading}>
            <Download className="h-3 w-3 mr-1" />Export CSV
          </Button>
        </div>
      </div>

      {/* Balance indicator */}
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : data && (
        <div className={cn(
          'flex items-center gap-3 rounded-md border p-3',
          data.isBalanced
            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
            : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
        )}>
          {data.isBalanced
            ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
          <div className="text-xs">
            <span className={cn('font-semibold', data.isBalanced ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
              {data.isBalanced ? 'Balanced' : 'Out of Balance'}
            </span>
            <span className="text-muted-foreground ml-2">
              Debit: {formatNPR(data.totalDebit)} / Credit: {formatNPR(data.totalCredit)}
              {!data.isBalanced && (
                <span className="text-red-600 font-medium ml-2">
                  Difference: {formatNPR(Math.abs(data.totalDebit - data.totalCredit))}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

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
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Debit</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.totalDebit ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <ArrowDownRight className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Credit</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.totalCredit ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-1.5">
                <Hash className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Accounts</p>
                <p className="text-sm font-semibold truncate">{filteredAccounts.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'rounded-full p-1.5',
                data?.isBalanced ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                <Scale className={cn(
                  'h-3.5 w-3.5',
                  data?.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Status</p>
                <p className={cn('text-sm font-semibold truncate', data?.isBalanced ? 'text-green-600' : 'text-red-600')}>
                  {data?.isBalanced ? 'Balanced' : 'Unbalanced'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Account type filter */}
      <div className="flex items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Asset">Asset</SelectItem>
            <SelectItem value="Liability">Liability</SelectItem>
            <SelectItem value="Equity">Equity</SelectItem>
            <SelectItem value="Revenue">Revenue</SelectItem>
            <SelectItem value="Expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filteredAccounts.length} accounts</Badge>
      </div>

      {/* Trial Balance Table */}
      <Card className="p-2.5">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Code</TableHead>
                  <TableHead className="text-xs h-8">Account Name</TableHead>
                  <TableHead className="text-xs h-8">Type</TableHead>
                  <TableHead className="text-xs h-8 text-right">Debit Total</TableHead>
                  <TableHead className="text-xs h-8 text-right">Credit Total</TableHead>
                  <TableHead className="text-xs h-8 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-6">No accounts with activity</TableCell></TableRow>
                )}
                {filteredAccounts.map(a => {
                  const isNormalBalance = a.balance >= 0
                  return (
                    <TableRow key={a.code} className="text-xs">
                      <TableCell className="font-mono py-1.5 text-muted-foreground">{a.code}</TableCell>
                      <TableCell className="py-1.5 font-medium">{a.name}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', typeColors[a.type] ?? '')}>{a.type}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right">{a.debitTotal > 0 ? formatNPR(a.debitTotal) : '—'}</TableCell>
                      <TableCell className="py-1.5 text-right">{a.creditTotal > 0 ? formatNPR(a.creditTotal) : '—'}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium', isNormalBalance ? 'text-green-600' : 'text-red-600')}>
                        {a.balance < 0 ? `(${formatNPR(Math.abs(a.balance))})` : formatNPR(a.balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Type Summary */}
      {!isLoading && Object.keys(typeSummary).length > 0 && (
        <Card className="p-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Summary by Account Type</p>
          <div className="max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Type</TableHead>
                  <TableHead className="text-xs h-8"># Accounts</TableHead>
                  <TableHead className="text-xs h-8 text-right">Total Debit</TableHead>
                  <TableHead className="text-xs h-8 text-right">Total Credit</TableHead>
                  <TableHead className="text-xs h-8 text-right">Net Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(typeSummary).sort(([a], [b]) => a.localeCompare(b)).map(([type, s]) => {
                  const isDebitNormal = debitNormalTypes.includes(type)
                  const net = isDebitNormal ? s.debit - s.credit : s.credit - s.debit
                  return (
                    <TableRow key={type} className="text-xs">
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', typeColors[type] ?? '')}>{type}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5">{s.count}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(s.debit)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(s.credit)}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium', net >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {net < 0 ? `(${formatNPR(Math.abs(net))})` : formatNPR(net)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
