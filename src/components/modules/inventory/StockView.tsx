'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, AlertTriangle, Package, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  reorderPoint: number
  unitCost: number
  supplier?: string
  location?: string
  minStock: number
  maxStock: number
  active: boolean
}

async function fetchInventory(category?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  const res = await fetch(`/api/inventory?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch inventory')
  return res.json()
}

export function StockView() {
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', filterCategory],
    queryFn: () => fetchInventory(filterCategory || undefined),
  })

  const filteredItems = data?.items?.filter((item: InventoryItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  })

  const getStockPercentage = (item: InventoryItem) => {
    if (item.maxStock <= 0) return 0
    return Math.min(100, Math.round((item.currentStock / item.maxStock) * 100))
  }

  const getStockColor = (item: InventoryItem) => {
    if (item.currentStock <= item.reorderPoint) return 'destructive'
    if (item.currentStock <= item.minStock) return 'warning' as const
    return 'default' as const
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-sm text-muted-foreground">Current inventory status and stock levels</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.total ?? 0} items
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{data?.total ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{data?.lowStockItems?.length ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">{data ? formatNPR(data.totalValue) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{data?.categories?.length ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {data?.lowStockItems?.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {data.lowStockItems.length} items are at or below reorder point
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.lowStockItems.slice(0, 5).map((item: InventoryItem) => (
                <Badge key={item.id} variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {item.name}: {item.currentStock} {item.unit}
                </Badge>
              ))}
              {data.lowStockItems.length > 5 && (
                <Badge variant="outline">+{data.lowStockItems.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Categories</option>
          {data?.categories?.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Reorder Point</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Unit Cost</TableHead>
                  <TableHead className="hidden md:table-cell">Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems?.map((item: InventoryItem) => (
                    <TableRow key={item.id} className={cn(item.currentStock <= item.reorderPoint && 'bg-red-50/50 dark:bg-red-950/20')}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.currentStock <= item.reorderPoint && (
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.category}</TableCell>
                      <TableCell className="text-center font-medium">
                        <span className={cn(item.currentStock <= item.reorderPoint && 'text-red-600')}>
                          {item.currentStock}
                        </span>
                        <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-center">
                        {item.reorderPoint} {item.unit}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">{formatNPR(item.unitCost)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Progress
                          value={getStockPercentage(item)}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground ml-1">
                          {getStockPercentage(item)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          item.currentStock <= item.reorderPoint
                            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                            : item.currentStock <= item.minStock * 1.5
                              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                        )}>
                          {item.currentStock <= item.reorderPoint ? 'Low' : item.currentStock <= item.minStock * 1.5 ? 'Warning' : 'Good'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
