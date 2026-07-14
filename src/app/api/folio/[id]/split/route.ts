import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

const VALID_FOLIO_TYPES = ['guest', 'company', 'comp', 'master']

// POST /api/folio/[id]/split
// Moves selected transactions to a new folio of the specified type.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id: sourceFolioId } = await params
    const body = await request.json()
    const { transactionIds, folioType, description } = body as {
      transactionIds: string[]
      folioType: string
      description?: string
    }

    // ── Validation ──────────────────────────────────────────────
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction ID is required' },
        { status: 400 },
      )
    }

    if (!VALID_FOLIO_TYPES.includes(folioType)) {
      return NextResponse.json(
        { error: `Invalid folioType. Must be one of: ${VALID_FOLIO_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    // ── Fetch source folio ──────────────────────────────────────
    const sourceFolio = await db.folio.findUnique({
      where: { id: sourceFolioId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            checkIn: true,
            checkOut: true,
            roomRate: true,
            status: true,
            creditLimit: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, vipLevel: true } },
      },
    })

    if (!sourceFolio) {
      return NextResponse.json({ error: 'Source folio not found' }, { status: 404 })
    }

    // ── Verify all transaction IDs belong to the source folio ──
    const sourceTxnIds = new Set(sourceFolio.transactions.map((t) => t.id))
    for (const txnId of transactionIds) {
      if (!sourceTxnIds.has(txnId)) {
        return NextResponse.json(
          { error: `Transaction ${txnId} does not belong to this folio` },
          { status: 400 },
        )
      }
    }

    // ── Create the target folio ─────────────────────────────────
    const targetFolio = await db.folio.create({
      data: {
        reservationId: sourceFolio.reservationId,
        guestId: sourceFolio.guestId,
        folioType,
        status: 'open',
        balance: 0,
      },
    })

    // ── Move transactions ───────────────────────────────────────
    await db.folioTransaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { folioId: targetFolio.id },
    })

    // ── Recalculate source folio balance ────────────────────────
    const sourceCharges = await db.folioTransaction.findMany({
      where: { folioId: sourceFolioId },
      select: { totalAmount: true },
    })
    const sourceTotalCharges = sourceCharges.reduce((sum, c) => sum + c.totalAmount, 0)

    const sourcePayments = await db.folioPayment.findMany({
      where: { folioId: sourceFolioId },
      select: { amount: true },
    })
    const sourceTotalPayments = sourcePayments.reduce((sum, p) => sum + p.amount, 0)

    const sourceNewBalance = sourceTotalCharges - sourceTotalPayments

    await db.folio.update({
      where: { id: sourceFolioId },
      data: { balance: sourceNewBalance },
    })

    // ── Recalculate target folio balance ────────────────────────
    const targetCharges = await db.folioTransaction.findMany({
      where: { folioId: targetFolio.id },
      select: { totalAmount: true },
    })
    const targetTotalCharges = targetCharges.reduce((sum, c) => sum + c.totalAmount, 0)

    await db.folio.update({
      where: { id: targetFolio.id },
      data: { balance: targetTotalCharges },
    })

    // ── Fetch full updated data ─────────────────────────────────
    const [updatedSourceFolio, fullTargetFolio] = await Promise.all([
      db.folio.findUnique({
        where: { id: sourceFolioId },
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
      }),
      db.folio.findUnique({
        where: { id: targetFolio.id },
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
      }),
    ])

    return NextResponse.json({
      sourceFolio: updatedSourceFolio,
      targetFolio: fullTargetFolio,
    })
  } catch (error) {
    console.error('Folio split error:', error)
    return NextResponse.json({ error: 'Failed to split folio' }, { status: 500 })
  }
}