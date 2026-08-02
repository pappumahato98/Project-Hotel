'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, ArrowDown, ArrowRight, Wallet, Activity, Building2, Landmark } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface CashFlowItem {
  accountName: string
  amount: number
  type: 'inflow' | 'outflow'
}

interface CashFlowCategory {
  inflows: number
  outflows: number
  net: number
  items: CashFlowItem[]
}

interface CashFlowData {
  period: string
  generatedAt: string
  operating: CashFlowCategory
  investing: CashFlowCategory
  financing: CashFlowCategory
  netCashFlow: number
  beginningCash: number
  endingCash: number
}

// ── Config ───────────────────────────────────────────────────
const periodLabels: Record<string, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  'all-time': 'All Time',
}

const categoryConfig = [
  { key: 'operating' as const, label: 'Operating Activities', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { key: 'investing' as const, label: 'Investing Activities', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { key: 'financing' as const, label: 'Financing Activities', icon: Landmark, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
]

export function CashFlowView() {
  const [period, setPeriod] = useState('this-month')

  const { data, isLoading } = useQuery<CashFlowData>({
    queryKey: ['cash-flow', period],
    queryFn: () => apiFetch(`/api/cash-flow?period=${period}`),
  })

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Cash Flow Statement</h1>
          <p className="text-xs text-muted-foreground">
            {data ? `Generated ${formatDateTime(data.generatedAt)}` : 'Computing...'}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              <div className={cn(
                'rounded-full p-1.5',
                (data?.netCashFlow ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {(data?.netCashFlow ?? 0) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Net Cash Flow</p>
                <p className={cn('text-sm font-semibold truncate', (data?.netCashFlow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data?.netCashFlow ?? 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'rounded-full p-1.5',
                (data?.operating.net ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {(data?.operating.net ?? 0) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Operating Net</p>
                <p className={cn('text-sm font-semibold truncate', (data?.operating.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data?.operating.net ?? 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'rounded-full p-1.5',
                (data?.investing.net ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {(data?.investing.net ?? 0) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Investing Net</p>
                <p className={cn('text-sm font-semibold truncate', (data?.investing.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data?.investing.net ?? 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'rounded-full p-1.5',
                (data?.financing.net ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                {(data?.financing.net ?? 0) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Financing Net</p>
                <p className={cn('text-sm font-semibold truncate', (data?.financing.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data?.financing.net ?? 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3 Category Sections */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-40 w-full" /></Card>)}
        </div>
      ) : data && (
        <div className="space-y-3">
          {categoryConfig.map(cat => {
            const category = data[cat.key]
            const Icon = cat.icon
            const inflows = category.items.filter(i => i.type === 'inflow')
            const outflows = category.items.filter(i => i.type === 'outflow')
            return (
              <Card key={cat.key} className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('rounded-full p-1.5', cat.bgColor)}>
                      <Icon className={cn('h-3.5 w-3.5', cat.color)} />
                    </div>
                    <h2 className="text-xs font-semibold">{cat.label}</h2>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold',
                    category.net >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {category.net >= 0 ? '+' : ''}{formatNPR(category.net)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {/* Inflows */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Inflows</span>
                      <span className="text-xs font-medium text-green-600">{formatNPR(category.inflows)}</span>
                    </div>
                    {inflows.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 py-1">No inflows</p>
                    ) : (
                      <div className="space-y-1">
                        {inflows.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">{item.accountName}</span>
                            <span className="text-green-600 shrink-0">{formatNPR(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outflows */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Outflows</span>
                      <span className="text-xs font-medium text-red-600">{formatNPR(category.outflows)}</span>
                    </div>
                    {outflows.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 py-1">No outflows</p>
                    ) : (
                      <div className="space-y-1">
                        {outflows.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">{item.accountName}</span>
                            <span className="text-red-600 shrink-0">({formatNPR(item.amount)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary / Waterfall */}
      {isLoading ? (
        <Card className="p-4"><Skeleton className="h-32 w-full" /></Card>
      ) : data && (
        <Card className="p-3">
          <p className="text-xs font-semibold mb-3">Cash Flow Summary</p>
          <div className="space-y-3">
            {/* Beginning Cash */}
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Beginning Cash Balance</p>
              </div>
              <p className="text-sm font-semibold">{formatNPR(data.beginningCash)}</p>
            </div>

            <div className="flex items-center gap-2 px-2">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{periodLabels[data.period] ?? data.period}</span>
              <Separator className="flex-1" />
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Net Cash Flow breakdown */}
            <div className="pl-4 space-y-1.5 border-l-2 border-muted">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Operating Activities</span>
                <span className={cn('font-medium', data.operating.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {data.operating.net >= 0 ? '+' : ''}{formatNPR(data.operating.net)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Investing Activities</span>
                <span className={cn('font-medium', data.investing.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {data.investing.net >= 0 ? '+' : ''}{formatNPR(data.investing.net)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Financing Activities</span>
                <span className={cn('font-medium', data.financing.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {data.financing.net >= 0 ? '+' : ''}{formatNPR(data.financing.net)}
                </span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Net Cash Flow</span>
                <span className={cn('font-semibold', data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {data.netCashFlow >= 0 ? '+' : ''}{formatNPR(data.netCashFlow)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Separator className="flex-1" />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Ending Cash */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-full p-1.5',
                data.endingCash >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}>
                <Wallet className={cn(
                  'h-3.5 w-3.5',
                  data.endingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Ending Cash Balance</p>
              </div>
              <p className={cn('text-sm font-bold', data.endingCash >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatNPR(data.endingCash)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
