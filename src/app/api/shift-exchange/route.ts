import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    const data = await getOrSet(
      `shift-exchange:requests:${status || ''}:${department || ''}`,
      async () => {
        const where: Prisma.ShiftExchangeWhereInput = {}

        if (status) where.status = status
        if (department) where.requesterDept = department

        const exchanges = await db.shiftExchange.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        // Compute summary stats
        const allExchanges = await db.shiftExchange.findMany({ take: 1000 })
        const totalPending = allExchanges.filter((e) => e.status === 'Pending').length
        const totalApproved = allExchanges.filter((e) => e.status === 'Approved').length
        const totalRejected = allExchanges.filter((e) => e.status === 'Rejected').length

        const byDepartment: Record<string, { pending: number; approved: number; rejected: number }> = {}
        for (const e of allExchanges) {
          if (!byDepartment[e.requesterDept]) {
            byDepartment[e.requesterDept] = { pending: 0, approved: 0, rejected: 0 }
          }
          if (e.status === 'Pending') byDepartment[e.requesterDept].pending++
          if (e.status === 'Approved') byDepartment[e.requesterDept].approved++
          if (e.status === 'Rejected') byDepartment[e.requesterDept].rejected++
        }

        return {
          exchanges,
          stats: { totalPending, totalApproved, totalRejected, byDepartment },
        }
      },
      60000,
    ) // Cache for 60s

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Shift Exchange API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch shift exchange requests', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { requesterId, requesterName, requesterDept, fromShift, toShift, exchangeDate, reason, targetId, targetName } = body

    if (!requesterId || !requesterName || !requesterDept || !fromShift || !toShift || !exchangeDate || !reason) {
      return cachedError(
        'Missing required fields: requesterId, requesterName, requesterDept, fromShift, toShift, exchangeDate, reason',
        400,
      )
    }

    const record = await db.shiftExchange.create({
      data: {
        requesterId,
        requesterName,
        requesterDept,
        fromShift,
        toShift,
        exchangeDate: new Date(exchangeDate),
        reason,
        targetId: targetId || null,
        targetName: targetName || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('shift-exchange:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Shift Exchange API POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create shift exchange request', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, approvedBy, rejectionReason } = body

    if (!id || !status) {
      return cachedError('ID and status are required', 400)
    }

    if (!['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(status)) {
      return cachedError('Invalid status. Must be Pending, Approved, Rejected, or Cancelled', 400)
    }

    const updateData: Prisma.ShiftExchangeUpdateInput = {
      status,
    }

    if (status === 'Approved') {
      updateData.approvedBy = approvedBy || null
      ;(updateData as Record<string, unknown>).approvedAt = new Date()
    }

    if (status === 'Rejected') {
      updateData.rejectionReason = rejectionReason || null
    }

    const record = await db.shiftExchange.update({
      where: { id },
      data: updateData,
    })

    afterMutation('hr')
    broadcastEvent('shift-exchange:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Shift Exchange API PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update shift exchange request', 500, msg.substring(0, 300))
  }
}
