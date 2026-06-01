'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react'
import { formatNPR } from '@/lib/utils'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4']

async function fetchAccounting() {
  const res = await fetch('/api/accounting')
  if (!res.ok) throw new Error('Failed to fetch accounting data')
  return res.json()
}

// Mock P&L data
const plData = {
  revenue: { room: 1250000, foodAndBeverage: 450000, spa: 85000, banquet: 320000, other: 45000 },
  expenses: { salaries: 580000, utilities: 125000, supplies: 68000, maintenance: 45000, marketing: 35000, other: 22000 },
}

const balanceSheetData = {
  assets: { cash: 850000, receivables: 125000, inventory: 78000, fixedAssets: 12500000 },
  liabilities: { payables: 245000, loans: 3200000, taxes: 45000 },
  equity: 10000000,
}

const revenueByDept = [
  { department: 'Rooms', revenue: 1250000 },
  { department: 'F&B', revenue: 450000 },
  { department: 'Banquet', revenue: 320000 },
  { department: 'Spa', revenue: 85000 },
  { department: 'Other', revenue: 45000 },
]

async function fetchOperations() {
  const res = await fetch('/api/operations')
  if (!res.ok) throw new Error('Failed to fetch operations')
  return res.json()
}

export function FinancialReportsView() {
  const { data: accountingData } = useQuery({
    queryKey: ['accounting-reports'],
    queryFn: fetchAccounting,
  })

  const { data: opsData } = useQuery({
    queryKey: ['operations-reports'],
    queryFn: fetchOperations,
  })

  const totalRevenue = Object.values(plData.revenue).reduce((s, v) => s + v, 0)
  const totalExpenses = Object.values(plData.expenses).reduce((s, v) => s + v, 0)
  const netIncome = totalRevenue - totalExpenses
  const profitMargin = ((netIncome / totalRevenue) * 100).toFixed(1)

  const totalAssets = Object.values(balanceSheetData.assets).reduce((s, v) => s + v, 0)
  const totalLiabilities = Object.values(balanceSheetData.liabilities).reduce((s, v) => s + v, 0)
  const totalEquity = balanceSheetData.equity + netIncome

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
          <div className="space-y-3">
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
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span className="text-green-600">Net Income</span>
              <span className="text-green-600">{formatNPR(netIncome)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Department Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Balance Sheet Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
              <div className="flex justify-between font-bold pt-2 border-t">
                <span className="text-purple-600">Net Equity</span>
                <span className="text-purple-600">{formatNPR(totalEquity)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
