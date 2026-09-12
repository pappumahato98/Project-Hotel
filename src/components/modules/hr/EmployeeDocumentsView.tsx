'use client'

import * as React from 'react'
import {
  FileText, Plus, Check, X, Clock, Search, Eye, Edit, Trash2,
  ShieldCheck, AlertTriangle, FileBadge, CalendarClock, FolderOpen,
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
interface EmployeeDocument {
  id: string
  employeeId: string
  employeeName: string
  documentType: string
  title: string
  documentNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  fileUrl: string | null
  fileSize: number | null
  mimeType: string | null
  verified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  notes: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
}

interface DocumentStats {
  totalDocuments: number
  verifiedCount: number
  pendingVerification: number
  expiringWithin90: number
  expiredCount: number
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  department: string
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'bank_detail', label: 'Bank Detail' },
  { value: 'other', label: 'Other' },
]

const EXPIRY_FILTERS = [
  { value: '30', label: '30 Days' },
  { value: '60', label: '60 Days' },
  { value: '90', label: '90 Days' },
]

// ── Helpers ───────────────────────────────────────────────────
function getDocTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find(t => t.value === type)?.label ?? type
}

function getExpiryStatus(expiryDate: string | null): 'expired' | 'expiring' | 'valid' | 'none' {
  if (!expiryDate) return 'none'
  const now = new Date()
  const exp = new Date(expiryDate)
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (exp < now) return 'expired'
  if (exp <= thirtyDays) return 'expiring'
  return 'valid'
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-medium">
        <Check className="h-3 w-3 mr-1" /> Verified
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 font-medium">
      <Clock className="h-3 w-3 mr-1" /> Pending
    </Badge>
  )
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate)
  if (status === 'none') return null
  if (status === 'expired') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-medium">
        <X className="h-3 w-3 mr-1" /> Expired
      </Badge>
    )
  }
  if (status === 'expiring') {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 font-medium">
        <AlertTriangle className="h-3 w-3 mr-1" /> Expiring
      </Badge>
    )
  }
  return null
}

function DocTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    contract: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    id_proof: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    certificate: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
    appraisal: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    warning_letter: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    resignation: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    tax_form: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    bank_detail: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
    other: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  }
  const cls = colorMap[type] || colorMap.other
  return (
    <Badge variant="outline" className={cn(cls, 'font-medium')}>
      {getDocTypeLabel(type)}
    </Badge>
  )
}

// ── View ──────────────────────────────────────────────────────
export function EmployeeDocumentsView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState('documents')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [verifiedFilter, setVerifiedFilter] = React.useState('all')
  const [expiringDays, setExpiringDays] = React.useState('90')
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [editDoc, setEditDoc] = React.useState<EmployeeDocument | null>(null)
  const [verifyDocId, setVerifyDocId] = React.useState<string | null>(null)
  const [deleteDocId, setDeleteDocId] = React.useState<string | null>(null)
  const [viewDoc, setViewDoc] = React.useState<EmployeeDocument | null>(null)

  // Form state
  const [formEmployeeId, setFormEmployeeId] = React.useState('')
  const [formEmployeeName, setFormEmployeeName] = React.useState('')
  const [formDocType, setFormDocType] = React.useState('')
  const [formTitle, setFormTitle] = React.useState('')
  const [formDocNumber, setFormDocNumber] = React.useState('')
  const [formIssueDate, setFormIssueDate] = React.useState('')
  const [formExpiryDate, setFormExpiryDate] = React.useState('')
  const [formNotes, setFormNotes] = React.useState('')
  const [formTags, setFormTags] = React.useState('')

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('documentType', typeFilter)
    if (verifiedFilter !== 'all') params.set('verified', verifiedFilter)
    if (activeTab === 'expiring') params.set('expiringDays', expiringDays)
    return params.toString()
  }, [typeFilter, verifiedFilter, activeTab, expiringDays])

  // Fetch documents
  const { data, isLoading } = useQuery<{ documents: EmployeeDocument[]; stats: DocumentStats }>({
    queryKey: ['employee-documents', queryParams],
    queryFn: () => apiFetch(`/api/employee-documents${queryParams ? '?' + queryParams : ''}`),
  })

  // Fetch employees for dropdown
  const { data: employeesData } = useQuery<{ employees: Employee[] }>({
    queryKey: ['employees-for-docs'],
    queryFn: () => apiFetch('/api/employees'),
  })

  const employees = React.useMemo(() => employeesData?.employees ?? [], [employeesData])
  const documents = React.useMemo(() => data?.documents ?? [], [data])
  const stats = data?.stats

  // Filter by search
  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter(d =>
      d.employeeName.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
      d.documentType.toLowerCase().includes(q)
    )
  }, [documents, searchQuery])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/employee-documents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      toast.success('Document created successfully')
      setShowCreateDialog(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
    onError: () => toast.error('Failed to create document'),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiFetch('/api/employee-documents', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...body }),
    }),
    onSuccess: () => {
      toast.success('Document updated successfully')
      setEditDoc(null)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
    onError: () => toast.error('Failed to update document'),
  })

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiFetch('/api/employee-documents', {
      method: 'PATCH',
      body: JSON.stringify({ id, action: 'verify' }),
    }),
    onSuccess: () => {
      toast.success('Document verified successfully')
      setVerifyDocId(null)
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
    onError: () => toast.error('Failed to verify document'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/employee-documents?id=${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      toast.success('Document deleted successfully')
      setDeleteDocId(null)
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const resetForm = () => {
    setFormEmployeeId('')
    setFormEmployeeName('')
    setFormDocType('')
    setFormTitle('')
    setFormDocNumber('')
    setFormIssueDate('')
    setFormExpiryDate('')
    setFormNotes('')
    setFormTags('')
  }

  const openEditDialog = (doc: EmployeeDocument) => {
    setFormEmployeeId(doc.employeeId)
    setFormEmployeeName(doc.employeeName)
    setFormDocType(doc.documentType)
    setFormTitle(doc.title)
    setFormDocNumber(doc.documentNumber || '')
    setFormIssueDate(doc.issueDate || '')
    setFormExpiryDate(doc.expiryDate || '')
    setFormNotes(doc.notes || '')
    setFormTags(doc.tags || '')
    setEditDoc(doc)
  }

  const handleSubmit = () => {
    if (!formEmployeeId || !formDocType || !formTitle) {
      toast.error('Please fill in all required fields')
      return
    }
    const payload = {
      employeeId: formEmployeeId,
      employeeName: formEmployeeName,
      documentType: formDocType,
      title: formTitle,
      documentNumber: formDocNumber || null,
      issueDate: formIssueDate || null,
      expiryDate: formExpiryDate || null,
      notes: formNotes || null,
      tags: formTags || null,
    }
    if (editDoc) {
      updateMutation.mutate({ id: editDoc.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const getRowHighlight = (doc: EmployeeDocument): string => {
    const status = getExpiryStatus(doc.expiryDate)
    if (status === 'expired') return 'bg-red-50 dark:bg-red-950/30'
    if (status === 'expiring') return 'bg-yellow-50 dark:bg-yellow-950/30'
    return ''
  }

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
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Employee Documents</h2>
          <p className="text-xs text-muted-foreground">Manage employee documents, contracts, and IDs</p>
        </div>
        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Documents</p>
              <p className="text-lg font-bold">{stats?.totalDocuments ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="text-lg font-bold">{stats?.verifiedCount ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Verification</p>
              <p className="text-lg font-bold">{stats?.pendingVerification ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <CalendarClock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expiring (90d)</p>
              <p className="text-lg font-bold">{stats?.expiringWithin90 ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-2">
          <TabsList className="h-8">
            <TabsTrigger value="documents" className="text-xs px-3">
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="expiring" className="text-xs px-3">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Expiring Soon
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Doc Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Verified</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
            </SelectContent>
          </Select>
          {activeTab === 'expiring' && (
            <Select value={expiringDays} onValueChange={setExpiringDays}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Expiry" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="documents" className="mt-2">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Doc #</TableHead>
                    <TableHead className="text-xs">Issue Date</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs">Verified</TableHead>
                    <TableHead className="text-xs">Expiry</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map(doc => (
                      <TableRow key={doc.id} className={cn(getRowHighlight(doc))}>
                        <TableCell className="text-xs font-medium">{doc.employeeName}</TableCell>
                        <TableCell className="text-xs"><DocTypeBadge type={doc.documentType} /></TableCell>
                        <TableCell className="text-xs">{doc.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{doc.documentNumber || '—'}</TableCell>
                        <TableCell className="text-xs">{doc.issueDate ? formatDateShort(doc.issueDate) : '—'}</TableCell>
                        <TableCell className="text-xs">{doc.expiryDate ? formatDateShort(doc.expiryDate) : '—'}</TableCell>
                        <TableCell className="text-xs"><VerifiedBadge verified={doc.verified} /></TableCell>
                        <TableCell className="text-xs"><ExpiryBadge expiryDate={doc.expiryDate} /></TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewDoc(doc)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {!doc.verified && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setVerifyDocId(doc.id)}>
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditDialog(doc)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700" onClick={() => setDeleteDocId(doc.id)}>
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

        <TabsContent value="expiring" className="mt-2">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs">Days Left</TableHead>
                    <TableHead className="text-xs">Verified</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                        No documents expiring within {expiringDays} days
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map(doc => {
                      const daysLeft = doc.expiryDate
                        ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null
                      return (
                        <TableRow key={doc.id} className={cn(getRowHighlight(doc))}>
                          <TableCell className="text-xs font-medium">{doc.employeeName}</TableCell>
                          <TableCell className="text-xs"><DocTypeBadge type={doc.documentType} /></TableCell>
                          <TableCell className="text-xs">{doc.title}</TableCell>
                          <TableCell className="text-xs">{doc.expiryDate ? formatDateShort(doc.expiryDate) : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {daysLeft !== null ? (
                              <Badge className={cn(
                                'font-medium',
                                daysLeft <= 0
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : daysLeft <= 30
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                              )}>
                                {daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs"><VerifiedBadge verified={doc.verified} /></TableCell>
                          <TableCell className="text-xs text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewDoc(doc)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditDialog(doc)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editDoc} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setEditDoc(null); resetForm() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{editDoc ? 'Edit Document' : 'Add Document'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editDoc ? 'Update document information' : 'Add a new employee document'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label className="text-xs">Employee *</Label>
              <Select value={formEmployeeId} onValueChange={(v) => {
                setFormEmployeeId(v)
                const emp = employees.find(e => e.id === v)
                if (emp) setFormEmployeeName(`${emp.firstName} ${emp.lastName}`)
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Document Type *</Label>
              <Select value={formDocType} onValueChange={setFormDocType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Title *</Label>
              <Input className="h-8 text-xs" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Document title" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Document Number</Label>
              <Input className="h-8 text-xs" value={formDocNumber} onChange={e => setFormDocNumber(e.target.value)} placeholder="Reference number" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Issue Date</Label>
                <Input type="date" className="h-8 text-xs" value={formIssueDate} onChange={e => setFormIssueDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" className="h-8 text-xs" value={formExpiryDate} onChange={e => setFormExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[60px]" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input className="h-8 text-xs" value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="e.g. urgent, renewal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowCreateDialog(false); setEditDoc(null); resetForm() }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editDoc ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Document Details</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{viewDoc.employeeName}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <DocTypeBadge type={viewDoc.documentType} /></div>
              </div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{viewDoc.title}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Doc #:</span> {viewDoc.documentNumber || '—'}</div>
                <div><span className="text-muted-foreground">Verified:</span> <VerifiedBadge verified={viewDoc.verified} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Issue Date:</span> {viewDoc.issueDate ? formatDateShort(viewDoc.issueDate) : '—'}</div>
                <div>
                  <span className="text-muted-foreground">Expiry:</span> {viewDoc.expiryDate ? formatDateShort(viewDoc.expiryDate) : '—'}
                  {' '}<ExpiryBadge expiryDate={viewDoc.expiryDate} />
                </div>
              </div>
              {viewDoc.verified && (
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Verified By:</span> {viewDoc.verifiedBy || '—'}</div>
                  <div><span className="text-muted-foreground">Verified At:</span> {viewDoc.verifiedAt ? formatDateShort(viewDoc.verifiedAt) : '—'}</div>
                </div>
              )}
              {viewDoc.notes && <div><span className="text-muted-foreground">Notes:</span> {viewDoc.notes}</div>}
              {viewDoc.tags && <div><span className="text-muted-foreground">Tags:</span> {viewDoc.tags.split(',').map(t => (
                <Badge key={t.trim()} variant="outline" className="text-[10px] mr-1 ml-1">{t.trim()}</Badge>
              ))}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Confirmation */}
      <AlertDialog open={!!verifyDocId} onOpenChange={(open) => { if (!open) setVerifyDocId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Verify Document</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to mark this document as verified? This confirms the document has been reviewed and is authentic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { if (verifyDocId) verifyMutation.mutate(verifyDocId) }}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={(open) => { if (!open) setDeleteDocId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The document record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-7 text-xs bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteDocId) deleteMutation.mutate(deleteDocId) }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
