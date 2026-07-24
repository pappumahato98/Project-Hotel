'use client'

import { apiFetch } from '@/lib/api'
import { invalidate } from '@/lib/queryKeys'
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, CreditCard, Receipt, Printer, Mail, DollarSign, FileText,
  ArrowLeft, ArrowUpDown, ChevronRight, BedDouble, CalendarDays, User, Shield,
  StickyNote, XCircle, Activity, CircleAlert, Ban, X, BookOpen, Loader2, Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore, usePreferencesStore, useFolioContextStore, useNavigationStore, useGuestLedgerContextStore } from '@/lib/store'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

interface FolioReservation {
  id: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number
  status: string
  creditLimit: number
  room: { number: string } | null
}

interface FolioGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface FolioTransaction {
  id: string
  transactionType: string
  description: string
  amount: number
  taxAmount: number
  totalAmount: number
  quantity: number
  reference: string | null
  outlet: string | null
  postedBy: string | null
  createdAt: string
}

interface FolioPayment {
  id: string
  paymentMethod: string
  amount: number
  reference: string | null
  cardType: string | null
  exchangeRate: number | null
  foreignAmount: number | null
  receivedBy: string | null
  status: string | null
  createdAt: string
}

interface Folio {
  id: string
  folioType: string
  status: string
  balance: number
  reservation: FolioReservation
  guest: FolioGuest
  transactions: FolioTransaction[]
  payments: FolioPayment[]
}

interface FolioStats {
  openFolios: number
  totalOutstanding: number
  todayCharges: number
  todayPayments: number
}

interface SearchResult {
  type: string
  id: string
  label: string
  sublabel: string
  balance: number
}

type SortField = 'guestName' | 'balance'
type SortDir = 'asc' | 'desc'

interface VoidTarget {
  type: 'transaction' | 'payment'
  id: string
  description: string
  amount: number
}

// ─── Constants ───────────────────────────────────────────────────────────

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  room: 'Room',
  f_and_b: 'Food & Bev',
  laundry: 'Laundry',
  spa: 'Spa',
  phone: 'Phone',
  minibar: 'Minibar',
  business_center: 'Biz Center',
  miscellaneous: 'Misc',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  city_ledger: 'City Ledger',
  voucher: 'Voucher',
  gift_card: 'Gift Card',
  foreign_currency: 'Foreign Currency',
}

const CARD_TYPE_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  other: 'Other',
}

const FOLIO_TYPE_LABELS: Record<string, string> = {
  guest: 'Guest',
  company: 'Company',
  comp: 'Complimentary',
  master: 'Master',
}

// ─── Helpers ────────────────────────────────────────────────────────────

function guestFullName(g: FolioGuest | null | undefined): string {
  if (!g) return '—'
  return `${g.firstName} ${g.lastName}`
}

function folioCharges(f: Folio): number {
  return f.transactions.reduce((s, t) => s + t.totalAmount, 0)
}

function folioPayments(f: Folio): number {
  return f.payments.reduce((s, p) => s + p.amount, 0)
}

function folioOutstanding(f: Folio): number {
  return folioCharges(f) - folioPayments(f)
}

function isVoidedTransaction(t: FolioTransaction): boolean {
  return t.totalAmount === 0 && t.description.includes('[VOIDED')
}

function isVoidedPayment(p: FolioPayment): boolean {
  return p.amount === 0 && p.reference?.includes('[VOIDED')
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Component ──────────────────────────────────────────────────────────

export function FolioView() {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const { preferences } = usePreferencesStore()
  const { folioContext, clearFolioContext } = useFolioContextStore()
  const { navigateTo } = useNavigationStore()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('guestName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Dialogs
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const [voidReason, setVoidReason] = useState('')

  // Charge form
  const [chargeType, setChargeType] = useState('miscellaneous')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeQty, setChargeQty] = useState('1')
  const [chargeOutlet, setChargeOutlet] = useState('')
  const [chargeRef, setChargeRef] = useState('')

  // Payment form
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')
  const [payReference, setPayReference] = useState('')
  const [payCardType, setPayCardType] = useState('visa')
  const [payReceivedBy, setPayReceivedBy] = useState('Front Desk')

  // Notes form
  const [folioNotes, setFolioNotes] = useState('')

  // Split folio dialog
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitSelectedTxnIds, setSplitSelectedTxnIds] = useState<Set<string>>(new Set())
  const [splitFolioType, setSplitFolioType] = useState('company')
  const [splitDescription, setSplitDescription] = useState('')

  // Email / receipt print dialogs
  const [receiptPrintDialogOpen, setReceiptPrintDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  // Search dropdown ref
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Auto-load folio from context
  React.useEffect(() => {
    if (folioContext && !selectedFolioId) {
      setSelectedFolioId(folioContext.folioId || '')
      clearFolioContext()
    }
  }, [folioContext])

  // Dropdown close state for search
  const [dropdownForceClose, setDropdownForceClose] = useState(false)

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownForceClose(true)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset force close when search changes
  useEffect(() => {
    setDropdownForceClose(false) // eslint-disable-line react-hooks/set-state-in-effect
  }, [searchQuery])

  // ─── Data Fetching ────────────────────────────────────────────────

  // Fetch all folios + stats (list view)
  const { data: foliosData, isLoading: foliosLoading } = useQuery({
    queryKey: ['folios'],
    queryFn: () => apiFetch<{ folios: Folio[]; stats: FolioStats | null; settings: Record<string, unknown> }>('/api/folio'),
  })

  // Search folios
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['folio-search', debouncedSearch],
    queryFn: () => apiFetch<{ folios: Folio[] }>(`/api/folio?search=${encodeURIComponent(debouncedSearch)}`),
    enabled: debouncedSearch.length >= 2,
  })

  // Compute search results from data
  const searchResults = useMemo(() => {
    if (!searchData?.folios) return []
    return searchData.folios.map((f) => ({
      type: 'folio',
      id: f.id,
      label: guestFullName(f.guest),
      sublabel: `Room ${f.reservation.room?.number || '?'} · ${f.reservation.confirmationNo} · ${formatCurrency(folioOutstanding(f))}`,
      balance: folioOutstanding(f),
    }))
  }, [searchData])

  // Show dropdown when results exist and search is active
  const showSearchDropdown = searchResults.length > 0 && debouncedSearch.length >= 2
  const isSearchDropdownOpen = showSearchDropdown && !dropdownForceClose

  // Fetch selected folio detail
  const { data: folioDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['folio-detail', selectedFolioId],
    queryFn: async () => {
      if (!selectedFolioId) return null
      // Find folio in the list first
      const folio = foliosData?.folios?.find((f) => f.id === selectedFolioId)
      if (folio) {
        // If folio has transactions/payments, use it; otherwise fetch with reservationId
        if (folio.transactions.length > 0 || folio.payments.length > 0) return folio
        try {
          const data = await apiFetch<{ folios: Folio[] }>(`/api/folio?reservationId=${folio.reservation.id}`)
          return data.folios?.[0] || folio
        } catch { return folio }
      }
      // Fallback: fetch all and find
      try {
        const data = await apiFetch<{ folios: Folio[] }>('/api/folio')
        return data.folios?.find((f) => f.id === selectedFolioId) || null
      } catch { return null }
    },
    enabled: !!selectedFolioId,
  })

  const activeFolio = folioDetail || null

  // ─── Computed Values ──────────────────────────────────────────────

  const stats = foliosData?.stats || null
  const allFolios = foliosData?.folios || []
  const totalCharges = activeFolio ? folioCharges(activeFolio) : 0
  const totalPayments = activeFolio ? folioPayments(activeFolio) : 0
  const outstandingBalance = totalCharges - totalPayments
  const creditLimit = activeFolio?.reservation.creditLimit || 15000
  const creditPct = creditLimit > 0 ? Math.min((outstandingBalance / creditLimit) * 100, 100) : 0

  // Charge tax preview
  const chargeAmountNum = parseFloat(chargeAmount) || 0
  const chargeTaxPreview = chargeAmountNum * (settings.taxRate / 100)
  const chargeTotalPreview = chargeAmountNum + chargeTaxPreview

  // Sort folios list
  const sortedFolios = useMemo(() => {
    const sorted = [...allFolios]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortField === 'guestName') {
        cmp = guestFullName(a.guest).localeCompare(guestFullName(b.guest))
      } else if (sortField === 'balance') {
        cmp = folioOutstanding(a) - folioOutstanding(b)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [allFolios, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Activity timeline (combined charges + payments)
  const activityTimeline = useMemo(() => {
    if (!activeFolio) return []
    const items: Array<{
      id: string
      type: 'charge' | 'payment'
      description: string
      amount: number
      date: string
      meta?: string
    }> = []

    activeFolio.transactions.forEach((t) => {
      items.push({
        id: t.id,
        type: 'charge',
        description: t.description,
        amount: t.totalAmount,
        date: t.createdAt,
        meta: TRANSACTION_TYPE_LABELS[t.transactionType] || t.transactionType,
      })
    })

    activeFolio.payments.forEach((p) => {
      items.push({
        id: p.id,
        type: 'payment',
        description: PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod,
        amount: p.amount,
        date: p.createdAt,
        meta: p.reference || undefined,
      })
    })

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [activeFolio])

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleSelectFolio = useCallback((id: string) => {
    setSelectedFolioId(id)
    setDropdownForceClose(true)
  }, [])

  const handleSelectSearchResult = (result: SearchResult) => {
    handleSelectFolio(result.id)
    setSearchQuery('')
    setDropdownForceClose(true)
  }

  const handleBackToList = () => {
    setSelectedFolioId(null)
  }

  const handleSortToggle = (field: SortField) => () => handleSort(field)

  // ─── Mutations ────────────────────────────────────────────────────

  const postChargeMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio) throw new Error('No folio selected')
      const qty = parseInt(chargeQty) || 1
      const baseAmount = chargeAmountNum
      const taxAmount = baseAmount * (settings.taxRate / 100)
      const totalAmount = (baseAmount + taxAmount) * qty

      return apiFetch<{ folio: Folio }>(`/api/folio/${activeFolio.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'charge',
          transactionType: chargeType,
          description: chargeDesc,
          amount: baseAmount * qty,
          taxAmount: taxAmount * qty,
          totalAmount,
          quantity: qty,
          outlet: chargeOutlet || undefined,
          reference: chargeRef || undefined,
        }),
      })
    },
    onSuccess: (data) => {
      invalidate.afterFolioChange(queryClient, activeFolio?.guest?.id)
      queryClient.invalidateQueries({ queryKey: ['folio-detail', data.folio.id] })
      setSelectedFolioId(data.folio.id)
      setChargeDialogOpen(false)
      setChargeDesc('')
      setChargeAmount('')
      setChargeQty('1')
      setChargeOutlet('')
      setChargeRef('')
      setChargeType('miscellaneous')
      toast.success('Charge posted successfully')
    },
    onError: () => toast.error('Failed to post charge'),
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio) throw new Error('No folio selected')
      return apiFetch<{ folio: Folio }>(`/api/folio/${activeFolio.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          paymentMethod: payMethod,
          amount: parseFloat(payAmount),
          reference: payReference || undefined,
          cardType: payMethod === 'card' ? payCardType : undefined,
          receivedBy: payReceivedBy,
        }),
      })
    },
    onSuccess: (data) => {
      invalidate.afterFolioChange(queryClient, activeFolio?.guest?.id)
      queryClient.invalidateQueries({ queryKey: ['folio-detail', data.folio.id] })
      setSelectedFolioId(data.folio.id)
      setPaymentDialogOpen(false)
      setPayAmount('')
      setPayReference('')
      setPayMethod('cash')
      setPayCardType('visa')
      setPayReceivedBy('Front Desk')
      toast.success('Payment recorded successfully')
    },
    onError: () => toast.error('Failed to record payment'),
  })

  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio || !voidTarget) throw new Error('Missing data')
      return apiFetch<{ folio: Folio }>(`/api/folio/${activeFolio.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: voidTarget.type === 'transaction' ? 'void_transaction' : 'void_payment',
          transactionId: voidTarget.type === 'transaction' ? voidTarget.id : undefined,
          paymentId: voidTarget.type === 'payment' ? voidTarget.id : undefined,
          reason: voidReason,
        }),
      })
    },
    onSuccess: () => {
      invalidate.afterFolioChange(queryClient, activeFolio?.guest?.id)
      queryClient.invalidateQueries({ queryKey: ['folio-detail', selectedFolioId] })
      setVoidDialogOpen(false)
      setVoidTarget(null)
      setVoidReason('')
      toast.success('Transaction voided successfully')
    },
    onError: () => toast.error('Failed to void transaction'),
  })

  const splitFolioMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio) throw new Error('No folio selected')
      return apiFetch<{ sourceFolio: Folio; targetFolio: Folio }>(
        `/api/folio/${activeFolio.id}/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionIds: Array.from(splitSelectedTxnIds),
            folioType: splitFolioType,
            description: splitDescription || undefined,
          }),
        },
      )
    },
    onSuccess: (data) => {
      invalidate.afterFolioChange(queryClient, activeFolio?.guest?.id)
      queryClient.invalidateQueries({ queryKey: ['folio-detail', data.sourceFolio.id] })
      queryClient.invalidateQueries({ queryKey: ['folio-detail', data.targetFolio.id] })
      setSelectedFolioId(data.sourceFolio.id)
      setSplitDialogOpen(false)
      setSplitSelectedTxnIds(new Set())
      setSplitDescription('')
      toast.success(
        `Split ${splitSelectedTxnIds.size} transaction${splitSelectedTxnIds.size !== 1 ? 's' : ''} to new ${FOLIO_TYPE_LABELS[splitFolioType]} folio`,
      )
    },
    onError: () => toast.error('Failed to split folio'),
  })

  const handlePrintFolio = () => {
    if (!activeFolio) return
    const guestName = guestFullName(activeFolio.guest)
    const roomNum = activeFolio.reservation.room?.number || 'N/A'
    const confNo = activeFolio.reservation.confirmationNo
    const charges = folioCharges(activeFolio)
    const payments = folioPayments(activeFolio)
    const balance = charges - payments

    const txnRows = activeFolio.transactions
      .filter(t => !isVoidedTransaction(t))
      .map(t => `<tr><td>${formatDateTime(t.createdAt)}</td><td>${t.description}</td><td style="text-align:right">${formatCurrency(t.totalAmount)}</td></tr>`)
      .join('')

    const payRows = activeFolio.payments
      .filter(p => !isVoidedPayment(p))
      .map(p => `<tr><td>${formatDateTime(p.createdAt)}</td><td>${PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td><td style="text-align:right">-${formatCurrency(p.amount)}</td></tr>`)
      .join('')

    const printWindow = window.open('', '_blank', 'width=450,height=700')
    if (!printWindow) { toast.error('Please allow popups to print'); return }
    printWindow.document.write(`
    <html><head><title>Folio Statement</title>
    <style>body{font-family:monospace;max-width:400px;margin:0 auto;padding:16px;font-size:11px}
    .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between}.green{color:green}.red{color:red}
    table{width:100%;border-collapse:collapse}th,td{padding:3px 4px;text-align:left;font-size:10px}
    th{border-bottom:1px solid #000;font-weight:bold}h2{margin:0 0 2px}p.sub{margin:0 0 12px;color:#666;font-size:10px}</style></head>
    <body>
    <div class="center"><h2>MERIDIAN HOTEL</h2><p class="sub">Folio Statement</p></div>
    <div class="line"></div>
    <div class="row"><span>Guest:</span><span class="bold">${guestName}</span></div>
    <div class="row"><span>Room:</span><span>${roomNum}</span></div>
    <div class="row"><span>Confirmation:</span><span>${confNo}</span></div>
    <div class="line"></div>
    <h4>Charges</h4>
    <table><thead><tr><th>Date</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${txnRows}</tbody></table>
    <div class="line"></div>
    <h4>Payments</h4>
    <table><thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>${payRows}</tbody></table>
    <div class="line"></div>
    <div class="row"><span>Total Charges:</span><span>${formatCurrency(charges)}</span></div>
    <div class="row"><span>Total Payments:</span><span class="green">-${formatCurrency(payments)}</span></div>
    <div class="line"></div>
    <div class="row"><span class="bold">Balance:</span><span class="bold ${balance > 0 ? 'red' : 'green'}">${formatCurrency(balance)}</span></div>
    <div class="line"></div>
    <div class="center" style="margin-top:12px;font-size:9px;color:#999">Generated: ${new Date().toLocaleString()}</div>
    <script>window.print();window.close();</script>
    </body></html>
  `)
    printWindow.document.close()
    toast.success('Folio sent to printer')
  }

  const handleEmailFolio = () => {
    if (!activeFolio) return
    setEmailDialogOpen(true)
  }
  const handleConfirmEmailFolio = async () => {
    if (!activeFolio) return
    setEmailDialogOpen(false)
    try {
      const res = await apiFetch<{ success: boolean; message: string; data: { to: string } }>(
        `/api/folio/${activeFolio.id}/email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customMessage: '' }),
        },
      )
      toast.success(`Folio statement emailed to ${res.data.to}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to email folio statement')
    }
  }

  const handleOpenVoidDialog = (target: VoidTarget) => {
    setVoidTarget(target)
    setVoidReason('')
    setVoidDialogOpen(true)
  }

  const handleViewGuestLedger = (guestId: string, guestName: string) => {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({ guestId, guestName })
    navigateTo('front-desk', 'guest-ledger')
  }

  const handleViewInHouse = (reservationId: string, guestId: string, guestName: string, roomNumber: string, confirmationNo: string, folioId: string) => {
    useFolioContextStore.getState().setFolioContext({
      reservationId, guestId, guestName, roomNumber, confirmationNo, folioId,
    })
    navigateTo('front-desk', 'in-house')
  }

  const handleOpenPaymentDialog = () => {
    setPayAmount(outstandingBalance > 0 ? String(outstandingBalance) : '')
    setPaymentDialogOpen(true)
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* ─── 1. Module Header ───────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Guest Folio</h2>
        <p className="text-xs text-muted-foreground">
          Search and manage guest folios, charges, and payments
        </p>
      </div>

      {/* ─── 2. Search Bar ─────────────────────────────────────── */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, room number, or confirmation #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9 h-8', searchQuery && !searchLoading && 'pr-7')}
            onFocus={() => { setDropdownForceClose(false) }}
          />
          {searchQuery && !searchLoading && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Dropdown */}
        {isSearchDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto p-1">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectSearchResult(result)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
                    <Receipt className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Content: List or Detail ───────────────────────────── */}
      {!activeFolio ? (
        <FolioList
          folios={sortedFolios}
          loading={foliosLoading}
          sortField={sortField}
          sortDir={sortDir}
          handleSort={handleSortToggle}
          onSelect={handleSelectFolio}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Folio Detail Panel */}
            <div className="flex-1 min-w-0 space-y-2">
              <FolioDetailPanel
                folio={activeFolio}
                loading={detailLoading}
                totalCharges={totalCharges}
                totalPayments={totalPayments}
                outstandingBalance={outstandingBalance}
                creditLimit={creditLimit}
                creditPct={creditPct}
                currency={preferences.currency}
                taxRate={settings.taxRate}
                activityTimeline={activityTimeline}
                onBack={handleBackToList}
                onViewGuestLedger={handleViewGuestLedger}
                onViewInHouse={handleViewInHouse}
                onChargeClick={() => setChargeDialogOpen(true)}
                onPaymentClick={handleOpenPaymentDialog}
                onVoidTransaction={(id, desc, amt) => handleOpenVoidDialog({ type: 'transaction', id, description: desc, amount: amt })}
                onVoidPayment={(id, desc, amt) => handleOpenVoidDialog({ type: 'payment', id, description: desc, amount: amt })}
                onNotesChange={setFolioNotes}
                folioNotes={folioNotes}
                onSplitClick={() => {
                  if (!activeFolio?.transactions.length) {
                    toast.info('No charges to split on this folio')
                    return
                  }
                  setSplitSelectedTxnIds(new Set())
                  setSplitFolioType('company')
                  setSplitDescription('')
                  setSplitDialogOpen(true)
                }}
                onPrintFolio={handlePrintFolio}
                onEmailFolio={handleEmailFolio}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Post Charge Dialog ────────────────────────────── */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Post New Charge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Transaction Type *</Label>
              <Select value={chargeType} onValueChange={setChargeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                placeholder="Charge description"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ({preferences.currency}) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  step="0.01"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={chargeQty}
                  onChange={(e) => setChargeQty(e.target.value)}
                />
              </div>
            </div>
            {chargeAmountNum > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(chargeAmountNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({settings.taxRate}%)</span>
                  <span>{formatCurrency(chargeTaxPreview)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(chargeTotalPreview)}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Input
                  placeholder="Optional"
                  value={chargeOutlet}
                  onChange={(e) => setChargeOutlet(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  placeholder="Optional"
                  value={chargeRef}
                  onChange={(e) => setChargeRef(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => postChargeMutation.mutate()}
              disabled={!chargeDesc || chargeAmountNum <= 0 || postChargeMutation.isPending}
            >
              {postChargeMutation.isPending ? (
                <><div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" /> Posting...</>
              ) : 'Post Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 6. Record Payment Dialog ──────────────────────────── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({preferences.currency}) *</Label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              {outstandingBalance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatCurrency(outstandingBalance)}
                </p>
              )}
            </div>
            {payMethod === 'card' && (
              <div className="space-y-1.5">
                <Label>Card Type *</Label>
                <Select value={payCardType} onValueChange={setPayCardType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CARD_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                placeholder="Reference # (optional)"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Received By</Label>
              <Input
                value={payReceivedBy}
                onChange={(e) => setPayReceivedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={!payAmount || parseFloat(payAmount) <= 0 || recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <><div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" /> Recording...</>
              ) : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 7. Void Transaction Dialog ─────────────────────────── */}
      <AlertDialog open={voidDialogOpen} onOpenChange={(open) => { setVoidDialogOpen(open); if (!open) { setVoidTarget(null); setVoidReason('') } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="size-5 text-red-500" />
              Void {voidTarget?.type === 'transaction' ? 'Charge' : 'Payment'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm">
                  Are you sure you want to void this {voidTarget?.type === 'transaction' ? 'charge' : 'payment'}? This action cannot be undone.
                </p>
                {voidTarget && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-medium">{voidTarget.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">{formatCurrency(voidTarget.amount)}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter reason for voiding..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => voidMutation.mutate()}
              disabled={!voidReason.trim() || voidMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {voidMutation.isPending ? 'Voiding...' : 'Confirm Void'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── 8. Split Folio Dialog ────────────────────────────── */}
      <Dialog open={splitDialogOpen} onOpenChange={(open) => { setSplitDialogOpen(open); if (!open) setSplitSelectedTxnIds(new Set()) }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitIcon className="size-5" />
              Split Folio
            </DialogTitle>
            <DialogDescription>
              Select charges to move to a new folio. The source folio balance will be recalculated.
            </DialogDescription>
          </DialogHeader>

          {activeFolio && (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Transaction list with checkboxes */}
              <div className="rounded-lg border max-h-64 overflow-y-auto">
                <div className="sticky top-0 bg-background/95 backdrop-sm border-b px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Charges ({activeFolio.transactions.filter((t) => !isVoidedTransaction(t)).length} non-voided)
                  </span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const nonVoided = activeFolio.transactions.filter((t) => !isVoidedTransaction(t))
                      const allIds = new Set(nonVoided.map((t) => t.id))
                      if (splitSelectedTxnIds.size === allIds.size) {
                        setSplitSelectedTxnIds(new Set())
                      } else {
                        setSplitSelectedTxnIds(allIds)
                      }
                    }}
                  >
                    {splitSelectedTxnIds.size === activeFolio.transactions.filter((t) => !isVoidedTransaction(t)).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="divide-y">
                  {activeFolio.transactions
                    .filter((t) => !isVoidedTransaction(t))
                    .map((txn) => (
                      <label
                        key={txn.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors',
                          splitSelectedTxnIds.has(txn.id) && 'bg-primary/5',
                        )}
                      >
                        <Checkbox
                          checked={splitSelectedTxnIds.has(txn.id)}
                          onCheckedChange={(checked) => {
                            setSplitSelectedTxnIds((prev) => {
                              const next = new Set(prev)
                              if (checked) next.add(txn.id)
                              else next.delete(txn.id)
                              return next
                            })
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{txn.description}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {TRANSACTION_TYPE_LABELS[txn.transactionType] || txn.transactionType}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(txn.createdAt)}
                            {txn.outlet ? ` · ${txn.outlet}` : ''}
                          </span>
                        </div>
                        <span className="text-sm font-semibold shrink-0">
                          {formatCurrency(txn.totalAmount)}
                        </span>
                      </label>
                    ))}
                  {activeFolio.transactions.filter((t) => !isVoidedTransaction(t)).length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No non-voided charges on this folio
                    </div>
                  )}
                </div>
              </div>

              {/* Split total */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Selected Charges</span>
                  <span className="font-medium">{splitSelectedTxnIds.size} transaction{splitSelectedTxnIds.size !== 1 ? 's' : ''}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Amount to Split</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(
                      activeFolio.transactions
                        .filter((t) => splitSelectedTxnIds.has(t.id))
                        .reduce((sum, t) => sum + t.totalAmount, 0),
                    )}
                  </span>
                </div>
              </div>

              {/* Target folio type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Target Folio Type *</Label>
                <Select value={splitFolioType} onValueChange={setSplitFolioType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="comp">Complimentary</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional description */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Reason for splitting this folio..."
                  value={splitDescription}
                  onChange={(e) => setSplitDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSplitDialogOpen(false)}
              disabled={splitFolioMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => splitFolioMutation.mutate()}
              disabled={splitSelectedTxnIds.size === 0 || splitFolioMutation.isPending}
            >
              {splitFolioMutation.isPending ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Splitting...</>
              ) : (
                <><Check className="size-4 mr-1.5" /> Split Folio</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 9. Email Folio Confirmation Dialog ──────────────────── */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Email Folio Statement
            </DialogTitle>
            <DialogDescription>
              Send a copy of this folio statement to the guest.
            </DialogDescription>
          </DialogHeader>
          {activeFolio && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-medium">{guestFullName(activeFolio.guest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span>{activeFolio.reservation.room?.number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={folioOutstanding(activeFolio) > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    {formatCurrency(folioOutstanding(activeFolio))}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The folio statement will be emailed to the guest&apos;s registered email address on file.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmEmailFolio} className="bg-primary">
              <Mail className="size-4 mr-1.5" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Folio List ─────────────────────────────────────────────────────────

function FolioList({ folios, loading, sortField, sortDir, handleSort, onSelect }: {
  folios: Folio[]
  loading: boolean
  sortField: SortField
  sortDir: SortDir
  handleSort: (f: SortField) => () => void
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-2 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!folios.length) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center text-muted-foreground">
          <Receipt className="size-12 mb-3 opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No Folios Found</h3>
          <p className="text-sm max-w-sm">
            There are no guest folios yet. Folios are automatically created when guests check in.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">
                <button onClick={handleSort('guestName')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Guest Name
                  <ArrowUpDown className="size-3" />
                  {sortField === 'guestName' && (
                    <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Confirmation #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Charges</TableHead>
              <TableHead className="text-right">Payments</TableHead>
              <TableHead className="text-right">
                <button onClick={handleSort('balance')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Balance
                  <ArrowUpDown className="size-3" />
                  {sortField === 'balance' && (
                    <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {folios.map((f) => {
              const charges = folioCharges(f)
              const payments = folioPayments(f)
              const balance = charges - payments
              return (
                <TableRow
                  key={f.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onSelect(f.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{guestFullName(f.guest)}</span>
                      {f.guest.vipLevel !== 'none' && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">VIP</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{f.reservation.room?.number || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{f.reservation.confirmationNo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {FOLIO_TYPE_LABELS[f.folioType] || f.folioType}
                    </Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(charges)}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600">{formatCurrency(payments)}</TableCell>
                  <TableCell className={cn('text-right text-xs font-semibold', balance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {formatCurrency(balance)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {folios.map((f) => {
          const charges = folioCharges(f)
          const payments = folioPayments(f)
          const balance = charges - payments
          return (
            <Card
              key={f.id}
              className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              onClick={() => onSelect(f.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs truncate">{guestFullName(f.guest)}</span>
                      {f.guest.vipLevel !== 'none' && (
                        <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">VIP</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Room {f.reservation.room?.number || '—'} · {f.reservation.confirmationNo}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Charges: {formatCurrency(charges)}</span>
                    <span>Paid: {formatCurrency(payments)}</span>
                  </div>
                  <span className={cn('text-xs font-bold', balance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ─── Folio Detail Panel ──────────────────────────────────────────────────

function FolioDetailPanel({
  folio, loading, totalCharges, totalPayments, outstandingBalance,
  creditLimit, creditPct, currency, taxRate, activityTimeline,
  onBack, onViewGuestLedger, onViewInHouse, onChargeClick, onPaymentClick,
  onVoidTransaction, onVoidPayment, onNotesChange, folioNotes, onSplitClick,
  onPrintFolio, onEmailFolio,
}: {
  folio: Folio
  loading: boolean
  totalCharges: number
  totalPayments: number
  outstandingBalance: number
  creditLimit: number
  creditPct: number
  currency: string
  taxRate: number
  activityTimeline: Array<{ id: string; type: 'charge' | 'payment'; description: string; amount: number; date: string; meta?: string }>
  onBack: () => void
  onViewGuestLedger: (guestId: string, guestName: string) => void
  onViewInHouse: (reservationId: string, guestId: string, guestName: string, roomNumber: string, confirmationNo: string, folioId: string) => void
  onChargeClick: () => void
  onPaymentClick: () => void
  onVoidTransaction: (id: string, desc: string, amt: number) => void
  onVoidPayment: (id: string, desc: string, amt: number) => void
  onNotesChange: (v: string) => void
  folioNotes: string
  onSplitClick: () => void
  onPrintFolio: () => void
  onEmailFolio: () => void
}) {
  const ratePerNight = folio.reservation.roomRate

  return (
    <div className="space-y-2">
      {/* Guest & Stay Info */}
      <Card>
        <CardContent className="p-2.5 md:p-4">
          {/* Back Button & Navigation */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onViewGuestLedger(folio.guest.id, guestFullName(folio.guest))}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" /> View Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onViewInHouse(
                folio.reservation.id,
                folio.guest.id,
                guestFullName(folio.guest),
                folio.reservation.room?.number || '',
                folio.reservation.confirmationNo,
                folio.id,
              )}
            >
              <BedDouble className="h-3.5 w-3.5 mr-1" /> In-House
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {loading ? (
                  <Skeleton className="h-6 w-40" />
                ) : (
                  <h3 className="text-base font-bold">
                    {guestFullName(folio.guest)}
                  </h3>
                )}
                {folio.guest.vipLevel !== 'none' && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 gap-1">
                    <Shield className="size-3" /> VIP
                  </Badge>
                )}
                <StatusBadge status={folio.status} />
                <Badge variant="secondary" className="text-[10px]">
                  {FOLIO_TYPE_LABELS[folio.folioType] || folio.folioType} Folio
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {loading ? (
                  <Skeleton className="h-4 w-72" />
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <BedDouble className="size-3.5" />
                      Room {folio.reservation.room?.number || '—'}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(folio.reservation.checkIn)} → {formatDate(folio.reservation.checkOut)}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="font-mono">{folio.reservation.confirmationNo}</span>
                    {ratePerNight > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{formatCurrency(ratePerNight)}/night</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 p-3 text-center">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-1">Total Charges</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalCharges)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 p-3 text-center">
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Payments</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalPayments)}</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/30 p-3 text-center">
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mb-1">Outstanding</p>
              <p className={cn('text-lg font-bold', outstandingBalance > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300')}>
                {formatCurrency(outstandingBalance)}
              </p>
            </div>
          </div>

          {/* Credit Limit Progress */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Credit Limit Usage</span>
              <span className="font-medium">{Math.round(creditPct)}% of {formatCurrency(creditLimit)}</span>
            </div>
            <Progress
              value={creditPct}
              className={cn('h-2', creditPct > 80 ? '[&>div]:bg-red-500' : creditPct > 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={onChargeClick}>
                    <Plus className="size-4 mr-1.5" /> Post Charge
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Post a new charge to this folio</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onPaymentClick}>
                    <CreditCard className="size-4 mr-1.5" /> Record Payment
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Record a payment against this folio</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => toast.info('Post to Room — charges will be routed to the guest\'s room account')}>
                    <BedDouble className="size-4 mr-1.5" /> <span className="hidden sm:inline">Post to Room</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Route charges to room account</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onSplitClick}>
                    <SplitIcon className="size-4 mr-1.5" /> <span className="hidden sm:inline">Split Folio</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Split charges across folios</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onPrintFolio}>
                    <Printer className="size-4 mr-1.5" /> <span className="hidden sm:inline">Print</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print folio statement</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onEmailFolio}>
                    <Mail className="size-4 mr-1.5" /> <span className="hidden sm:inline">Email</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Email folio to guest</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabbed Sections ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="charges" className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger
                value="charges"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
              >
                <FileText className="size-4 mr-1.5" />
                Charges ({folio.transactions.length})
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
              >
                <CreditCard className="size-4 mr-1.5" />
                Payments ({folio.payments.length})
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
              >
                <Activity className="size-4 mr-1.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
              >
                <StickyNote className="size-4 mr-1.5" />
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Charges Tab */}
          <TabsContent value="charges" className="m-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !folio.transactions.length ? (
              <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
                <Receipt className="size-10 mb-2 opacity-30" />
                <p className="text-sm">No charges posted yet</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center w-[60px]">Qty</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center w-[100px]">Posted By</TableHead>
                        <TableHead className="text-center w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folio.transactions.map((txn) => {
                        const voided = isVoidedTransaction(txn)
                        return (
                          <TableRow key={txn.id} className={voided ? 'opacity-40' : ''}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(txn.createdAt)}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              <div className={voided ? 'line-through' : ''}>
                                {txn.description}
                              </div>
                              {txn.reference && <p className="text-[10px] text-muted-foreground truncate">Ref: {txn.reference}</p>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {TRANSACTION_TYPE_LABELS[txn.transactionType] || txn.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{txn.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(txn.amount)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(txn.taxAmount)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(txn.totalAmount)}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">{txn.postedBy || '—'}</TableCell>
                            <TableCell className="text-center">
                              {!voided && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-7 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => onVoidTransaction(txn.id, txn.description, txn.totalAmount)}
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y max-h-96 overflow-y-auto">
                  {folio.transactions.map((txn) => {
                    const voided = isVoidedTransaction(txn)
                    return (
                      <div key={txn.id} className={cn('p-3 space-y-1.5', voided && 'opacity-40')}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium truncate', voided && 'line-through')}>{txn.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px]">
                                {TRANSACTION_TYPE_LABELS[txn.transactionType] || txn.transactionType}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{formatDateTime(txn.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatCurrency(txn.totalAmount)}</p>
                            {!voided && (
                              <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-red-600" onClick={() => onVoidTransaction(txn.id, txn.description, txn.totalAmount)}>
                                <XCircle className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="m-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !folio.payments.length ? (
              <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
                <DollarSign className="size-10 mb-2 opacity-30" />
                <p className="text-sm">No payments recorded yet</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Card Type</TableHead>
                        <TableHead>Received By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folio.payments.map((pay) => {
                        const voided = isVoidedPayment(pay)
                        return (
                          <TableRow key={pay.id} className={voided ? 'opacity-40' : ''}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(pay.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-emerald-600">{formatCurrency(pay.amount)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{pay.reference || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {pay.cardType ? (CARD_TYPE_LABELS[pay.cardType] || pay.cardType) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{pay.receivedBy || '—'}</TableCell>
                            <TableCell>
                              {pay.status ? <StatusBadge status={pay.status} /> : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {!voided && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-7 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => onVoidPayment(pay.id, PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod, pay.amount)}
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y max-h-96 overflow-y-auto">
                  {folio.payments.map((pay) => {
                    const voided = isVoidedPayment(pay)
                    return (
                      <div key={pay.id} className={cn('p-3 space-y-1.5', voided && 'opacity-40')}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}
                              </Badge>
                              {pay.status && <StatusBadge status={pay.status} />}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDateTime(pay.createdAt)} {pay.receivedBy ? `· ${pay.receivedBy}` : ''}
                            </p>
                            {pay.reference && <p className="text-[10px] text-muted-foreground truncate">Ref: {pay.reference}</p>}
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1">
                            <span className="text-sm font-semibold text-emerald-600">{formatCurrency(pay.amount)}</span>
                            {!voided && (
                              <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-red-600" onClick={() => onVoidPayment(pay.id, PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod, pay.amount)}>
                                <XCircle className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="m-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !activityTimeline.length ? (
              <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
                <Activity className="size-10 mb-2 opacity-30" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y">
                  {activityTimeline.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-1 shrink-0">
                        <div className={cn(
                          'size-2.5 rounded-full',
                          item.type === 'charge' ? 'bg-red-500' : 'bg-emerald-500'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {item.type === 'charge' ? item.description : item.description}
                          </p>
                          <span className={cn(
                            'text-sm font-semibold shrink-0',
                            item.type === 'charge' ? 'text-red-600' : 'text-emerald-600'
                          )}>
                            {item.type === 'charge' ? '+' : '−'}{formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{formatDateTime(item.date)}</span>
                          {item.meta && (
                            <>
                              <span>·</span>
                              <span>{item.meta}</span>
                            </>
                          )}
                          <Badge variant="outline" className={cn(
                            'text-[10px] px-1 py-0',
                            item.type === 'charge'
                              ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400'
                              : 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400'
                          )}>
                            {item.type === 'charge' ? 'Charge' : 'Payment'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="m-0">
            <div className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Folio Notes</Label>
                <Textarea
                  placeholder="Add notes about this folio... (e.g., special billing arrangements, disputes, etc.)"
                  value={folioNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={8}
                  className="resize-y"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success('Notes saved')}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

// ─── Split Icon (simple SVG) ───────────────────────────────────────────

function SplitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 0 0-1.2-2.86L3 4.5" />
      <path d="M12 22v-8.3a4 4 0 0 1 1.2-2.86L21 4.5" />
    </svg>
  )
}
