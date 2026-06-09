'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, CreditCard, Receipt, Printer, Mail, DollarSign, FileText,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSettingsStore, usePreferencesStore, useFolioContextStore } from '@/lib/store'

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
  receivedBy: string | null
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

interface SearchResult {
  type: string
  id: string
  label: string
  sublabel: string
}

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

// ─── Component ──────────────────────────────────────────────────────────

export function FolioView() {
  const queryClient = useQueryClient()
  const { settings } = useSettingsStore()
  const { preferences } = usePreferencesStore()
  const { folioContext, clearFolioContext } = useFolioContextStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null)
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  // Charge form
  const [chargeType, setChargeType] = useState('miscellaneous')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')

  // Payment form
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')
  const [payReference, setPayReference] = useState('')

  // Auto-load folio from context (when navigated from InHouse or other views)
  React.useEffect(() => {
    if (folioContext && !selectedFolio) {
      setSelectedFolio({
        id: folioContext.folioId || '',
        folioType: 'guest',
        status: 'open',
        balance: 0,
        reservation: {
          id: folioContext.reservationId,
          confirmationNo: folioContext.confirmationNo,
          checkIn: '',
          checkOut: '',
          roomRate: 0,
          status: 'checked_in',
          creditLimit: 15000,
          room: { number: folioContext.roomNumber },
        },
        guest: {
          id: folioContext.guestId,
          firstName: folioContext.guestName.split(' ')[0] || '',
          lastName: folioContext.guestName.split(' ').slice(1).join(' ') || '',
          vipLevel: 'none',
        },
        transactions: [],
        payments: [],
      })
      clearFolioContext()
    }
  }, [folioContext])

  // Search folios
  const searchFolios = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setSelectedFolio(null)
      return
    }
    try {
      const res = await fetch(`/api/folio?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        const folios: Folio[] = data.folios || []
        const results: SearchResult[] = folios.map((f) => ({
          type: 'folio',
          id: f.id,
          label: `${f.guest.firstName} ${f.guest.lastName}`,
          sublabel: `Room ${f.reservation.room?.number || '?'} • ${f.reservation.confirmationNo} • ${formatCurrency(f.balance)}`,
        }))
        setSearchResults(results)
      }
    } catch {
      setSearchResults([])
    }
  }

  // Fetch selected folio detail
  const { data: folioDetail, isLoading: folioLoading } = useQuery({
    queryKey: ['folio-detail', selectedFolio?.id, selectedFolio?.reservation?.id],
    queryFn: async () => {
      if (!selectedFolio) return null
      const resId = selectedFolio.reservation?.id
      if (!resId) return null
      const res = await fetch(`/api/folio?reservationId=${resId}`)
      if (!res.ok) throw new Error('Failed to fetch folio detail')
      const data = await res.json()
      return data.folios?.[0] || null
    },
    enabled: !!selectedFolio && !!selectedFolio.reservation?.id,
  })

  const activeFolio = folioDetail || selectedFolio

  // Computed totals
  const totalCharges = activeFolio?.transactions?.reduce((sum, t) => sum + t.totalAmount, 0) || 0
  const totalPayments = activeFolio?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const outstandingBalance = totalCharges - totalPayments
  const creditLimit = activeFolio?.reservation.creditLimit || 15000
  const creditPct = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0

  // Post charge mutation
  const postChargeMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio) return
      const amount = parseFloat(chargeAmount)
      const taxAmount = amount * (settings.taxRate / 100)
      const res = await fetch(`/api/folio/${activeFolio.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'charge',
          transactionType: chargeType,
          description: chargeDesc,
          amount,
          taxAmount,
          totalAmount: amount + taxAmount,
        }),
      })
      if (!res.ok) throw new Error('Failed to post charge')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folio-detail'] })
      setSelectedFolio(data.folio)
      setChargeDialogOpen(false)
      setChargeDesc('')
      setChargeAmount('')
      setChargeType('miscellaneous')
    },
  })

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeFolio) return
      const res = await fetch(`/api/folio/${activeFolio.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          paymentMethod: payMethod,
          amount: parseFloat(payAmount),
          reference: payReference || undefined,
          receivedBy: 'Front Desk',
        }),
      })
      if (!res.ok) throw new Error('Failed to record payment')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folio-detail'] })
      setSelectedFolio(data.folio)
      setPaymentDialogOpen(false)
      setPayAmount('')
      setPayReference('')
      setPayMethod('cash')
    },
  })

  const handleSelectResult = (result: SearchResult) => {
    setSearchResults([])
    // We need to fetch full folio data; selectedFolio holds partial data from search
    setSelectedFolio({
      id: result.id,
      folioType: 'guest',
      status: 'open',
      balance: 0,
      reservation: {
        id: '',
        confirmationNo: '',
        checkIn: '',
        checkOut: '',
        roomRate: 0,
        status: 'checked_in',
        creditLimit: 15000,
        room: null,
      },
      guest: {
        id: '',
        firstName: result.label.split(' ')[0] || '',
        lastName: result.label.split(' ').slice(1).join(' ') || '',
        vipLevel: 'none',
      },
      transactions: [],
      payments: [],
    })
    // The useQuery will fetch the full detail
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Guest Folio</h2>
        <p className="text-sm text-muted-foreground">
          Search and manage guest folios, charges, and payments
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, room number, or confirmation #..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchFolios(e.target.value)
              }}
              className="pl-9"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-w-2xl rounded-lg border bg-popover shadow-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto p-1">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                  >
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                      <Receipt className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Folio Detail (when selected) */}
      {activeFolio && (
        <div className="space-y-4">
          {/* Folio Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">
                      {folioLoading ? (
                        <Skeleton className="h-6 w-40" />
                      ) : (
                        `${activeFolio.guest.firstName} ${activeFolio.guest.lastName}`
                      )}
                    </h3>
                    {activeFolio.guest.vipLevel !== 'none' && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        VIP
                      </Badge>
                    )}
                    <StatusBadge status={activeFolio.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {folioLoading ? (
                      <Skeleton className="h-4 w-60" />
                    ) : (
                      <>
                        <span>Room {activeFolio.reservation.room?.number || '?'}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{formatDate(activeFolio.reservation.checkIn)} → {formatDate(activeFolio.reservation.checkOut)}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="font-mono">{activeFolio.reservation.confirmationNo}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="flex items-center gap-3 shrink-0">
                  <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="size-4 mr-1" /> Post Charge
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Post New Charge</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Charge Type</Label>
                          <Select value={chargeType} onValueChange={setChargeType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Description *</Label>
                          <Input
                            placeholder="Charge description"
                            value={chargeDesc}
                            onChange={(e) => setChargeDesc(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Amount ({preferences.currency}) *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            min={0}
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                          />
                          {chargeAmount && parseFloat(chargeAmount) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Tax ({settings.taxRate}%): {formatCurrency(parseFloat(chargeAmount) * (settings.taxRate / 100))} • Total: {formatCurrency(parseFloat(chargeAmount) * (1 + settings.taxRate / 100))}
                            </p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => postChargeMutation.mutate()}
                          disabled={!chargeDesc || !chargeAmount || parseFloat(chargeAmount) <= 0 || postChargeMutation.isPending}
                        >
                          {postChargeMutation.isPending ? 'Posting...' : 'Post Charge'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <DollarSign className="size-4 mr-1" /> Record Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
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
                        <div className="space-y-1">
                          <Label>Amount ({preferences.currency}) *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            min={0}
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Reference</Label>
                          <Input
                            placeholder="Reference # (optional)"
                            value={payReference}
                            onChange={(e) => setPayReference(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => recordPaymentMutation.mutate()}
                          disabled={!payAmount || parseFloat(payAmount) <= 0 || recordPaymentMutation.isPending}
                        >
                          {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button size="sm" variant="ghost">
                    <Printer className="size-4 mr-1" /> Print
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Mail className="size-4 mr-1" /> Email
                  </Button>
                </div>
              </div>

              {/* Balance Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Charges</p>
                  <p className="text-lg font-bold">{formatCurrency(totalCharges)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Payments</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalPayments)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className={cn('text-lg font-bold', outstandingBalance > 0 ? 'text-red-600' : 'text-green-600')}>
                    {formatCurrency(outstandingBalance)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Credit Limit: {Math.round(creditPct)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Charges / Payments */}
          <Card className="py-0">
            <CardContent className="p-0">
              <Tabs defaultValue="charges" className="w-full">
                <div className="border-b px-4">
                  <TabsList className="bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="charges"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
                    >
                      <FileText className="size-4 mr-1.5" />
                      Charges ({activeFolio.transactions?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5"
                    >
                      <CreditCard className="size-4 mr-1.5" />
                      Payments ({activeFolio.payments?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="charges" className="m-0">
                  {folioLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !activeFolio.transactions?.length ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <Receipt className="size-8 mx-auto mb-2 opacity-50" />
                      No charges posted yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeFolio.transactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDateTime(txn.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm">{txn.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {TRANSACTION_TYPE_LABELS[txn.transactionType] || txn.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(txn.amount)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(txn.taxAmount)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(txn.totalAmount)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{txn.reference || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="m-0">
                  {folioLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !activeFolio.payments?.length ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <DollarSign className="size-8 mx-auto mb-2 opacity-50" />
                      No payments recorded yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Received By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeFolio.payments.map((pay) => (
                          <TableRow key={pay.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDateTime(pay.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-green-600">
                              {formatCurrency(pay.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{pay.reference || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{pay.receivedBy || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!activeFolio && !searchResults.length && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <Receipt className="size-12 mb-3 opacity-30" />
            <h3 className="text-lg font-semibold mb-1">Guest Folio</h3>
            <p className="text-sm max-w-sm">
              Search for a guest by name, room number, or confirmation number to view and manage their folio.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
