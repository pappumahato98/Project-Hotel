import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const maxDuration = 60

// Temporary debug endpoint — remove after fixing dashboard
export async function GET() {
  const results: { query: string; ok: boolean; time: number; error?: string; data?: unknown }[] = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const queries = [
    ['systemSetting.findMany', () => db.systemSetting.findMany()],
    ['room.count', () => db.room.count()],
    ['room.count(occupied)', () => db.room.count({ where: { status: 'occupied' } })],
    ['room.count(vacant_clean)', () => db.room.count({ where: { status: 'vacant_clean' } })],
    ['nightAudit.findFirst(yesterday)', () => db.nightAudit.findFirst({ where: { status: 'completed', businessDate: yesterday }, orderBy: { businessDate: 'desc' } })],
    ['nightAudit.findFirst(last)', () => db.nightAudit.findFirst({ where: { status: 'completed' }, orderBy: { businessDate: 'desc' } })],
    ['reservation.count(arrivals)', () => db.reservation.count({ where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed' } })],
    ['reservation.count(departures)', () => db.reservation.count({ where: { checkOut: { gte: today, lt: tomorrow }, status: 'checked_in' } })],
    ['room.groupBy(status)', () => db.room.groupBy({ by: ['status'], _count: { status: true } })],
    ['reservation(vip arrivals)', () => db.reservation.findMany({ where: { checkIn: { gte: today, lt: tomorrow }, status: { in: ['confirmed', 'checked_in'] }, guest: { vipLevel: { in: ['gold', 'platinum'] } } }, include: { guest: true, room: true }, take: 5 })],
    ['reservation(overdue)', () => db.reservation.count({ where: { checkOut: { lt: today }, status: 'checked_in' } })],
    ['workOrder(emergency)', () => db.workOrder.findMany({ where: { priority: 'emergency', status: { in: ['open', 'in_progress'] } }, take: 5 })],
    ['room(ooo)', () => db.room.findMany({ where: { status: 'out_of_order' }, select: { id: true, number: true, floor: true }, take: 10 })],
    ['reservation(unassigned)', () => db.reservation.count({ where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed', roomId: null } })],
    ['folio(credit breach)', () => db.folio.findMany({ where: { status: 'open', balance: { gt: 15000 }, reservation: { status: 'checked_in' } }, include: { reservation: { include: { guest: true, room: true } } }, take: 5 })],
    ['hkTask.count', () => db.hkTask.count({ where: { status: { in: ['pending', 'assigned', 'in_progress'] } } })],
    ['hkWorkFlow.count', () => db.hkWorkFlow.count({ where: { status: { in: ['open', 'in_progress'] } } })],
    ['hkWorkFlow(high)', () => db.hkWorkFlow.findMany({ where: { status: { in: ['open', 'in_progress'] }, priority: { in: ['high', 'medium'] } }, include: { room: { select: { id: true, number: true, floor: true, wing: true } } }, orderBy: { requestedDate: 'asc' }, take: 5 })],
    ['posOrder.count', () => db.posOrder.count({ where: { status: { in: ['open', 'in_progress', 'ready'] } } })],
    ['nightAudit(7d)', () => db.nightAudit.findMany({ where: { status: 'completed', businessDate: { gte: sevenDaysAgo, lt: today } }, orderBy: { businessDate: 'asc' }, select: { businessDate: true, roomRevenue: true, fAndBRevenue: true, totalRevenue: true } })],
    ['reservation(recent)', () => db.reservation.findMany({ orderBy: { createdAt: 'desc' }, take: 3, include: { guest: true, room: true } })],
    ['folioTransaction(recent)', () => db.folioTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 2, include: { folio: { include: { reservation: { include: { guest: true } } } } } })],
    ['posOrder(recent)', () => db.posOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 2, include: { outlet: true } })],
    ['workOrder(recent)', () => db.workOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 2 })],
  ]

  for (const [name, fn] of queries) {
    const start = Date.now()
    try {
      const data = await fn()
      results.push({ query: name, ok: true, time: Date.now() - start, data: Array.isArray(data) ? `${data.length} items` : 'ok' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ query: name, ok: false, time: Date.now() - start, error: msg.substring(0, 300) })
    }
  }

  return NextResponse.json({ results, total: results.reduce((a, r) => a + r.time, 0) })
}
