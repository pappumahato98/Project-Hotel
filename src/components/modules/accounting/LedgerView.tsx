'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, BookOpen } from 'lucide-react'
import { useState, Fragment } from 'react'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Account {
  id: string
  code: string
  name: string
  type: string
  description?: string
  active: boolean
  journalLines: { debit: number; credit: number }[]
}

const typeColors: Record<string, string> = {
  asset: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  liability: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
  equity: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  revenue: 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  expense: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
}

async function fetchAccounts() {
  const res = await fetch('/api/accounting')
  if (!res.ok) throw new Error('Failed to fetch accounting data')
  return res.json()
}

export function LedgerView() {
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accounting'],
    queryFn: fetchAccounts,
  })

  const filteredAccounts = data?.accounts?.filter((account: Account) => {
    if (filterType && account.type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        account.code.toLowerCase().includes(q) ||
        account.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  const getAccountBalance = (account: Account) => {
    const totalDebit = account.journalLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = account.journalLines.reduce((s, l) => s + l.credit, 0)
    if (account.type === 'asset' || account.type === 'expense') {
      return totalDebit - totalCredit
    }
    return totalCredit - totalDebit
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">General ledger account structure</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.accounts?.length ?? 0} accounts
        </Badge>
      </div>

      {/* Type Summary */}
      <div className="grid gap-4 sm:grid-cols-5">
        {Object.entries(data?.accountTypeBreakdown ?? {}).map(([type, count]: [string, unknown]) => (
          <Card key={type} className="p-3">
            <Badge variant="outline" className={typeColors[type] ?? ''}>
              <span className="capitalize">{type}</span>
            </Badge>
            <p className="mt-1 text-lg font-bold">{count as number}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Types</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="equity">Equity</option>
          <option value="revenue">Revenue</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  filteredAccounts?.map((account: Account) => {
                    const isExpanded = expandedAccount === account.id
                    const balance = getAccountBalance(account)
                    return (
                      <Fragment key={account.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                        >
                          <TableCell className="w-8">
                            <span className={cn(
                              'inline-block transition-transform',
                              isExpanded && 'rotate-90'
                            )}>▶</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{account.code}</TableCell>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={typeColors[account.type] ?? ''}>
                              <span className="capitalize">{account.type}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={account.active
                              ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                            }>
                              {account.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5} className="px-8 py-3">
                              <div className="text-sm space-y-1">
                                {account.description && (
                                  <p className="text-muted-foreground">{account.description}</p>
                                )}
                                <div className="flex gap-6 mt-2">
                                  <div>
                                    <span className="text-muted-foreground">Total Debit: </span>
                                    <span className="font-medium">{formatNPR(account.journalLines.reduce((s, l) => s + l.debit, 0))}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Credit: </span>
                                    <span className="font-medium">{formatNPR(account.journalLines.reduce((s, l) => s + l.credit, 0))}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Balance: </span>
                                    <span className={cn('font-bold', balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                                      {formatNPR(balance)}
                                    </span>
                                  </div>
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
    </div>
  )
}
