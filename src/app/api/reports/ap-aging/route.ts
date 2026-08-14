import { NextRequest, NextResponse } from 'next/server'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Types ─────────────────────────────────────────────────────
interface AgingBucket {
  current: number
  days31to60: number
  days61to90: number
  daysOver90: number
  total: number
}

interface APAgingItem {
  id: string
  type: 'purchase_order' | 'invoice'
  reference: string
  vendorName: string
  vendorId: string
  date: string
  dueDate?: string
  totalAmount: number
  paidAmount: number
  balance: number
  aging: AgingBucket
}

interface VendorAPGroup {
  vendorId: string
  vendorName: string
  items: APAgingItem[]
  totalBalance: number
  aging: AgingBucket
}

interface APAgingReport {
  reportType: 'ap-aging'
  generatedAt: string
  totalOutstanding: number
  totalPOBalance: number
  totalInvoiceBalance: number
  agingSummary: AgingBucket
  vendorGroups: VendorAPGroup[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeAging(date: Date | null, balance: number): AgingBucket {
  const empty: AgingBucket = { current: 0, days31to60: 0, days61to90: 0, daysOver90: 0, total: round2(balance) }
  if (balance <= 0 || !date) return empty

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 30) return { ...empty, current: round2(balance) }
  if (days <= 60) return { ...empty, days31to60: round2(balance) }
  if (days <= 90) return { ...empty, days61to90: round2(balance) }
  return { ...empty, daysOver90: round2(balance) }
}

function sumBuckets(buckets: AgingBucket[]): AgingBucket {
  return {
    current: round2(buckets.reduce((s, b) => s + b.current, 0)),
    days31to60: round2(buckets.reduce((s, b) => s + b.days31to60, 0)),
    days61to90: round2(buckets.reduce((s, b) => s + b.days61to90, 0)),
    daysOver90: round2(buckets.reduce((s, b) => s + b.daysOver90, 0)),
    total: round2(buckets.reduce((s, b) => s + b.total, 0)),
  }
}

// ─── GET Handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const cacheKey = 'reports:ap-aging'
    const data = await getOrSet(cacheKey, async (): Promise<APAgingReport> => {
      // ── 1. Unpaid Purchase Orders (approved/delivered but unpaid) ──
      // PO model has no payment tracking; treat approved/delivered/partial as outstanding
      const unpaidPOs = await db.purchaseOrder.findMany({
        where: {
          status: { in: ['approved', 'ordered', 'partial', 'delivered'] },
          totalAmount: { gt: 0 },
        },
      })

      const poItems: APAgingItem[] = []
      let totalPOBalance = 0

      // Check if any POs have been paid via journal entries (CR to AP account)
      // For simplicity, treat all unpaid POs as outstanding since the model
      // doesn't have a paidAmount field. In practice, a fully delivered PO
      // with a matching payment entry could be filtered, but we show all.
      for (const po of unpaidPOs) {
        // Only count delivered/partial as truly payable (approved but not yet ordered = not yet due)
        const isPayable = ['delivered', 'partial', 'ordered'].includes(po.status)
        if (!isPayable) continue

        const balance = round2(po.totalAmount)
        const aging = computeAging(po.date, balance)

        poItems.push({
          id: po.id,
          type: 'purchase_order',
          reference: po.poNumber,
          vendorName: po.vendor,
          vendorId: po.vendorId,
          date: po.date.toISOString(),
          dueDate: po.expectedDelivery || undefined,
          totalAmount: po.totalAmount,
          paidAmount: 0,
          balance,
          aging,
        })
        totalPOBalance = round2(totalPOBalance + balance)
      }

      // ── 2. Unpaid/overdue purchase-type invoices ──
      const unpaidInvoices = await db.invoice.findMany({
        where: {
          type: 'purchase',
          status: { in: ['Sent', 'Partially Paid', 'Overdue'] },
          totalAmount: { gt: 0 },
        },
      })

      const invoiceItems: APAgingItem[] = []
      let totalInvoiceBalance = 0

      for (const inv of unpaidInvoices) {
        const balance = round2(inv.totalAmount - inv.paidAmount)
        if (balance <= 0) continue

        const aging = computeAging(inv.dueDate ?? inv.date, balance)

        invoiceItems.push({
          id: inv.id,
          type: 'invoice',
          reference: inv.invoiceNumber,
          vendorName: inv.vendorName || 'Unknown',
          vendorId: '',
          date: inv.date.toISOString(),
          dueDate: inv.dueDate?.toISOString() || undefined,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balance,
          aging,
        })
        totalInvoiceBalance = round2(totalInvoiceBalance + balance)
      }

      // ── 3. Group by vendor ──
      const vendorMap = new Map<string, VendorAPGroup>()
      const allItems = [...poItems, ...invoiceItems]

      for (const item of allItems) {
        const vendorId = item.vendorId || `__invoice__${item.vendorName}`
        const vendorName = item.vendorName

        const existing = vendorMap.get(vendorId)
        if (existing) {
          existing.items.push(item)
          existing.totalBalance = round2(existing.totalBalance + item.balance)
        } else {
          vendorMap.set(vendorId, {
            vendorId,
            vendorName,
            items: [item],
            totalBalance: item.balance,
            aging: { current: 0, days31to60: 0, days61to90: 0, daysOver90: 0, total: 0 },
          })
        }
      }

      // Compute per-vendor aging
      for (const group of vendorMap.values()) {
        group.aging = sumBuckets(group.items.map(i => i.aging))
      }

      const vendorGroups = [...vendorMap.values()].sort((a, b) => b.totalBalance - a.totalBalance)

      // ── 4. Summary ──
      const agingSummary = sumBuckets(allItems.map(i => i.aging))
      const totalOutstanding = round2(totalPOBalance + totalInvoiceBalance)

      return {
        reportType: 'ap-aging',
        generatedAt: new Date().toISOString(),
        totalOutstanding,
        totalPOBalance,
        totalInvoiceBalance,
        agingSummary,
        vendorGroups,
      }
    }, 120_000)

    return cachedJson(data, request, { tier: 'long' })
  } catch (error) {
    console.error('AP Aging Report API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to generate AP aging report', 500, msg.substring(0, 300))
  }
}
