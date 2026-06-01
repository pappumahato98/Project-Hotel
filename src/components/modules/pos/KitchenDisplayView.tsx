'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ChefHat, Flame, Clock, AlertTriangle, CheckCircle, Eye,
  Undo2, PartyPopper,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePosData, timeAgo,
  type KitchenTicket,
} from './pos-types'

// ─── Urgency Color ──────────────────────────────────────────────────
function getUrgencyColor(createdAt: string, status: string): string {
  if (status === 'served' || status === 'ready') return ''
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes >= 30) return 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/30'
  if (minutes >= 20) return 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
  if (minutes >= 10) return 'border-yellow-300 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10'
  return ''
}

function getUrgencyLabel(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes >= 30) return 'URGENT'
  if (minutes >= 20) return 'HIGH'
  if (minutes >= 10) return 'MEDIUM'
  return 'LOW'
}

// ─── Age Timer ──────────────────────────────────────────────────────
function AgeTimer({ createdAt }: { createdAt: string }) {
  const [age, setAge] = useState(timeAgo(createdAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setAge(timeAgo(createdAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)

  return (
    <span className={`text-xs font-mono font-bold ${
      minutes >= 30 ? 'text-red-600 dark:text-red-400' :
      minutes >= 20 ? 'text-amber-600 dark:text-amber-400' :
      minutes >= 10 ? 'text-yellow-600 dark:text-yellow-400' :
      'text-muted-foreground'
    }`}>
      {age}
    </span>
  )
}

// ─── Station Icon ──────────────────────────────────────────────────
function StationIcon({ station }: { station: KitchenTicket['station'] }) {
  switch (station) {
    case 'hot_kitchen':
      return <Flame className="h-3.5 w-3.5 text-orange-600" />
    case 'cold_kitchen':
      return <Clock className="h-3.5 w-3.5 text-blue-600" />
    case 'bar':
      return <PartyPopper className="h-3.5 w-3.5 text-purple-600" />
  }
}

function StationLabel({ station }: { station: KitchenTicket['station'] }) {
  const labels: Record<KitchenTicket['station'], string> = {
    hot_kitchen: 'Hot Kitchen',
    cold_kitchen: 'Cold Kitchen',
    bar: 'Bar',
  }
  return labels[station]
}

// ─── Ticket Card ────────────────────────────────────────────────────
function TicketCard({
  ticket,
  onAction,
  onRecall,
}: {
  ticket: KitchenTicket
  onAction: (ticketId: string, action: 'preparing' | 'ready' | 'served') => void
  onRecall: (ticketId: string) => void
}) {
  const urgencyColor = getUrgencyColor(ticket.createdAt, ticket.status)
  const urgencyLabel = getUrgencyLabel(ticket.createdAt)

  const actionConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; color?: string }> = {
    pending: { label: 'Start Preparing', variant: 'default' },
    preparing: { label: 'Mark Ready', variant: 'secondary' },
    ready: { label: 'Mark Served', variant: 'outline' },
  }

  const config = actionConfig[ticket.status]

  return (
    <Card className={`transition-all ${urgencyColor} ${ticket.status === 'served' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StationIcon station={ticket.station} />
            <CardTitle className="text-sm font-bold">
              Table {ticket.tableId}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {ticket.id}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {ticket.rush && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> RUSH
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] ${
                urgencyLabel === 'URGENT' ? 'border-red-400 text-red-600 bg-red-50 dark:bg-red-950/40' :
                urgencyLabel === 'HIGH' ? 'border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40' :
                'border-gray-300 text-gray-500'
              }`}
            >
              {urgencyLabel}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <AgeTimer createdAt={ticket.createdAt} />
          <span className="text-[10px] text-muted-foreground">ago</span>
          {ticket.status !== 'served' && (
            <Separator orientation="vertical" className="h-3 mx-1" />
          )}
          <Badge
            variant={ticket.status === 'ready' ? 'default' : ticket.status === 'preparing' ? 'secondary' : 'outline'}
            className={`text-[10px] ${
              ticket.status === 'ready' ? 'bg-emerald-600 hover:bg-emerald-600' :
              ticket.status === 'preparing' ? '' : ''
            }`}
          >
            {ticket.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-1.5 mb-2">
          {ticket.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-bold text-primary mr-1">×{item.quantity}</span>
                {item.name}
              </span>
            </div>
          ))}
        </div>
        {ticket.specialInstructions && (
          <div className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-1 mb-2">
            <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {ticket.specialInstructions}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          {ticket.status !== 'served' && config && (
            <Button
              size="sm"
              variant={config.variant}
              className={`flex-1 text-[11px] ${
                ticket.status === 'ready' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                ticket.status === 'preparing' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                ''
              }`}
              onClick={() => onAction(ticket.id, ticket.status === 'pending' ? 'preparing' : ticket.status === 'preparing' ? 'ready' : 'served')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {config.label}
            </Button>
          )}
          {ticket.status === 'served' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[11px]"
              onClick={() => onRecall(ticket.id)}
            >
              <Undo2 className="h-3 w-3 mr-1" /> Recall
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Station Column ──────────────────────────────────────────────────
function StationColumn({
  station,
  tickets,
  onAction,
  onRecall,
}: {
  station: KitchenTicket['station']
  tickets: KitchenTicket[]
  onAction: (ticketId: string, action: 'preparing' | 'ready' | 'served') => void
  onRecall: (ticketId: string) => void
}) {
  const stationTickets = tickets.filter((t) => t.station === station && t.status !== 'served')
  const completedTickets = tickets.filter((t) => t.station === station && t.status === 'served').slice(-5)

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <StationIcon station={station} />
        <h3 className="text-sm font-semibold">{StationLabel({ station })}</h3>
        <Badge variant="secondary" className="text-[10px]">{stationTickets.length} active</Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2.5 pr-2">
          {stationTickets.length > 0 ? (
            stationTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onAction={onAction}
                onRecall={onRecall}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm text-muted-foreground">All caught up! 🎉</p>
            </div>
          )}

          {/* Completed Queue */}
          {completedTickets.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Undo2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Completed ({completedTickets.length})
                </span>
              </div>
              {completedTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onAction={onAction}
                  onRecall={onRecall}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Main KitchenDisplayView ────────────────────────────────────────
export default function KitchenDisplayView() {
  const { data, isLoading } = usePosData('kitchen-display')
  const [localOverrides, setLocalOverrides] = useState<Record<string, KitchenTicket>>({})
  const [station, setStation] = useState('all')

  const tickets = useMemo(() => {
    const base = data?.kitchenTickets ?? []
    if (Object.keys(localOverrides).length === 0) return base
    return base.map((t) => localOverrides[t.id] ?? t)
  }, [data?.kitchenTickets, localOverrides])

  const handleAction = useCallback((ticketId: string, action: 'preparing' | 'ready' | 'served') => {
    setLocalOverrides((prev) => {
      const base = prev[ticketId]
      return {
        ...prev,
        [ticketId]: {
          ...(base ?? {}),
          id: ticketId,
          status: action,
          ...(action === 'served' ? { completedAt: new Date().toISOString() } : {}),
        },
      }
    })
  }, [])

  const handleRecall = useCallback((ticketId: string) => {
    setLocalOverrides((prev) => {
      const base = prev[ticketId]
      return {
        ...prev,
        [ticketId]: {
          ...(base ?? {}),
          id: ticketId,
          status: 'preparing',
          completedAt: undefined,
        },
      }
    })
  }, [])

  const activeTickets = tickets.filter((t) => t.status !== 'served')
  const completedCount = tickets.filter((t) => t.status === 'served').length

  const displayedTickets = station === 'all'
    ? tickets
    : tickets.filter((t) => t.station === station)

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[600px] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 px-3 py-2">
            <ChefHat className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-bold">Kitchen Display</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" /> {activeTickets.length} Active
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" /> {completedCount} Completed
          </Badge>
        </div>
      </div>

      {/* Station Filter */}
      <Tabs value={station} onValueChange={setStation}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All Stations</TabsTrigger>
          <TabsTrigger value="hot_kitchen" className="text-xs gap-1">
            <Flame className="h-3 w-3 text-orange-500" /> Hot Kitchen
          </TabsTrigger>
          <TabsTrigger value="cold_kitchen" className="text-xs gap-1">
            <Clock className="h-3 w-3 text-blue-500" /> Cold Kitchen
          </TabsTrigger>
          <TabsTrigger value="bar" className="text-xs gap-1">
            <PartyPopper className="h-3 w-3 text-purple-500" /> Bar
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Station Columns */}
      {station === 'all' ? (
        <div className="grid gap-4 lg:grid-cols-3 min-h-[500px]">
          <StationColumn station="hot_kitchen" tickets={displayedTickets} onAction={handleAction} onRecall={handleRecall} />
          <StationColumn station="cold_kitchen" tickets={displayedTickets} onAction={handleAction} onRecall={handleRecall} />
          <StationColumn station="bar" tickets={displayedTickets} onAction={handleAction} onRecall={handleRecall} />
        </div>
      ) : (
        <div className="min-h-[500px]">
          <StationColumn station={station as KitchenTicket['station']} tickets={displayedTickets} onAction={handleAction} onRecall={handleRecall} />
        </div>
      )}
    </div>
  )
}
