import { NextRequest, NextResponse } from 'next/server'
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

interface ARAgingItem {
  folioId: string
  type: 'folio' | 'invoice'
  reference: string
  guestName: string
  roomNumber?: string
  checkoutDate?: string
  invoiceDate?: string
  dueDate?: string
  aging: AgingBucket
}

interface GuestARGroup {
  guestId: string
  guestName: string
  items: ARAgingItem[]
  totalBalance: number
  aging: AgingBucket
}

interface ARAgingReport {
  reportType: 'ar-aging'
  generatedAt: string
  totalOutstanding: number
  totalFolioBalance: number
  totalInvoiceBalance: number
  agingSummary: AgingBucket
  guestGroups: GuestARGroup[]
  unpaidInvoices: ARAgingItem[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function ageFolio(checkoutDate: Date | null, balance: number): AgingBucket {
  const empty: AgingBucket = { current: 0, days31to60: 0, days61to90: 0, daysOver90: 0, total: round2(balance) }
  if (balance <= 0 || !checkoutDate) return empty

  const now = new Date()
  const diffMs = now.getTime() - checkoutDate.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 30) return { ...empty, current: round2(balance) }
  if (days <= 60) return { ...empty, days31to60: round2(balance) }
  if (days <= 90) return { ...empty, days61to90: round2(balance) }
  return { ...empty, daysOver90: round2(balance) }
}

function ageInvoice(dueDate: Date | null, totalAmount: number, paidAmount: number): AgingBucket {
  const balance = round2(totalAmount - paidAmount)
  const empty: AgingBucket = { current: 0, days31to60: 0, days61to90: 0, daysOver90: 0, total: balance }
  if (balance <= 0) return empty

  const refDate = dueDate || new Date() // If no due date, age from now
  const now = new Date()
  const diffMs = now.getTime() - refDate.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 0) return { ...empty, current: balance }
  if (days <= 30) return { ...empty, current: balance }
  if (days <= 60) return { ...empty, days31to60: balance }
  if (days <= 90) return { ...empty, days61to90: balance }
  return { ...empty, daysOver90: balance }
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
    const cacheKey = 'reports:ar-aging'
    const data = await getOrSet(cacheKey, async (): Promise<ARAgingReport> => {
      // ── 1. Open folios with balance > 0 ──
      const openFolios = await db.folio.findMany({
        where: { status: 'open' },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true } },
          reservation: {
            select: {
              id: true,
              checkOut: true,
              status: true,
              room: { select: { number: true } },
            },
          },
        },
      })

      const openFolioIds = openFolios.map(f => f.id)
      let totalFolioBalance = 0
      const arItems: ARAgingItem[] = []

      if (openFolioIds.length > 0) {
        const [folioTxns, folioPays] = await Promise.all([
          db.folioTransaction.groupBy({
            by: ['folioId'],
            where: { folioId: { in: openFolioIds } },
            _sum: { totalAmount: true },
          }),
          db.folioPayment.groupBy({
            by: ['folioId'],
            where: { folioId: { in: openFolioIds } },
            _sum: { amount: true },
          }),
        ])

        const txnMap = new Map(folioTxns.map(t => [t.folioId, t._sum.totalAmount ?? 0]))
        const payMap = new Map(folioPays.map(p => [p.folioId, p._sum.amount ?? 0]))

        for (const f of openFolios) {
          const charges = txnMap.get(f.id) ?? 0
          const paid = payMap.get(f.id) ?? 0
          const balance = round2(charges - paid)
          if (balance <= 0) continue

          // Use checkout date for aging; if not checked out, use today (treat as current)
          const isCheckedOut = f.reservation?.status === 'checked_out'
          const checkoutDate = isCheckedOut ? f.reservation.checkOut : null

          const aging = ageFolio(checkoutDate, balance)
          totalFolioBalance = round2(totalFolioBalance + balance)

          arItems.push({
            folioId: f.id,
            type: 'folio',
            reference: f.reservationId,
            guestName: `${f.guest.firstName} ${f.guest.lastName}`,
            roomNumber: f.reservation?.room?.number || undefined,
            checkoutDate: checkoutDate?.toISOString() || undefined,
            aging,
          })
        }
      }

      // ── 2. Unpaid/overdue invoices ──
      const unpaidInvoices = await db.invoice.findMany({
        where: {
          status: { in: ['Sent', 'Partially Paid', 'Overdue'] },
          totalAmount: { gt: 0 },
        },
      })

      let totalInvoiceBalance = 0
      const invoiceItems: ARAgingItem[] = []

      for (const inv of unpaidInvoices) {
        const balance = round2(inv.totalAmount - inv.paidAmount)
        if (balance <= 0) continue

        const aging = ageInvoice(inv.dueDate, inv.totalAmount, inv.paidAmount)
        totalInvoiceBalance = round2(totalInvoiceBalance + balance)

        invoiceItems.push({
          folioId: inv.id,
          type: 'invoice',
          reference: inv.invoiceNumber,
          guestName: inv.customerName || 'Unknown',
          invoiceDate: inv.date.toISOString(),
          dueDate: inv.dueDate?.toISOString() || undefined,
          aging,
        })
      }

      // ── 3. Group folio AR items by guest ──
      const guestMap = new Map<string, GuestARGroup>()
      for (const item of arItems) {
        const f = openFolios.find(of => of.id === item.folioId)
        if (!f) continue
        const guestId = f.guestId
        const guestName = item.guestName

        const existing = guestMap.get(guestId)
        if (existing) {
          existing.items.push(item)
          existing.totalBalance = round2(existing.totalBalance + item.aging.total)
        } else {
          guestMap.set(guestId, {
            guestId,
            guestName,
            items: [item],
            totalBalance: item.aging.total,
            aging: { current: 0, days31to60: 0, days61to90: 0, daysOver90: 0, total: 0 },
          })
        }
      }

      // Compute group aging
      for (const group of guestMap.values()) {
        group.aging = sumBuckets(group.items.map(i => i.aging))
      }

      const guestGroups = [...guestMap.values()]

      // ── 4. Summary ──
      const allItems = [...arItems, ...invoiceItems]
      const agingSummary = sumBuckets(allItems.map(i => i.aging))
      const totalOutstanding = round2(totalFolioBalance + totalInvoiceBalance)

      return {
        reportType: 'ar-aging',
        generatedAt: new Date().toISOString(),
        totalOutstanding,
        totalFolioBalance,
        totalInvoiceBalance,
        agingSummary,
        guestGroups,
        unpaidInvoices: invoiceItems,
      }
    }, 120_000)

    return NextResponse.json(data)
  } catch (error) {
    console.error('AR Aging Report API error:', error)
    return NextResponse.json({ error: 'Failed to generate AR aging report' }, { status: 500 })
  }
}
