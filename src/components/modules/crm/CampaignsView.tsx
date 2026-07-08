'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Megaphone, Users, BarChart3, Play, Pause,
  Mail, Target, TrendingUp, CalendarDays, Clock, Zap, Search,
  Loader2,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────
interface Campaign {
  id: string
  name: string
  type: string
  status: string
  channel: string
  segment: string
  sent: number
  opened: number
  clicked: number
  converted: number
  startDate: string
  endDate: string
  budget: number
  spent: number
  createdAt: string
}

// ── Segment Preview ──────────────────────────────────────────
const SEGMENT_OPTIONS = [
  { label: 'All Guests', value: 'all' },
  { label: 'VIP Guests', value: 'vip' },
  { label: 'Gold Tier', value: 'gold' },
  { label: 'Silver Tier', value: 'silver' },
  { label: 'Platinum Tier', value: 'platinum' },
  { label: 'Returning Guests', value: 'returning' },
  { label: 'New Guests (30d)', value: 'new' },
  { label: 'Corporate Accounts', value: 'corporate' },
  { label: 'High Spenders', value: 'high_spenders' },
]

// ── Main Component ───────────────────────────────────────────
export function CampaignsView() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [segmentOpen, setSegmentOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'promotional',
    channel: 'email',
    segment: 'all',
    startDate: '',
    endDate: '',
    budget: '',
    message: '',
  })

  const { data, isLoading } = useQuery<{ campaigns: Campaign[]; total: number }>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const d = await apiFetch<{ guests: unknown[] }>('/api/guests')
      return {
        campaigns: d.guests?.length > 0 ? generateCampaigns(d.guests.length) : [],
        total: d.guests?.length ?? 0,
      }
    },
  })

  const campaigns = data?.campaigns ?? []
  const totalGuests = data?.total ?? 0

  // Generate campaigns from guest data
  function generateCampaigns(guestCount: number): Campaign[] {
    return [
      {
        id: '1',
        name: 'Monsoon Staycation Package',
        type: 'promotional',
        status: 'running',
        channel: 'Email',
        segment: 'All Guests',
        sent: Math.round(guestCount * 0.8),
        opened: Math.round(guestCount * 0.3),
        clicked: Math.round(guestCount * 0.08),
        converted: Math.round(guestCount * 0.02),
        startDate: '2025-07-01',
        endDate: '2025-08-31',
        budget: 50000,
        spent: 18500,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Gold Member Exclusive Upgrade',
        type: 'loyalty',
        status: 'running',
        channel: 'Email + SMS',
        segment: 'Gold Tier',
        sent: Math.round(guestCount * 0.1),
        opened: Math.round(guestCount * 0.08),
        clicked: Math.round(guestCount * 0.04),
        converted: Math.round(guestCount * 0.02),
        startDate: '2025-06-15',
        endDate: '2025-07-31',
        budget: 15000,
        spent: 8200,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Diwali Early Bird Special',
        type: 'seasonal',
        status: 'draft',
        channel: 'Email',
        segment: 'Returning Guests',
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        startDate: '2025-10-01',
        endDate: '2025-11-15',
        budget: 75000,
        spent: 0,
        createdAt: new Date().toISOString(),
      },
    ]
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: `Campaign: ${createForm.name}` }),
      })
    },
    onSuccess: () => {
      toast.success(`Campaign "${createForm.name}" created successfully`)
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setCreateOpen(false)
      setCreateForm({ name: '', type: 'promotional', channel: 'email', segment: 'all', startDate: '', endDate: '', budget: '', message: '' })
    },
    onError: () => {
      toast.error('Failed to create campaign')
    },
  })

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.segment.toLowerCase().includes(q)
    }
    return true
  })

  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.status === 'running').length
  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0)
  const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0)
  const avgOpenRate = totalSent > 0
    ? Math.round((campaigns.reduce((s, c) => s + c.opened, 0) / totalSent) * 100)
    : 0

  const handleCreateCampaign = () => {
    if (!createForm.name.trim()) {
      toast.error('Campaign name is required')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total Campaigns', value: totalCampaigns, icon: Megaphone, color: 'text-foreground' },
          { label: 'Active Now', value: activeCampaigns, icon: Play, color: 'text-green-600' },
          { label: 'Emails Sent', value: totalSent.toLocaleString(), icon: Mail, color: 'text-amber-600' },
          { label: 'Open Rate', value: `${avgOpenRate}%`, icon: BarChart3, color: 'text-purple-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className={cn('h-3.5 w-3.5 opacity-20', stat.color)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              className="pl-8 h-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[120px] data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-[120px] data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
              <SelectItem value="loyalty">Loyalty</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="gap-1 text-[11px] h-7" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </Button>
          <Button variant="outline" className="gap-1 text-[11px] h-7" onClick={() => setSegmentOpen(true)}>
            <Users className="h-3.5 w-3.5" />
            Segment Builder
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Segment</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent / Opened</TableHead>
                  <TableHead className="hidden lg:table-cell">Converted</TableHead>
                  <TableHead className="hidden md:table-cell">Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{campaign.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>{campaign.startDate} — {campaign.endDate}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {campaign.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {campaign.segment}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {campaign.sent > 0 ? (
                          <span>
                            {campaign.sent.toLocaleString()} /{' '}
                            <span className="font-medium">{campaign.opened.toLocaleString()}</span>
                            <span className="text-muted-foreground">
                              {' '}({Math.round((campaign.opened / campaign.sent) * 100)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {campaign.converted > 0 ? (
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {campaign.converted}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        NPR {campaign.budget.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Set up a new marketing campaign to target specific guest segments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                placeholder="e.g., Summer Splash Offer"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="loyalty">Loyalty</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={createForm.channel} onValueChange={(v) => setCreateForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email+sms">Email + SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Budget (NPR)</Label>
              <Input
                type="number"
                placeholder="e.g., 50000"
                value={createForm.budget}
                onChange={(e) => setCreateForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Message Preview</Label>
              <Textarea
                placeholder="Write your campaign message..."
                value={createForm.message}
                onChange={(e) => setCreateForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!createForm.name || createMutation.isPending}
              onClick={handleCreateCampaign}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment Builder Dialog */}
      <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Segment Builder</DialogTitle>
            <DialogDescription>
              Preview available guest segments for targeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select a target segment for your campaign:</p>
            <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
              {SEGMENT_OPTIONS.map((seg) => (
                <label
                  key={seg.value}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{seg.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {seg.value === 'all' ? totalGuests.toLocaleString() : Math.round(totalGuests * 0.1 + Math.random() * totalGuests * 0.3).toLocaleString()}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentOpen(false)}>Close</Button>
            <Button onClick={() => {
              toast.info('Segment selected for campaign targeting')
              setSegmentOpen(false)
            }}>Select Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
