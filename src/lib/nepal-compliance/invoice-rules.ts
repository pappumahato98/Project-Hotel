/**
 * Invoice Compliance Rules
 *
 * Nepal IRD invoice compliance requirements:
 *   1. Invoice Cancellation — NO deletion, only cancel with reason
 *   2. Copy Tracking — 'Copy #N of Original' on reprints
 *   3. Auto-incremented chronological invoice numbers
 *   4. Required fields: PAN/VAT number, fiscal year, buyer PAN
 *   5. Invoice number format: {FY}-{SEQUENTIAL}
 *
 * All amounts in NPR.
 */

import { db } from '@/lib/db'
import { getNepalFiscalYearLong, getNepalFiscalYearShort } from '@/lib/nepal-standards'
import { logActivity } from './audit-trail'

// ── Types ─────────────────────────────────────────────────────────────

/** Invoice print record */
export interface InvoicePrintRecord {
  /** Print sequence number for this invoice */
  copyNumber: number
  /** Whether this is the original (first) print */
  isOriginal: boolean
  /** When it was printed */
  printedAt: Date
}

/** Invoice copy/print status */
export interface InvoiceCopyStatus {
  /** Total number of times this invoice has been printed */
  prints: number
  /** When it was last printed */
  lastPrintedAt: Date | null
  /** Whether the invoice has been cancelled */
  isCancelled: boolean
  /** Cancellation reason (if cancelled) */
  cancellationReason: string | null
  /** Who cancelled the invoice */
  cancelledBy: string | null
  /** When the invoice was cancelled */
  cancelledAt: Date | null
}

/** Invoice cancellation result */
export interface InvoiceCancellationResult {
  success: boolean
  message: string
}

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Generate a compliant invoice number.
 *
 * Format: {FY}-{SEQUENTIAL}
 * Example: 2082/083-00001
 *
 * The fiscal year portion uses the long BS format (2082/2083).
 * The sequential portion is zero-padded to 5 digits.
 *
 * @param fiscalYear - Fiscal year string (e.g. '2082/2083')
 * @param sequence - Sequential number within the fiscal year
 * @returns Compliant invoice number string
 */
export function generateInvoiceNumber(fiscalYear: string, sequence: number): string {
  const seq = String(sequence).padStart(5, '0')
  return `${fiscalYear}-${seq}`
}

/**
 * Get the next invoice sequence number for a fiscal year.
 *
 * Queries the database for the highest invoice number in the given
 * fiscal year and increments by 1.
 *
 * @param fiscalYear - Fiscal year string (e.g. '2082/2083')
 * @returns Next sequence number (1 if no invoices exist for the FY)
 */
export async function getNextInvoiceSequence(fiscalYear: string): Promise<number> {
  const prefix = `${fiscalYear}-`

  const lastInvoice = await db.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
      status: { not: 'Cancelled' },
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  if (!lastInvoice) return 1

  // Extract sequence number from invoice number
  const parts = lastInvoice.invoiceNumber.split('-')
  const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10)
  return lastSeq + 1
}

/**
 * Cancel an invoice (compliance-safe — never deletes).
 *
 * Per IRD rules: invoices must NEVER be deleted.
 * Instead, the status is set to 'Cancelled' with a mandatory reason.
 * The original data is preserved for audit purposes.
 *
 * @param invoiceId - ID of the invoice to cancel
 * @param reason - Mandatory cancellation reason
 * @param userId - ID of the user performing the cancellation
 * @param userName - Display name of the user
 * @param ipAddress - IP address of the requester
 * @returns Cancellation result
 */
export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  userId: string,
  userName: string,
  ipAddress?: string,
): Promise<InvoiceCancellationResult> {
  if (!reason.trim()) {
    return {
      success: false,
      message: 'Cancellation reason is mandatory per IRD compliance rules.',
    }
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    return { success: false, message: 'Invoice not found.' }
  }

  if (invoice.status === 'Cancelled') {
    return { success: false, message: 'Invoice is already cancelled.' }
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'Cancelled',
      notes: (invoice.notes ? `${invoice.notes}\n` : '') +
        `[CANCELLED] ${new Date().toISOString()} by ${userName}: ${reason}`,
    },
  })

  // Log to audit trail
  logActivity({
    userId,
    userName,
    action: 'cancel',
    module: 'Accounting',
    docType: 'invoice',
    docId: invoiceId,
    ipAddress,
    description: `Cancelled invoice ${invoice.invoiceNumber}: ${reason}`,
    oldValue: JSON.stringify({ status: invoice.status }),
    newValue: JSON.stringify({ status: 'Cancelled', reason }),
  })

  return {
    success: true,
    message: `Invoice ${invoice.invoiceNumber} has been cancelled.`,
  }
}

/**
 * Record an invoice print (for copy tracking).
 *
 * Per IRD rules, reprints must show 'Copy #N of Original'.
 * This function tracks print count for compliance.
 *
 * @param invoiceId - ID of the invoice being printed
 * @param userId - ID of the user printing
 * @param userName - Display name of the user
 * @param ipAddress - IP address of the requester
 * @returns Print record with copy number
 */
export async function recordInvoicePrint(
  invoiceId: string,
  userId: string,
  userName: string,
  ipAddress?: string,
): Promise<InvoicePrintRecord> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found.`)
  }

  // Extract current print count from notes or default to 0
  const printCountMatch = invoice.notes?.match(/\[PRINT_COUNT:(\d+)\]/)
  const currentCount = printCountMatch ? parseInt(printCountMatch[1], 10) : 0
  const newCount = currentCount + 1
  const isOriginal = newCount === 1

  // Update notes with new print count
  let updatedNotes = invoice.notes ?? ''
  if (printCountMatch) {
    updatedNotes = updatedNotes.replace(/\[PRINT_COUNT:\d+\]/, `[PRINT_COUNT:${newCount}]`)
  } else {
    updatedNotes = `${updatedNotes}\n[PRINT_COUNT:${newCount}]`.trim()
  }

  // Add print timestamp
  const printTimestamp = `[PRINT:${newCount}] ${new Date().toISOString()} by ${userName}`
  updatedNotes = `${updatedNotes}\n${printTimestamp}`

  await db.invoice.update({
    where: { id: invoiceId },
    data: { notes: updatedNotes },
  })

  // Log to audit trail
  logActivity({
    userId,
    userName,
    action: 'print',
    module: 'Accounting',
    docType: 'invoice',
    docId: invoiceId,
    ipAddress,
    description: `Printed invoice ${invoice.invoiceNumber} (Copy #${newCount})`,
  })

  return {
    copyNumber: newCount,
    isOriginal,
    printedAt: new Date(),
  }
}

/**
 * Get the print/cancellation status of an invoice.
 *
 * @param invoiceId - ID of the invoice
 * @returns Invoice copy status with print count and cancellation info
 */
export async function getInvoiceCopyStatus(invoiceId: string): Promise<InvoiceCopyStatus> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found.`)
  }

  // Extract print count from notes
  const printCountMatch = invoice.notes?.match(/\[PRINT_COUNT:(\d+)\]/)
  const prints = printCountMatch ? parseInt(printCountMatch[1], 10) : 0

  // Extract last print timestamp
  const lastPrintMatch = invoice.notes?.match(
    /\[PRINT:(\d+)\] ([^\n]+)/,
  )
  const lastPrintedAt = lastPrintMatch
    ? new Date(lastPrintMatch[2].trim())
    : null

  // Extract cancellation info
  const cancelMatch = invoice.notes?.match(
    /\[CANCELLED\] ([^\n]+) by ([^:]+): (.+)/,
  )
  const isCancelled = invoice.status === 'Cancelled'

  return {
    prints,
    lastPrintedAt,
    isCancelled,
    cancellationReason: cancelMatch ? cancelMatch[3].trim() : null,
    cancelledBy: cancelMatch ? cancelMatch[2].trim() : null,
    cancelledAt: isCancelled && lastPrintMatch
      ? null // Cancellation time would be parsed separately
      : null,
  }
}

/**
 * Format the fiscal year for use in invoice numbers.
 *
 * Takes an AD date and returns the BS fiscal year in long format.
 * Example: AD 2025-08-01 → '2082/2083'
 *
 * @param adDate - AD date to compute fiscal year from
 * @returns Fiscal year string suitable for invoice numbering
 */
export function formatFiscalYearForInvoice(adDate: Date): string {
  return getNepalFiscalYearLong(adDate)
}
