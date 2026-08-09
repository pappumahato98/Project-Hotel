'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatNPR, cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'
import { AccountingError } from './AccountingErrorBoundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  FileBarChart,
  Scale,
  Moon,
  Receipt,
  ScrollText,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Search,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────

type ReportType = 'profit-loss' | 'balance-sheet' | 'night-audit' | 'vat' | 'account-statement'

interface ReportOption {
  id: ReportType
  label: string
  description: string
  icon: React.ReactNode
  hasDepartment?: boolean
  hasAccount?: boolean
  singleDate?: boolean
}

// P&L
interface PLResponse {
  revenue: { roomRevenue: number; fbRevenue: number; eventsRevenue: number; otherRevenue: number }
  expenses: { salaries: number; utilities: number; fbCost: number; marketing: number; maintenance: number; admin: number; depreciation: number; other: number }
  grossOperatingProfit: number
  netOperatingIncome: number
  totalRevenue: number
  totalExpenses: number
  variance?: { grossOpProfitPct?: number; netOpIncomePct?: number }
}

// Balance Sheet
interface BalanceSheetResponse {
  currentAssets: { cash: number; bank: number; receivables: number; inventory: number; prepayments: number }
  nonCurrentAssets: { furniture: number; equipment: number; buildings: number; land: number; accumulatedDepreciation: number }
  currentLiabilities: { payables: number; taxPayable: number; accrued: number; advances: number; deferred: number }
  nonCurrentLiabilities: { loans: number }
  equity: { ownerCapital: number; retainedEarnings: number }
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
}

// Night Audit
interface NightAuditResponse {
  date: string
  shift: string
  roomRevenue: number
  fbRevenue: number
  totalRevenue: number
  payments: { cash: number; card: number; bankTransfer: number; cityLedger: number }
  outstandingFolios: { count: number; total: number }
  arTotal: number
  cashOnHand: number
  occupancy: { totalRooms: number; occupied: number; rate: number }
}

// VAT
interface VatEntry {
  date: string
  reference: string
  account: string
  description: string
  outputVat: number
  inputVat: number
}

interface VatResponse {
  period: string
  totalOutputVat: number
  totalInputVat: number
  netVatPayable: number
  entries: VatEntry[]
}

// Account Statement
interface StatementEntry {
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  runningBalance: number
}

interface StatementResponse {
  accountId: string
  accountName: string
  openingBalance: number
  closingBalance: number
  entries: StatementEntry[]
  totalDebit: number
  totalCredit: number
}

// ── Report Options ───────────────────────────────────────────────

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'profit-loss',
    label: 'Profit & Loss',
    description: 'Revenue, expenses, and operating profit analysis',
    icon: <FileBarChart className="h-5 w-5" />,
    hasDepartment: true,
  },
  {
    id: 'balance-sheet',
    label: 'Balance Sheet',
    description: 'Assets, liabilities, and equity snapshot',
    icon: <Scale className="h-5 w-5" />,
    singleDate: true,
  },
  {
    id: 'night-audit',
    label: 'Night Audit Summary',
    description: 'End-of-day audit with revenue and payments',
    icon: <Moon className="h-5 w-5" />,
    singleDate: true,
  },
  {
    id: 'vat',
    label: 'VAT/GST Report',
    description: 'Tax collected, paid, and net payable',
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: 'account-statement',
    label: 'Account Statement',
    description: 'Detailed ledger for a specific account',
    icon: <ScrollText className="h-5 w-5" />,
    hasAccount: true,
  },
]

// ── Date Helpers ─────────────────────────────────────────────────

function getStartOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  return formatDateShort(dateStr + 'T00:00:00')
}

// ── Departments ──────────────────────────────────────────────────

const DEPARTMENTS = [
  { value: '', label: 'All Departments' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'food-beverage', label: 'Food & Beverage' },
  { value: 'events', label: 'Events & Banquets' },
  { value: 'spa', label: 'Spa & Wellness' },
  { value: 'other', label: 'Other' },
]

// ── Accounts (mock dropdown) ────────────────────────────────────

const ACCOUNT_OPTIONS = [
  { value: 'acc-001', label: '1001 - Cash in Hand' },
  { value: 'acc-002', label: '1002 - Bank Account' },
  { value: 'acc-003', label: '1101 - Accounts Receivable' },
  { value: 'acc-004', label: '2001 - Accounts Payable' },
  { value: 'acc-005', label: '3001 - Room Revenue' },
  { value: 'acc-006', label: '3002 - F&B Revenue' },
  { value: 'acc-007', label: '4001 - Salaries & Wages' },
  { value: 'acc-008', label: '4002 - Utilities' },
  { value: 'acc-009', label: '4003 - F&B Cost of Sales' },
]

// ── Variance Indicator ───────────────────────────────────────────

function VarianceIndicator({ value, label }: { value?: number; label?: string }) {
  if (value == null || value === 0) {
    return <span className="text-muted-foreground text-sm">No change</span>
  }
  const isPositive = value > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-sm font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value).toFixed(1)}%
      {label && <span className="text-muted-foreground font-normal ml-1">{label}</span>}
    </span>
  )
}

// ── Skeleton Loaders ─────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  )
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

// ── Sub-component: Profit & Loss Report ──────────────────────────

function ProfitLossReport({ data }: { data: PLResponse }) {
  const rev = data.revenue
  const exp = data.expenses
  const revItems = [
    { label: 'Room Revenue', value: rev.roomRevenue },
    { label: 'F&B Revenue', value: rev.fbRevenue },
    { label: 'Events Revenue', value: rev.eventsRevenue },
    { label: 'Other Revenue', value: rev.otherRevenue },
  ]
  const expItems = [
    { label: 'Salaries & Wages', value: exp.salaries },
    { label: 'Utilities', value: exp.utilities },
    { label: 'F&B Cost of Sales', value: exp.fbCost },
    { label: 'Marketing', value: exp.marketing },
    { label: 'Maintenance', value: exp.maintenance },
    { label: 'Administrative', value: exp.admin },
    { label: 'Depreciation', value: exp.depreciation },
    { label: 'Other Expenses', value: exp.other },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold truncate">{formatNPR(data.totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-red-600 truncate">{formatNPR(data.totalExpenses)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <FileBarChart className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Gross Operating Profit</p>
              <p className={cn('text-lg font-bold truncate', data.grossOperatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatNPR(data.grossOperatingProfit)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Net Operating Income</p>
              <p className={cn('text-lg font-bold truncate', data.netOperatingIncome >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatNPR(data.netOperatingIncome)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed P&L Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Profit & Loss Statement</CardTitle>
            {data.variance && (
              <div className="flex items-center gap-3">
                <VarianceIndicator value={data.variance.grossOpProfitPct} label="GOP" />
                <VarianceIndicator value={data.variance.netOpIncomePct} label="NOI" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Revenue Section */}
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Revenue</p>
          <div className="pl-3 space-y-1">
            {revItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">{formatNPR(item.value)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between py-2 mt-2 border-t border-dashed">
            <span className="text-sm font-bold">Total Revenue</span>
            <span className="text-sm font-bold tabular-nums">{formatNPR(data.totalRevenue)}</span>
          </div>

          <Separator className="my-3" />

          {/* Expenses Section */}
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Expenses</p>
          <div className="pl-3 space-y-1">
            {expItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums text-red-600">{formatNPR(item.value)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between py-2 mt-2 border-t border-dashed">
            <span className="text-sm font-bold">Total Expenses</span>
            <span className="text-sm font-bold tabular-nums text-red-600">{formatNPR(data.totalExpenses)}</span>
          </div>

          <Separator className="my-3" />

          {/* Bottom Line */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Gross Operating Profit</span>
              <div className="text-right">
                <span className={cn('text-base font-bold tabular-nums', data.grossOperatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {formatNPR(data.grossOperatingProfit)}
                </span>
                {data.totalRevenue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {((data.grossOperatingProfit / data.totalRevenue) * 100).toFixed(1)}% margin
                  </p>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Net Operating Income</span>
              <div className="text-right">
                <span className={cn('text-base font-bold tabular-nums', data.netOperatingIncome >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {formatNPR(data.netOperatingIncome)}
                </span>
                {data.totalRevenue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {((data.netOperatingIncome / data.totalRevenue) * 100).toFixed(1)}% margin
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-component: Balance Sheet ─────────────────────────────────

function BalanceSheetReport({ data }: { data: BalanceSheetResponse }) {
  const ca = data.currentAssets
  const nca = data.nonCurrentAssets
  const cl = data.currentLiabilities
  const ncl = data.nonCurrentLiabilities
  const eq = data.equity

  const totalCurrentAssets = ca.cash + ca.bank + ca.receivables + ca.inventory + ca.prepayments
  const totalNonCurrentAssets = nca.furniture + nca.equipment + nca.buildings + nca.land - nca.accumulatedDepreciation
  const totalCurrentLiabilities = cl.payables + cl.taxPayable + cl.accrued + cl.advances + cl.deferred
  const totalNonCurrentLiabilities = ncl.loans
  const totalEquity = eq.ownerCapital + eq.retainedEarnings

  return (
    <div className="space-y-6">
      {/* Balance Verification Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Balance Sheet as of {formatDateDisplay(getToday())}</h3>
        {data.isBalanced ? (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Balanced
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Not Balanced
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ASSETS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Current Assets</p>
              <div className="pl-3 space-y-1">
                {[
                  { label: 'Cash', value: ca.cash },
                  { label: 'Bank', value: ca.bank },
                  { label: 'Receivables', value: ca.receivables },
                  { label: 'Inventory', value: ca.inventory },
                  { label: 'Prepayments', value: ca.prepayments },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums">{formatNPR(item.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 mt-1 border-t border-dashed">
                <span className="text-sm font-medium">Total Current Assets</span>
                <span className="text-sm font-medium tabular-nums">{formatNPR(totalCurrentAssets)}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Non-Current Assets</p>
              <div className="pl-3 space-y-1">
                {[
                  { label: 'Furniture & Fixtures', value: nca.furniture },
                  { label: 'Equipment', value: nca.equipment },
                  { label: 'Buildings', value: nca.buildings },
                  { label: 'Land', value: nca.land },
                  { label: 'Accum. Depreciation', value: -nca.accumulatedDepreciation, negative: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn('font-medium tabular-nums', item.negative && 'text-red-600')}>{formatNPR(item.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 mt-1 border-t border-dashed">
                <span className="text-sm font-medium">Total Non-Current Assets</span>
                <span className="text-sm font-medium tabular-nums">{formatNPR(totalNonCurrentAssets)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-md px-3">
              <span className="text-sm font-bold">Total Assets</span>
              <span className="text-sm font-bold tabular-nums">{formatNPR(data.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* LIABILITIES + EQUITY */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-600 uppercase tracking-wider">Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Current Liabilities</p>
              <div className="pl-3 space-y-1">
                {[
                  { label: 'Accounts Payable', value: cl.payables },
                  { label: 'Tax Payable', value: cl.taxPayable },
                  { label: 'Accrued Expenses', value: cl.accrued },
                  { label: 'Guest Advances', value: cl.advances },
                  { label: 'Deferred Revenue', value: cl.deferred },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums text-red-600">{formatNPR(item.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 mt-1 border-t border-dashed">
                <span className="text-sm font-medium">Total Current Liabilities</span>
                <span className="text-sm font-medium tabular-nums text-red-600">{formatNPR(totalCurrentLiabilities)}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Non-Current Liabilities</p>
              <div className="pl-3 space-y-1">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Long-term Loans</span>
                  <span className="font-medium tabular-nums text-red-600">{formatNPR(ncl.loans)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 mt-1 border-t border-dashed">
                <span className="text-sm font-medium">Total Non-Current Liabilities</span>
                <span className="text-sm font-medium tabular-nums text-red-600">{formatNPR(totalNonCurrentLiabilities)}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Equity</p>
              <div className="pl-3 space-y-1">
                {[
                  { label: 'Owner Capital', value: eq.ownerCapital },
                  { label: 'Retained Earnings', value: eq.retainedEarnings },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums">{formatNPR(item.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 mt-1 border-t border-dashed">
                <span className="text-sm font-medium">Total Equity</span>
                <span className="text-sm font-medium tabular-nums">{formatNPR(totalEquity)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3">
              <span className="text-sm font-bold">Total Liabilities + Equity</span>
              <span className="text-sm font-bold tabular-nums">{formatNPR(data.totalLiabilitiesAndEquity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Sub-component: Night Audit Summary ───────────────────────────

function NightAuditReport({ data }: { data: NightAuditResponse }) {
  const occ = data.occupancy

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-xs">
          <Moon className="h-3 w-3 mr-1" /> {data.shift} Shift
        </Badge>
        <Badge variant="outline" className="text-xs">
          <FileText className="h-3 w-3 mr-1" /> {formatDateDisplay(data.date)}
        </Badge>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Room Revenue</p>
          <p className="text-xl font-bold tabular-nums">{formatNPR(data.roomRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">F&B Revenue</p>
          <p className="text-xl font-bold tabular-nums">{formatNPR(data.fbRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">{formatNPR(data.totalRevenue)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Cash', value: data.payments.cash, color: 'text-emerald-600' },
                { label: 'Card', value: data.payments.card, color: 'text-blue-600' },
                { label: 'Bank Transfer', value: data.payments.bankTransfer, color: 'text-violet-600' },
                { label: 'City Ledger', value: data.payments.cityLedger, color: 'text-amber-600' },
              ].map((p) => (
                <div key={p.label} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">{p.label}</span>
                  <span className={cn('text-sm font-medium tabular-nums', p.color)}>{formatNPR(p.value)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold">Total Collected</span>
                <span className="text-sm font-bold tabular-nums">
                  {formatNPR(data.payments.cash + data.payments.card + data.payments.bankTransfer + data.payments.cityLedger)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Folios & Occupancy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Operations Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Outstanding Folios */}
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Outstanding Folios</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums">{data.outstandingFolios.count}</span>
                <span className="text-sm font-semibold text-red-600 tabular-nums">{formatNPR(data.outstandingFolios.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">AR Total</p>
                <p className="text-lg font-bold tabular-nums text-red-600">{formatNPR(data.arTotal)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Cash on Hand</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">{formatNPR(data.cashOnHand)}</p>
              </div>
            </div>

            {/* Occupancy */}
            <div className="rounded-md bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Room Occupancy</p>
                <span className="text-sm font-bold">{occ.rate.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(occ.rate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {occ.occupied} of {occ.totalRooms} rooms occupied
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Sub-component: VAT/GST Report ────────────────────────────────

function VatReport({ data }: { data: VatResponse }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Output VAT (Collected)</p>
          <p className="text-xl font-bold tabular-nums text-red-600">{formatNPR(data.totalOutputVat)}</p>
          <p className="text-xs text-muted-foreground mt-1">Period: {data.period}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Input VAT (Paid)</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">{formatNPR(data.totalInputVat)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Net VAT {data.netVatPayable >= 0 ? 'Payable' : 'Receivable'}
          </p>
          <p className={cn('text-xl font-bold tabular-nums', data.netVatPayable >= 0 ? 'text-amber-600' : 'text-emerald-600')}>
            {formatNPR(Math.abs(data.netVatPayable))}
          </p>
          {data.netVatPayable >= 0 ? (
            <p className="text-xs text-amber-600 mt-1">Due to tax authority</p>
          ) : (
            <p className="text-xs text-emerald-600 mt-1">Refundable credit</p>
          )}
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">VAT Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          {data.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No VAT transactions found for this period.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Output VAT</TableHead>
                    <TableHead className="text-xs text-right">Input VAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-2">{formatDateDisplay(entry.date)}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{entry.reference}</TableCell>
                      <TableCell className="text-xs py-2">{entry.account}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-xs py-2 text-right tabular-nums">
                        {entry.outputVat > 0 ? formatNPR(entry.outputVat) : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right tabular-nums">
                        {entry.inputVat > 0 ? formatNPR(entry.inputVat) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4} className="text-xs py-2">Total</TableCell>
                    <TableCell className="text-xs py-2 text-right tabular-nums text-red-600">
                      {formatNPR(data.totalOutputVat)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right tabular-nums text-emerald-600">
                      {formatNPR(data.totalInputVat)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-component: Account Statement ─────────────────────────────

function AccountStatementReport({ data }: { data: StatementResponse }) {
  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{data.accountName}</h3>
          <p className="text-xs text-muted-foreground">Account Statement</p>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Opening Balance</p>
            <p className={cn('text-sm font-bold tabular-nums', data.openingBalance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {formatNPR(data.openingBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Closing Balance</p>
            <p className={cn('text-sm font-bold tabular-nums', data.closingBalance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {formatNPR(data.closingBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Debit</p>
              <p className="text-lg font-bold tabular-nums text-red-600">{formatNPR(data.totalDebit)}</p>
            </div>
            <ArrowDownRight className="h-5 w-5 text-red-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Credit</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600">{formatNPR(data.totalCredit)}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Statement Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          {data.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No transactions found for this period.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-2">{formatDateDisplay(entry.date)}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{entry.reference}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-xs py-2 text-right tabular-nums">
                        {entry.debit > 0 ? formatNPR(entry.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right tabular-nums">
                        {entry.credit > 0 ? formatNPR(entry.credit) : '—'}
                      </TableCell>
                      <TableCell className={cn('text-xs py-2 text-right tabular-nums font-medium',
                        entry.runningBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatNPR(entry.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={3} className="text-xs py-2">Total</TableCell>
                    <TableCell className="text-xs py-2 text-right tabular-nums text-red-600">
                      {formatNPR(data.totalDebit)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right tabular-nums text-emerald-600">
                      {formatNPR(data.totalCredit)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right tabular-nums">
                      {formatNPR(data.closingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

export function FinancialReportsView() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('profit-loss')
  const [startDate, setStartDate] = useState(getStartOfMonth())
  const [endDate, setEndDate] = useState(getToday())
  const [singleDate, setSingleDate] = useState(getToday())
  const [department, setDepartment] = useState('')
  const [accountId, setAccountId] = useState('')
  const [generated, setGenerated] = useState(false)

  const currentOption = REPORT_OPTIONS.find((r) => r.id === selectedReport)!

  // Reset generated flag when report type changes
  const handleReportChange = (type: ReportType) => {
    setSelectedReport(type)
    setGenerated(false)
  }

  const handleGenerate = () => {
    setGenerated(true)
  }

  // ── Query builders ──
  const buildQueryKey = useMemo(() => {
    if (!generated) return ['report-empty']
    switch (selectedReport) {
      case 'profit-loss':
        return ['report-pl', startDate, endDate, department]
      case 'balance-sheet':
        return ['report-bs', singleDate]
      case 'night-audit':
        return ['report-na', singleDate]
      case 'vat':
        return ['report-vat', startDate, endDate]
      case 'account-statement':
        return ['report-stmt', accountId, startDate, endDate]
      default:
        return ['report-empty']
    }
  }, [selectedReport, generated, startDate, endDate, singleDate, department, accountId])

  const buildQueryFn = () => {
    switch (selectedReport) {
      case 'profit-loss':
        return () => {
          const params = new URLSearchParams({ startDate, endDate })
          if (department) params.set('department', department)
          return apiFetch<PLResponse>(`/api/reports/profit-loss?${params}`)
        }
      case 'balance-sheet':
        return () => apiFetch<BalanceSheetResponse>(`/api/reports/balance-sheet?asOfDate=${singleDate}`)
      case 'night-audit':
        return () => apiFetch<NightAuditResponse>(`/api/reports/night-audit?date=${singleDate}`)
      case 'vat':
        return () => apiFetch<VatResponse>(`/api/reports/vat?startDate=${startDate}&endDate=${endDate}`)
      case 'account-statement':
        return () => {
          if (!accountId) return Promise.resolve(null)
          const params = new URLSearchParams({ accountId, startDate, endDate })
          return apiFetch<StatementResponse>(`/api/accounting/statement?${params}`)
        }
      default:
        return () => Promise.resolve(null)
    }
  }

  const { data: reportData, isLoading, isError, error } = useQuery<unknown>({
    queryKey: buildQueryKey,
    queryFn: buildQueryFn(),
    enabled: generated,
    staleTime: 30_000,
    retry: 1,
  })

  const needsAccount = selectedReport === 'account-statement' && !accountId
  const canGenerate = generated
    ? true
    : selectedReport === 'account-statement'
      ? !!accountId
      : true

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate and view detailed financial reports</p>
      </div>

      {/* Report Type Selector - Card Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleReportChange(opt.id)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
              selectedReport === opt.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-transparent bg-card hover:border-muted-foreground/20'
            )}
          >
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md',
              selectedReport === opt.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {opt.icon}
            </div>
            <div className="min-w-0">
              <p className={cn(
                'text-sm font-semibold leading-tight',
                selectedReport === opt.id ? 'text-primary' : 'text-foreground'
              )}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range - for reports that use it */}
            {!currentOption.singleDate && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[160px] h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px] h-9 text-sm"
                  />
                </div>
              </>
            )}

            {/* Single Date - for Balance Sheet and Night Audit */}
            {currentOption.singleDate && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {currentOption.id === 'night-audit' ? 'Audit Date' : 'As of Date'}
                </label>
                <Input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-[160px] h-9 text-sm"
                />
              </div>
            )}

            {/* Department Filter - P&L only */}
            {currentOption.hasDepartment && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account Selector - Account Statement only */}
            {currentOption.hasAccount && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Account</label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-[260px] h-9 text-sm">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="h-9 gap-1.5"
            >
              <Search className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display Area */}
      {!generated ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FileBarChart className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">Select a report type and click Generate</p>
          <p className="text-xs mt-1">Choose your parameters above to generate a financial report</p>
        </div>
      ) : needsAccount ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ScrollText className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">Please select an account</p>
          <p className="text-xs mt-1">Choose an account from the dropdown to view its statement</p>
        </div>
      ) : isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <AccountingError error={error} onRetry={handleGenerate} title="Failed to load report" />
      ) : !reportData ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs mt-1">Try adjusting your date range or filters</p>
        </div>
      ) : (
        <div>
          {selectedReport === 'profit-loss' && <ProfitLossReport data={reportData as PLResponse} />}
          {selectedReport === 'balance-sheet' && <BalanceSheetReport data={reportData as BalanceSheetResponse} />}
          {selectedReport === 'night-audit' && <NightAuditReport data={reportData as NightAuditResponse} />}
          {selectedReport === 'vat' && <VatReport data={reportData as VatResponse} />}
          {selectedReport === 'account-statement' && <AccountStatementReport data={reportData as StatementResponse} />}
        </div>
      )}
    </div>
  )
}
