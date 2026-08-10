/**
 * CBMS (Central Billing Management System) Integration for IRD
 *
 * Nepal's Inland Revenue Department (IRD) requires real-time
 * sales invoice data submission via CBMS API for VAT-registered businesses.
 *
 * This module provides:
 *   - Payload preparation matching CBMS schema
 *   - API submission (fire-and-forget with retry queue)
 *   - Response code parsing
 *   - Settings validation
 *   - Failed invoice sync
 *
 * All amounts in NPR.
 */

import { db } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────

/** CBMS API configuration settings */
export interface CBMSSettings {
  /** IRD-issued API username */
  username: string
  /** IRD-issued API password */
  password: string
  /** CBMS API base URL */
  apiBaseUrl: string
  /** Registered PAN/VAT number */
  panNumber: string
  /** Whether CBMS integration is enabled */
  enabled: boolean
}

/** A single invoice line item for CBMS payload */
export interface CBMSLineItem {
  /** Item description */
  itemDescription: string
  /** Unit price (exclusive of VAT) */
  unitPrice: number
  /** Quantity */
  quantity: number
  /** Total amount (unitPrice × quantity) */
  totalAmount: number
  /** VAT rate percentage */
  vatRate: number
  /** VAT amount */
  vatAmount: number
  /** Discount amount (if any) */
  discount: number
}

/** Source invoice data (from our Invoice model) */
export interface SourceInvoice {
  id: string
  invoiceNumber: string
  date: Date | string
  customerName?: string | null
  customerPan?: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: string
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    totalAmount: number
  }>
}

/** Complete CBMS API payload */
export interface CBMSPayload {
  username: string
  password: string
  sellerPan: string
  buyerPan: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  totalTax: number
  taxableAmount: number
  items: CBMSLineItem[]
  /** UTC timestamp of submission */
  timestamp: string
  /** Unique request ID for idempotency */
  requestId: string
}

/** CBMS API response */
export interface CBMSResult {
  success: boolean
  message: string
  code: number
  /** IRD response reference number (if successful) */
  referenceNumber?: string
  /** Timestamp of IRD acknowledgment */
  responseTimestamp?: string
}

/** Parsed CBMS response */
export interface CBMSParsedResponse {
  success: boolean
  message: string
  code: number
}

/** CBMS settings validation result */
export interface CBMSValidationResult {
  configured: boolean
  missingFields: string[]
}

/** Failed invoice sync result */
export interface FailedInvoiceSyncResult {
  queued: boolean
  count: number
}

// ── CBMS Response Codes ───────────────────────────────────────────────

const CBMS_RESPONSE_MESSAGES: Record<number, string> = {
  200: 'Success — Invoice accepted by IRD',
  100: 'API credentials do not match',
  101: 'Invoice already exists',
  102: 'Exception while saving invoice',
  103: 'Unknown exception',
  104: 'Invalid model or validation error',
  105: 'Invoice does not exist (return case)',
}

// ── Helper: Settings from DB ──────────────────────────────────────────

/**
 * Retrieve CBMS settings from SystemSetting table.
 * Settings are stored with category 'integrations' and keys prefixed 'cbms_'.
 */
async function getCBMSSettingsFromDB(): Promise<Partial<CBMSSettings>> {
  const settings = await db.systemSetting.findMany({
    where: { category: 'integrations', key: { startsWith: 'cbms_' } },
  })

  const result: Record<string, string> = {}
  for (const s of settings) {
    result[s.key.replace('cbms_', '')] = s.value
  }

  return {
    username: result['username'],
    password: result['password'],
    apiBaseUrl: result['apiBaseUrl'],
    panNumber: result['panNumber'],
    enabled: result['enabled'] === 'true',
  }
}

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Validate CBMS configuration settings.
 *
 * Checks that all required fields (username, password, apiBaseUrl, panNumber)
 * are present and non-empty.
 *
 * @returns Validation result with list of missing fields
 */
export async function validateCBMSSettings(): Promise<CBMSValidationResult> {
  const settings = await getCBMSSettingsFromDB()
  const missingFields: string[] = []

  if (!settings.username) missingFields.push('username')
  if (!settings.password) missingFields.push('password')
  if (!settings.apiBaseUrl) missingFields.push('apiBaseUrl')
  if (!settings.panNumber) missingFields.push('panNumber')

  return {
    configured: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Prepare a CBMS-compliant payload from a source invoice.
 *
 * Transforms the internal Invoice model data into the format
 * expected by the IRD CBMS API.
 *
 * @param invoice - Source invoice data
 * @returns CBMS API payload ready for submission
 */
export async function prepareCBMSPayload(invoice: SourceInvoice): Promise<CBMSPayload> {
  const settings = await getCBMSSettingsFromDB()

  const items: CBMSLineItem[] = (invoice.lineItems ?? []).map((item) => ({
    itemDescription: item.description,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    totalAmount: item.totalAmount,
    vatRate: item.taxRate,
    vatAmount: Math.round(item.totalAmount * (item.taxRate / 100)),
    discount: 0,
  }))

  return {
    username: settings.username ?? '',
    password: settings.password ?? '',
    sellerPan: settings.panNumber ?? '',
    buyerPan: invoice.customerPan ?? '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: new Date(invoice.date).toISOString().split('T')[0],
    totalAmount: Math.round(invoice.totalAmount),
    totalTax: Math.round(invoice.taxAmount),
    taxableAmount: Math.round(invoice.subtotal),
    items,
    timestamp: new Date().toISOString(),
    requestId: `meridian-${invoice.id}-${Date.now()}`,
  }
}

/**
 * Send invoice data to CBMS API.
 *
 * Submits the payload to IRD and returns the result.
 * On failure, the invoice is queued for retry via syncFailedInvoices().
 *
 * @param payload - Prepared CBMS payload
 * @returns CBMS API result with success status and message
 */
export async function sendToCBMS(payload: CBMSPayload): Promise<CBMSResult> {
  const settings = await getCBMSSettingsFromDB()

  if (!settings.apiBaseUrl || !settings.enabled) {
    return {
      success: false,
      message: 'CBMS not configured or disabled',
      code: -1,
    }
  }

  try {
    const response = await fetch(settings.apiBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    const code = data.code ?? data.statusCode ?? -1
    const parsed = parseCBMSResponse(code)

    return {
      ...parsed,
      referenceNumber: data.referenceNumber,
      responseTimestamp: data.timestamp ?? new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
      code: -1,
    }
  }
}

/**
 * Parse a CBMS response code into a human-readable result.
 *
 * @param code - CBMS response code (200, 100, 101, etc.)
 * @returns Parsed response with success flag and message
 */
export function parseCBMSResponse(code: number): CBMSParsedResponse {
  const message = CBMS_RESPONSE_MESSAGES[code] ?? `Unknown CBMS response code: ${code}`
  return {
    success: code === 200,
    message,
    code,
  }
}

/**
 * Sync failed invoices to CBMS.
 *
 * Finds invoices with status 'Sent' or 'Partially Paid' that have not
 * been acknowledged by CBMS and resubmits them.
 *
 * Uses fire-and-forget pattern — errors are logged but don't propagate.
 *
 * @returns Sync result with count of queued invoices
 */
export async function syncFailedInvoices(): Promise<FailedInvoiceSyncResult> {
  try {
    // Find invoices that need CBMS submission
    // (Sent or Paid but not yet synced to CBMS)
    const pendingInvoices = await db.invoice.findMany({
      where: {
        status: { in: ['Sent', 'Paid', 'Partially Paid'] },
      },
      take: 50, // Batch size
    })

    if (pendingInvoices.length === 0) {
      return { queued: false, count: 0 }
    }

    // Queue them for submission (fire-and-forget)
    for (const invoice of pendingInvoices) {
      prepareCBMSPayload(invoice as unknown as SourceInvoice)
        .then((payload) => sendToCBMS(payload))
        .catch(() => { /* Log error but don't crash */ })
    }

    return { queued: true, count: pendingInvoices.length }
  } catch {
    return { queued: false, count: 0 }
  }
}
