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
import { Search, AlertTriangle, Wrench, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { useState } from 'react'

interface WorkOrder {
  id: string
  roomId?: string
  title: string
  description: string
  priority: string
  status: string
  category: string
  assignedTo?: string
  reportedBy?: string
  completedAt?: string
  createdAt: string
  room?: { number: string; floor: number; wing?: string; type?: { name: string } }
}

const priorityConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  emergency: { color: 'border-red-400 bg-red-500 text-white', label: 'Emergency', icon: <AlertTriangle className="h-3 w-3" /> },
  high: { color: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300', label: 'High', icon: <ArrowRight className="h-3 w-3" /> },
  normal: { color: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300', label: 'Normal', icon: <Clock className="h-3 w-3" /> },
  low: { color: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400', label: 'Low', icon: <Clock className="h-3 w-3" /> },
}

async function fetchWorkOrders(status?: string, priority?: string, category?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  if (category) params.set('category', category)
  const res = await fetch(`/api/work-orders?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch work orders')
  return res.json()
}

export function WorkOrdersView() {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', filterStatus, filterPriority, filterCategory],
    queryFn: () => fetchWorkOrders(
      filterStatus || undefined,
      filterPriority || undefined,
      filterCategory || undefined
    ),
  })

  const filteredOrders = data?.workOrders?.filter((wo: WorkOrder) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      wo.title.toLowerCase().includes(q) ||
      wo.description.toLowerCase().includes(q) ||
      (wo.assignedTo?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-sm text-muted-foreground">Maintenance requests and work orders</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.total ?? 0} orders
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Open', value: data?.summary?.open ?? 0, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
          { label: 'Assigned', value: data?.summary?.assigned ?? 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'In Progress', value: data?.summary?.inProgress ?? 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
          { label: 'Completed', value: data?.summary?.completed ?? 0, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
          { label: 'Emergency', value: data?.summary?.emergency ?? 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <Wrench className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Priority</option>
          <option value="emergency">Emergency</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Categories</option>
          <option value="electrical">Electrical</option>
          <option value="plumbing">Plumbing</option>
          <option value="hvac">HVAC</option>
          <option value="furniture">Furniture</option>
          <option value="painting">Painting</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Room</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No work orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders?.map((wo: WorkOrder) => {
                    const pConfig = priorityConfig[wo.priority] ?? priorityConfig.normal
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {wo.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="font-medium">{wo.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {wo.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {wo.room ? `${wo.room.number}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${pConfig.color} gap-1`}>
                            {pConfig.icon}
                            {pConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            wo.status === 'open' ? 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : wo.status === 'assigned' ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : wo.status === 'in_progress' ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : wo.status === 'completed' ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                            : 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                          }>
                            <span className="capitalize">{wo.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {wo.assignedTo ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(wo.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </TableCell>
                      </TableRow>
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
