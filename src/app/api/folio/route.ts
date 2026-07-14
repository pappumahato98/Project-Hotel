import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Settings helper ──────────────────────────────────────
async function getSettingsMap() {
  const rows = await db.systemSetting.findMany()
  const map: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.type === 'number') map[r.key] = parseFloat(r.value)
    else if (r.type === 'boolean') map[r.key] = r.value === 'true'
    else if (r.type === 'json') { try { map[r.key] = JSON.parse(r.value) } catch { map[r.key] = r.value } }
    else map[r.key] = r.value
  }
  return map
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')
    const guestId = searchParams.get('guestId')
    const search = searchParams.get('search')

    const where: Prisma.FolioWhereInput = {}

    if (reservationId) {
      where.reservationId = reservationId
    }

    if (guestId) {
      where.guestId = guestId
    }

    if (search) {
      // SQLite does not support mode: 'insensitive'
      where.OR = [
        { guest: { firstName: { contains: search } } },
        { guest: { lastName: { contains: search } } },
        { reservation: { confirmationNo: { contains: search } } },
        { reservation: { room: { number: { contains: search } } } },
      ]
    }

    const folios = await db.folio.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true, confirmationNo: true, checkIn: true, checkOut: true,
            roomRate: true, status: true, creditLimit: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Read relevant settings from DB
    const s = await getSettingsMap()
    const taxRate = (s.taxRate as number) ?? 13
    const serviceCharge = (s.serviceCharge as number) ?? 0

    // ─── Compute stats ───────────────────────────────────────
    // Only compute when no search/filter params (full list view)
    const isFullList = !reservationId && !guestId && !search

    let stats: {
      openFolios: number
      totalOutstanding: number
      todayCharges: number
      todayPayments: number
    } | null = null

    if (isFullList) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Open folios count and outstanding
      const openFolios = await db.folio.findMany({
        where: { status: 'open' },
        select: { balance: true },
      })

      // Today's charges
      const todayTxns = await db.folioTransaction.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: { totalAmount: true },
      })

      // Today's payments
      const todayPayments = await db.folioPayment.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: { amount: true },
      })

      stats = {
        openFolios: openFolios.length,
        totalOutstanding: openFolios.reduce((sum, f) => sum + f.balance, 0),
        todayCharges: todayTxns.reduce((sum, t) => sum + t.totalAmount, 0),
        todayPayments: todayPayments.reduce((sum, p) => sum + p.amount, 0),
      }
    }

    return NextResponse.json({
      folios,
      stats,
      settings: { taxRate, serviceCharge },
    })
  } catch (error) {
    console.error('Folio API error:', error)
    return NextResponse.json({ error: 'Failed to fetch folio data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { reservationId, guestId, folioType } = body

    // Check if folio already exists for this reservation
    const existingFolio = await db.folio.findFirst({
      where: { reservationId, folioType: folioType || 'guest' },
    })

    if (existingFolio) {
      return NextResponse.json({ folio: existingFolio, message: 'Folio already exists' }, { status: 200 })
    }

    const folio = await db.folio.create({
      data: {
        reservationId,
        guestId,
        folioType: folioType || 'guest',
      },
      include: {
        reservation: true,
        guest: true,
      },
    })

    return NextResponse.json({ folio }, { status: 201 })
  } catch (error) {
    console.error('Create folio error:', error)
    return NextResponse.json({ error: 'Failed to create folio' }, { status: 500 })
  }
}
