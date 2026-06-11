'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Wrench, CheckCircle, AlertTriangle, DollarSign, X } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  category: string
  location: string
  purchaseDate: string
  purchaseCost: number
  currentValue: number
  status: string
  warrantyExpiry: string
  lastMaintenance: string
}

async function fetchAssets() {
  const res = await fetch('/api/assets')
  if (!res.ok) throw new Error('Failed to fetch assets')
  return res.json()
}

export function AssetRegisterView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  })

  const filteredAssets = data?.assets?.filter((asset: Asset) => {
    if (filterCategory && asset.category !== filterCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return asset.name.toLowerCase().includes(q) || asset.category.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Asset Register</h1>
          <p className="text-xs text-muted-foreground">Fixed assets and equipment tracking</p>
        </div>
        <Badge variant="outline" className="text-[11px]">
          {data?.total ?? 0} assets
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Operational</p>
              <p className="text-lg font-bold">{data?.operational ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Needs Repair</p>
              <p className="text-lg font-bold text-red-600">{data?.needsRepair ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Purchase Value</p>
              <p className="text-sm font-bold">{data ? formatNPR(data.totalPurchaseValue) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="text-sm font-bold">{data ? formatNPR(data.totalCurrentValue) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('h-7 text-xs pl-9', searchQuery && 'pr-7')}
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
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={cn('h-7 rounded-md border bg-background px-3 text-xs appearance-none', filterCategory && 'pr-8')}
          >
            <option value="">All Categories</option>
            {data?.categories?.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {filterCategory && (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
              onClick={() => setFilterCategory('')}
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
        {(searchQuery || filterCategory) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterCategory('') }}
            className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0"
            title="Clear all filters"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Assets Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Purchase Cost</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Current Value</TableHead>
                  <TableHead className="hidden md:table-cell">Last Maintenance</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filteredAssets?.map((asset: Asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">Purchased: {asset.purchaseDate}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{asset.category}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {asset.location}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-xs">
                      {formatNPR(asset.purchaseCost)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-xs font-medium">
                      {formatNPR(asset.currentValue)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {asset.lastMaintenance}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        asset.status === 'operational'
                          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                          : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                      }>
                        <span className="capitalize">{asset.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
