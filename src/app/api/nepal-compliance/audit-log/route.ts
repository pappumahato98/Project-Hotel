import { NextRequest, NextResponse } from 'next/server'
import { getAuditLog, type AuditDocType } from '@/lib/nepal-compliance/audit-trail'

// ─── GET: Paginated audit log entries ─────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const entityType = searchParams.get('entityType') ?? undefined
    const entityId = searchParams.get('entityId') ?? undefined
    const userId = searchParams.get('userId') ?? undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0

    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined

    if (fromDate && isNaN(fromDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for "from". Use YYYY-MM-DD.' },
        { status: 400 },
      )
    }

    if (toDate && isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for "to". Use YYYY-MM-DD.' },
        { status: 400 },
      )
    }

    const entries = await getAuditLog({
      userId,
      docType: entityType as AuditDocType,
      docId: entityId,
      fromDate,
      toDate,
      limit,
      offset,
    })

    return NextResponse.json({
      entries,
      pagination: { limit, offset },
    })
  } catch (error) {
    console.error('[audit-log] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit log.' },
      { status: 500 },
    )
  }
}
