'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemandDay {
  date: string
  dayOfWeek: string
  day: number
  month: string
  demandLevel: string
  occupancy: number
}

async function fetchRevenue() {
  const res = await fetch('/api/revenue')
  if (!res.ok) throw new Error('Failed to fetch revenue data')
  return res.json()
}

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
  low: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-800' },
}

const cellLevelColors: Record<string, string> = {
  high: 'bg-red-500/20 border-red-300 dark:bg-red-950/50 dark:border-red-800',
  medium: 'bg-amber-500/20 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800',
  low: 'bg-green-500/20 border-green-300 dark:bg-green-950/50 dark:border-green-800',
}

export function DemandCalendarView() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue'],
    queryFn: fetchRevenue,
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demand Calendar</h1>
          <p className="text-sm text-muted-foreground">30-day demand forecast and occupancy projections</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">30-Day View</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500/30 border border-red-300" />
          <span className="text-xs text-muted-foreground">High Demand (85%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-amber-500/30 border border-amber-300" />
          <span className="text-xs text-muted-foreground">Medium (60-84%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-500/30 border border-green-300" />
          <span className="text-xs text-muted-foreground">Low (&lt;60%)</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High Demand Days</p>
              <p className="text-2xl font-bold text-red-600">{data?.summary?.highDays ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medium Days</p>
              <p className="text-2xl font-bold text-amber-600">{data?.summary?.mediumDays ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Demand Days</p>
              <p className="text-2xl font-bold text-green-600">{data?.summary?.lowDays ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">30-Day Demand Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg border bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {data?.demandCalendar?.map((day: DemandDay) => {
                const isToday = day.date === today
                const lc = levelColors[day.demandLevel] ?? levelColors.low
                return (
                  <div
                    key={day.date}
                    className={cn(
                      'rounded-lg border p-2 text-center transition-all hover:scale-105',
                      cellLevelColors[day.demandLevel] ?? cellLevelColors.low,
                      isToday && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <p className="text-[10px] text-muted-foreground font-medium">{day.dayOfWeek}</p>
                    <p className={cn('text-lg font-bold', lc.text)}>{day.day}</p>
                    <p className="text-[10px] text-muted-foreground">{day.month}</p>
                    <p className={cn('text-xs font-bold mt-1', lc.text)}>{day.occupancy}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
