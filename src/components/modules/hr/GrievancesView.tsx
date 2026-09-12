'use client'

import * as React from 'react'
import {
  AlertTriangle, Plus, Search, Eye, Edit, Trash2, Shield, ArrowUpCircle,
  Scale, MessageSquareWarning, FileWarning, UserX, Gavel,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ─────────────────────────────────────────────────────
interface Grievance {
  id: string
  grievanceNumber: string
  type: string
  priority: string
  category: string | null
  title: string
  description: string
  raisedById: string
  raisedByName: string
  raisedByDept: string
  raisedDate: string
  assignedToId: string | null
  assignedToName: string | null
  resolution: string | null
  resolvedDate: string | null
  resolvedById: string | null
  resolvedByName: string | null
  status: string
  isAnonymous: boolean
  attachments: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  actions?: DisciplinaryAction[]
}

interface DisciplinaryAction {
  id: string
  grievanceId: string | null
  employeeId: string
  employeeName: string
  employeeDept: string
  actionType: string
  reason: string
  incidentDate: string
  actionDate: string
  issuedById: string
  issuedByName: string
  effectiveFrom: string | null
  effectiveTo: string | null
  status: string
  appealNotes: string | null
  appealDate: string | null
  appealStatus: string | null
  attachments: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  grievance?: { grievanceNumber: string; title: string } | null
}

interface GrievanceStats {
  openCount: number
  criticalCount: number
  pendingInvestigation: number
  activeActions: number
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  department: string
}

const GRIEVANCE_TYPES = [
  { value: 'complaint', label: 'Complaint' },
  { value: 'grievance', label: 'Grievance' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'safety', label: 'Safety' },
  { value: 'discrimination', label: 'Discrimination' },
]

const GRIEVANCE_PRIORITIES = ['low', 'medium', 'high', 'critical']

const GRIEVANCE_CATEGORIES = ['workplace', 'salary', 'behavior', 'facilities', 'policy', 'other']

const GRIEVANCE_STATUSES = ['open', 'investigating', 'resolved', 'escalated', 'closed', 'withdrawn']

const ACTION_TYPES = [
  { value: 'verbal_warning', label: 'Verbal Warning' },
  { value: 'written_warning', label: 'Written Warning' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'demotion', label: 'Demotion' },
  { value: 'termination', label: 'Termination' },
  { value: 'show_cause', label: 'Show Cause' },
  { value: 'inquiry', label: 'Inquiry' },
]

const ACTION_STATUSES = ['issued', 'acknowledged', 'appealed', 'revoked', 'completed']

// ── Helpers ───────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === 'critical'
    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    : priority === 'high'
      ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
      : priority === 'medium'
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'

  return (
    <Badge variant="outline" className={cn(cls, 'font-medium capitalize')}>
      {priority === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
      {priority}
    </Badge>
  )
}

function GrievanceStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    investigating: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    escalated: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    closed: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    withdrawn: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  }
  const cls = statusConfig[status] || statusConfig.open
  return (
    <Badge variant="outline" className={cn(cls, 'font-medium capitalize')}>{status}</Badge>
  )
}

function ActionStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, string> = {
    issued: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    appealed: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    revoked: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  }
  const cls = statusConfig[status] || statusConfig.issued
  return (
    <Badge variant="outline" className={cn(cls, 'font-medium capitalize')}>{status}</Badge>
  )
}

function ActionTypeBadge({ type }: { type: string }) {
  const label = ACTION_TYPES.find(t => t.value === type)?.label ?? type.replace(/_/g, ' ')
  const iconMap: Record<string, React.ReactNode> = {
    verbal_warning: <MessageSquareWarning className="h-3 w-3" />,
    written_warning: <FileWarning className="h-3 w-3" />,
    suspension: <UserX className="h-3 w-3" />,
    termination: <UserX className="h-3 w-3" />,
    show_cause: <Gavel className="h-3 w-3" />,
    inquiry: <Search className="h-3 w-3" />,
    demotion: <ArrowUpCircle className="h-3 w-3 rotate-180" />,
  }
  return (
    <Badge variant="outline" className="font-medium capitalize text-xs">
      {iconMap[type]}<span className="ml-1">{label}</span>
    </Badge>
  )
}

function getTypeLabel(type: string): string {
  return GRIEVANCE_TYPES.find(t => t.value === type)?.label ?? type
}

// ── View ──────────────────────────────────────────────────────
export function GrievancesView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState('grievances')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')

  // Grievance dialogs
  const [showCreateGrievance, setShowCreateGrievance] = React.useState(false)
  const [viewGrievance, setViewGrievance] = React.useState<Grievance | null>(null)
  const [deleteGrievanceId, setDeleteGrievanceId] = React.useState<string | null>(null)

  // Disciplinary action dialogs
  const [showCreateAction, setShowCreateAction] = React.useState(false)
  const [viewAction, setViewAction] = React.useState<DisciplinaryAction | null>(null)
  const [editActionId, setEditActionId] = React.useState<string | null>(null)
  const [editActionStatus, setEditActionStatus] = React.useState('')
  const [deleteActionId, setDeleteActionId] = React.useState<string | null>(null)

  // Grievance form state
  const [gFormType, setGFormType] = React.useState('complaint')
  const [gFormPriority, setGFormPriority] = React.useState('medium')
  const [gFormCategory, setGFormCategory] = React.useState('')
  const [gFormTitle, setGFormTitle] = React.useState('')
  const [gFormDescription, setGFormDescription] = React.useState('')
  const [gFormRaisedById, setGFormRaisedById] = React.useState('')
  const [gFormRaisedByName, setGFormRaisedByName] = React.useState('')
  const [gFormRaisedByDept, setGFormRaisedByDept] = React.useState('')
  const [gFormAssignedToId, setGFormAssignedToId] = React.useState('')
  const [gFormAssignedToName, setGFormAssignedToName] = React.useState('')
  const [gFormIsAnonymous, setGFormIsAnonymous] = React.useState(false)

  // Disciplinary action form state
  const [aFormEmployeeId, setAFormEmployeeId] = React.useState('')
  const [aFormEmployeeName, setAFormEmployeeName] = React.useState('')
  const [aFormEmployeeDept, setAFormEmployeeDept] = React.useState('')
  const [aFormActionType, setAFormActionType] = React.useState('')
  const [aFormReason, setAFormReason] = React.useState('')
  const [aFormIncidentDate, setAFormIncidentDate] = React.useState('')
  const [aFormActionDate, setAFormActionDate] = React.useState(new Date().toISOString().split('T')[0])
  const [aFormGrievanceId, setAFormGrievanceId] = React.useState('')
  const [aFormEffectiveFrom, setAFormEffectiveFrom] = React.useState('')
  const [aFormEffectiveTo, setAFormEffectiveTo] = React.useState('')
  const [aFormNotes, setAFormNotes] = React.useState('')

  // Fetch grievances
  const grievanceQueryParams = React.useMemo(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (priorityFilter !== 'all') params.set('priority', priorityFilter)
    return params.toString()
  }, [statusFilter, priorityFilter])

  const { data: grievancesData, isLoading: grievancesLoading } = useQuery<{
    grievances: Grievance[]; stats: GrievanceStats
  }>({
    queryKey: ['grievances', grievanceQueryParams],
    queryFn: () => apiFetch(`/api/grievances${grievanceQueryParams ? '?' + grievanceQueryParams : ''}`),
  })

  // Fetch disciplinary actions
  const { data: actionsData, isLoading: actionsLoading } = useQuery<{
    actions: DisciplinaryAction[]; stats: { issuedCount: number; acknowledgedCount: number; appealedCount: number; activeCount: number }
  }>({
    queryKey: ['disciplinary-actions'],
    queryFn: () => apiFetch('/api/disciplinary-actions'),
  })

  // Fetch employees
  const { data: employeesData } = useQuery<{ employees: Employee[] }>({
    queryKey: ['employees-for-grievances'],
    queryFn: () => apiFetch('/api/employees'),
  })

  const employees = React.useMemo(() => employeesData?.employees ?? [], [employeesData])
  const grievances = React.useMemo(() => grievancesData?.grievances ?? [], [grievancesData])
  const gStats = grievancesData?.stats
  const actions = React.useMemo(() => actionsData?.actions ?? [], [actionsData])

  // Filter by search
  const filteredGrievances = React.useMemo(() => {
    if (!searchQuery) return grievances
    const q = searchQuery.toLowerCase()
    return grievances.filter(g =>
      g.grievanceNumber.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.raisedByName.toLowerCase().includes(q) ||
      g.type.toLowerCase().includes(q)
    )
  }, [grievances, searchQuery])

  const filteredActions = React.useMemo(() => {
    if (!searchQuery) return actions
    const q = searchQuery.toLowerCase()
    return actions.filter(a =>
      a.employeeName.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.actionType.toLowerCase().includes(q)
    )
  }, [actions, searchQuery])

  // ── Mutations ─────────────────────────────────────────────
  const createGrievanceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/grievances', {
      method: 'POST', body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Grievance created successfully')
      setShowCreateGrievance(false)
      resetGrievanceForm()
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
    },
    onError: () => toast.error('Failed to create grievance'),
  })

  const updateGrievanceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/grievances', {
      method: 'PATCH', body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Grievance updated')
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
    },
    onError: () => toast.error('Failed to update grievance'),
  })

  const deleteGrievanceMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/grievances?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Grievance deleted')
      setDeleteGrievanceId(null)
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
    },
    onError: () => toast.error('Failed to delete grievance'),
  })

  const createActionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/disciplinary-actions', {
      method: 'POST', body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Disciplinary action created')
      setShowCreateAction(false)
      resetActionForm()
      queryClient.invalidateQueries({ queryKey: ['disciplinary-actions'] })
    },
    onError: () => toast.error('Failed to create disciplinary action'),
  })

  const updateActionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/disciplinary-actions', {
      method: 'PATCH', body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Action status updated')
      setEditActionId(null)
      queryClient.invalidateQueries({ queryKey: ['disciplinary-actions'] })
    },
    onError: () => toast.error('Failed to update action'),
  })

  const deleteActionMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/disciplinary-actions?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Action deleted')
      setDeleteActionId(null)
      queryClient.invalidateQueries({ queryKey: ['disciplinary-actions'] })
    },
    onError: () => toast.error('Failed to delete action'),
  })

  const resetGrievanceForm = () => {
    setGFormType('complaint'); setGFormPriority('medium'); setGFormCategory('')
    setGFormTitle(''); setGFormDescription(''); setGFormRaisedById('')
    setGFormRaisedByName(''); setGFormRaisedByDept(''); setGFormAssignedToId('')
    setGFormAssignedToName(''); setGFormIsAnonymous(false)
  }

  const resetActionForm = () => {
    setAFormEmployeeId(''); setAFormEmployeeName(''); setAFormEmployeeDept('')
    setAFormActionType(''); setAFormReason(''); setAFormIncidentDate('')
    setAFormActionDate(new Date().toISOString().split('T')[0])
    setAFormGrievanceId(''); setAFormEffectiveFrom(''); setAFormEffectiveTo('')
    setAFormNotes('')
  }

  const handleCreateGrievance = () => {
    if (!gFormTitle || !gFormDescription || !gFormRaisedById) {
      toast.error('Please fill in all required fields')
      return
    }
    createGrievanceMutation.mutate({
      type: gFormType,
      priority: gFormPriority,
      category: gFormCategory || null,
      title: gFormTitle,
      description: gFormDescription,
      raisedById: gFormRaisedById,
      raisedByName: gFormRaisedByName,
      raisedByDept: gFormRaisedByDept,
      assignedToId: gFormAssignedToId || null,
      assignedToName: gFormAssignedToName || null,
      isAnonymous: gFormIsAnonymous,
      raisedDate: new Date().toISOString().split('T')[0],
    })
  }

  const handleCreateAction = () => {
    if (!aFormEmployeeId || !aFormActionType || !aFormReason || !aFormIncidentDate) {
      toast.error('Please fill in all required fields')
      return
    }
    createActionMutation.mutate({
      grievanceId: aFormGrievanceId || null,
      employeeId: aFormEmployeeId,
      employeeName: aFormEmployeeName,
      employeeDept: aFormEmployeeDept,
      actionType: aFormActionType,
      reason: aFormReason,
      incidentDate: aFormIncidentDate,
      actionDate: aFormActionDate,
      effectiveFrom: aFormEffectiveFrom || null,
      effectiveTo: aFormEffectiveTo || null,
      notes: aFormNotes || null,
    })
  }

  const handleGrievanceStatusChange = (id: string, newStatus: string) => {
    updateGrievanceMutation.mutate({ id, status: newStatus })
  }

  const handleActionStatusChange = () => {
    if (editActionId && editActionStatus) {
      updateActionMutation.mutate({ id: editActionId, status: editActionStatus })
    }
  }

  const isLoading = grievancesLoading || actionsLoading

  // ── Loading Skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Grievances & Disciplinary</h2>
          <p className="text-xs text-muted-foreground">Manage grievances, complaints, and disciplinary actions</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { resetActionForm(); setShowCreateAction(true) }}>
            <Scale className="h-4 w-4" />
            Disciplinary Action
          </Button>
          <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => { resetGrievanceForm(); setShowCreateGrievance(true) }}>
            <Plus className="h-4 w-4" />
            New Grievance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <MessageSquareWarning className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Grievances</p>
              <p className="text-lg font-bold">{gStats?.openCount ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Critical Priority</p>
              <p className="text-lg font-bold">{gStats?.criticalCount ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Search className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Investigation</p>
              <p className="text-lg font-bold">{gStats?.pendingInvestigation ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <Scale className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Actions</p>
              <p className="text-lg font-bold">{gStats?.activeActions ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="grievances" className="text-xs px-3">
            <MessageSquareWarning className="h-3.5 w-3.5 mr-1" />
            Grievances
          </TabsTrigger>
          <TabsTrigger value="disciplinary" className="text-xs px-3">
            <Scale className="h-3.5 w-3.5 mr-1" />
            Disciplinary Actions
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'grievances' ? 'Search grievances...' : 'Search actions...'}
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'grievances' && (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {GRIEVANCE_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {GRIEVANCE_PRIORITIES.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Grievances Tab */}
        <TabsContent value="grievances" className="mt-2">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Number</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Raised By</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrievances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No grievances found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGrievances.map(g => (
                      <TableRow key={g.id} className={cn(
                        g.priority === 'critical' && g.status !== 'closed' && g.status !== 'withdrawn' && 'bg-red-50/50 dark:bg-red-950/20'
                      )}>
                        <TableCell className="text-xs font-mono font-medium">
                          {g.isAnonymous && <Shield className="h-3 w-3 inline mr-1 text-blue-500" />}
                          {g.grievanceNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] font-medium capitalize">{getTypeLabel(g.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs"><PriorityBadge priority={g.priority} /></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{g.title}</TableCell>
                        <TableCell className="text-xs">{g.isAnonymous ? 'Anonymous' : g.raisedByName}</TableCell>
                        <TableCell className="text-xs">{formatDateShort(g.raisedDate)}</TableCell>
                        <TableCell className="text-xs">{g.assignedToName || '—'}</TableCell>
                        <TableCell className="text-xs"><GrievanceStatusBadge status={g.status} /></TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewGrievance(g)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {g.status === 'open' && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600" title="Investigate"
                                onClick={() => handleGrievanceStatusChange(g.id, 'investigating')}>
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(g.status === 'open' || g.status === 'investigating') && (
                              <>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" title="Escalate"
                                  onClick={() => handleGrievanceStatusChange(g.id, 'escalated')}>
                                  <ArrowUpCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600" title="Resolve"
                                  onClick={() => handleGrievanceStatusChange(g.id, 'resolved')}>
                                  <Scale className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => setDeleteGrievanceId(g.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Disciplinary Actions Tab */}
        <TabsContent value="disciplinary" className="mt-2">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Action Type</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Incident Date</TableHead>
                    <TableHead className="text-xs">Issued By</TableHead>
                    <TableHead className="text-xs">Effective</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Linked</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No disciplinary actions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActions.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-medium">{a.employeeName}</TableCell>
                        <TableCell className="text-xs"><ActionTypeBadge type={a.actionType} /></TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{a.reason}</TableCell>
                        <TableCell className="text-xs">{formatDateShort(a.incidentDate)}</TableCell>
                        <TableCell className="text-xs">{a.issuedByName}</TableCell>
                        <TableCell className="text-xs">
                          {a.effectiveFrom ? formatDateShort(a.effectiveFrom) : '—'}
                          {a.effectiveTo && <span className="text-muted-foreground"> — {formatDateShort(a.effectiveTo)}</span>}
                        </TableCell>
                        <TableCell className="text-xs"><ActionStatusBadge status={a.status} /></TableCell>
                        <TableCell className="text-xs">
                          {a.grievance ? (
                            <Badge variant="outline" className="text-[10px] font-mono">{a.grievance.grievanceNumber}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewAction(a)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(a.status === 'issued' || a.status === 'acknowledged') && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditActionId(a.id); setEditActionStatus('') }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => setDeleteActionId(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Grievance Dialog */}
      <Dialog open={showCreateGrievance} onOpenChange={(open) => { if (!open) { setShowCreateGrievance(false); resetGrievanceForm() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">New Grievance</DialogTitle>
            <DialogDescription className="text-xs">Raise a new grievance or complaint</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={gFormType} onValueChange={setGFormType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRIEVANCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Priority *</Label>
                <Select value={gFormPriority} onValueChange={setGFormPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRIEVANCE_PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={gFormCategory} onValueChange={setGFormCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {GRIEVANCE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Title *</Label>
              <Input className="h-8 text-xs" value={gFormTitle} onChange={e => setGFormTitle(e.target.value)} placeholder="Brief title" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description *</Label>
              <Textarea className="text-xs min-h-[80px]" value={gFormDescription} onChange={e => setGFormDescription(e.target.value)} placeholder="Describe the grievance in detail" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={gFormIsAnonymous} onCheckedChange={setGFormIsAnonymous} />
              <Label className="text-xs">Submit anonymously</Label>
              {gFormIsAnonymous && <Shield className="h-4 w-4 text-blue-500" />}
            </div>
            {!gFormIsAnonymous && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Raised By *</Label>
                <Select value={gFormRaisedById} onValueChange={(v) => {
                  setGFormRaisedById(v)
                  const emp = employees.find(e => e.id === v)
                  if (emp) {
                    setGFormRaisedByName(`${emp.firstName} ${emp.lastName}`)
                    setGFormRaisedByDept(emp.department)
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label className="text-xs">Assign To</Label>
              <Select value={gFormAssignedToId} onValueChange={(v) => {
                setGFormAssignedToId(v)
                const emp = employees.find(e => e.id === v)
                if (emp) setGFormAssignedToName(`${emp.firstName} ${emp.lastName}`)
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select HR officer" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowCreateGrievance(false); resetGrievanceForm() }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreateGrievance} disabled={createGrievanceMutation.isPending}>
              {createGrievanceMutation.isPending ? 'Creating...' : 'Create Grievance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Disciplinary Action Dialog */}
      <Dialog open={showCreateAction} onOpenChange={(open) => { if (!open) { setShowCreateAction(false); resetActionForm() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">New Disciplinary Action</DialogTitle>
            <DialogDescription className="text-xs">Issue a disciplinary action against an employee</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label className="text-xs">Employee *</Label>
              <Select value={aFormEmployeeId} onValueChange={(v) => {
                setAFormEmployeeId(v)
                const emp = employees.find(e => e.id === v)
                if (emp) {
                  setAFormEmployeeName(`${emp.firstName} ${emp.lastName}`)
                  setAFormEmployeeDept(emp.department)
                }
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} — {emp.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Action Type *</Label>
              <Select value={aFormActionType} onValueChange={setAFormActionType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select action type" /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea className="text-xs min-h-[60px]" value={aFormReason} onChange={e => setAFormReason(e.target.value)} placeholder="Reason for disciplinary action" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Incident Date *</Label>
                <Input type="date" className="h-8 text-xs" value={aFormIncidentDate} onChange={e => setAFormIncidentDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Action Date</Label>
                <Input type="date" className="h-8 text-xs" value={aFormActionDate} onChange={e => setAFormActionDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Effective From</Label>
                <Input type="date" className="h-8 text-xs" value={aFormEffectiveFrom} onChange={e => setAFormEffectiveFrom(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Effective To</Label>
                <Input type="date" className="h-8 text-xs" value={aFormEffectiveTo} onChange={e => setAFormEffectiveTo(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Linked Grievance</Label>
              <Select value={aFormGrievanceId} onValueChange={setAFormGrievanceId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select grievance (optional)" /></SelectTrigger>
                <SelectContent>
                  {grievances.filter(g => g.status !== 'closed' && g.status !== 'withdrawn').map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.grievanceNumber} — {g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[40px]" value={aFormNotes} onChange={e => setAFormNotes(e.target.value)} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowCreateAction(false); resetActionForm() }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreateAction} disabled={createActionMutation.isPending}>
              {createActionMutation.isPending ? 'Creating...' : 'Issue Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Grievance Dialog */}
      <Dialog open={!!viewGrievance} onOpenChange={(open) => { if (!open) setViewGrievance(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {viewGrievance?.grievanceNumber}
              {viewGrievance?.isAnonymous && <Shield className="h-4 w-4 text-blue-500" />}
            </DialogTitle>
          </DialogHeader>
          {viewGrievance && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="text-[10px] capitalize">{getTypeLabel(viewGrievance.type)}</Badge></div>
                <div><span className="text-muted-foreground">Priority:</span> <PriorityBadge priority={viewGrievance.priority} /></div>
                <div><span className="text-muted-foreground">Status:</span> <GrievanceStatusBadge status={viewGrievance.status} /></div>
              </div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{viewGrievance.title}</span></div>
              <div><span className="text-muted-foreground block mb-1">Description:</span> <p className="bg-muted p-2 rounded text-xs">{viewGrievance.description}</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Raised By:</span> {viewGrievance.isAnonymous ? 'Anonymous' : viewGrievance.raisedByName}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDateShort(viewGrievance.raisedDate)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Assigned To:</span> {viewGrievance.assignedToName || 'Unassigned'}</div>
                <div><span className="text-muted-foreground">Category:</span> {viewGrievance.category || '—'}</div>
              </div>
              {viewGrievance.resolution && (
                <div><span className="text-muted-foreground block mb-1">Resolution:</span> <p className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded text-xs">{viewGrievance.resolution}</p></div>
              )}
              {viewGrievance.resolvedDate && (
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Resolved Date:</span> {formatDateShort(viewGrievance.resolvedDate)}</div>
                  <div><span className="text-muted-foreground">Resolved By:</span> {viewGrievance.resolvedByName || '—'}</div>
                </div>
              )}
              {viewGrievance.notes && <div><span className="text-muted-foreground">Notes:</span> {viewGrievance.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Disciplinary Action Dialog */}
      <Dialog open={!!viewAction} onOpenChange={(open) => { if (!open) setViewAction(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Disciplinary Action Details</DialogTitle>
          </DialogHeader>
          {viewAction && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{viewAction.employeeName}</span></div>
                <div><span className="text-muted-foreground">Department:</span> {viewAction.employeeDept}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Action Type:</span> <ActionTypeBadge type={viewAction.actionType} /></div>
                <div><span className="text-muted-foreground">Status:</span> <ActionStatusBadge status={viewAction.status} /></div>
              </div>
              <div><span className="text-muted-foreground block mb-1">Reason:</span> <p className="bg-muted p-2 rounded text-xs">{viewAction.reason}</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Incident Date:</span> {formatDateShort(viewAction.incidentDate)}</div>
                <div><span className="text-muted-foreground">Action Date:</span> {formatDateShort(viewAction.actionDate)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Issued By:</span> {viewAction.issuedByName}</div>
                <div><span className="text-muted-foreground">Effective:</span> {viewAction.effectiveFrom ? formatDateShort(viewAction.effectiveFrom) : '—'} {viewAction.effectiveTo && `— ${formatDateShort(viewAction.effectiveTo)}`}</div>
              </div>
              {viewAction.grievance && (
                <div><span className="text-muted-foreground">Linked Grievance:</span> <Badge variant="outline" className="text-[10px] font-mono ml-1">{viewAction.grievance.grievanceNumber}</Badge></div>
              )}
              {viewAction.appealNotes && (
                <div><span className="text-muted-foreground block mb-1">Appeal Notes:</span> <p className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded text-xs">{viewAction.appealNotes}</p></div>
              )}
              {viewAction.notes && <div><span className="text-muted-foreground">Notes:</span> {viewAction.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Disciplinary Action Status Dialog */}
      <Dialog open={!!editActionId} onOpenChange={(open) => { if (!open) setEditActionId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Update Action Status</DialogTitle>
            <DialogDescription className="text-xs">Change the status of this disciplinary action</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">New Status</Label>
              <Select value={editActionStatus} onValueChange={setEditActionStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select new status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="appealed">Appealed</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditActionId(null)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleActionStatusChange} disabled={!editActionStatus || updateActionMutation.isPending}>
              {updateActionMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Grievance Confirmation */}
      <AlertDialog open={!!deleteGrievanceId} onOpenChange={(open) => { if (!open) setDeleteGrievanceId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Grievance</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The grievance record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteGrievanceId) deleteGrievanceMutation.mutate(deleteGrievanceId) }}
              disabled={deleteGrievanceMutation.isPending}>
              {deleteGrievanceMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Action Confirmation */}
      <AlertDialog open={!!deleteActionId} onOpenChange={(open) => { if (!open) setDeleteActionId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Disciplinary Action</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The disciplinary action record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteActionId) deleteActionMutation.mutate(deleteActionId) }}
              disabled={deleteActionMutation.isPending}>
              {deleteActionMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
