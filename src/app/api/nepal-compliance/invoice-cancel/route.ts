import { NextRequest, NextResponse } from 'next/server'
import { cancelInvoice } from '@/lib/nepal-compliance/invoice-rules'
import { requireAuth, getClientIp } from '@/lib/security/auth-helpers'

// ─── POST: Cancel an invoice (IRD-compliant, no deletion) ──────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['admin', 'manager', 'gm'])
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { invoiceId, reason } = body as {
      invoiceId?: string
      reason?: string
    }

    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json(
        { error: 'invoiceId is required.' },
        { status: 400 },
      )
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'reason is required and must be a non-empty string.' },
        { status: 400 },
      )
    }

    const ipAddress = getClientIp(request)
    const userName = `${auth.user.firstName} ${auth.user.lastName}`

    const result = await cancelInvoice(
      invoiceId,
      reason,
      auth.user.userId,
      userName,
      ipAddress,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('[invoice-cancel] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invoice.' },
      { status: 500 },
    )
  }
}
