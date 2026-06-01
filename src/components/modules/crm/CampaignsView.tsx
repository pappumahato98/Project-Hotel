'use client'

import { useState } from 'react'
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
import {
  Plus, Megaphone, Users, BarChart3, Eye, Play, Pause,
  Mail, Target, TrendingUp, CalendarDays, Clock, Zap
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'

// ── Mock Campaigns Data ──────────────────────────────────────
const MOCK_CAMPAIGNS = [
  {
    id: '1',
    name: 'Monsoon Staycation Package',
    type: 'Promotional',
    status: 'running',
    channel: 'Email',
    segment: 'All Guests',
    sent: 2450,
    opened: 892,
    clicked: 234,
    converted: 67,
    startDate: '2025-07-01',
    endDate: '2025-08-31',
    budget: 50000,
    spent: 18500,
  },
  {
    id: '2',
    name: 'Gold Member Exclusive Upgrade',
    type: 'Loyalty',
    status: 'running',
    channel: 'Email + SMS',
    segment: 'Gold Tier',
    sent: 180,
    opened: 145,
    clicked: 78,
    converted: 34,
    startDate: '2025-06-15',
    endDate: '2025-07-31',
    budget: 15000,
    spent: 8200,
  },
  {
    id: '3',
    name: 'Diwali Early Bird Special',
    type: 'Seasonal',
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
  },
  {
    id: '4',
    name: 'Corporate Partnership Outreach',
    type: 'B2B',
    status: 'paused',
    channel: 'Email',
    segment: 'Corporate Accounts',
    sent: 320,
    opened: 98,
    clicked: 42,
    converted: 12,
    startDate: '2025-05-01',
    endDate: '2025-12-31',
    budget: 30000,
    spent: 12000,
  },
  {
    id: '5',
    name: 'Birthday Celebration Package',
    type: 'Promotional',
    status: 'running',
    channel: 'Email',
    segment: 'VIP Guests',
    sent: 56,
    opened: 48,
    clicked: 29,
    converted: 15,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    budget: 25000,
    spent: 9800,
  },
]

// ── Segment Preview (Mock) ──────────────────────────────────
const SEGMENT_PREVIEW = [
  { label: 'All Guests', count: 2450 },
  { label: 'VIP Guests', count: 156 },
  { label: 'Gold Tier', count: 89 },
  { label: 'Silver Tier', count: 245 },
  { label: 'Platinum Tier', count: 34 },
  { label: 'Returning Guests', count: 680 },
  { label: 'New Guests (30d)', count: 124 },
  { label: 'Corporate Accounts', count: 320 },
  { label: 'High Spenders', count: 210 },
]

// ── Main Component ───────────────────────────────────────────
export function CampaignsView() {
  const [createOpen, setCreateOpen] = useState(false)
  const [segmentOpen, setSegmentOpen] = useState(false)

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

  const totalCampaigns = MOCK_CAMPAIGNS.length
  const activeCampaigns = MOCK_CAMPAIGNS.filter((c) => c.status === 'running').length
  const totalSent = MOCK_CAMPAIGNS.reduce((s, c) => s + c.sent, 0)
  const totalConverted = MOCK_CAMPAIGNS.reduce((s, c) => s + c.converted, 0)
  const avgOpenRate = totalSent > 0
    ? Math.round((MOCK_CAMPAIGNS.reduce((s, c) => s + c.opened, 0) / totalSent) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/20">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Marketing Campaigns — Preview Mode
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
              Full campaign automation, segment builder, and analytics coming soon.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Campaigns', value: totalCampaigns, icon: Megaphone, color: 'text-foreground' },
          { label: 'Active Now', value: activeCampaigns, icon: Play, color: 'text-green-600' },
          { label: 'Emails Sent', value: totalSent.toLocaleString(), icon: Mail, color: 'text-blue-600' },
          { label: 'Open Rate', value: `${avgOpenRate}%`, icon: BarChart3, color: 'text-purple-600' },
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setSegmentOpen(true)}>
          <Users className="h-4 w-4" />
          Segment Builder
        </Button>
      </div>

      {/* Campaigns Table */}
      <Card>
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader>
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
              {MOCK_CAMPAIGNS.map((campaign) => (
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
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                placeholder="e.g., Summer Splash Offer"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <Button disabled={!createForm.name} onClick={() => setCreateOpen(false)}>
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
              {SEGMENT_PREVIEW.map((seg) => (
                <label
                  key={seg.label}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{seg.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {seg.count.toLocaleString()}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentOpen(false)}>Close</Button>
            <Button onClick={() => setSegmentOpen(false)}>Select Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
