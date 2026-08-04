'use client'

import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { AccountingError } from './AccountingErrorBoundary'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Trash2, FileText, DollarSign, CheckCircle2, AlertCircle, Search, Send, Clock } from 'lucide-react'
import { useState } from 'react'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  totalAmount: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: string
  vendorName?: string
  customerName?: string
  date: string
  dueDate?: string
  status: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  notes?: string
  lineItems?: LineItem[]
}

interface InvoiceStats {
  totalInvoices: number
  totalAmount: number
  totalPaid: number
  totalOutstanding: number
  byType: Record<string, { count: number; amount: number; paid: number }>
}

interface InvoiceData {
  invoices: Invoice[]
  stats: InvoiceStats
}

// ── Config ───────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Sent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  Paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  'Partially Paid': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
}

const typeLabels: Record<string, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
}

const typeColors: Record<string, string> = {
  sales: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  purchase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  credit_note: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  debit_note: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ── Form line item type ─────────────────────────────────────
interface NewLineItem {
  tempId: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

function createEmptyLine(): NewLineItem {
  return { tempId: crypto.randomUUID(), description: '', quantity: '1', unitPrice: '', taxRate: '13' }
}

export function InvoicesView() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  // Form state
  const [formInvoiceNo, setFormInvoiceNo] = useState('')
  const [formType, setFormType] = useState('sales')
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDueDate, setFormDueDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formLines, setFormLines] = useState<NewLineItem[]>([createEmptyLine()])

  // Fetch invoices
  const { data, isLoading, error, refetch } = useQuery<InvoiceData>({
    queryKey: ['invoices', typeFilter, statusFilter, searchQuery, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      return apiFetch(`/api/invoices?${params.toString()}`)
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Invoice created successfully'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); closeCreateForm() },
    onError: (err: Error) => toast.error(err.message),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiFetch(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Invoice updated'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); setDetailInvoice(null); setPaymentDialog(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const resetForm = () => {
    setFormInvoiceNo(''); setFormType('sales'); setFormName(''); setFormDate(new Date().toISOString().split('T')[0])
    setFormDueDate(''); setFormNotes(''); setFormLines([createEmptyLine()])
  }

  const closeCreateForm = () => { setCreateOpen(false); resetForm() }

  // Line item management
  const addLine = () => setFormLines(prev => [...prev, createEmptyLine()])
  const removeLine = (id: string) => {
    if (formLines.length <= 1) return
    setFormLines(prev => prev.filter(l => l.tempId !== id))
  }
  const updateLine = (id: string, field: keyof NewLineItem, value: string) => {
    setFormLines(prev => prev.map(l => l.tempId === id ? { ...l, [field]: value } : l))
  }

  // Computed totals
  const lineTotals = formLines.map(l => {
    const qty = parseFloat(l.quantity) || 0
    const price = parseFloat(l.unitPrice) || 0
    const tax = parseFloat(l.taxRate) || 0
    const lineSubtotal = qty * price
    const lineTax = lineSubtotal * tax / 100
    return { subtotal: lineSubtotal, tax: lineTax, total: lineSubtotal + lineTax }
  })
  const subtotal = lineTotals.reduce((s, l) => s + l.subtotal, 0)
  const totalTax = lineTotals.reduce((s, l) => s + l.tax, 0)
  const total = subtotal + totalTax

  const handleCreate = () => {
    if (!formType) { toast.error('Type is required'); return }
    const validLines = formLines.filter(l => l.description && parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) > 0)
    if (validLines.length === 0) { toast.error('At least one valid line item is required'); return }
    const lineItems = validLines.map(l => {
      const qty = parseFloat(l.quantity)
      const price = parseFloat(l.unitPrice)
      const tax = parseFloat(l.taxRate) || 0
      const lineSubtotal = qty * price
      const lineTotal = lineSubtotal * (1 + tax / 100)
      return { description: l.description, quantity: qty, unitPrice: price, taxRate: tax, totalAmount: Math.round(lineTotal * 100) / 100 }
    })
    createMutation.mutate({
      ...(formInvoiceNo ? { invoiceNumber: formInvoiceNo } : {}),
      type: formType,
      date: formDate,
      ...(formType === 'purchase' ? { vendorName: formName } : { customerName: formName }),
      dueDate: formDueDate || undefined,
      lineItems,
      notes: formNotes || undefined,
    })
  }

  const handleRecordPayment = () => {
    if (!paymentDialog || !paymentAmount) return
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid payment amount'); return }
    const balance = paymentDialog.totalAmount - paymentDialog.paidAmount
    const newStatus = amt >= balance ? 'Paid' : 'Partially Paid'
    updateMutation.mutate({ id: paymentDialog.id, paidAmount: paymentDialog.paidAmount + amt, status: newStatus })
  }

  const handleMarkSent = (inv: Invoice) => {
    updateMutation.mutate({ id: inv.id, status: 'Sent' })
  }

  const handleMarkOverdue = (inv: Invoice) => {
    updateMutation.mutate({ id: inv.id, status: 'Overdue' })
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Invoices</h1>
          <p className="text-xs text-muted-foreground">Manage sales, purchase, and credit/debit notes</p>
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Create Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-7 text-xs pl-7 w-40" placeholder="Search invoices..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="credit_note">Credit Note</SelectItem>
            <SelectItem value="debit_note">Debit Note</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input className="h-7 text-xs w-32" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start" />
        <Input className="h-7 text-xs w-32" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End" />
        {(typeFilter || statusFilter || searchQuery || startDate || endDate) && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setTypeFilter(''); setStatusFilter(''); setSearchQuery(''); setStartDate(''); setEndDate('') }}>Clear</Button>
        )}
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><Skeleton className="h-14 w-full" /></Card>
          ))}
        </div>
      ) : error ? (
        <AccountingError error={error} onRetry={() => refetch()} title="Failed to load invoices" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Invoices</p>
                <p className="text-sm font-semibold truncate">{data?.stats.totalInvoices ?? 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-1.5">
                <DollarSign className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Amount</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.stats.totalAmount ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Paid</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.stats.totalPaid ?? 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Outstanding</p>
                <p className="text-sm font-semibold truncate">{formatNPR(data?.stats.totalOutstanding ?? 0)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Invoices Table */}
      <Card className="p-3">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data?.invoices.length ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No invoices found</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => { resetForm(); setCreateOpen(true) }}>
              <Plus className="h-3 w-3 mr-1" />Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableHead className="text-xs h-8">Invoice #</TableHead>
                  <TableHead className="text-xs h-8">Type</TableHead>
                  <TableHead className="text-xs h-8 hidden md:table-cell">Customer/Vendor</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-xs h-8 hidden lg:table-cell">Due Date</TableHead>
                  <TableHead className="text-xs h-8 text-right">Total</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Paid</TableHead>
                  <TableHead className="text-xs h-8 text-right hidden md:table-cell">Balance</TableHead>
                  <TableHead className="text-xs h-8">Status</TableHead>
                  <TableHead className="text-xs h-8 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map(inv => {
                  const balance = inv.totalAmount - inv.paidAmount
                  return (
                    <TableRow key={inv.id} className="text-xs">
                      <TableCell className="font-medium py-1.5 cursor-pointer hover:underline" onClick={() => setDetailInvoice(inv)}>{inv.invoiceNumber}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', typeColors[inv.type] ?? '')}>{typeLabels[inv.type] ?? inv.type}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden md:table-cell">
                        {inv.type === 'purchase' ? inv.vendorName : inv.customerName || '—'}
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{formatDateShort(inv.date)}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground hidden lg:table-cell">{inv.dueDate ? formatDateShort(inv.dueDate) : '—'}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatNPR(inv.totalAmount)}</TableCell>
                      <TableCell className="py-1.5 text-right hidden md:table-cell text-green-600">{formatNPR(inv.paidAmount)}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium hidden md:table-cell', balance > 0 ? 'text-red-600' : 'text-green-600')}>{formatNPR(balance)}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-xs', statusColors[inv.status] ?? '')}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailInvoice(inv)} className="p-1 rounded hover:bg-muted" title="View"><FileText className="h-3 w-3 text-muted-foreground" /></button>
                          {inv.status === 'Draft' && (
                            <button onClick={() => handleMarkSent(inv)} className="p-1 rounded hover:bg-muted" title="Mark as Sent"><Send className="h-3 w-3 text-muted-foreground" /></button>
                          )}
                          {(inv.status === 'Sent' || inv.status === 'Partially Paid') && (
                            <button onClick={() => handleMarkOverdue(inv)} className="p-1 rounded hover:bg-muted" title="Mark Overdue"><Clock className="h-3 w-3 text-muted-foreground" /></button>
                          )}
                          {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                            <button onClick={() => { setPaymentDialog(inv); setPaymentAmount(String(inv.totalAmount - inv.paidAmount)) }} className="p-1 rounded hover:bg-muted" title="Record Payment"><DollarSign className="h-3 w-3 text-green-600" /></button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Invoice</DialogTitle>
            <DialogDescription className="text-xs">Add a new invoice with line items</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Invoice Number</Label>
                <Input className="h-8 text-xs" value={formInvoiceNo} onChange={e => setFormInvoiceNo(e.target.value)} placeholder="Auto-generated" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                    <SelectItem value="debit_note">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5 col-span-1">
                <Label className="text-xs">Date</Label>
                <Input className="h-8 text-xs" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input className="h-8 text-xs" type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Customer/Vendor</Label>
                <Input className="h-8 text-xs" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Name" />
              </div>
            </div>
            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Line Items</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formLines.map((line) => (
                  <div key={line.tempId} className="grid grid-cols-[1fr_60px_80px_50px_24px] gap-1 items-end">
                    <div><Label className="text-[10px] text-muted-foreground">Description</Label><Input className="h-7 text-xs" value={line.description} onChange={e => updateLine(line.tempId, 'description', e.target.value)} placeholder="Item" /></div>
                    <div><Label className="text-[10px] text-muted-foreground">Qty</Label><Input className="h-7 text-xs" type="number" value={line.quantity} onChange={e => updateLine(line.tempId, 'quantity', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground">Unit Price</Label><Input className="h-7 text-xs" type="number" value={line.unitPrice} onChange={e => updateLine(line.tempId, 'unitPrice', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground">Tax %</Label><Input className="h-7 text-xs" type="number" value={line.taxRate} onChange={e => updateLine(line.tempId, 'taxRate', e.target.value)} /></div>
                    <button type="button" onClick={() => removeLine(line.tempId)} className="p-1 hover:bg-muted rounded" disabled={formLines.length <= 1}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            </div>
            {/* Totals */}
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatNPR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatNPR(totalTax)}</span></div>
              <div className="flex justify-between font-semibold text-sm border-t pt-1"><span>Total</span><span>{formatNPR(total)}</span></div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[50px]" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeCreateForm}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Invoice'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Invoice {detailInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription className="text-xs flex items-center gap-2">
              {detailInvoice && <Badge variant="outline" className={cn('text-xs', typeColors[detailInvoice.type] ?? '')}>{typeLabels[detailInvoice.type]}</Badge>}
              {detailInvoice && <Badge variant="outline" className={cn('text-xs', statusColors[detailInvoice?.status ?? ''] ?? '')}>{detailInvoice?.status}</Badge>}
            </DialogDescription>
          </DialogHeader>
          {detailInvoice && (
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Customer/Vendor: </span>{detailInvoice.type === 'purchase' ? detailInvoice.vendorName : detailInvoice.customerName || '—'}</div>
                <div><span className="text-muted-foreground">Date: </span>{formatDateShort(detailInvoice.date)}</div>
                <div><span className="text-muted-foreground">Due Date: </span>{detailInvoice.dueDate ? formatDateShort(detailInvoice.dueDate) : '—'}</div>
                <div><span className="text-muted-foreground">Balance: </span><span className={cn('font-medium', (detailInvoice.totalAmount - detailInvoice.paidAmount) > 0 ? 'text-red-600' : 'text-green-600')}>{formatNPR(detailInvoice.totalAmount - detailInvoice.paidAmount)}</span></div>
              </div>
              {detailInvoice.lineItems && detailInvoice.lineItems.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs h-7">Description</TableHead><TableHead className="text-xs h-7 text-right">Qty</TableHead><TableHead className="text-xs h-7 text-right">Price</TableHead><TableHead className="text-xs h-7 text-right">Tax</TableHead><TableHead className="text-xs h-7 text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {detailInvoice.lineItems.map(item => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="py-1.5">{item.description}</TableCell>
                        <TableCell className="py-1.5 text-right">{item.quantity}</TableCell>
                        <TableCell className="py-1.5 text-right">{formatNPR(item.unitPrice)}</TableCell>
                        <TableCell className="py-1.5 text-right">{item.taxRate}%</TableCell>
                        <TableCell className="py-1.5 text-right">{formatNPR(item.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatNPR(detailInvoice.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatNPR(detailInvoice.taxAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-600">{formatNPR(detailInvoice.paidAmount)}</span></div>
                <div className="flex justify-between font-semibold text-sm border-t pt-1"><span>Total</span><span>{formatNPR(detailInvoice.totalAmount)}</span></div>
              </div>
              {detailInvoice.notes && <div className="text-xs"><span className="text-muted-foreground">Notes: </span>{detailInvoice.notes}</div>}
              {detailInvoice.status !== 'Paid' && detailInvoice.status !== 'Cancelled' && (
                <div className="flex justify-end">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { setPaymentDialog(detailInvoice); setDetailInvoice(null); setPaymentAmount(String(detailInvoice.totalAmount - detailInvoice.paidAmount)) }}>{updateMutation.isPending ? 'Updating...' : 'Record Payment'}</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Record Payment</DialogTitle>
            <DialogDescription className="text-xs">Invoice {paymentDialog?.invoiceNumber} — Balance: {formatNPR((paymentDialog?.totalAmount ?? 0) - (paymentDialog?.paidAmount ?? 0))}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Payment Amount (NPR)</Label>
              <Input className="h-8 text-xs" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPaymentDialog(null)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleRecordPayment} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Processing...' : 'Record Payment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
