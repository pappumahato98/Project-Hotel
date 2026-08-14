import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── GET: List invoices with filters and stats ─────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const cacheKey = `invoices:list:${status || ''}:${type || ''}:${search || ''}:${startDate || ''}:${endDate || ''}`

    const data = await getOrSet(cacheKey, async () => {
      const where: Prisma.InvoiceWhereInput = {}
      if (status) where.status = status
      if (type) where.type = type
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search } },
          { customerName: { contains: search } },
          { vendorName: { contains: search } },
        ]
      }
      if (startDate || endDate) {
        where.date = {}
        if (startDate) where.date.gte = new Date(startDate)
        if (endDate) where.date.lte = new Date(endDate)
      }

      const invoices = await db.invoice.findMany({
        where,
        include: {
          lineItems: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { date: 'desc' },
        take: 200,
      })

      // Compute stats from all invoices matching the filter
      const allInvoices = await db.invoice.findMany({ where, take: 5000 })
      const totalInvoices = allInvoices.length
      const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const totalPaid = allInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
      const totalOutstanding = totalAmount - totalPaid

      // Total overdue: invoices past due date and not paid
      const now = new Date()
      const overdueInvoices = allInvoices.filter(
        (inv) => inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'Paid' && inv.status !== 'Cancelled',
      )
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0)
      const overdueCount = overdueInvoices.length

      // Counts by type
      const countsByType: Record<string, number> = {}
      const byType: Record<string, { count: number; amount: number; paid: number }> = {}
      for (const inv of allInvoices) {
        countsByType[inv.type] = (countsByType[inv.type] || 0) + 1
        if (!byType[inv.type]) byType[inv.type] = { count: 0, amount: 0, paid: 0 }
        byType[inv.type].count++
        byType[inv.type].amount += inv.totalAmount
        byType[inv.type].paid += inv.paidAmount
      }
      // Round byType amounts
      for (const bt of Object.values(byType)) {
        bt.amount = Math.round(bt.amount * 100) / 100
        bt.paid = Math.round(bt.paid * 100) / 100
      }

      // Counts by status
      const countsByStatus: Record<string, number> = {}
      for (const inv of allInvoices) {
        countsByStatus[inv.status] = (countsByStatus[inv.status] || 0) + 1
      }

      return {
        invoices,
        stats: {
          totalInvoices,
          totalAmount,
          totalPaid,
          totalOutstanding,
          totalOverdue,
          overdueCount,
          countsByType,
          countsByStatus,
          byType,
        },
      }
    }, 120) // Cache for 120s

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('Invoices API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch invoices', 500, msg.substring(0, 300))
  }
}

// ─── POST: Create invoice with line items ──────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { invoiceNumber, type, vendorName, customerName, date, dueDate, lineItems, notes, createdBy } = body

    // Validate required fields
    if (!type || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return cachedError('Missing required fields: type, lineItems (non-empty array)', 400)
    }

    if (!['sales', 'purchase', 'credit_note', 'debit_note'].includes(type)) {
      return cachedError('Invalid type. Must be sales, purchase, credit_note, or debit_note', 400)
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.description || item.quantity === undefined || item.unitPrice === undefined) {
        return cachedError('Each line item requires: description, quantity, unitPrice', 400)
      }
      if (item.quantity <= 0 || item.unitPrice < 0) {
        return cachedError('Line item quantity must be > 0 and unitPrice must be >= 0', 400)
      }
    }

    // Auto-generate invoice number if not provided: INV-YYYYMMDD-NNN
    let finalInvoiceNumber = invoiceNumber
    if (!finalInvoiceNumber) {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayCount = await db.invoice.count({
        where: {
          createdAt: { gte: todayStart },
        },
      })
      finalInvoiceNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`

      // Check uniqueness
      const exists = await db.invoice.findUnique({ where: { invoiceNumber: finalInvoiceNumber } })
      if (exists) {
        finalInvoiceNumber = `INV-${dateStr}-${String(todayCount + 2).padStart(3, '0')}`
      }
    } else {
      // Verify uniqueness of provided number
      const exists = await db.invoice.findUnique({ where: { invoiceNumber: finalInvoiceNumber } })
      if (exists) {
        return cachedError('Invoice number already exists', 409)
      }
    }

    // Calculate subtotal, tax, total from line items
    const processedLines = lineItems.map((item: { description: string; quantity: number; unitPrice: number; taxRate?: number }) => {
      const qty = parseFloat(String(item.quantity))
      const price = parseFloat(String(item.unitPrice))
      const taxRate = parseFloat(String(item.taxRate || 0))
      const lineSubtotal = qty * price
      const lineTax = lineSubtotal * taxRate / 100
      const lineTotal = lineSubtotal + lineTax
      return {
        description: item.description,
        quantity: qty,
        unitPrice: price,
        taxRate,
        totalAmount: Math.round(lineTotal * 100) / 100,
      }
    })

    const subtotal = processedLines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = processedLines.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * item.taxRate / 100,
      0,
    )
    const totalAmount = subtotal + taxAmount

    const record = await db.invoice.create({
      data: {
        invoiceNumber: finalInvoiceNumber,
        type,
        vendorName: vendorName || null,
        customerName: customerName || null,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paidAmount: 0,
        status: 'Draft',
        notes: notes || null,
        createdBy: createdBy || null,
        lineItems: {
          create: processedLines,
        },
      },
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Invoices API POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create invoice', 500, msg.substring(0, 300))
  }
}

// ─── PATCH: Update invoice with status transitions ─────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, paidAmount, notes, dueDate, vendorName, customerName, lineItems } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    const validStatuses = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled']
    if (status && !validStatuses.includes(status)) {
      return cachedError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    }

    // Fetch current invoice
    const current = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    })
    if (!current) {
      return cachedError('Invoice not found', 404)
    }

    // Block updates on cancelled invoices
    if (current.status === 'Cancelled') {
      return cachedError('Cannot update a cancelled invoice', 400)
    }

    const data: Prisma.InvoiceUpdateInput = {}
    if (notes !== undefined) data.notes = notes || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (vendorName !== undefined) data.vendorName = vendorName || null
    if (customerName !== undefined) data.customerName = customerName || null

    // Handle line items update: replace all line items
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

      // Delete existing and create new
      await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
      data.lineItems = { create: processedLines }
    }

    // Handle status transitions
    if (status !== undefined) {
      data.status = status

      if (status === 'Paid') {
        data.paidAmount = current.totalAmount
        // Auto-create journal entry for payment
        await createPaymentJournalEntry(current, auth as { name?: string })
      } else if (status === 'Partially Paid' && paidAmount !== undefined) {
        data.paidAmount = parseFloat(paidAmount)
      } else if (status === 'Sent') {
        // Transition from Draft to Sent
        if (current.status !== 'Draft') {
          return cachedError('Only Draft invoices can be sent', 400)
        }
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
    console.error('Invoices API PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update invoice', 500, msg.substring(0, 300))
  }
}

// ─── DELETE: Cancel invoice (soft delete) ──────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return cachedError('Invoice ID is required (query param)', 400)
    }

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
    console.error('Invoices API DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to cancel invoice', 500, msg.substring(0, 300))
  }
}

// ─── Helper: Auto-create journal entry for invoice payment ─────────────
async function createPaymentJournalEntry(
  invoice: { id: string; type: string; totalAmount: number; invoiceNumber: string },
  user: { name?: string } | NextResponse,
) {
  try {
    // Find the appropriate accounts
    const isSales = invoice.type === 'sales' || invoice.type === 'debit_note'
    const cashAccount = await db.ledgerAccount.findFirst({
      where: { code: '1100', active: true }, // Bank Account Nabil
    })
    const cashFallback = cashAccount || (await db.ledgerAccount.findFirst({
      where: { code: '1000', active: true }, // Cash on Hand
    }))

    let drAccountId: string | null = null
    let crAccountId: string | null = null
    let drNarration = ''
    let crNarration = ''

    if (isSales) {
      // Sales invoice payment: DR Cash/Bank, CR Accounts Receivable
      drAccountId = cashFallback?.id || null
      const arAccount = await db.ledgerAccount.findFirst({
        where: { code: '1200', active: true },
      })
      crAccountId = arAccount?.id || null
      drNarration = `Payment received for ${invoice.invoiceNumber}`
      crNarration = `AR settled for ${invoice.invoiceNumber}`
    } else {
      // Purchase invoice payment: DR Accounts Payable, CR Cash/Bank
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
    // Don't fail the invoice update if journal entry creation fails
  }
}
