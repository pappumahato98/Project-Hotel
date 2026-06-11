'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Send,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

// ── Types ──────────────────────────────────────────────────
interface SupportTicket {
  id: string
  ticketNo: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  department: string
  createdByName: string
  assignedTo: string | null
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
}

// ── Constants ───────────────────────────────────────────────
const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

// ── Badge Helpers ──────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    general: 'bg-secondary text-secondary-foreground',
    bug_report: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    feature_request: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
    billing: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    technical: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    training: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
    other: 'bg-secondary text-secondary-foreground',
  }
  const label = CATEGORIES.find((c) => c.value === category)?.label ?? category
  return (
    <Badge variant="outline" className={cn('text-[11px]', map[category] || '')}>
      {label}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    normal: 'bg-secondary text-secondary-foreground',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  }
  const icons: Record<string, React.ReactNode> = {
    low: <CheckCircle2 className="h-3 w-3" />,
    normal: <MessageSquare className="h-3 w-3" />,
    high: <AlertTriangle className="h-3 w-3" />,
    urgent: <AlertCircle className="h-3 w-3" />,
  }
  const label = PRIORITIES.find((p) => p.value === priority)?.label ?? priority
  return (
    <Badge variant="outline" className={cn('gap-1 text-[11px]', map[priority] || '')}>
      {icons[priority]}
      {label}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    closed: 'bg-secondary text-secondary-foreground',
    reopened: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  }
  const label = status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return (
    <Badge variant="outline" className={cn('text-[11px]', map[status] || '')}>
      {label}
    </Badge>
  )
}

// ── Component ─────────────────────────────────────────────
export function ContactSupportView() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Form state
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')

  // List state
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  // Resolve dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolveTarget, setResolveTarget] = useState<SupportTicket | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [resolveStatus, setResolveStatus] = useState('resolved')

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['support-tickets'],
    queryFn: () => fetch('/api/support-tickets').then((r) => r.json()),
  })

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      subject: string
      description: string
      category: string
      priority: string
      department: string
      createdByName: string
      createdBy: string
    }) => {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create ticket')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Support ticket submitted successfully!')
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setSubject('')
      setCategory('')
      setPriority('normal')
      setDescription('')
    },
    onError: () => {
      toast.error('Failed to submit ticket. Please try again.')
    },
  })

  // Resolve ticket mutation
  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      resolution,
      status,
    }: {
      id: string
      resolution: string
      status: string
    }) => {
      const res = await fetch(`/api/support-tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, status }),
      })
      if (!res.ok) throw new Error('Failed to update ticket')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setResolveDialogOpen(false)
      setResolutionText('')
      setResolveStatus('resolved')
      setResolveTarget(null)
    },
    onError: () => {
      toast.error('Failed to update ticket. Please try again.')
    },
  })

  const handleSubmit = () => {
    if (!subject.trim() || !category || !description.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }
    createMutation.mutate({
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      department: user?.department || 'General',
      createdByName: user
        ? `${user.firstName} ${user.lastName}`
        : 'Unknown User',
      createdBy: user?.id || 'unknown',
    })
  }

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return []
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          t.subject.toLowerCase().includes(q) ||
          (t.ticketNo || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [tickets, statusFilter, searchQuery])

  const isAdmin =
    user?.role === 'admin' || user?.role === 'manager'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="space-y-4">
      {/* ── New Ticket Form ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="size-3.5" />
            Submit a Support Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject *</Label>
              <Input
                id="ticket-subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-desc">Description *</Label>
            <Textarea
              id="ticket-desc"
              placeholder="Describe the issue in detail..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── My Tickets ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-3.5" />
            My Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject or ticket #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                    statusFilter === tab.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Table */}
          <div className="rounded-lg border">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: isAdmin ? 8 : 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 8 : 7}
                        className="h-24 text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Inbox className="h-8 w-8 opacity-40" />
                          <p className="text-sm">
                            {searchQuery || statusFilter !== 'all'
                              ? 'No tickets match your filters.'
                              : 'No support tickets yet.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const isExpanded = expandedTicket === ticket.id
                      return (
                        <tbody key={ticket.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              setExpandedTicket(isExpanded ? null : ticket.id)
                            }
                          >
                            <TableCell className="w-8">
                              <span
                                className={cn(
                                  'inline-block text-xs transition-transform',
                                  isExpanded && 'rotate-90'
                                )}
                              >
                                ▶
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {ticket.ticketNo}
                            </TableCell>
                            <TableCell className="font-medium text-xs max-w-[200px] truncate">
                              {ticket.subject}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <CategoryBadge category={ticket.category} />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <PriorityBadge priority={ticket.priority} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={ticket.status} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                              {formatDate(ticket.createdAt)}
                            </TableCell>
                            {isAdmin &&
                              (ticket.status === 'open' ||
                                ticket.status === 'in_progress' ||
                                ticket.status === 'reopened') && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setResolveTarget(ticket)
                                      setResolveDialogOpen(true)
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                </TableCell>
                              )}
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell
                                colSpan={isAdmin ? 8 : 7}
                                className="px-6 py-4"
                              >
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <span className="font-medium text-muted-foreground">
                                      Description:
                                    </span>
                                    <p className="mt-1">{ticket.description}</p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                                    <div>
                                      <span className="text-xs text-muted-foreground">
                                        Created By
                                      </span>
                                      <p className="font-medium">
                                        {ticket.createdByName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {ticket.department}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">
                                        Assigned To
                                      </span>
                                      <p className="font-medium">
                                        {ticket.assignedTo || 'Unassigned'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">
                                        Dates
                                      </span>
                                      <p className="font-medium">
                                        Created: {formatDate(ticket.createdAt)}
                                      </p>
                                      {ticket.resolvedAt && (
                                        <p className="font-medium">
                                          Resolved: {formatDate(ticket.resolvedAt)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {ticket.resolution && (
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 mt-2">
                                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        Resolution
                                      </span>
                                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                                        {ticket.resolution}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </tbody>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* ── Resolve Dialog ────────────────────────────────── */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Update ticket #{resolveTarget?.ticketNo} — {resolveTarget?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution *</Label>
              <Textarea
                placeholder="Describe the resolution..."
                rows={4}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={resolveStatus} onValueChange={setResolveStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveDialogOpen(false)
                setResolutionText('')
                setResolveStatus('resolved')
                setResolveTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!resolutionText.trim()) {
                  toast.error('Please provide a resolution.')
                  return
                }
                if (resolveTarget) {
                  resolveMutation.mutate({
                    id: resolveTarget.id,
                    resolution: resolutionText.trim(),
                    status: resolveStatus,
                  })
                }
              }}
              disabled={resolveMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {resolveMutation.isPending ? 'Updating...' : 'Update Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
