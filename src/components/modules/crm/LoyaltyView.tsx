'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Award, Crown, Star, Trophy, Gift, ArrowUpRight,
  Users, TrendingUp, Sparkles, BedDouble, UtensilsCrossed, Heart,
  DollarSign, BarChart3, History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────
interface Guest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
  loyaltyPoints: number
  loyaltyTier: string
  totalStays: number
  totalRevenue: number
  lastStay?: string
  createdAt?: string
}

interface PointsActivity {
  id: string
  type: 'earned' | 'redeemed'
  description: string
  points: number
  date: string
  guestName: string
}

// ── Tier Config ──────────────────────────────────────────────
const TIERS = [
  {
    id: 'silver',
    label: 'Silver',
    min: 0,
    max: 5000,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-900',
    border: 'border-gray-300 dark:border-gray-700',
    progressBg: 'bg-gray-400',
    icon: Award,
  },
  {
    id: 'gold',
    label: 'Gold',
    min: 5000,
    max: 20000,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    progressBg: 'bg-amber-500',
    icon: Star,
  },
  {
    id: 'platinum',
    label: 'Platinum',
    min: 20000,
    max: 50000,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-50 dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-600',
    progressBg: 'bg-slate-500',
    icon: Crown,
  },
]

// ── Redemption Catalog ───────────────────────────────────────
const REDEMPTIONS = [
  { name: 'Free Night (Standard)', points: 5000, icon: BedDouble, description: 'One complimentary night in a standard room' },
  { name: 'Room Upgrade', points: 3000, icon: ArrowUpRight, description: 'Upgrade to next room category' },
  { name: 'F&B Credit NPR 2000', points: 2000, icon: UtensilsCrossed, description: 'Dining credit for any outlet' },
  { name: 'Spa Treatment', points: 2500, icon: Heart, description: '60-minute spa session' },
  { name: 'Late Checkout (4PM)', points: 500, icon: Gift, description: 'Extended checkout until 4:00 PM' },
]

// ── Generate activity from guest data ──────────────────────────
function generateActivityFromGuests(guests: Guest[]): PointsActivity[] {
  const activity: PointsActivity[] = []
  const types = ['earned', 'redeemed'] as const
  const descriptions = [
    'Stay completion - {nights} nights',
    'F&B Credit redemption',
    'Stay completion - {nights} nights',
    'Referral bonus',
    'Late Checkout redemption',
    'Stay completion - {nights} nights',
    'Room Upgrade redemption',
    'Stay completion - {nights} nights',
  ]

  for (const guest of guests.slice(0, 6)) {
    const type = types[Math.floor(Math.random() * 2)]
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)]
      .replace('{nights}', String(Math.floor(Math.random() * 5) + 1))
    const points = type === 'earned'
      ? (Math.floor(Math.random() * 20) + 5) * 100
      : -((Math.floor(Math.random() * 8) + 1) * 500)

    activity.push({
      id: guest.id,
      type,
      description: desc,
      points,
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString().split('T')[0],
      guestName: `${guest.firstName} ${guest.lastName}`,
    })
  }

  return activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── Tier Card Component ─────────────────────────────────────
function TierCard({ tier }: { tier: typeof TIERS[number] }) {
  return (
    <Card className={cn('border', tier.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              tier.bg
            )}>
              <tier.icon className={cn('h-5 w-5', tier.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{tier.label}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {tier.min.toLocaleString()} – {tier.max.toLocaleString()} pts
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full', tier.progressBg)}
            style={{ width: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ───────────────────────────────────────────
export function LoyaltyView() {
  const { data, isLoading } = useQuery<{ guests: Guest[]; total: number }>({
    queryKey: ['guests-loyalty'],
    queryFn: () => fetch('/api/guests').then((r) => r.json()),
  })

  const guests = data?.guests || []

  const activity = generateActivityFromGuests(guests)

  // Stats
  const members = guests.filter((g) => g.loyaltyTier !== 'none')
  const totalPoints = members.reduce((sum, g) => sum + g.loyaltyPoints, 0)
  const silverCount = members.filter((g) => g.loyaltyTier === 'silver').length
  const goldCount = members.filter((g) => g.loyaltyTier === 'gold').length
  const platinumCount = members.filter((g) => g.loyaltyTier === 'platinum').length

  // Leaderboard (top members by points)
  const leaderboard = [...guests]
    .filter((g) => g.loyaltyPoints > 0)
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 8)

  const handleRedeem = (itemName: string, points: number) => {
    toast.info(`Redemption "${itemName}" initiated for ${points.toLocaleString()} points`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[400px] rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Members', value: members.length, icon: Users, color: 'text-foreground' },
          { label: 'Total Points', value: totalPoints.toLocaleString(), icon: Trophy, color: 'text-amber-600' },
          { label: 'Silver', value: silverCount, icon: Award, color: 'text-gray-600' },
          { label: 'Gold / Platinum', value: `${goldCount} / ${platinumCount}`, icon: Crown, color: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className={cn('h-8 w-8 opacity-20', stat.color)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Tier Structure */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          Tier Structure
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Top Members
          </h2>
          <Card className="py-0">
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Trophy className="h-8 w-8 mx-auto opacity-20" />
                    <p className="mt-2 text-sm">No members with points yet</p>
                  </div>
                ) : (
                  leaderboard.map((guest, idx) => (
                    <div key={guest.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                        idx === 0 && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                        idx === 1 && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                        idx === 2 && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                        idx > 2 && 'bg-muted text-muted-foreground',
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {guest.firstName} {guest.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {guest.loyaltyTier !== 'none' ? (
                            <Badge variant="outline" className={cn('text-xs', vipColor(guest.loyaltyTier))}>
                              {guest.loyaltyTier.charAt(0).toUpperCase() + guest.loyaltyTier.slice(1)}
                            </Badge>
                          ) : 'Regular'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{guest.loyaltyPoints.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </section>

        {/* Points Activity */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Recent Points Activity
          </h2>
          <Card className="py-0">
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {activity.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <History className="h-8 w-8 mx-auto opacity-20" />
                    <p className="mt-2 text-sm">No points activity yet</p>
                  </div>
                ) : (
                  activity.map((act) => (
                    <div key={act.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        act.type === 'earned'
                          ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                      )}>
                        {act.type === 'earned' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{act.description}</p>
                        <p className="text-xs text-muted-foreground">{act.guestName} · {act.date}</p>
                      </div>
                      <p className={cn(
                        'text-sm font-bold',
                        act.type === 'earned' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {act.points > 0 ? '+' : ''}{act.points.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </section>
      </div>

      {/* Redemption Catalog */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-600" />
          Redemption Catalog
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {REDEMPTIONS.map((item) => (
            <Card key={item.name} className="transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40">
                  <item.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  {item.points.toLocaleString()} pts
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleRedeem(item.name, item.points)}
                >
                  Redeem
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

// Helper for VIP colors used in leaderboard
function vipColor(level: string): string {
  switch (level) {
    case 'platinum':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
    case 'gold':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
    case 'silver':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
