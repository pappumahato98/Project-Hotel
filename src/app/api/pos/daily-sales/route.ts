import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError } from '@/lib/api-response'

// ─── Icon mapping from outlet type ──────────────────────────────────
const OUTLET_ICON_MAP: Record<string, string> = {
  restaurant: 'utensils',
  bar: 'wine',
  room_service: 'bell',
  spa: 'flower',
  business_center: 'monitor',
  gift_shop: 'store',
  laundry: 'store',
}

function getOutletIcon(type: string): string {
  return OUTLET_ICON_MAP[type] || 'store'
}

// ─── Hour format helper ─────────────────────────────────────────────
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

// ─── Response type matching DailyReportData interface ───────────────
interface DailySalesResponse {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  taxCollected: number
  byOutlet: { name: string; revenue: number; orders: number; icon: string }[]
  byCategory: { name: string; amount: number; percentage: number }[]
  byPayment: { method: string; amount: number; percentage: number; icon: string }[]
  topItems: { rank: number; name: string; qtySold: number; revenue: number }[]
  hourlySales: { hour: string; revenue: number; orders: number }[]
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const cacheKey = `pos:daily-sales:${dateParam || 'today'}`
    const response = await getOrSet(cacheKey, async () => {
      // Determine the target date range
      const targetDate = dateParam ? new Date(dateParam) : new Date()
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      // Fetch all closed or voided orders for the date range with relations
      const orders = await db.posOrder.findMany({
        where: {
          createdAt: { gte: targetDate, lt: nextDay },
          status: { in: ['closed', 'voided'] },
        },
        include: {
          outlet: { select: { id: true, name: true, code: true, type: true, active: true } },
          items: {
            where: { status: { not: 'voided' } },
            include: {
              menuItem: { select: { id: true, name: true, category: true, price: true, taxRate: true } },
            },
          },
        },
      })

      // ─── Compute summary metrics ──────────────────────────────────
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      const totalOrders = orders.length
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const taxCollected = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0)

      // ─── Group by outlet ──────────────────────────────────────────
      const outletMap = new Map<string, { name: string; revenue: number; orders: number; icon: string }>()
      for (const order of orders) {
        const outlet = order.outlet
        const key = outlet.id
        if (!outletMap.has(key)) {
          outletMap.set(key, {
            name: outlet.name,
            revenue: 0,
            orders: 0,
            icon: getOutletIcon(outlet.type),
          })
        }
        const entry = outletMap.get(key)!
        entry.revenue += order.totalAmount || 0
        entry.orders += 1
      }
      const byOutlet = Array.from(outletMap.values()).sort((a, b) => b.revenue - a.revenue)

      // ─── Group by MenuItem category ───────────────────────────────
      const categoryMap = new Map<string, number>()
      for (const order of orders) {
        for (const item of order.items) {
          const cat = item.menuItem?.category || 'Other'
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.totalPrice || 0))
        }
      }
      const categoryTotal = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0)
      const byCategory = Array.from(categoryMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: categoryTotal > 0 ? Math.round((amount / categoryTotal) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)

      // ─── Group by payment ─────────────────
      // Since PosOrder doesn't have a paymentMethod field, we can only distinguish
      // paid vs unpaid (room charge). Report actual totals without fabrication.
      const paymentMap = new Map<string, { method: string; amount: number; icon: string }>()
      paymentMap.set('Room Charge', { method: 'Room Charge', amount: 0, icon: 'bed' })
      paymentMap.set('Paid', { method: 'Paid', amount: 0, icon: 'creditcard' })

      for (const order of orders) {
        if (order.paymentStatus === 'unpaid') {
          paymentMap.get('Room Charge')!.amount += order.totalAmount || 0
        } else {
          paymentMap.get('Paid')!.amount += order.totalAmount || 0
        }
      }

      const paymentTotal = Array.from(paymentMap.values()).reduce((s, p) => s + p.amount, 0)
      const byPayment = Array.from(paymentMap.values())
        .map((p) => ({
          method: p.method,
          amount: Math.round(p.amount),
          percentage: paymentTotal > 0 ? Math.round((p.amount / paymentTotal) * 1000) / 10 : 0,
          icon: p.icon,
        }))
        .filter((p) => p.amount > 0)
        .sort((a, b) => b.amount - a.amount)

      // ─── Top 5 items by quantity sold ─────────────────────────────
      const itemMap = new Map<string, { name: string; qtySold: number; revenue: number }>()
      for (const order of orders) {
        for (const item of order.items) {
          const itemName = item.menuItem?.name || `Item ${item.menuItemId}`
          if (!itemMap.has(itemName)) {
            itemMap.set(itemName, { name: itemName, qtySold: 0, revenue: 0 })
          }
          const entry = itemMap.get(itemName)!
          entry.qtySold += item.quantity || 1
          entry.revenue += item.totalPrice || 0
        }
      }
      const topItems = Array.from(itemMap.values())
        .sort((a, b) => b.qtySold - a.qtySold)
        .slice(0, 5)
        .map((item, idx) => ({ rank: idx + 1, ...item }))

      // ─── Hourly sales ──────────────────────────────────────────────
      const hourlyMap = new Map<number, { revenue: number; orders: number }>()
      // Initialize all 24 hours
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { revenue: 0, orders: 0 })
      }
      for (const order of orders) {
        const hour = new Date(order.createdAt).getHours()
        const entry = hourlyMap.get(hour)!
        entry.revenue += order.totalAmount || 0
        entry.orders += 1
      }
      const hourlySales = Array.from(hourlyMap.entries())
        .filter(([_h, data]) => data.orders > 0)
        .map(([h, data]) => ({ hour: formatHour(h), revenue: Math.round(data.revenue), orders: data.orders }))
        .sort((a, b) => {
          // Sort by hour of day
          const aH = parseHourStr(a.hour)
          const bH = parseHourStr(b.hour)
          return aH - bH
        })

      // ─── Build response ──────────────────────────────────────────
      return {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue),
        taxCollected: Math.round(taxCollected),
        byOutlet,
        byCategory,
        byPayment,
        topItems,
        hourlySales,
      } satisfies DailySalesResponse
    }, 120000)

    return cachedJson(response, request, { tier: 'short' })
  } catch (error) {
    console.error('POS Daily Sales API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch daily sales report', 500, msg.substring(0, 300))
  }
}

// ─── Helper: parse hour string back to number for sorting ────────────
function parseHourStr(hourStr: string): number {
  const match = hourStr.match(/^(\d{1,2})\s*(AM|PM)$/i)
  if (!match) return 0
  let h = parseInt(match[1], 10)
  const period = match[2].toUpperCase()
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return h
}
