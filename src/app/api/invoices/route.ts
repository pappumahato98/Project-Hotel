import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const data = await getOrSet(`invoices:list:${status || ''}:${type || ''}`, async () => {
      const where: Prisma.InvoiceWhereInput = {}
      if (status) where.status = status
      if (type) where.type = type

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
      const allInvoices = await db.invoice.findMany({ where, take: 1000 })
      const totalInvoices = allInvoices.length
      const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const totalPaid = allInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
      const totalOutstanding = totalAmount - totalPaid

      const byType: Record<string, { count: number; amount: number; paid: number }> = {}
      for (const inv of allInvoices) {
        const t = inv.type
        if (!byType[t]) {
          byType[t] = { count: 0, amount: 0, paid: 0 }
        }
        byType[t].count++
        byType[t].amount += inv.totalAmount
        byType[t].paid += inv.paidAmount
      }

      return {
        invoices,
        stats: { totalInvoices, totalAmount, totalPaid, totalOutstanding, byType },
      }
    }, 120000) // Cache for 120s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Invoices API GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { invoiceNumber, type, vendorName, customerName, date, dueDate, lineItems, notes, createdBy } = body

    if (!invoiceNumber || !type || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceNumber, type, lineItems (non-empty array)' },
        { status: 400 },
      )
    }

    if (!['sales', 'purchase', 'credit_note', 'debit_note'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be sales, purchase, credit_note, or debit_note' },
        { status: 400 },
      )
    }

    // Validate each line item
    for (const item of lineItems) {
      if (!item.description || item.quantity === undefined || item.unitPrice === undefined || item.totalAmount === undefined) {
        return NextResponse.json(
          { error: 'Each line item requires: description, quantity, unitPrice, totalAmount' },
          { status: 400 },
        )
      }
    }

    // Compute subtotal, taxAmount, totalAmount
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      const lineTax = lineSubtotal * (item.taxRate || 0) / 100
      return sum + lineTax
    }, 0)
    const totalAmount = subtotal + taxAmount

    const record = await db.invoice.create({
      data: {
        invoiceNumber,
        type,
        vendorName: vendorName || null,
        customerName: customerName || null,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        notes: notes || null,
        createdBy: createdBy || null,
        lineItems: {
          create: lineItems.map((item: { description: string; quantity: number; unitPrice: number; taxRate: number; totalAmount: number }) => ({
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            taxRate: parseFloat(item.taxRate || 0),
            totalAmount: parseFloat(item.totalAmount),
          })),
        },
      },
      include: { lineItems: true },
    })

    afterMutation('accounting')
    broadcastEvent('invoice:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Invoices API POST error:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, paidAmount, notes, dueDate, vendorName, customerName } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (status && !['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Draft, Sent, Paid, Partially Paid, Overdue, or Cancelled' },
        { status: 400 },
      )
    }

    // Fetch current invoice to handle status-based logic
    const current = await db.invoice.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const data: Prisma.InvoiceUpdateInput = {}
    if (notes !== undefined) data.notes = notes || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (vendorName !== undefined) data.vendorName = vendorName || null
    if (customerName !== undefined) data.customerName = customerName || null
    if (status !== undefined) data.status = status

    // Handle paidAmount based on status change
    if (status === 'Paid') {
      // When marking as paid, set paidAmount to totalAmount
      data.paidAmount = current.totalAmount
    } else if (status === 'Partially Paid' && paidAmount !== undefined) {
      data.paidAmount = parseFloat(paidAmount)
    } else if (paidAmount !== undefined) {
      data.paidAmount = parseFloat(paidAmount)
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
    console.error('Invoices API PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}
