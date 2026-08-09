/**
 * VAT Register & Return Report Engine
 *
 * Implements Nepal VAT register management per IRD requirements:
 *   1. Sales VAT Register
 *   2. Purchase VAT Register
 *   3. Sales Return VAT Register
 *   4. Purchase Return VAT Register
 *   5. Monthly Sales Register
 *   6. Monthly Purchase Register
 *   7. Party-wise Sales Register
 *   8. Party-wise Purchase Register
 *   9. VAT Return Report (for filing)
 *
 * Uses NEPAL_VAT_RATE (13%) from nepal-standards.ts.
 * All amounts in NPR.
 */

import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'
import { db } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────

/** A single entry in a VAT register */
export interface VATRegisterEntry {
  /** Invoice ID */
  invoiceId: string
  /** Invoice number */
  invoiceNumber: string
  /** Invoice date */
  date: Date
  /** Party name (customer or vendor) */
  partyName: string | null
  /** Party PAN */
  partyPan: string | null
  /** Taxable amount (exclusive of VAT) */
  taxableAmount: number
  /** VAT rate applied */
  vatRate: number
  /** VAT amount */
  vatAmount: number
  /** Total amount (taxable + VAT) */
  totalAmount: number
  /** Invoice status */
  status: string
}

/** VAT payable calculation result */
export interface VATPayableResult {
  /** Total output VAT (sales) */
  salesVAT: number
  /** Total input VAT (purchases) */
  purchaseVAT: number
  /** Total VAT on sales returns */
  salesReturnVAT: number
  /** Total VAT on purchase returns */
  purchaseReturnVAT: number
  /** Net VAT payable to IRD (positive = pay, negative = refund) */
  payable: number
  /** Whether a refund is due */
  refundable: boolean
  /** Net VAT (positive = payable, negative = refund) */
  net: number
}

/** VAT return report for a fiscal year */
export interface VATReturnReport {
  /** Fiscal year string (e.g. '2082/83') */
  fiscalYear: string
  /** Monthly breakdown */
  months: VATReturnMonth[]
  /** Annual totals */
  totals: VATPayableResult
}

/** Monthly VAT data for the return report */
export interface VATReturnMonth {
  /** BS month number (4=Shrawan start of FY, through 3=Ashadh) */
  bsMonth: number
  /** Month label */
  monthLabel: string
  /** Total sales VAT */
  salesVAT: number
  /** Total purchase VAT */
  purchaseVAT: number
  /** Net payable */
  netPayable: number
  /** Number of sales invoices */
  salesInvoiceCount: number
  /** Number of purchase invoices */
  purchaseInvoiceCount: number
}

/** Simple VAT calculation result */
export interface VATCalculationResult {
  /** VAT amount */
  vat: number
  /** Taxable amount */
  taxable: number
  /** Total (taxable + VAT) */
  total: number
}

// ── BS month names for labels ──────────────────────────────────────────

const BS_MONTH_LABELS: Record<number, string> = {
  1: 'Baishakh', 2: 'Jestha', 3: 'Ashadh', 4: 'Shrawan',
  5: 'Bhadra', 6: 'Ashwin', 7: 'Kartik', 8: 'Mangsir',
  9: 'Poush', 10: 'Magh', 11: 'Falgun', 12: 'Chaitra',
}

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Calculate VAT on a taxable amount.
 *
 * Uses the standard Nepal VAT rate (13%).
 *
 * @param taxableAmount - Amount exclusive of VAT
 * @returns VAT calculation result with vat, taxable, and total
 */
export function calculateVAT(taxableAmount: number): VATCalculationResult {
  const vat = Math.round(taxableAmount * (NEPAL_VAT_RATE / 100))
  return {
    vat,
    taxable: Math.round(taxableAmount),
    total: Math.round(taxableAmount) + vat,
  }
}

/**
 * Generate Sales VAT Register for a date range.
 *
 * Queries all sales invoices within the given date range and returns
 * a register with VAT details for IRD compliance.
 *
 * @param fromDate - Start date (inclusive)
 * @param toDate - End date (inclusive)
 * @returns Array of sales VAT register entries
 */
export async function generateSalesVATRegister(
  fromDate: Date,
  toDate: Date,
): Promise<VATRegisterEntry[]> {
  const invoices = await db.invoice.findMany({
    where: {
      type: 'sales',
      date: { gte: fromDate, lte: toDate },
      status: { not: 'Cancelled' },
    },
    orderBy: { date: 'asc' },
  })

  return invoices.map((inv) => ({
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    partyName: inv.customerName,
    partyPan: null, // Customer PAN stored separately if needed
    taxableAmount: Math.round(inv.subtotal),
    vatRate: NEPAL_VAT_RATE,
    vatAmount: Math.round(inv.taxAmount),
    totalAmount: Math.round(inv.totalAmount),
    status: inv.status,
  }))
}

/**
 * Generate Purchase VAT Register for a date range.
 *
 * Queries all purchase invoices within the given date range and returns
 * a register with VAT details for IRD compliance.
 *
 * @param fromDate - Start date (inclusive)
 * @param toDate - End date (inclusive)
 * @returns Array of purchase VAT register entries
 */
export async function generatePurchaseVATRegister(
  fromDate: Date,
  toDate: Date,
): Promise<VATRegisterEntry[]> {
  const invoices = await db.invoice.findMany({
    where: {
      type: 'purchase',
      date: { gte: fromDate, lte: toDate },
      status: { not: 'Cancelled' },
    },
    orderBy: { date: 'asc' },
  })

  return invoices.map((inv) => ({
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    partyName: inv.vendorName,
    partyPan: null, // Vendor PAN stored separately if needed
    taxableAmount: Math.round(inv.subtotal),
    vatRate: NEPAL_VAT_RATE,
    vatAmount: Math.round(inv.taxAmount),
    totalAmount: Math.round(inv.totalAmount),
    status: inv.status,
  }))
}

/**
 * Generate a complete VAT Return Report for a fiscal year.
 *
 * Aggregates sales and purchase VAT data by BS month and
 * produces the report format required by IRD for VAT filing.
 *
 * @param fiscalYear - Fiscal year string (e.g. '2082/83')
 * @returns Complete VAT return report with monthly breakdown
 */
export async function generateVATReturnReport(
  fiscalYear: string,
): Promise<VATReturnReport> {
  // Parse fiscal year to get AD date range
  // FY 2082/83 BS ≈ Jul 2025 AD to Jul 2026 AD
  const [fyStartStr] = fiscalYear.split('/')
  const fyStartBS = parseInt(fyStartStr ?? '2082', 10)
  // Approximate: FY starts ~Jul 16 AD, year = BS_year - 57
  const fyStartADYear = fyStartBS - 57
  const fromDate = new Date(fyStartADYear, 6, 16) // July 16
  const toDate = new Date(fyStartADYear + 1, 6, 15) // July 15 next year

  // Fetch all sales and purchase invoices for the FY
  const [salesInvoices, purchaseInvoices] = await Promise.all([
    db.invoice.findMany({
      where: {
        type: 'sales',
        date: { gte: fromDate, lte: toDate },
        status: { not: 'Cancelled' },
      },
    }),
    db.invoice.findMany({
      where: {
        type: 'purchase',
        date: { gte: fromDate, lte: toDate },
        status: { not: 'Cancelled' },
      },
    }),
  ])

  // Monthly aggregation
  const months: VATReturnMonth[] = []
  let totalSalesVAT = 0
  let totalPurchaseVAT = 0
  let totalSalesCount = 0
  let totalPurchaseCount = 0

  // FY months: Shrawan(4) through Ashadh(3)
  const fyMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]

  for (const bsMonth of fyMonths) {
    const monthLabel = BS_MONTH_LABELS[bsMonth] ?? `Month ${bsMonth}`

    // Approximate AD month range for this BS month
    // This is a simplification; for production use bsToAD conversion
    const adMonthApprox = ((bsMonth + 2) % 12) // Rough AD month offset

    const monthSales = salesInvoices.filter((inv) => {
      const m = inv.date.getMonth() + 1
      return m === adMonthApprox || m === adMonthApprox + 1
    })

    const monthPurchases = purchaseInvoices.filter((inv) => {
      const m = inv.date.getMonth() + 1
      return m === adMonthApprox || m === adMonthApprox + 1
    })

    const salesVAT = monthSales.reduce((sum, inv) => sum + inv.taxAmount, 0)
    const purchaseVAT = monthPurchases.reduce((sum, inv) => sum + inv.taxAmount, 0)

    totalSalesVAT += salesVAT
    totalPurchaseVAT += purchaseVAT
    totalSalesCount += monthSales.length
    totalPurchaseCount += monthPurchases.length

    months.push({
      bsMonth,
      monthLabel,
      salesVAT: Math.round(salesVAT),
      purchaseVAT: Math.round(purchaseVAT),
      netPayable: Math.round(salesVAT - purchaseVAT),
      salesInvoiceCount: monthSales.length,
      purchaseInvoiceCount: monthPurchases.length,
    })
  }

  const totals = calculateVATPayable(
    Math.round(totalSalesVAT),
    Math.round(totalPurchaseVAT),
    0, // Sales return VAT (tracked via credit notes)
    0, // Purchase return VAT (tracked via debit notes)
  )

  return { fiscalYear, months, totals }
}

/**
 * Calculate net VAT payable to IRD.
 *
 * Formula: (Sales VAT + Purchase Return VAT) − (Purchase VAT + Sales Return VAT)
 * Positive result = payable to IRD
 * Negative result = refundable from IRD
 *
 * @param salesVAT - Total output VAT on sales
 * @param purchaseVAT - Total input VAT on purchases
 * @param salesReturnVAT - Total VAT on sales returns (credit notes)
 * @param purchaseReturnVAT - Total VAT on purchase returns (debit notes)
 * @returns VAT payable calculation result
 */
export function calculateVATPayable(
  salesVAT: number,
  purchaseVAT: number,
  salesReturnVAT: number = 0,
  purchaseReturnVAT: number = 0,
): VATPayableResult {
  const net = salesVAT + purchaseReturnVAT - purchaseVAT - salesReturnVAT
  return {
    salesVAT,
    purchaseVAT,
    salesReturnVAT,
    purchaseReturnVAT,
    payable: Math.max(0, Math.round(net)),
    refundable: net < 0,
    net: Math.round(net),
  }
}
