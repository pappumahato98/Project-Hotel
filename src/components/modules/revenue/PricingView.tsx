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
import { DollarSign, Percent, Tag, Settings2 } from 'lucide-react'
import { formatNPR } from '@/lib/utils'

interface RatePlan {
  id: string
  name: string
  roomType: string
  baseRate: number
  channel: string
  active: boolean
  minStay: number
  maxStay: number
}

interface PricingRule {
  id: string
  name: string
  type: string
  value: number
  appliesTo: string
  dates: string
  active: boolean
}

function fetchRevenue() {
  return apiFetch('/api/revenue')
}

export function PricingView() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-pricing'],
    queryFn: fetchRevenue,
  })

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div>
        <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pricing Rules</h1>
        <p className="text-xs text-muted-foreground">Rate plans and pricing configuration</p>
      </div>

      {/* Rate Plans */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Active Rate Plans</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate Plan</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="hidden md:table-cell">Channel</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Min Stay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.ratePlans?.map((plan: RatePlan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-sm">{plan.roomType}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <Badge variant="outline" className="capitalize">{plan.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatNPR(plan.baseRate)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center text-sm">
                      {plan.minStay > 1 ? `${plan.minStay} nights` : 'Any'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        plan.active
                          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                          : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                      }>
                        {plan.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pricing Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Pricing Rules</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-2.5">
                  <Skeleton className="h-5 w-[200px]" />
                  <Skeleton className="h-4 w-[300px] mt-2" />
                </div>
              ))
            ) : data?.pricingRules?.map((rule: PricingRule) => (
              <div key={rule.id} className="rounded-lg border p-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <Badge variant="outline" className={
                      rule.active
                        ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                        : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                    }>
                      {rule.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Type: <span className="capitalize font-medium text-foreground">{rule.type}</span></span>
                    <span>Applies: <span className="font-medium text-foreground">{rule.appliesTo}</span></span>
                    <span>When: <span className="font-medium text-foreground">{rule.dates}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className={rule.type === 'discount' ? 'text-green-600' : 'text-red-600'}>
                    {rule.type === 'discount' ? '-' : '+'}{rule.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
