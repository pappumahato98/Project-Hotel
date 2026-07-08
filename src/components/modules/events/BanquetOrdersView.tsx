'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ClipboardList, ChefHat, Monitor, Printer, Flower2 } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNPR } from '@/lib/utils'

interface BeoItem {
  id: string
  service: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface BeoOrder {
  id: string
  eventId: string
  eventName: string
  orderDate: string
  status: string
  items: BeoItem[]
  totalAmount: number
}

const serviceIcons: Record<string, React.ReactNode> = {
  Catering: <ChefHat className="h-4 w-4" />,
  'AV Equipment': <Monitor className="h-4 w-4" />,
  'Business Center': <Printer className="h-4 w-4" />,
  Decoration: <Flower2 className="h-4 w-4" />,
}

function fetchBeoOrders() {
  return apiFetch('/api/banquet-orders')
}

export function BanquetOrdersView() {
  const { data, isLoading } = useQuery({
    queryKey: ['banquet-orders'],
    queryFn: fetchBeoOrders,
  })

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200">BEO / Banquet Orders</h1>
          <p className="text-xs text-muted-foreground">Banquet Event Orders with linked services</p>
        </div>
        <Badge variant="outline" className="text-[11px]">
          {data?.total ?? 0} orders
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Card className="p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              {data?.summary?.confirmed ?? 0}
            </Badge>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {data?.summary?.inProgress ?? 0}
            </Badge>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Draft</p>
            <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {data?.summary?.draft ?? 0}
            </Badge>
          </div>
        </Card>
      </div>

      {/* BEO List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[300px] mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : data?.orders?.map((order: BeoOrder) => (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-sm">{order.eventName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      BEO #{order.id.split('-')[1]} · Order Date: {order.orderDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <Badge variant="outline" className="font-medium">{formatNPR(order.totalAmount)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item: BeoItem) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {serviceIcons[item.service] ?? <ClipboardList className="h-4 w-4" />}
                            <span className="font-medium">{item.service}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatNPR(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNPR(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <Separator className="my-2" />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground mr-2">Total:</span>
                <span className="font-bold">{formatNPR(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
