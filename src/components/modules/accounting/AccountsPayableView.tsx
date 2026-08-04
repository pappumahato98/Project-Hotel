'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { AccountingError } from './AccountingErrorBoundary'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight, Download, CreditCard, Clock, AlertTriangle, Truck } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────
interface AgingBucket {
  current: number
  days31to60: number
  days61to90: number
  daysOver90: number
  total: number
}

interface APAgingItem {
  id: string
  type: 'purchase_order' | 'invoice'
  reference: string
  vendorName: string
  vendorId: string
  date: string
  dueDate?: string
  totalAmount: number
  paidAmount: number
  balance: number
  aging: AgingBucket
}

interface VendorAPGroup {
  vendorId: string
  vendorName: string
  items: APAgingItem[]
  totalBalance: number
  aging: AgingBucket
}

interface APData {
  reportType: string
  generatedAt: string
  totalOutstanding: number
  totalPOBalance: number
  totalInvoiceBalance: number
  agingSummary: AgingBucket
  vendorGroups: VendorAPGroup[]
}

export function AccountsPayableView() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { data, isLoading, error, refetch, isFetching } = useQuery<APData>({
    queryKey: ['ap-aging'],
    queryFn: () => apiFetch('/api/reports/ap-aging'),
  })

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleProcessPayment = (vendorName: string) => {
    toast.success(`Payment processed for ${vendorName}`)
  }

  const handleExportCSV = () => {
    if (!data) return
    const headers = ['Vendor Name', 'Total Payable', 'Current (0-30d)', '31-60 days', '61-90 days', '90+ days', 'PO/Invoice Count']
    const rows = data.vendorGroups.map(g => [
      g.vendorName,
      g.aging.total.toFixed(2),
      g.aging.current.toFixed(2),
      g.aging.days31to60.toFixed(2),
      g.aging.days61to90.toFixed(2),
      g.aging.daysOver90.toFixed(2),
      String(g.items.length),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ap-aging-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('AP Aging report exported')
  }

  const agingSummary = data?.agingSummary

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Accounts Payable</h1>
          <p className="text-xs text-muted-foreground">Payables aging analysis with PO and invoice tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <Truck className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportCSV} disabled={isLoading || !data}>
            <Download className="h-3 w-3 mr-1" />Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : error ? (
        <AccountingError error={error} onRetry={() => refetch()} title="Failed to load AP aging data" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5"><CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Total AP</p><p className="text-sm font-semibold truncate">{formatNPR(data?.totalOutstanding ?? 0)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5"><Clock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Current (0-30d)</p><p className="text-sm font-semibold truncate text-green-600">{formatNPR(agingSummary?.current ?? 0)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5"><Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">31-60 days</p><p className="text-sm font-semibold truncate text-amber-600">{formatNPR(agingSummary?.days31to60 ?? 0)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-1.5"><AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">61-90 days</p><p className="text-sm font-semibold truncate text-orange-600">{formatNPR(agingSummary?.days61to90 ?? 0)}</p></div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">Over 90 days</p><p className="text-sm font-semibold truncate text-red-600">{formatNPR(agingSummary?.daysOver90 ?? 0)}</p></div>
            </div>
          </Card>
        </div>
      )}

      {/* AP Aging Table */}
      <Card className="p-3">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data?.vendorGroups.length ? (
          <div className="text-center py-8">
            <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No outstanding payables</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8 w-8" />
                  <TableHead className="text-xs h-8">Vendor Name</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Total</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Current</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden lg:table-cell">31-60</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden lg:table-cell">61-90</TableHead>
                  <TableHead className="text-xs h-8 text-right">90+</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vendorGroups.map(group => {
                  const isExpanded = expandedRows.has(group.vendorId)
                  const hasOverdue = (group.aging.days31to60 + group.aging.days61to90 + group.aging.daysOver90) > 0
                  return (
                    <>
                      <TableRow key={group.vendorId} className={cn('text-xs', hasOverdue && 'bg-red-50/50 dark:bg-red-950/10')}>
                        <TableCell className="py-1.5">
                          <button onClick={() => toggleRow(group.vendorId)} className="p-0">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium py-1.5">{group.vendorName}</TableCell>
                        <TableCell className="py-1.5 text-right font-medium hidden md:table-cell">{formatNPR(group.aging.total)}</TableCell>
                        <TableCell className="py-1.5 text-right text-green-600 hidden md:table-cell">{formatNPR(group.aging.current)}</TableCell>
                        <TableCell className="py-1.5 text-right text-amber-600 hidden lg:table-cell">{formatNPR(group.aging.days31to60)}</TableCell>
                        <TableCell className="py-1.5 text-right text-orange-600 hidden lg:table-cell">{formatNPR(group.aging.days61to90)}</TableCell>
                        <TableCell className={cn('py-1.5 text-right font-medium', (group.aging.daysOver90 > 0) ? 'text-red-600' : 'text-muted-foreground')}>{formatNPR(group.aging.daysOver90)}</TableCell>
                        <TableCell className="py-1.5 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{group.items.length}</Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={cn('text-xs', hasOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200')}>
                            {hasOverdue ? 'Overdue' : 'Current'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <button onClick={() => handleProcessPayment(group.vendorName)} className="p-1 rounded hover:bg-muted" title="Process Payment">
                            <CreditCard className="h-3 w-3 text-green-600" />
                          </button>
                        </TableCell>
                      </TableRow>
                      {/* Expanded detail rows */}
                      {isExpanded && group.items.map((item) => (
                        <TableRow key={item.id} className="text-xs bg-muted/20">
                          <TableCell className="py-1" />
                          <TableCell className="py-1 text-muted-foreground">
                            <span className="text-[10px] uppercase mr-1">{item.type === 'purchase_order' ? 'PO' : 'Inv'}</span>
                            {item.reference}
                          </TableCell>
                          <TableCell className="py-1 text-right hidden md:table-cell">{formatNPR(item.balance)}</TableCell>
                          <TableCell className="py-1 text-right hidden md:table-cell">{formatNPR(item.aging.current)}</TableCell>
                          <TableCell className="py-1 text-right hidden lg:table-cell">{formatNPR(item.aging.days31to60)}</TableCell>
                          <TableCell className="py-1 text-right hidden lg:table-cell">{formatNPR(item.aging.days61to90)}</TableCell>
                          <TableCell className="py-1 text-right">{formatNPR(item.aging.daysOver90)}</TableCell>
                          <TableCell className="py-1 hidden md:table-cell" colSpan={3} />
                        </TableRow>
                      ))}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Summary footer */}
      {data && (data.totalPOBalance > 0 || data.totalInvoiceBalance > 0) && (
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">PO Balance: {formatNPR(data.totalPOBalance)}</Badge>
          <Badge variant="outline" className="text-xs">Invoice Balance: {formatNPR(data.totalInvoiceBalance)}</Badge>
        </div>
      )}
    </div>
  )
}
