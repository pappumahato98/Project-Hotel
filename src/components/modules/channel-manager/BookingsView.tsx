'use client'
import { toast } from 'sonner'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Globe, DollarSign, Receipt, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNPR, cn } from '@/lib/utils'

interface ChannelBooking {
  id: string
  confirmationNo: string
  guestName: string
  channel: string
  roomType: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  commission: number
  netAmount: number
  status: string
}

function fetchChannelBookings() {
  return apiFetch('/api/channel-bookings')
}

export function BookingsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterChannel, setFilterChannel] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['channel-bookings'],
    queryFn: fetchChannelBookings,
  })

  const channelNames = data?.bookings
    ? [...new Set(data.bookings.map((b: ChannelBooking) => b.channel))]
    : []

  const filteredBookings = data?.bookings?.filter((b: ChannelBooking) => {
    if (filterChannel && b.channel !== filterChannel) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.confirmationNo.toLowerCase().includes(q) ||
        b.channel.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Channel-Sourced Bookings</h1>
          <p className="text-xs text-muted-foreground">Bookings from OTAs and distribution channels</p>
        </div>
        <Badge variant="outline" className="text-[11px]">
          {data?.total ?? 0} bookings
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              <p className="text-lg font-bold">{data ? formatNPR(data.totalRevenue) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <Receipt className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commissions</p>
              <p className="text-lg font-bold text-red-600">{data ? formatNPR(data.totalCommission) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-lg font-bold">{data?.confirmed ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Checked In</p>
              <p className="text-lg font-bold">{data?.checkedIn ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
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
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className={cn('h-7 rounded-md border bg-background px-3 text-xs appearance-none', filterChannel && 'pr-8')}
          >
            <option value="">All Channels</option>
            {channelNames.map((ch: string) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
          {filterChannel && (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
              onClick={() => setFilterChannel('')}
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
        {(searchQuery || filterChannel) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterChannel('') }}
            className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0"
            title="Clear all filters"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Bookings Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Confirmation</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="hidden md:table-cell">Room Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Check-in</TableHead>
                  <TableHead className="hidden lg:table-cell">Check-out</TableHead>
                  <TableHead className="text-center">Nights</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Commission</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredBookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings?.map((booking: ChannelBooking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">{booking.confirmationNo}</TableCell>
                      <TableCell className="font-medium text-xs">{booking.guestName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{booking.channel}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{booking.roomType}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{booking.checkIn}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{booking.checkOut}</TableCell>
                      <TableCell className="text-center">{booking.nights}</TableCell>
                      <TableCell className="text-right text-xs">{formatNPR(booking.totalAmount)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-xs text-red-600">
                        {booking.commission > 0 ? formatNPR(booking.commission) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">{formatNPR(booking.netAmount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
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
