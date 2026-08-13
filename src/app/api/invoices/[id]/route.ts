import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── GET: Single invoice with line items ──────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!invoice) {
      return cachedError('Invoice not found', 404)
    }

    return cachedJson(invoice, request, { tier: 'long' })
  } catch (error) {
    console.error('Invoice GET by ID error:', error)
    return cachedError('Failed to fetch invoice', 500)
  }
}

// ─── PATCH: Update single invoice ──────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { status, paidAmount, notes, dueDate, vendorName, customerName, lineItems } = body

    const validStatuses = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled']
    if (status && !validStatuses.includes(status)) {
      return cachedError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    }

    const current = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    })
    if (!current) {
      return cachedError('Invoice not found', 404)
    }

    if (current.status === 'Cancelled') {
      return cachedError('Cannot update a cancelled invoice', 400)
    }

    const data: Prisma.InvoiceUpdateInput = {}
    if (notes !== undefined) data.notes = notes || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (vendorName !== undefined) data.vendorName = vendorName || null
    if (customerName !== undefined) data.customerName = customerName || null

    // Handle line items replacement
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const processedLines = lineItems.map((item: { description: string; quantity: number; unitPrice: number; taxRate?: number }) => {
        const qty = parseFloat(String(item.quantity))
        const price = parseFloat(String(item.unitPrice))
        const taxRate = parseFloat(String(item.taxRate || 0))
        const lineSubtotal = qty * price
        const lineTax = lineSubtotal * taxRate / 100
        return {
          description: item.description,
          quantity: qty,
          unitPrice: price,
          taxRate,
          totalAmount: Math.round((lineSubtotal + lineTax) * 100) / 100,
        }
      })

      const newSubtotal = processedLines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const newTaxAmount = processedLines.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice * item.taxRate / 100,
        0,
      )
      data.subtotal = Math.round(newSubtotal * 100) / 100
      data.taxAmount = Math.round(newTaxAmount * 100) / 100
      data.totalAmount = Math.round((newSubtotal + newTaxAmount) * 100) / 100

      await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
      data.lineItems = { create: processedLines }
    }

    // Handle status transitions
    if (status !== undefined) {
      data.status = status

      if (status === 'Paid') {
        data.paidAmount = current.totalAmount
        await createPaymentJournalEntry(current, auth.firstName ? `${auth.firstName} ${auth.lastName || ''}`.trim() : 'System')
      } else if (status === 'Partially Paid' && paidAmount !== undefined) {
        data.paidAmount = parseFloat(paidAmount)
      } else if (status === 'Sent' && current.status !== 'Draft') {
        return cachedError('Only Draft invoices can be sent', 400)
      }
    }

    const record = await db.invoice.update({
      where: { id },
      data,
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Invoice PATCH by ID error:', error)
    return cachedError('Failed to update invoice', 500)
  }
}

// ─── DELETE: Cancel invoice ─────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const current = await db.invoice.findUnique({ where: { id } })
    if (!current) {
      return cachedError('Invoice not found', 404)
    }

    if (current.status === 'Cancelled') {
      return cachedError('Invoice is already cancelled', 400)
    }

    if (current.status === 'Paid') {
      return cachedError('Cannot cancel a paid invoice. Create a credit note instead.', 400)
    }

    const record = await db.invoice.update({
      where: { id },
      data: { status: 'Cancelled' },
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:cancelled', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Invoice DELETE by ID error:', error)
    return cachedError('Failed to cancel invoice', 500)
  }
}

// ─── Helper: Auto-create journal entry for invoice payment ─────────────
async function createPaymentJournalEntry(
  invoice: { id: string; type: string; totalAmount: number; invoiceNumber: string },
  userName: string,
) {
  try {
    const isSales = invoice.type === 'sales' || invoice.type === 'debit_note'
    const cashAccount = await db.ledgerAccount.findFirst({
      where: { code: '1100', active: true },
    })
    const cashFallback = cashAccount || (await db.ledgerAccount.findFirst({
      where: { code: '1000', active: true },
    }))

    let drAccountId: string | null = null
    let crAccountId: string | null = null
    let drNarration = ''
    let crNarration = ''

    if (isSales) {
      drAccountId = cashFallback?.id || null
      const arAccount = await db.ledgerAccount.findFirst({
        where: { code: '1200', active: true },
      })
      crAccountId = arAccount?.id || null
      drNarration = `Payment received for ${invoice.invoiceNumber}`
      crNarration = `AR settled for ${invoice.invoiceNumber}`
    } else {
      const apAccount = await db.ledgerAccount.findFirst({
        where: { code: '2000', active: true },
      })
      drAccountId = apAccount?.id || null
      crAccountId = cashFallback?.id || null
      drNarration = `AP settled for ${invoice.invoiceNumber}`
      crNarration = `Payment made for ${invoice.invoiceNumber}`
    }

    if (!drAccountId || !crAccountId) {
      console.warn('Could not find accounts for auto journal entry on invoice payment')
      return
    }

    const amount = Math.round(invoice.totalAmount * 100) / 100

    await db.journalEntry.create({
      data: {
        date: new Date(),
        description: `Invoice payment — ${invoice.invoiceNumber}`,
        reference: `JE-INV-PAY-${invoice.invoiceNumber}`,
        status: 'posted',
        sourceModule: 'invoice_payment',
        sourceId: invoice.id,
        createdBy: userName,
        postedBy: userName,
        postedAt: new Date(),
        lines: {
          create: [
            { accountId: drAccountId, debit: amount, credit: 0, narration: drNarration },
            { accountId: crAccountId, debit: 0, credit: amount, narration: crNarration },
          ],
        },
      },
    })
  } catch (err) {
    console.error('Failed to auto-create payment journal entry:', err)
  }
}
