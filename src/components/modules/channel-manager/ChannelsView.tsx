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
import { Globe, Wifi, WifiOff, DollarSign, RefreshCw } from 'lucide-react'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  type: string
  logo: string
  status: string
  lastSync: string | null
  totalBookings: number
  monthlyCommission: number
  mappingStatus: string
}

async function fetchChannels() {
  const res = await fetch('/api/channels')
  if (!res.ok) throw new Error('Failed to fetch channels')
  return res.json()
}

export function ChannelsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Channels</h1>
          <p className="text-sm text-muted-foreground">Distribution channel management and connectivity</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Wifi className="h-3 w-3 mr-1" />
            {data?.connected ?? 0} connected
          </Badge>
          {data?.disconnected > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <WifiOff className="h-3 w-3 mr-1" />
              {data?.disconnected} offline
            </Badge>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Channels</p>
              <p className="text-2xl font-bold">{data?.channels?.length ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{data?.totalBookings ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Commission</p>
              <p className="text-lg font-bold">{data ? formatNPR(data.totalCommission) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel Cards (Visual Overview) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-8 mt-2 rounded-full" />
              </Card>
            ))
          : data?.channels?.map((channel: Channel) => (
              <Card key={channel.id} className={cn(
                'p-4 transition-all hover:shadow-md',
                channel.status === 'connected' && 'border-green-200 dark:border-green-900',
                channel.status === 'disconnected' && 'border-red-200 dark:border-red-900 opacity-70',
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold',
                      channel.type === 'OTA' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                      : channel.type === 'Direct' ? 'bg-green-100 dark:bg-green-950 text-green-600'
                      : channel.type === 'Corporate' ? 'bg-purple-100 dark:bg-purple-950 text-purple-600'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    )}>
                      {channel.logo}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{channel.type}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    channel.status === 'connected' && 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
                    channel.status === 'disconnected' && 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
                    channel.status === 'active' && 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
                  )}>
                    {channel.status === 'connected' && <RefreshCw className="h-2.5 w-2.5 mr-0.5" />}
                    {channel.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {channel.totalBookings} bookings
                  </span>
                </div>
                {channel.lastSync && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Last sync: {new Date(channel.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </Card>
            ))
        }
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Channel Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Bookings</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="hidden md:table-cell">Mapping</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.channels?.map((channel: Channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{channel.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        channel.status === 'connected' && 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
                        channel.status === 'disconnected' && 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
                        channel.status === 'active' && 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
                      )}>
                        {channel.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{channel.totalBookings}</TableCell>
                    <TableCell className="text-right">
                      {channel.monthlyCommission > 0 ? formatNPR(channel.monthlyCommission) : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={cn(
                        channel.mappingStatus === 'complete' && 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
                        channel.mappingStatus === 'incomplete' && 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
                        'text-xs'
                      )}>
                        {channel.mappingStatus === 'complete' ? 'Complete' : channel.mappingStatus === 'incomplete' ? 'Incomplete' : 'N/A'}
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
