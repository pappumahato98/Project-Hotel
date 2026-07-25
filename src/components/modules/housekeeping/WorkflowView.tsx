'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  Plus, Search, MoreHorizontal, ChevronDown, ChevronUp,
  CircleDot, Clock, CheckCircle2, AlertCircle,
  Paperclip, Eye, Pencil, Trash2, BedDouble, User,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface WorkflowItem {
  id: string
  title: string
  description: string | null
  priority: string
  category: string
  area: string | null
  roomId: string | null
  status: string
  assignedTo: string | null
  assignedByName: string | null
  requestedDate: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  room?: { id: string; number: string; floor: number; wing: string | null }
}

interface WorkflowSummary {
  total: number
  open: number
  inProgress: number
  completed: number
}

interface RoomOption {
  id: string
  number: string
  floor: number
  wing: string | null
  status: string
  type?: { name: string; code: string } | null
}

interface EmployeeOption {
  id: string
  firstName: string
  lastName: string
  department: string
  position: string
  status: string
}

// ─── Constants ───────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; barClass: string }> = {
  low:    { label: 'Low',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', barClass: 'bg-emerald-500' },
  medium: { label: 'Medium', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-900/40',     barClass: 'bg-amber-500' },
  high:   { label: 'High',   color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-900/40',         barClass: 'bg-red-500' },
  na:     { label: 'N/A',    color: 'text-gray-500 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-800/40',       barClass: 'bg-gray-400' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CircleDot; headerBg: string; headerText: string }> = {
  open:        { label: 'Open',        color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/40',   icon: CircleDot,    headerBg: 'bg-blue-50 dark:bg-blue-950/30', headerText: 'text-blue-700 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: Clock,        headerBg: 'bg-amber-50 dark:bg-amber-950/30', headerText: 'text-amber-700 dark:text-amber-400' },
  completed:   { label: 'Completed',   color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40', icon: CheckCircle2, headerBg: 'bg-green-50 dark:bg-green-950/30', headerText: 'text-green-700 dark:text-green-400' },
}

const CATEGORY_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair',      label: 'Repair' },
  { value: 'service',     label: 'Service' },
  { value: 'inspection',  label: 'Inspection' },
  { value: 'safety',      label: 'Safety' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'na',     label: 'N/A' },
]

const AREA_OPTIONS = [
  { value: 'Lobby',         label: 'Lobby' },
  { value: 'Restaurant',    label: 'Restaurant' },
  { value: 'Pool Area',     label: 'Pool Area' },
  { value: 'Gym',           label: 'Gym' },
  { value: 'Parking',       label: 'Parking' },
  { value: 'Corridor',      label: 'Corridor' },
  { value: 'Kitchen',       label: 'Kitchen' },
  { value: 'Front Desk',    label: 'Front Desk' },
  { value: 'Laundry',       label: 'Laundry' },
  { value: 'Garden',       label: 'Garden' },
]

// ─── Component ────────────────────────────────────────────
export function WorkflowView() {
  const queryClient = useQueryClient()

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WorkflowItem | null>(null)

  // Add form state
  const [addForm, setAddForm] = useState({
    title: '', description: '', priority: 'low', category: 'maintenance',
    area: '', roomId: '', assignedTo: '', assignedByName: '', dueDate: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '', description: '', priority: 'low', category: 'maintenance',
    area: '', roomId: '', assignedTo: '', assignedByName: '', dueDate: '',
  })

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (status: string) => {
    setCollapsedSections((prev) => ({ ...prev, [status]: !prev[status] }))
  }

  // ─── Fetch Rooms & Employees for dropdowns ──────────────
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-list'],
    queryFn: () => apiFetch('/api/rooms'),
    staleTime: 60000,
  })
  const roomsList: RoomOption[] = (roomsData as any)?.rooms ?? []

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => apiFetch('/api/employees?status=active'),
    staleTime: 60000,
  })
  const employeesList: EmployeeOption[] = (employeesData as any)?.employees ?? []

  // ─── Fetch ─────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['housekeeping-workflow', statusFilter, priorityFilter, categoryFilter, areaFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (areaFilter !== 'all') params.set('area', areaFilter)
      if (searchQuery) params.set('search', searchQuery)
      return apiFetch(`/api/housekeeping/workflow?${params.toString()}`)
    },
    refetchInterval: 10000,
  })

  const items: WorkflowItem[] = (data as any)?.items ?? []
  const summary: WorkflowSummary = (data as any)?.summary ?? { total: 0, open: 0, inProgress: 0, completed: 0 }

  // ─── Mutations ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/housekeeping/workflow', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-workflow'] })
      setShowAddDialog(false)
      setAddForm({ title: '', description: '', priority: 'low', category: 'maintenance', area: '', roomId: '', assignedTo: '', assignedByName: '', dueDate: '' })
      toast.success('Task created successfully')
    },
    onError: () => toast.error('Failed to create task'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch('/api/housekeeping/workflow', { method: 'POST', body: { action: 'update-status', id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-workflow'] })
      toast.success('Task status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/housekeeping/workflow', { method: 'POST', body: { action: 'update', ...body } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-workflow'] })
      setShowEditDialog(false)
      toast.success('Task updated successfully')
    },
    onError: () => toast.error('Failed to update task'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch('/api/housekeeping/workflow', { method: 'POST', body: { action: 'delete', id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-workflow'] })
      setShowDeleteDialog(false)
      setSelectedItem(null)
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  // ─── Grouped items ──────────────────────────────────────
  const groupedItems = useMemo(() => {
    const groups: Record<string, WorkflowItem[]> = {}
    for (const item of items) {
      const s = item.status
      if (!groups[s]) groups[s] = []
      groups[s].push(item)
    }
    return groups
  }, [items])

  const statusOrder = ['open', 'in_progress', 'completed']

  // ─── Helpers ───────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const openDetail = (item: WorkflowItem) => {
    setSelectedItem(item)
    setShowDetailDialog(true)
  }

  const openEdit = (item: WorkflowItem) => {
    setSelectedItem(item)
    setEditForm({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      category: item.category,
      area: item.area || '',
      roomId: item.roomId || '',
      assignedTo: item.assignedTo || '',
      assignedByName: item.assignedByName || '',
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
    })
    setShowEditDialog(true)
  }

  const openDelete = (item: WorkflowItem) => {
    setSelectedItem(item)
    setShowDeleteDialog(true)
  }

  const cycleStatus = (item: WorkflowItem) => {
    const nextStatus = item.status === 'open' ? 'in_progress' : item.status === 'in_progress' ? 'completed' : 'open'
    updateStatusMutation.mutate({ id: item.id, status: nextStatus })
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Task Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Priority Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Select Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Area</SelectItem>
              {AREA_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Total: {summary.total}
        </Badge>
        {STATUS_CONFIG.open && (
          <Badge className={cn("text-xs", STATUS_CONFIG.open.bg, STATUS_CONFIG.open.color)}>
            <CircleDot className="h-3 w-3 mr-1" />
            Open: {summary.open}
          </Badge>
        )}
        {STATUS_CONFIG.in_progress && (
          <Badge className={cn("text-xs", STATUS_CONFIG.in_progress.bg, STATUS_CONFIG.in_progress.color)}>
            <Clock className="h-3 w-3 mr-1" />
            In Progress: {summary.inProgress}
          </Badge>
        )}
        {STATUS_CONFIG.completed && (
          <Badge className={cn("text-xs", STATUS_CONFIG.completed.bg, STATUS_CONFIG.completed.color)}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed: {summary.completed}
          </Badge>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 2 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grouped Sections */}
      {!isLoading && (
        <div className="space-y-4">
          {statusOrder.map((status) => {
            const statusCfg = STATUS_CONFIG[status]
            const statusItems = groupedItems[status] || []
            if (statusItems.length === 0 && statusFilter !== 'all' && statusFilter !== status) return null
            if (statusItems.length === 0 && statusFilter === 'all') return null

            const isCollapsed = collapsedSections[status] ?? false
            const StatusIcon = statusCfg.icon

            return (
              <div key={status} className="rounded-lg border bg-card overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(status)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 transition-colors',
                    'hover:bg-muted/50',
                    statusCfg.headerBg,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn('h-4 w-4', statusCfg.headerText)} />
                    <span className={cn('text-sm font-semibold', statusCfg.headerText)}>
                      {status === 'in_progress' ? 'Progress Task Work' : status === 'open' ? 'Open Task Work' : 'Completed Task'}
                    </span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {statusItems.length}
                    </Badge>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 min-w-[200px]">Task Title</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[80px]">Priority</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[100px]">Category</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[100px]">Area / Room</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[100px]">Requested Date</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[130px]">Assigned To</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[110px]">Task Status</TableHead>
                          <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusItems.map((item) => {
                          const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low
                          const sCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open
                          const StatusBadgeIcon = sCfg.icon

                          return (
                            <TableRow key={item.id} className="group cursor-pointer" onClick={() => openDetail(item)}>
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                  <span className="text-xs font-medium truncate max-w-[280px]">{item.title}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className={cn('flex items-center gap-1.5', pCfg.bg, 'rounded px-2 py-0.5 w-fit')}>
                                  <div className={cn('h-1.5 w-1.5 rounded-full', pCfg.barClass)} />
                                  <span className={cn('text-[10px] font-medium', pCfg.color)}>{pCfg.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <span className="text-xs text-muted-foreground">
                                  {item.room ? `Room ${item.room.number}` : item.area || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <span className="text-xs text-muted-foreground">{formatDate(item.requestedDate)}</span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                {item.assignedByName ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                                      {item.assignedByName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs truncate max-w-[80px]">{item.assignedByName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded px-2 py-0.5 w-fit cursor-pointer',
                                    sCfg.bg, sCfg.color,
                                  )}
                                  onClick={(e) => { e.stopPropagation(); cycleStatus(item) }}
                                >
                                  <StatusBadgeIcon className="h-3 w-3" />
                                  <span className="text-[10px] font-medium">{sCfg.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => openDetail(item)}>
                                      <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEdit(item)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openDelete(item)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {statusItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                              <p className="text-xs text-muted-foreground">No tasks in this category</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty state */}
          {items.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium text-muted-foreground">No workflow tasks found</h3>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-[300px]">
                Create a new task to start managing your housekeeping workflow
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5 text-xs"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Task
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Add Task Dialog ──────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add New Task</DialogTitle>
            <DialogDescription className="text-xs">Create a new housekeeping workflow task</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Title *</label>
              <Input
                placeholder="e.g., Change water filter in lobby"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                placeholder="Add details about the task..."
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Priority</label>
                <Select value={addForm.priority} onValueChange={(v) => setAddForm({ ...addForm, priority: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Category</label>
                <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Room (optional)</label>
                <Select value={addForm.roomId} onValueChange={(v) => {
                  const rm = roomsList.find(r => r.id === v)
                  setAddForm({ ...addForm, roomId: v, area: v ? (rm ? `Floor ${rm.floor} - ${rm.wing || ''}` : '') : addForm.area })
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomsList.map((rm) => (
                      <SelectItem key={rm.id} value={rm.id}>
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="h-3 w-3 text-muted-foreground" />
                          Room {rm.number} — {rm.type?.name || 'Standard'} (F{rm.floor})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Area</label>
                <Select value={addForm.area} onValueChange={(v) => setAddForm({ ...addForm, area: v, roomId: '' })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Assign To</label>
                <Select value={addForm.assignedTo} onValueChange={(v) => {
                  const emp = employeesList.find(e => e.id === v)
                  setAddForm({ ...addForm, assignedTo: v, assignedByName: emp ? `${emp.firstName} ${emp.lastName}` : '' })
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {emp.firstName} {emp.lastName} — {emp.department}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Due Date</label>
                <Input
                  type="date"
                  value={addForm.dueDate}
                  onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              disabled={!addForm.title.trim()}
              onClick={() => createMutation.mutate(addForm)}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ───────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedItem.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Created {formatDate(selectedItem.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                {selectedItem.description && (
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{selectedItem.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Priority</label>
                    <div className={cn('inline-flex items-center gap-1.5 rounded px-2.5 py-1 w-fit', (PRIORITY_CONFIG[selectedItem.priority] || PRIORITY_CONFIG.low).bg)}>
                      <div className={cn('h-2 w-2 rounded-full', (PRIORITY_CONFIG[selectedItem.priority] || PRIORITY_CONFIG.low).barClass)} />
                      <span className={cn('text-xs font-medium', (PRIORITY_CONFIG[selectedItem.priority] || PRIORITY_CONFIG.low).color)}>
                        {(PRIORITY_CONFIG[selectedItem.priority] || PRIORITY_CONFIG.low).label}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <span className="text-sm capitalize">{selectedItem.category}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Room</label>
                    <span className="text-sm">
                      {selectedItem.room ? (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                          Room {selectedItem.room.number} (F{selectedItem.room.floor}{selectedItem.room.wing ? ` · ${selectedItem.room.wing}` : ''})
                        </span>
                      ) : '—'}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Area</label>
                    <span className="text-sm">{selectedItem.area || '—'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <div className={cn(
                      'inline-flex items-center gap-1 rounded px-2.5 py-1 w-fit',
                      (STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.open).bg,
                      (STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.open).color,
                    )}>
                      {(() => { const Ic = (STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.open).icon; return <Ic className="h-3 w-3" /> })()}
                      <span className="text-xs font-medium">{(STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.open).label}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Requested Date</label>
                    <span className="text-sm">{formatDate(selectedItem.requestedDate)}</span>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                    <span className="text-sm">{selectedItem.dueDate ? formatDate(selectedItem.dueDate) : '—'}</span>
                  </div>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                  {selectedItem.assignedByName ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {selectedItem.assignedByName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{selectedItem.assignedByName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">Unassigned</span>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowDetailDialog(false); openEdit(selectedItem) }}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setShowDetailDialog(false)
                    cycleStatus(selectedItem)
                  }}
                >
                  {selectedItem.status === 'open' ? 'Start Task' : selectedItem.status === 'in_progress' ? 'Complete Task' : 'Reopen Task'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Task</DialogTitle>
            <DialogDescription className="text-xs">Update task details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Title *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Priority</label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Category</label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Room (optional)</label>
                <Select value={editForm.roomId} onValueChange={(v) => {
                  const rm = roomsList.find(r => r.id === v)
                  setEditForm({ ...editForm, roomId: v, area: v ? (rm ? `Floor ${rm.floor} - ${rm.wing || ''}` : '') : editForm.area })
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomsList.map((rm) => (
                      <SelectItem key={rm.id} value={rm.id}>
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="h-3 w-3 text-muted-foreground" />
                          Room {rm.number} — {rm.type?.name || 'Standard'} (F{rm.floor})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Area</label>
                <Select value={editForm.area} onValueChange={(v) => setEditForm({ ...editForm, area: v, roomId: '' })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Assign To</label>
                <Select value={editForm.assignedTo} onValueChange={(v) => {
                  const emp = employeesList.find(e => e.id === v)
                  setEditForm({ ...editForm, assignedTo: v, assignedByName: emp ? `${emp.firstName} ${emp.lastName}` : '' })
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {emp.firstName} {emp.lastName} — {emp.department}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              disabled={!editForm.title.trim() || !selectedItem}
              onClick={() => selectedItem && updateMutation.mutate({ id: selectedItem.id, ...editForm })}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete &quot;{selectedItem?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive text-white hover:bg-destructive/90"
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
