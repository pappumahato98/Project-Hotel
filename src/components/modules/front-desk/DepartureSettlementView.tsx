'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  ArrowLeft, PlaneTakeoff, Receipt, CreditCard, AlertTriangle, CheckCircle2,
  LogOut, Eye, BookOpen, FileText, Banknote, X, Search, DollarSign, Users,
  Plus, CalendarPlus, ArrowRightLeft, StickyNote, Crown, Filter,
  UtensilsCrossed, Wine, Shirt, Phone, Loader2, CalendarDays,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatTime, formatCurrency, getTodayString, toDateOnly } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore, usePreferencesStore, useNavigationStore, useFolioContextStore, useGuestLedgerContextStore, useReservationContextStore } from '@/lib/store'
import { invalidate } from '@/lib/queryKeys'

// ─── Types ──────────────────────────────────────────────────────────────

interface SettlementGuest {
  id: string
  firstName: string
  lastName: string
  vipLevel: string
}

interface SettlementRoom {
  id: string
  number: string
  floor: number
  type: { name: string; code: string }
}

interface SettlementFolio {
  id: string
  balance: number
  status: string
  transactions?: {
    id: string
    description: string
    totalAmount: number
    type: string
    createdAt: string
  }[]
  payments?: {
    id: string
    amount: number
    paymentMethod: string
    reference: string
    createdAt: string
  }[]
}

interface SettlementDeparture {
  id: string
  confirmationNo: string
  status: string
  checkIn: string
  checkOut: string
  roomRate: number
  totalAmount: number
  paidAmount: number
  creditLimit: number
  notes?: string | null
  guest: SettlementGuest | null
  room: SettlementRoom | null
  folios: SettlementFolio[]
}

interface OtherFolio {
  id: string
  balance: number
  status: string
  reservation: {
    id: string
    confirmationNo: string
    room: { number: string } | null
    status: string
  } | null
}

interface VacantRoom {
  id: string
  number: string
  floor: number
  type: { name: string; code: string }
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Credit/Debit Card',
  bank_transfer: 'Bank Transfer',
}

type BalanceFilter = 'all' | 'outstanding' | 'settled'

// ─── Quick Charge Presets ───────────────────────────────────────────────

const QUICK_CHARGES = [
  { label: 'Room Service', amount: 500, type: 'f_and_b', description: 'Room Service', icon: UtensilsCrossed },
  { label: 'Minibar', amount: 300, type: 'minibar', description: 'Minibar consumption', icon: Wine },
  { label: 'Laundry', amount: 200, type: 'laundry', description: 'Laundry service', icon: Shirt },
  { label: 'Phone Call', amount: 50, type: 'phone', description: 'Phone call charge', icon: Phone },
]

// ─── Helpers ────────────────────────────────────────────────────────────

function nightsBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
}

function getCreditStatus(res: SettlementDeparture) {
  const balance = res.folios[0]?.balance || 0
  const limit = res.creditLimit || 15000
  const pct = limit > 0 ? (balance / limit) * 100 : 0
  if (pct >= 100) return { pct, status: 'breach' as const, color: 'text-red-600' }
  if (pct >= 80) return { pct, status: 'warning' as const, color: 'text-amber-600' }
  return { pct, status: 'ok' as const, color: 'text-green-600' }
}

// ─── Component ──────────────────────────────────────────────────────────

export function DepartureSettlementView() {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const { preferences } = usePreferencesStore()
  const { navigateTo } = useNavigationStore()
  const today = getTodayString()

  // Search & filter
  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [vipOnlyFilter, setVipOnlyFilter] = useState(false)

  // Dialogs
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false)
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false)
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)

  // Selected
  const [selectedDeparture, setSelectedDeparture] = useState<SettlementDeparture | null>(null)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  // Charge form
  const [chargeType, setChargeType] = useState('miscellaneous')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')

  // Transfer form
  const [selectedNewRoomId, setSelectedNewRoomId] = useState('')

  // Extend stay form
  const [newCheckOut, setNewCheckOut] = useState<Date | undefined>(undefined)

  // Note form
  const [noteText, setNoteText] = useState('')

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)))
    }
  }

  // ─── Query ────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['departure-settlement', today],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'checked_in',
        checkOutOnOrBefore: today,
      })
      return apiFetch(`/api/reservations?${params.toString()}`)
    },
    refetchInterval: 30000,
  })

  const departures: SettlementDeparture[] = data?.reservations || []

  // ─── Other Folios query ──────────────────────────────────────────────

  const { data: otherFoliosData, isLoading: otherFoliosLoading } = useQuery({
    queryKey: ['settlement-other-folios', selectedDeparture?.guest?.id, selectedDeparture?.id],
    queryFn: async () => {
      if (!selectedDeparture?.guest?.id) return { folios: [] }
      const params = new URLSearchParams({ guestId: selectedDeparture.guest.id })
      return apiFetch<{ folios: OtherFolio[] }>(`/api/folio?${params.toString()}`)
    },
    enabled: settlementDialogOpen && !!selectedDeparture?.guest?.id,
  })

  const otherFolios = (otherFoliosData?.folios || []).filter(
    (f) => f.reservation?.id !== selectedDeparture?.id,
  )
  const otherBillsTotal = otherFolios.reduce((sum, f) => sum + f.balance, 0)

  // ─── Vacant rooms query (for transfer) ───────────────────────────────

  const { data: vacantRoomsData } = useQuery({
    queryKey: ['vacant-rooms'],
    queryFn: async () => {
      const json = await apiFetch('/api/rooms') as { rooms?: VacantRoom[] }
      return (json.rooms || []).filter((r: any) => r.status === 'vacant_clean')
    },
    enabled: transferDialogOpen,
  })

  // ─── Compute unique floors for filter ─────────────────────────────────

  const floors = useMemo(() => {
    const floorSet = new Set(departures.map((d) => d.room?.floor).filter((f): f is number => f != null))
    return Array.from(floorSet).sort((a, b) => a - b)
  }, [departures])

  // ─── Helpers ──────────────────────────────────────────────────────────

  const getBalance = (dep: SettlementDeparture) => dep.folios[0]?.balance || 0

  const guestName = (dep: SettlementDeparture) =>
    dep.guest
      ? `${dep.guest.firstName || ''} ${dep.guest.lastName || ''}`.trim() || 'Unknown'
      : 'Unknown'

  const roomNumber = (dep: SettlementDeparture) => dep.room?.number || '—'

  // ─── Stats ────────────────────────────────────────────────────────────

  const pendingCount = departures.length
  const withBalanceCount = departures.filter((d) => getBalance(d) > 0).length
  const settledCount = departures.filter((d) => getBalance(d) <= 0).length
  const totalOutstanding = departures.reduce((sum, d) => sum + getBalance(d), 0)

  // ─── Filtered list ────────────────────────────────────────────────────

  const filtered = departures.filter((d) => {
    const balance = getBalance(d)
    if (balanceFilter === 'outstanding' && balance <= 0) return false
    if (balanceFilter === 'settled' && balance > 0) return false
    if (floorFilter !== 'all') {
      if (d.room?.floor !== Number(floorFilter)) return false
    }
    if (vipOnlyFilter) {
      if (!d.guest?.vipLevel || d.guest.vipLevel === 'none') return false
    }
    if (search) {
      const s = search.toLowerCase()
      const gName = d.guest
        ? `${d.guest.firstName || ''} ${d.guest.lastName || ''}`.toLowerCase().trim()
        : ''
      const room = (d.room?.number || '').toLowerCase()
      const conf = (d.confirmationNo || '').toLowerCase()
      return gName.includes(s) || room.includes(s) || conf.includes(s)
    }
    return true
  })

  // ─── Mutations ────────────────────────────────────────────────────────

  const paymentMutation = useMutation({
    mutationFn: async ({ folioId, amount, paymentMethod: method, reference }: { folioId: string; amount: number; paymentMethod: PaymentMethod; reference: string }) => {
      return apiFetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment', amount, paymentMethod: method, reference }),
      })
    },
    onSuccess: () => {
      invalidate.afterFolioChange(queryClient, selectedDeparture?.guest?.id)
      setPaymentAmount('')
      setPaymentReference('')
      toast.success('Payment recorded successfully')
    },
    onError: () => {
      toast.error('Failed to record payment')
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_out' }),
      })
    },
    onSuccess: () => {
      invalidate.afterCheckout(queryClient)
      setSettlementDialogOpen(false)
      setCheckoutConfirmOpen(false)
      setSelectedDeparture(null)
      toast.success('Checkout complete')
    },
  })

  // Post charge mutation
  const postChargeMutation = useMutation({
    mutationFn: async ({ folioId, transactionType, description, amount }: { folioId: string; transactionType: string; description: string; amount: number }) => {
      const taxRate = settings.taxRate / 100
      const taxAmount = amount * taxRate
      const totalAmount = amount + taxAmount
      return apiFetch(`/api/folio/${folioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'charge', transactionType, description, amount, taxAmount, totalAmount }),
      })
    },
    onSuccess: () => {
      invalidate.afterFolioChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['departure-settlement'] })
      setChargeDialogOpen(false)
      resetChargeForm()
      toast.success('Charge posted successfully')
    },
    onError: () => { toast.error('Failed to post charge') },
  })

  // Room transfer mutation
  const transferRoomMutation = useMutation({
    mutationFn: async ({ reservationId, newRoomId }: { reservationId: string; newRoomId: string }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: newRoomId }),
      })
    },
    onSuccess: () => {
      invalidate.afterRoomTransfer(queryClient)
      queryClient.invalidateQueries({ queryKey: ['departure-settlement'] })
      setTransferDialogOpen(false)
      setSelectedNewRoomId('')
      toast.success('Room transfer completed successfully')
    },
    onError: () => { toast.error('Failed to transfer room') },
  })

  // Extend stay mutation
  const extendStayMutation = useMutation({
    mutationFn: async ({ reservationId, checkOut, totalAmount }: { reservationId: string; checkOut: string; totalAmount: number }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkOut: new Date(checkOut).toISOString(), totalAmount }),
      })
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      setExtendDialogOpen(false)
      setNewCheckOut(undefined)
      toast.success('Stay extended successfully')
    },
    onError: () => { toast.error('Failed to extend stay') },
  })

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ reservationId, notes }: { reservationId: string; notes: string }) => {
      return apiFetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
    },
    onSuccess: () => {
      invalidate.afterReservationChange(queryClient)
      queryClient.invalidateQueries({ queryKey: ['departure-settlement'] })
      setNoteDialogOpen(false)
      setNoteText('')
      toast.success('Note added successfully')
    },
    onError: () => { toast.error('Failed to add note') },
  })

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleOpenSettlement = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    const balance = getBalance(dep)
    setPaymentAmount(String(balance))
    setPaymentMethod('cash')
    setPaymentReference('')
    setSettlementDialogOpen(true)
  }

  const handleNavigateToFolio = (dep: SettlementDeparture) => {
    useFolioContextStore.getState().setFolioContext({
      reservationId: dep.id,
      guestId: dep.guest?.id || '',
      guestName: guestName(dep),
      roomNumber: roomNumber(dep),
      confirmationNo: dep.confirmationNo,
    })
    navigateTo('front-desk', 'folio')
  }

  const handleViewLedger = (dep: SettlementDeparture) => {
    useGuestLedgerContextStore.getState().setGuestLedgerContext({
      guestId: dep.guest?.id || '',
      guestName: guestName(dep),
    })
    navigateTo('front-desk', 'guest-ledger')
  }

  const handleViewReservation = (dep: SettlementDeparture) => {
    useReservationContextStore.getState().setReservationContext({
      reservationId: dep.id,
      confirmationNo: dep.confirmationNo,
    })
    navigateTo('front-desk', 'reservations')
  }

  const handleRecordPayment = () => {
    if (!selectedDeparture) return
    const folioId = selectedDeparture.folios[0]?.id
    if (!folioId) {
      toast.error('No folio found for this reservation')
      return
    }
    const amount = Number(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    paymentMutation.mutate({
      folioId,
      amount,
      paymentMethod,
      reference: paymentReference,
    })
  }

  const handleForceCheckout = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    setCheckoutConfirmOpen(true)
  }

  const handleSettleAndCheckout = () => {
    if (!selectedDeparture) return
    const balance = getBalance(selectedDeparture)
    if (balance > 0) {
      toast.error('Please settle the outstanding balance before checkout')
      return
    }
    setSettlementDialogOpen(false)
    setSelectedDeparture(selectedDeparture)
    setCheckoutConfirmOpen(true)
  }

  const confirmCheckout = () => {
    if (!selectedDeparture) return
    checkoutMutation.mutate(selectedDeparture.id)
  }

  // Post charge handlers
  function resetChargeForm() {
    setChargeType('miscellaneous')
    setChargeDesc('')
    setChargeAmount('')
  }

  const handlePostCharge = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    resetChargeForm()
    setChargeDialogOpen(true)
  }

  const handleQuickCharge = (preset: typeof QUICK_CHARGES[0]) => {
    setChargeType(preset.type)
    setChargeDesc(preset.description)
    setChargeAmount(String(preset.amount))
  }

  const ensureFolioAndPostCharge = async (dep: SettlementDeparture) => {
    let folioId = dep.folios[0]?.id
    if (!folioId && dep.guest?.id) {
      try {
        const data = await apiFetch('/api/folio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: dep.id, guestId: dep.guest.id, folioType: 'guest' }),
        })
        folioId = data.folio?.id
        if (!folioId) throw new Error('Folio creation failed')
        toast.info('Folio auto-created for this guest')
      } catch {
        toast.error('Failed to create folio')
        return
      }
    }
    if (folioId) {
      postChargeMutation.mutate({ folioId, transactionType: chargeType, description: chargeDesc, amount: parseFloat(chargeAmount) })
    }
  }

  const submitCharge = () => {
    if (!selectedDeparture || !chargeAmount || !chargeDesc) return
    const folio = selectedDeparture.folios[0]
    if (!folio) { ensureFolioAndPostCharge(selectedDeparture); return }
    postChargeMutation.mutate({ folioId: folio.id, transactionType: chargeType, description: chargeDesc, amount: parseFloat(chargeAmount) })
  }

  // Room transfer handlers
  const handleTransferRoom = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    setSelectedNewRoomId('')
    setTransferDialogOpen(true)
  }

  const submitTransfer = () => {
    if (!selectedDeparture || !selectedNewRoomId) return
    transferRoomMutation.mutate({ reservationId: selectedDeparture.id, newRoomId: selectedNewRoomId })
  }

  // Extend stay handlers
  const handleExtendStay = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    setNewCheckOut(undefined)
    setExtendDialogOpen(true)
  }

  const extendAdditionalNights = selectedDeparture && newCheckOut
    ? nightsBetween(selectedDeparture.checkIn, newCheckOut) - nightsBetween(selectedDeparture.checkIn, selectedDeparture.checkOut)
    : 0
  const extendAdditionalCharge = extendAdditionalNights > 0 ? extendAdditionalNights * (selectedDeparture?.roomRate || 0) : 0

  const submitExtendStay = () => {
    if (!selectedDeparture || !newCheckOut) return
    const currentNights = nightsBetween(selectedDeparture.checkIn, selectedDeparture.checkOut)
    const newNights = nightsBetween(selectedDeparture.checkIn, newCheckOut)
    const additionalNights = newNights - currentNights
    const newTotal = selectedDeparture.totalAmount + (additionalNights * selectedDeparture.roomRate)
    extendStayMutation.mutate({
      reservationId: selectedDeparture.id,
      checkOut: toDateOnly(newCheckOut),
      totalAmount: newTotal,
    })
  }

  // Add note handlers
  const handleAddNote = (dep: SettlementDeparture) => {
    setSelectedDeparture(dep)
    setNoteText('')
    setNoteDialogOpen(true)
  }

  const submitNote = () => {
    if (!selectedDeparture || !noteText.trim()) return
    const existingNotes = selectedDeparture.notes || ''
    const newNotes = existingNotes
      ? `${existingNotes}\n[${new Date().toLocaleString()}] ${noteText.trim()}`
      : `[${new Date().toLocaleString()}] ${noteText.trim()}`
    addNoteMutation.mutate({ reservationId: selectedDeparture.id, notes: newNotes })
  }

  // ─── Computed ─────────────────────────────────────────────────────────

  const currentBalance = selectedDeparture ? getBalance(selectedDeparture) : 0
  const grandTotal = currentBalance + otherBillsTotal

  // Charges & payments from folio transactions
  const folioTransactions = selectedDeparture?.folios[0]?.transactions || []
  const folioPayments = selectedDeparture?.folios[0]?.payments || []
  const totalCharges = folioTransactions.reduce((sum, t) => sum + t.totalAmount, 0) + (selectedDeparture?.totalAmount || 0)
  const totalPaid = folioPayments.reduce((sum, p) => sum + p.amount, 0) + (selectedDeparture?.paidAmount || 0)

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => navigateTo('front-desk', 'departures')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Departure Settlement</h2>
          <p className="text-xs text-muted-foreground">Manage and settle departing guest accounts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2.5 shrink-0">
              <PlaneTakeoff className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 dark:bg-red-950 p-2.5 shrink-0">
              <DollarSign className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">With Balance</p>
              <p className="text-lg font-bold text-red-600">{withBalanceCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-950 p-2.5 shrink-0">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Settled</p>
              <p className="text-lg font-bold text-green-600">{settledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2.5 shrink-0">
              <Receipt className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, room, or confirmation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={balanceFilter} onValueChange={(v) => setBalanceFilter(v as BalanceFilter)}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departures</SelectItem>
            <SelectItem value="outstanding">Outstanding Balance</SelectItem>
            <SelectItem value="settled">Settled (Zero)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="All Floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f} value={String(f)} className="text-xs">Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Switch
              id="vip-filter-settlement"
              checked={vipOnlyFilter}
              onCheckedChange={setVipOnlyFilter}
              className="scale-75"
            />
            <Label htmlFor="vip-filter-settlement" className="text-xs text-muted-foreground whitespace-nowrap">
              <Crown className="size-3 inline mr-0.5" />VIP
            </Label>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={handleToggleAll}
                        className="size-3.5"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-[70px]">Room</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="w-[100px]">Check-out</TableHead>
                  <TableHead className="w-[110px] text-right">Balance</TableHead>
                  <TableHead className="w-[120px]">Credit</TableHead>
                  <TableHead className="w-[100px] text-right">Status</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      <PlaneTakeoff className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      No departures match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((dep) => {
                    const balance = getBalance(dep)
                    const isSettled = balance <= 0
                    const credit = getCreditStatus(dep)
                    return (
                      <TableRow key={dep.id}>
                        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedIds.has(dep.id)}
                              onCheckedChange={() => handleToggleSelect(dep.id)}
                              className="size-3.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-bold font-mono">{roomNumber(dep)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{guestName(dep)}</span>
                            {dep.guest?.vipLevel && dep.guest.vipLevel !== 'none' && (
                              <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <Crown className="size-2.5 mr-0.5" />{dep.guest.vipLevel.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{dep.confirmationNo}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{formatDate(dep.checkOut)}</div>
                          <div className="text-muted-foreground">{formatTime(dep.checkOut)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-medium', balance > 0 ? 'text-red-600' : 'text-green-600')}>
                            {formatCurrency(balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Progress
                              value={Math.min(credit.pct, 100)}
                              className={cn(
                                'h-2 w-14',
                                credit.status === 'breach' && '[&>div]:bg-red-500',
                                credit.status === 'warning' && '[&>div]:bg-amber-500',
                                credit.status === 'ok' && '[&>div]:bg-green-500',
                              )}
                            />
                            <span className={cn('text-[10px] font-medium', credit.color)}>{Math.round(credit.pct)}%</span>
                            {credit.status === 'breach' && <AlertTriangle className="size-3 text-red-500" />}
                            {credit.status === 'warning' && <AlertTriangle className="size-3 text-amber-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isSettled ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-0 text-[10px]">
                              SETTLED
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-0 text-[10px]">
                              OUTSTANDING
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="size-8 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleOpenSettlement(dep)}>
                                <Receipt className="size-3.5 mr-2" /> Settlement
                              </DropdownMenuItem>
                              {isSettled && (
                                <DropdownMenuItem onClick={() => handleForceCheckout(dep)} disabled={checkoutMutation.isPending}>
                                  <LogOut className="size-3.5 mr-2" /> Checkout
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleNavigateToFolio(dep)}>
                                <FileText className="size-3.5 mr-2" /> Folio
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewLedger(dep)}>
                                <BookOpen className="size-3.5 mr-2" /> Ledger
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handlePostCharge(dep)}>
                                <Plus className="size-3.5 mr-2" /> Charge
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExtendStay(dep)}>
                                <CalendarPlus className="size-3.5 mr-2" /> Extend
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTransferRoom(dep)}>
                                <ArrowRightLeft className="size-3.5 mr-2" /> Move
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAddNote(dep)}>
                                <StickyNote className="size-3.5 mr-2" /> Note
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewReservation(dep)}>
                                <Eye className="size-3.5 mr-2" /> Reservation
                              </DropdownMenuItem>
                              {!isSettled && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-orange-600 focus:text-orange-600"
                                    onClick={() => handleForceCheckout(dep)}
                                    disabled={checkoutMutation.isPending}
                                  >
                                    <AlertTriangle className="size-3.5 mr-2" /> Force CO
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Settlement Detail Dialog ────────────────────────────── */}
      <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Departure Settlement</DialogTitle>
            <DialogDescription>
              {selectedDeparture && (
                <>Room {roomNumber(selectedDeparture)} — {guestName(selectedDeparture)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              {/* Guest & Room Info */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-base">{guestName(selectedDeparture)}</p>
                <p className="text-muted-foreground">
                  Room {roomNumber(selectedDeparture)} {selectedDeparture.room?.type?.name ? `(${selectedDeparture.room.type.name})` : ''} • {selectedDeparture.confirmationNo}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(selectedDeparture.checkIn)} → {formatDate(selectedDeparture.checkOut)}
                </p>
              </div>

              {/* Other Pending Bills */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="size-3.5" />
                  Other Pending Bills
                </h4>
                {otherFoliosLoading ? (
                  <div className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : otherFolios.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-lg border p-3">
                    No other pending folios for this guest.
                  </p>
                ) : (
                  <div className="rounded-lg border max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Reservation #</TableHead>
                          <TableHead className="text-xs">Room</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Balance</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {otherFolios.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">
                              {f.reservation?.confirmationNo || '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {f.reservation?.room?.number || '—'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={f.reservation?.status || f.status} />
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-red-600">
                              {formatCurrency(f.balance)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6"
                                onClick={() => {
                                  if (!f.reservation?.id) return
                                  useFolioContextStore.getState().setFolioContext({
                                    reservationId: f.reservation.id,
                                    guestId: selectedDeparture.guest?.id || '',
                                    guestName: guestName(selectedDeparture),
                                    roomNumber: f.reservation?.room?.number || '',
                                    confirmationNo: f.reservation?.confirmationNo || '',
                                  })
                                  navigateTo('front-desk', 'folio')
                                }}
                              >
                                Go to Folio
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {otherFolios.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Total other pending bills: <span className="font-semibold text-red-600">{formatCurrency(otherBillsTotal)}</span>
                  </div>
                )}
              </div>

              {/* Charges & Payments */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Charges &amp; Payments</h4>
                <div className="rounded-lg border max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs w-[90px]">Date</TableHead>
                        <TableHead className="text-xs w-[90px] text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">Room Charge ({selectedDeparture.room?.type?.name || '—'})</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(selectedDeparture.checkIn)}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-red-600">
                          {formatCurrency(selectedDeparture.totalAmount)}
                        </TableCell>
                      </TableRow>
                      {selectedDeparture.paidAmount > 0 && (
                        <TableRow>
                          <TableCell className="text-sm">Advance Payment</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(selectedDeparture.checkIn)}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-green-600">
                            -{formatCurrency(selectedDeparture.paidAmount)}
                          </TableCell>
                        </TableRow>
                      )}
                      {folioTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{t.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-red-600">
                            {formatCurrency(t.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {folioPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">
                            Payment ({PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod] || p.paymentMethod})
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-green-600">
                            -{formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Charges:</span>
                  <span className="font-medium">{formatCurrency(totalCharges)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-medium text-green-600">-{formatCurrency(totalPaid)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Current Balance:</span>
                  <span className={currentBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total Liability:</span>
                  <span className={grandTotal > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
                {otherBillsTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Current balance ({formatCurrency(currentBalance)}) + Other bills ({formatCurrency(otherBillsTotal)})
                  </p>
                )}
              </div>

              {/* Quick Payment */}
              {currentBalance > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Quick Payment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Method</Label>
                      <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount ({preferences.currency})</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min={1}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Reference</Label>
                      <Input
                        type="text"
                        className="h-8 text-xs"
                        placeholder="Transaction ID"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRecordPayment}
                    disabled={paymentMutation.isPending || !paymentAmount || Number(paymentAmount) <= 0}
                  >
                    <Banknote className="size-3.5 mr-1.5" />
                    {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setSettlementDialogOpen(false)}>Cancel</Button>
            {selectedDeparture && (
              <Button
                variant="outline"
                onClick={() => {
                  setSettlementDialogOpen(false)
                  handleNavigateToFolio(selectedDeparture)
                }}
              >
                <FileText className="size-3.5 mr-1.5" />
                Go to Full Folio
              </Button>
            )}
            <Button
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
              onClick={() => {
                setSettlementDialogOpen(false)
                if (selectedDeparture) {
                  setSelectedDeparture(selectedDeparture)
                  setCheckoutConfirmOpen(true)
                }
              }}
              disabled={checkoutMutation.isPending}
            >
              <AlertTriangle className="size-3.5 mr-1.5" />
              Force Checkout
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSettleAndCheckout}
              disabled={currentBalance > 0 || checkoutMutation.isPending}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" />
              {checkoutMutation.isPending ? 'Processing...' : 'Settle & Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Checkout Confirmation Dialog ───────────────────────── */}
      <Dialog open={checkoutConfirmOpen} onOpenChange={setCheckoutConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Checkout</DialogTitle>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              {/* Guest & Room Info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">
                  {guestName(selectedDeparture)}
                </p>
                <p className="text-muted-foreground">
                  Room {roomNumber(selectedDeparture)} • {selectedDeparture.confirmationNo}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(selectedDeparture.checkIn)} → {formatDate(selectedDeparture.checkOut)}
                </p>
              </div>

              {/* Balance */}
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Outstanding Balance:</span>
                  <span className={getBalance(selectedDeparture) > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(getBalance(selectedDeparture))}
                  </span>
                </div>
              </div>

              {getBalance(selectedDeparture) > 0 && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>This guest has an outstanding balance. This is a force checkout.</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This will change the reservation status to <strong>Checked Out</strong> and update the room status to <strong>Vacant Dirty</strong> for housekeeping.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmCheckout}
              disabled={checkoutMutation.isPending}
            >
              <LogOut className="size-4 mr-1.5" />
              {checkoutMutation.isPending ? 'Processing...' : 'Confirm Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Post Charge Dialog ─────────────────────────────────── */}
      <Dialog open={chargeDialogOpen} onOpenChange={(open) => {
        setChargeDialogOpen(open)
        if (!open) resetChargeForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Post Charge</DialogTitle>
            <DialogDescription>
              {selectedDeparture ? `Room ${roomNumber(selectedDeparture)} — ${guestName(selectedDeparture)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick charge presets */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CHARGES.map((preset) => {
                  const Icon = preset.icon
                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 justify-start text-xs gap-1.5"
                      onClick={() => handleQuickCharge(preset)}
                    >
                      <Icon className="size-3.5" />
                      {preset.label} ({formatCurrency(preset.amount)})
                    </Button>
                  )
                })}
              </div>
            </div>
            <Separator />
            {/* Custom charge */}
            <div className="space-y-2">
              <Label className="text-xs">Charge Type</Label>
              <Select value={chargeType} onValueChange={setChargeType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="f_and_b" className="text-xs">Food & Beverage</SelectItem>
                  <SelectItem value="minibar" className="text-xs">Minibar</SelectItem>
                  <SelectItem value="laundry" className="text-xs">Laundry</SelectItem>
                  <SelectItem value="phone" className="text-xs">Phone</SelectItem>
                  <SelectItem value="miscellaneous" className="text-xs">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-xs" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="Charge description" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Amount ({preferences.currency})</Label>
              <Input type="number" className="h-8 text-xs" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} min={1} placeholder="0.00" />
              {chargeAmount && parseFloat(chargeAmount) > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Tax ({settings.taxRate}%): {formatCurrency(parseFloat(chargeAmount) * settings.taxRate / 100)} — Total: {formatCurrency(parseFloat(chargeAmount) * (1 + settings.taxRate / 100))}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setChargeDialogOpen(false); resetChargeForm() }}>Cancel</Button>
            <Button size="sm" onClick={submitCharge} disabled={postChargeMutation.isPending || !chargeAmount || !chargeDesc}>
              {postChargeMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {postChargeMutation.isPending ? 'Posting...' : 'Post Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room Transfer Dialog ───────────────────────────────── */}
      <Dialog open={transferDialogOpen} onOpenChange={(open) => {
        setTransferDialogOpen(open)
        if (!open) setSelectedNewRoomId('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="size-4" /> Room Transfer</DialogTitle>
            <DialogDescription>
              {selectedDeparture ? `Move ${guestName(selectedDeparture)} from Room ${roomNumber(selectedDeparture)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">Current Room: {selectedDeparture?.room?.number || '—'} ({selectedDeparture?.room?.type?.name || '—'})</p>
              <p className="text-muted-foreground">Floor: {selectedDeparture?.room?.floor || '—'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Select New Room</Label>
              <Select value={selectedNewRoomId} onValueChange={setSelectedNewRoomId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a vacant clean room" /></SelectTrigger>
                <SelectContent>
                  {(vacantRoomsData || []).map((room) => (
                    <SelectItem key={room.id} value={room.id} className="text-xs">
                      Room {room.number} — {room.type.name} (Floor {room.floor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submitTransfer} disabled={transferRoomMutation.isPending || !selectedNewRoomId}>
              {transferRoomMutation.isPending ? 'Transferring...' : 'Transfer Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Extend Stay Dialog ─────────────────────────────────── */}
      <Dialog open={extendDialogOpen} onOpenChange={(open) => {
        setExtendDialogOpen(open)
        if (!open) setNewCheckOut(undefined)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarPlus className="size-4" /> Extend Stay</DialogTitle>
            <DialogDescription>
              {selectedDeparture ? `Room ${roomNumber(selectedDeparture)} — ${guestName(selectedDeparture)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">Current Check-out: {formatDate(selectedDeparture.checkOut)}</p>
                <p className="text-muted-foreground">Room Rate: {formatCurrency(selectedDeparture.roomRate)}/night</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">New Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-xs font-normal">
                      <CalendarDays className="size-3.5 mr-2" />
                      {newCheckOut ? formatDate(toDateOnly(newCheckOut)) : 'Select new check-out date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newCheckOut}
                      onSelect={setNewCheckOut}
                      disabled={(date) => date <= new Date(selectedDeparture.checkOut)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {extendAdditionalNights > 0 && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-3 text-sm space-y-1">
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">Extension Summary</p>
                  <p className="text-muted-foreground">Additional nights: <strong>{extendAdditionalNights}</strong></p>
                  <p className="text-muted-foreground">Additional charge: <strong className="text-emerald-600">{formatCurrency(extendAdditionalCharge)}</strong></p>
                  <p className="text-muted-foreground">New total: <strong>{formatCurrency(selectedDeparture.totalAmount + extendAdditionalCharge)}</strong></p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExtendDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submitExtendStay} disabled={extendStayMutation.isPending || extendAdditionalNights <= 0}>
              {extendStayMutation.isPending ? 'Extending...' : 'Extend Stay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Note Dialog ────────────────────────────────────── */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => {
        setNoteDialogOpen(open)
        if (!open) setNoteText('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><StickyNote className="size-4" /> Add Note</DialogTitle>
            <DialogDescription>
              {selectedDeparture ? `Room ${roomNumber(selectedDeparture)} — ${guestName(selectedDeparture)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDeparture?.notes && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Existing Notes</Label>
                <div className="rounded-md bg-muted/50 p-2.5 max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedDeparture.notes}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">New Note</Label>
              <Textarea
                className="text-xs min-h-[80px]"
                placeholder="Enter note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Notes are timestamped automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submitNote} disabled={addNoteMutation.isPending || !noteText.trim()}>
              {addNoteMutation.isPending && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              {addNoteMutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}