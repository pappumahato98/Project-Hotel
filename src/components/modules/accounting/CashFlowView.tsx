'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { AccountingError } from './AccountingErrorBoundary'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Wallet, Activity, Building2, Landmark } from 'lucide-react'
import { useState, useMemo } from 'react'
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operating', 'investing', 'financing']))

  const { data, isLoading, error, refetch, isFetching } = useQuery<CashFlowData>({
    queryKey: ['cash-flow', period],
    queryFn: () => apiFetch(`/api/cash-flow?period=${period}`),
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  // Compute max absolute amount for bar widths
  const maxAbsAmount = useMemo(() => {
    if (!data) return 1
    const allAmounts = [
      data.operating.inflows, data.operating.outflows,
      data.investing.inflows, data.investing.outflows,
      data.financing.inflows, data.financing.outflows,
    ]
    return Math.max(...allAmounts.map(Math.abs), 1)
  }, [data])

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
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <TrendingUp className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : error ? (
        <AccountingError error={error} onRetry={() => refetch()} title="Failed to load cash flow data" />
      ) : data && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5">
                <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Beginning Cash</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data.beginningCash)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-1.5', data.netCashFlow >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                {data.netCashFlow >= 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Net Cash Flow</p>
                <p className={cn('text-sm font-semibold truncate', data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {data.netCashFlow >= 0 ? '+' : ''}{formatNPR(data.netCashFlow)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-1.5', data.endingCash >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                <Wallet className={cn('h-3.5 w-3.5', data.endingCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Ending Cash</p>
                <p className={cn('text-sm font-bold truncate', data.endingCash >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatNPR(data.endingCash)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3 Category Sections - Expandable */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-40 w-full" /></Card>)}</div>
      ) : data && (
        <div className="space-y-3">
          {categoryConfig.map(cat => {
            const category = data[cat.key]
            const Icon = cat.icon
            const isExpanded = expandedSections.has(cat.key)
            const inflows = category.items.filter(i => i.type === 'inflow').sort((a, b) => b.amount - a.amount)
            const outflows = category.items.filter(i => i.type === 'outflow').sort((a, b) => b.amount - a.amount)
            return (
              <Card key={cat.key} className="p-3">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection(cat.key)}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <div className={cn('rounded-full p-1.5', cat.bgColor)}><Icon className={cn('h-3.5 w-3.5', cat.color)} /></div>
                    <h2 className="text-xs font-semibold">{cat.label}</h2>
                  </div>
                  <span className={cn('text-xs font-semibold', category.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {category.net >= 0 ? '+' : ''}{formatNPR(category.net)}
                  </span>
                </div>

                {/* Summary bar */}
                <div className="flex gap-2 mb-2 text-xs">
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5"><span className="text-green-600">Inflows</span><span>{formatNPR(category.inflows)}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max((category.inflows / maxAbsAmount) * 100, category.inflows > 0 ? 2 : 0)}%` }} /></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5"><span className="text-red-600">Outflows</span><span>{formatNPR(category.outflows)}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.max((category.outflows / maxAbsAmount) * 100, category.outflows > 0 ? 2 : 0)}%` }} /></div>
                  </div>
                </div>

                {/* Expandable detail lines */}
                {isExpanded && (
                  <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-1">Inflows</p>
                      {inflows.length === 0 ? <p className="text-xs text-muted-foreground/60 py-1">No inflows</p> : (
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
                    <div>
                      <p className="text-xs text-red-600 font-medium mb-1">Outflows</p>
                      {outflows.length === 0 ? <p className="text-xs text-muted-foreground/60 py-1">No outflows</p> : (
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
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Waterfall Summary */}
      {isLoading ? (
        <Card className="p-4"><Skeleton className="h-32 w-full" /></Card>
      ) : data && (
        <Card className="p-3">
          <p className="text-xs font-semibold mb-3">Cash Flow Waterfall</p>
          <div className="space-y-2">
            {/* Beginning */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">Beginning Cash</span>
              <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                <div className={cn('absolute inset-y-0 left-0 rounded', data.beginningCash >= 0 ? 'bg-slate-300 dark:bg-slate-600' : 'bg-red-300 dark:bg-red-700')}
                  style={{ width: `${Math.max(Math.abs(data.beginningCash) / maxAbsAmount * 100, 2)}%` }} />
              </div>
              <span className="text-xs font-medium w-32 text-right shrink-0">{formatNPR(data.beginningCash)}</span>
            </div>

            <Separator />

            {/* Three category bars */}
            {categoryConfig.map(cat => {
              const category = data[cat.key]
              const pct = Math.max(Math.abs(category.net) / maxAbsAmount * 100, Math.abs(category.net) > 0 ? 2 : 0)
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{cat.label.replace(' Activities', '')}</span>
                  <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                    <div className={cn('absolute inset-y-0 rounded', category.net >= 0 ? 'bg-green-500' : 'bg-red-500')}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('text-xs font-medium w-32 text-right shrink-0', category.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {category.net >= 0 ? '+' : ''}{formatNPR(category.net)}
                  </span>
                </div>
              )
            })}

            <Separator />

            {/* Ending */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold w-28 shrink-0">Ending Cash</span>
              <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                <div className={cn('absolute inset-y-0 left-0 rounded', data.endingCash >= 0 ? 'bg-green-600' : 'bg-red-600')}
                  style={{ width: `${Math.max(Math.abs(data.endingCash) / maxAbsAmount * 100, 2)}%` }} />
              </div>
              <span className={cn('text-xs font-bold w-32 text-right shrink-0', data.endingCash >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatNPR(data.endingCash)}
              </span>
            </div>
          </div>

          {/* Net summary row */}
          <div className="mt-3 pt-2 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Period: {periodLabels[data.period] ?? data.period}</span>
            <span className={cn('text-xs font-semibold', data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
              Net Change: {data.netCashFlow >= 0 ? '+' : ''}{formatNPR(data.netCashFlow)}
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}
