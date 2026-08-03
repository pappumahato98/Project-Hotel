import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice GET by ID error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
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
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      )
    }

    const current = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    })
    if (!current) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (current.status === 'Cancelled') {
      return NextResponse.json({ error: 'Cannot update a cancelled invoice' }, { status: 400 })
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
        await createPaymentJournalEntry(current, auth)
      } else if (status === 'Partially Paid' && paidAmount !== undefined) {
        data.paidAmount = parseFloat(paidAmount)
      } else if (status === 'Sent' && current.status !== 'Draft') {
        return NextResponse.json({ error: 'Only Draft invoices can be sent' }, { status: 400 })
      }
    }

    const record = await db.invoice.update({
      where: { id },
      data,
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Invoice PATCH by ID error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (current.status === 'Cancelled') {
      return NextResponse.json({ error: 'Invoice is already cancelled' }, { status: 400 })
    }

    if (current.status === 'Paid') {
      return NextResponse.json(
        { error: 'Cannot cancel a paid invoice. Create a credit note instead.' },
        { status: 400 },
      )
    }

    const record = await db.invoice.update({
      where: { id },
      data: { status: 'Cancelled' },
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:cancelled', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Invoice DELETE by ID error:', error)
    return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 })
  }
}

// ─── Helper: Auto-create journal entry for invoice payment ─────────────
async function createPaymentJournalEntry(
  invoice: { id: string; type: string; totalAmount: number; invoiceNumber: string },
  user: { name?: string } | NextResponse,
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
        createdBy: user && 'name' in user ? user.name : null,
        postedBy: user && 'name' in user ? user.name : null,
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
