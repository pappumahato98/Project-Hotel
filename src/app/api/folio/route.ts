import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation, getSettingsMap } from '@/lib/cache'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')
    const guestId = searchParams.get('guestId')
    const search = searchParams.get('search')

    // Build cache key from filter params
    const cacheKey = `folio:list:${reservationId || ''}:${guestId || ''}:${search || ''}`

    const result = await getOrSet(cacheKey, async () => {
      const where: Prisma.FolioWhereInput = {}

      if (reservationId) {
        where.reservationId = reservationId
      }

      if (guestId) {
        where.guestId = guestId
      }

      if (search) {
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
          // Only fetch fields needed for list display
          transactions: {
            select: { id: true, transactionType: true, description: true, amount: true, totalAmount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          payments: {
            select: { id: true, amount: true, paymentMethod: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      // Read relevant settings
      const s = await getSettingsMap()
      const taxRate = (s.taxRate as number) ?? NEPAL_VAT_RATE
      const serviceCharge = (s.serviceCharge as number) ?? 0

      // Only compute stats for full list view
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

        // Use aggregate instead of findMany for much faster stats
        const [openCount, outstandingSum, todayChargesSum, todayPaymentsSum] = await Promise.all([
          db.folio.count({ where: { status: 'open' } }),
          db.folio.aggregate({ where: { status: 'open' }, _sum: { balance: true } }),
          db.folioTransaction.aggregate({ where: { createdAt: { gte: todayStart, lte: todayEnd } }, _sum: { totalAmount: true } }),
          db.folioPayment.aggregate({ where: { createdAt: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
        ])

        stats = {
          openFolios: openCount,
          totalOutstanding: outstandingSum._sum.balance ?? 0,
          todayCharges: todayChargesSum._sum.totalAmount ?? 0,
          todayPayments: todayPaymentsSum._sum.amount ?? 0,
        }
      }

      return { folios, stats, settings: { taxRate, serviceCharge } }
    }, 30_000) // 30s cache TTL

    return NextResponse.json(result)
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

    afterMutation('folio')

    return NextResponse.json({ folio }, { status: 201 })
  } catch (error) {
    console.error('Create folio error:', error)
    return NextResponse.json({ error: 'Failed to create folio' }, { status: 500 })
  }
}
