'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react'
import { formatNPR } from '@/lib/utils'
import { toast } from 'sonner'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4']

async function fetchAccounting() {
  const res = await fetch('/api/accounting')
  if (!res.ok) throw new Error('Failed to fetch accounting data')
  return res.json()
}

// ── Types ────────────────────────────────────────────────────
interface JournalLine {
  debit: number
  credit: number
  account: { type: string; name: string; code: string }
}

interface JournalEntry {
  id: string
  date: string
  lines: JournalLine[]
}

interface LedgerAccount {
  id: string
  code: string
  name: string
  type: string
  journalLines: { debit: number; credit: number }[]
}

// ── Compute P&L from real data ──────────────────────────────
function computePLData(accounts: LedgerAccount[], journalEntries: JournalEntry[]) {
  // Group accounts by type and compute totals from journal lines
  const revenueAccounts = accounts.filter((a) => a.type === 'revenue')
  const expenseAccounts = accounts.filter((a) => a.type === 'expense')

  const revenue: Record<string, number> = {}
  const expenses: Record<string, number> = {}

  for (const account of revenueAccounts) {
    const creditTotal = account.journalLines.reduce((s, l) => s + l.credit, 0)
    revenue[account.name] = creditTotal
  }

  for (const account of expenseAccounts) {
    const debitTotal = account.journalLines.reduce((s, l) => s + l.debit, 0)
    expenses[account.name] = debitTotal
  }

  return { revenue, expenses }
}

function computeBalanceSheet(accounts: LedgerAccount[]) {
  const assetAccounts = accounts.filter((a) => a.type === 'asset')
  const liabilityAccounts = accounts.filter((a) => a.type === 'liability')
  const equityAccounts = accounts.filter((a) => a.type === 'equity')

  const assets: Record<string, number> = {}
  const liabilities: Record<string, number> = {}
  let equity = 0

  for (const account of assetAccounts) {
    const balance = account.journalLines.reduce((s, l) => s + l.debit - l.credit, 0)
    if (balance > 0) assets[account.name] = balance
  }

  for (const account of liabilityAccounts) {
    const balance = account.journalLines.reduce((s, l) => s + l.credit - l.debit, 0)
    if (balance > 0) liabilities[account.name] = balance
  }

  for (const account of equityAccounts) {
    const balance = account.journalLines.reduce((s, l) => s + l.credit - l.debit, 0)
    if (balance > 0) equity += balance
  }

  return { assets, liabilities, equity }
}

export function FinancialReportsView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['accounting-reports'],
    queryFn: fetchAccounting,
  })

  const accounts: LedgerAccount[] = data?.accounts ?? []
  const journalEntries: JournalEntry[] = data?.journalEntries ?? []

  const plData = computePLData(accounts, journalEntries)
  const balanceSheetData = computeBalanceSheet(accounts)

  const totalRevenue = Object.values(plData.revenue).reduce((s, v) => s + v, 0)
  const totalExpenses = Object.values(plData.expenses).reduce((s, v) => s + v, 0)
  const netIncome = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'

  const totalAssets = Object.values(balanceSheetData.assets).reduce((s, v) => s + v, 0)
  const totalLiabilities = Object.values(balanceSheetData.liabilities).reduce((s, v) => s + v, 0)
  const totalEquity = balanceSheetData.equity + netIncome

  const revenueByDept = [
    ...Object.entries(plData.revenue).map(([department, revenue]) => ({ department, revenue })),
    { department: 'Other', revenue: 0 },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError) {
    toast.error('Failed to load financial reports')
    return (
      <div className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load financial reports</p>
          <p className="text-sm text-red-500/70 mt-1">{error?.message || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">P&L Summary, Balance Sheet, and Revenue Analytics</p>
      </div>

      {/* Quick KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className="text-lg font-bold text-green-600">{formatNPR(netIncome)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold">{formatNPR(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-red-600">{formatNPR(totalExpenses)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Scale className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <p className="text-2xl font-bold">{profitMargin}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* P&L Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(plData.revenue).length === 0 && Object.keys(plData.expenses).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No financial data available yet. Post journal entries to see reports.</p>
          ) : (
            <div className="space-y-3">
              {Object.keys(plData.revenue).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-600 mb-2">Revenue</h4>
                  <div className="grid gap-1 text-sm pl-4">
                    {Object.entries(plData.revenue).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium">{formatNPR(value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-1 border-t">
                      <span>Total Revenue</span>
                      <span>{formatNPR(totalRevenue)}</span>
                    </div>
                  </div>
                </div>
              )}
              {Object.keys(plData.expenses).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2">Expenses</h4>
                  <div className="grid gap-1 text-sm pl-4">
                    {Object.entries(plData.expenses).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium">{formatNPR(value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-1 border-t">
                      <span>Total Expenses</span>
                      <span className="text-red-600">{formatNPR(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span className="text-green-600">Net Income</span>
                <span className="text-green-600">{formatNPR(netIncome)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Department Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDept.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No revenue data available yet.
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByDept} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatNPR(value)} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {revenueByDept.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Balance Sheet Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(balanceSheetData.assets).length === 0 && Object.keys(balanceSheetData.liabilities).length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No balance sheet data available yet.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(balanceSheetData.assets).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-600 mb-2">Assets</h4>
                    <div className="grid gap-1 text-sm pl-4">
                      {Object.entries(balanceSheetData.assets).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-medium">{formatNPR(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total Assets</span>
                        <span>{formatNPR(totalAssets)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {Object.keys(balanceSheetData.liabilities).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-orange-600 mb-2">Liabilities</h4>
                    <div className="grid gap-1 text-sm pl-4">
                      {Object.entries(balanceSheetData.liabilities).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-medium">{formatNPR(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total Liabilities</span>
                        <span className="text-red-600">{formatNPR(totalLiabilities)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span className="text-purple-600">Net Equity</span>
                  <span className="text-purple-600">{formatNPR(totalEquity)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
