import { NextRequest, NextResponse } from 'next/server'
import {
  generateSalesVATRegister,
  generatePurchaseVATRegister,
  generateVATReturnReport,
} from '@/lib/nepal-compliance/vat-engine'
import { db } from '@/lib/db'
import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'
import { cachedJson, cachedError } from '@/lib/api-response'

type VATRegisterType = 'sales' | 'purchase' | 'sales_return' | 'purchase_return'

// ─── GET: VAT register entries or VAT return report ──────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const fiscalYear = searchParams.get('fiscalYear')

    if (!type) {
      return cachedError("Query parameter 'type' is required.", 400)
    }

    // Special case: type=return → VAT return report
    if (type === 'return') {
      if (!fiscalYear) {
        return cachedError("Query parameter 'fiscalYear' is required when type=return.", 400)
      }
      const report = await generateVATReturnReport(fiscalYear)
      return cachedJson({ type: 'return', fiscalYear, report }, request, { tier: 'long' })
    }

    // Standard register types
    const validTypes: VATRegisterType[] = ['sales', 'purchase', 'sales_return', 'purchase_return']
    if (!validTypes.includes(type as VATRegisterType)) {
      return cachedError(`type must be one of: ${validTypes.join(', ')}, or 'return'.`, 400)
    }

    // Default date range: current fiscal year (approximate)
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 6, 16) // Jul 16
    const toDate = to ? new Date(to) : new Date(new Date().getFullYear() + 1, 6, 15) // Jul 15 next year

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return cachedError('Invalid date format for from/to. Use YYYY-MM-DD.', 400)
    }

    // For sales_return and purchase_return, we query cancelled invoices
    // since credit notes / debit notes aren't a separate type in our schema
    if (type === 'sales_return') {
      const invoices = await db.invoice.findMany({
        where: {
          type: 'credit_note',
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: 'asc' },
      })

      const entries = invoices.map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        partyName: inv.customerName,
        partyPan: null,
        taxableAmount: Math.round(inv.subtotal),
        vatRate: NEPAL_VAT_RATE,
        vatAmount: Math.round(inv.taxAmount),
        totalAmount: Math.round(inv.totalAmount),
        status: inv.status,
      }))

      return cachedJson({ type: 'sales_return', from, to, entries }, request, { tier: 'long' })
    }

    if (type === 'purchase_return') {
      const invoices = await db.invoice.findMany({
        where: {
          type: 'debit_note',
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: 'asc' },
      })

      const entries = invoices.map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        partyName: inv.vendorName,
        partyPan: null,
        taxableAmount: Math.round(inv.subtotal),
        vatRate: NEPAL_VAT_RATE,
        vatAmount: Math.round(inv.taxAmount),
        totalAmount: Math.round(inv.totalAmount),
        status: inv.status,
      }))

      return cachedJson({ type: 'purchase_return', from, to, entries }, request, { tier: 'long' })
    }

    // Sales and Purchase use the engine functions
    if (type === 'sales') {
      const entries = await generateSalesVATRegister(fromDate, toDate)
      return cachedJson({ type: 'sales', from, to, entries }, request, { tier: 'long' })
    }

    // type === 'purchase'
    const entries = await generatePurchaseVATRegister(fromDate, toDate)
    return cachedJson({ type: 'purchase', from, to, entries }, request, { tier: 'long' })
  } catch (error) {
    console.error('[vat-register] GET error:', error)
    return cachedError('Failed to retrieve VAT register.', 500)
  }
}
