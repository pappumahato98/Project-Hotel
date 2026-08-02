import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    const data = await getOrSet(`leave:requests:${status || ''}:${department || ''}`, async () => {
      const where: Prisma.LeaveRequestWhereInput = {}

      if (status) where.status = status
      if (department) where.department = department

      const requests = await db.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      // Compute summary stats
      const allRequests = await db.leaveRequest.findMany({ take: 1000 })
      const totalPending = allRequests.filter((r) => r.status === 'Pending').length
      const totalApproved = allRequests.filter((r) => r.status === 'Approved').length
      const totalRejected = allRequests.filter((r) => r.status === 'Rejected').length

      const byDepartment: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {}
      for (const r of allRequests) {
        if (!byDepartment[r.department]) {
          byDepartment[r.department] = { total: 0, pending: 0, approved: 0, rejected: 0 }
        }
        byDepartment[r.department].total++
        if (r.status === 'Pending') byDepartment[r.department].pending++
        if (r.status === 'Approved') byDepartment[r.department].approved++
        if (r.status === 'Rejected') byDepartment[r.department].rejected++
      }

      return {
        requests,
        stats: { totalPending, totalApproved, totalRejected, byDepartment },
      }
    }, 60000) // Cache for 60s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Leave API GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { employeeId, employeeName, department, leaveType, startDate, endDate, duration, reason } = body

    if (!employeeId || !employeeName || !department || !leaveType || !startDate || !endDate || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, employeeName, department, leaveType, startDate, endDate, duration' },
        { status: 400 },
      )
    }

    const record = await db.leaveRequest.create({
      data: {
        employeeId,
        employeeName,
        department,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: parseFloat(duration),
        reason: reason || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('leave:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Leave API POST error:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, approvedBy, rejectionReason } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })
    }

    if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be Approved, Rejected, or Cancelled' }, { status: 400 })
    }

    const record = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approvedBy || null,
        approvedAt: status === 'Approved' ? new Date() : undefined,
        rejectionReason: status === 'Rejected' ? (rejectionReason || null) : undefined,
      },
    })

    afterMutation('hr')
    broadcastEvent('leave:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Leave API PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
  }
}
