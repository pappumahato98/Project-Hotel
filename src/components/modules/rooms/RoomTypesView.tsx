'use client'

import React from 'react'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatNPR } from '@/lib/nepal-standards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  BedDouble,
  Users,
  Maximize,
  Eye,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Wine,
  ShieldCheck,
  Bath,
  Sparkles,
  Droplets,
  UtensilsCrossed,
  Bed,
  Sofa,
  Crown,
  Gem,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────
interface RoomTypeData {
  id: string
  name: string
  code: string
  description: string | null
  baseOccupancy: number
  maxOccupancy: number
  bedConfig: string
  areaSqFt: number | null
  view: string | null
  amenities: string | null
  sortOrder: number
  roomCount: number
  ratePlans: Array<{ id: string; name: string; code: string; baseRate: number; channel: string | null }>
}

interface RoomTypesResponse {
  roomTypes: RoomTypeData[]
}

// ─── Amenity Icons ─────────────────────────────────────────────
const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WiFi: Wifi,
  AC: Wind,
  TV: Tv,
  'Coffee Machine': Coffee,
  Minibar: Wine,
  Safe: ShieldCheck,
  Bathrobe: Bath,
  Slippers: Sparkles,
  Jacuzzi: Droplets,
  'Butler Service': Crown,
  'Private Pool': Droplets,
  'Dining Room': UtensilsCrossed,
}

// Special tier icons for premium room types
const TIER_BADGES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'Presidential Suite': { icon: Gem, color: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' },
  'Executive Suite': { icon: Crown, color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' },
  'Superior King': { icon: Sparkles, color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950 dark:border-teal-800' },
}

// ─── Helpers ──────────────────────────────────────────────────
// Bed icons imported at top: BedDouble, Bed, Sofa

// ─── Rate Tag ──────────────────────────────────────────────────
function RateTag({ name, rate, channel }: { name: string; rate: number; channel: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium truncate">{name}</p>
        {channel && (
          <p className="text-[10px] text-muted-foreground capitalize">{channel.replace('_', ' ')}</p>
        )}
      </div>
      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
        {formatNPR(rate)}
      </p>
    </div>
  )
}

// ─── Bed Config Field ──────────────────────────────────────────
function BedConfigField({ bedConfig }: { bedConfig: string }) {
  const lower = bedConfig.toLowerCase()
  const isSofa = lower.includes('sofa')
  const isTwin = lower.includes('twin') || lower.includes('double')
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
      {isSofa ? <Sofa className="size-4 text-muted-foreground" /> : isTwin ? <Bed className="size-4 text-muted-foreground" /> : <BedDouble className="size-4 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium">Bed Config</p>
        <p className="text-xs font-medium truncate">{bedConfig}</p>
      </div>
    </div>
  )
}

// ─── Room Type Card ───────────────────────────────────────────
function RoomTypeCard({ roomType }: { roomType: RoomTypeData }) {
  const amenities: string[] = roomType.amenities ? JSON.parse(roomType.amenities) : []
  const tier = TIER_BADGES[roomType.name]
  const barRate = roomType.ratePlans.find(rp => rp.code === 'BAR')

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{roomType.name}</CardTitle>
              {tier && (
                <Badge variant="outline" className={cn('text-[10px] gap-0.5 px-1.5 py-0', tier.color)}>
                  <tier.icon className="size-2.5" />
                  Premium
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {roomType.description || 'No description available'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {roomType.roomCount} room{roomType.roomCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Key specs */}
        <div className="grid grid-cols-2 gap-2">
          <BedConfigField bedConfig={roomType.bedConfig} />
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
            <Users className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Occupancy</p>
              <p className="text-xs font-medium">{roomType.baseOccupancy} – {roomType.maxOccupancy}</p>
            </div>
          </div>
          {roomType.areaSqFt && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
              <Maximize className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Area</p>
                <p className="text-xs font-medium">{roomType.areaSqFt} sq ft</p>
              </div>
            </div>
          )}
          {roomType.view && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
              <Eye className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">View</p>
                <p className="text-xs font-medium">{roomType.view}</p>
              </div>
            </div>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
              Amenities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity]
                return (
                  <Badge
                    key={amenity}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 gap-1"
                  >
                    {Icon && <Icon className="size-3" />}
                    {amenity}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Rate information */}
        {roomType.ratePlans.length > 0 && (
          <div>
            <Separator className="mb-3" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
              Rate Plans
            </p>
            <div className="space-y-1.5">
              {barRate && (
                <div className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-2">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    BAR Rate (Best Available)
                  </p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatNPR(barRate.baseRate)}<span className="text-[10px] font-normal">/night</span>
                  </p>
                </div>
              )}
              {roomType.ratePlans.filter(rp => rp.code !== 'BAR').slice(0, 3).map((rp) => (
                <RateTag key={rp.id} name={rp.name} rate={rp.baseRate} channel={rp.channel} />
              ))}
              {roomType.ratePlans.length > 4 && (
                <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                  + {roomType.ratePlans.length - 4} more rate plans
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────
function RoomTypesSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6 overflow-y-auto">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-16 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export function RoomTypesView() {
  const { data, isLoading, error, refetch } = useQuery<RoomTypesResponse>({
    queryKey: ['rooms', 'types'],
    queryFn: () => apiFetch('/api/rooms'),
    staleTime: 60_000,
  })

  if (isLoading) return <RoomTypesSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load room types</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const totalRooms = data.roomTypes.reduce((sum, rt) => sum + rt.roomCount, 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-gray-700 dark:text-gray-200">Room Types</h2>
              <p className="text-xs text-muted-foreground">
                {data.roomTypes.length} room types · {totalRooms} total rooms
              </p>
            </div>
          </div>

          {/* Room Type Cards */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.roomTypes.map((roomType) => (
              <RoomTypeCard key={roomType.id} roomType={roomType} />
            ))}
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}
