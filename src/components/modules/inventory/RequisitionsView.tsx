'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RequisitionItem {
  name: string
  quantity: string
  unit: string
}

interface Requisition {
  id: string
  requestDate: string
  department: string
  requestor: string
  items: RequisitionItem[]
  status: string
  priority: string
  totalItems: number
}

async function fetchRequisitions() {
  const res = await fetch('/api/requisitions')
  if (!res.ok) throw new Error('Failed to fetch requisitions')
  return res.json()
}

export function RequisitionsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: fetchRequisitions,
  })

  const statusColors: Record<string, string> = {
    pending: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    approved: 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
    received: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  }

  const priorityColors: Record<string, string> = {
    high: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    normal: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
    low: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requisitions</h1>
          <p className="text-sm text-muted-foreground">Purchase requisitions and supply requests</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.total ?? 0} requisitions
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{data?.summary?.pending ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{data?.summary?.approved ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received</p>
              <p className="text-2xl font-bold">{data?.summary?.received ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Requisitions Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.requisitions?.map((req: Requisition) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-sm">{req.id}</TableCell>
                    <TableCell className="text-sm">{req.requestDate}</TableCell>
                    <TableCell className="text-sm">{req.department}</TableCell>
                    <TableCell className="text-sm">{req.requestor}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {req.items.slice(0, 2).map((item, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {item.name} ({item.quantity} {item.unit})
                          </p>
                        ))}
                        {req.items.length > 2 && (
                          <p className="text-xs text-muted-foreground">+{req.items.length - 2} more</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityColors[req.priority] ?? ''}>
                        <span className="capitalize">{req.priority}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[req.status] ?? ''}>
                        <span className="capitalize">{req.status}</span>
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
