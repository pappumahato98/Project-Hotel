import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status')
    const dateStr = searchParams.get('date')

    const where: Prisma.AttendanceWhereInput = {}

    if (department) where.department = department
    if (status) where.status = status
    if (dateStr) {
      const d = new Date(dateStr)
      where.date = { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) }
    }

    const attendance = await db.attendance.findMany({ where, orderBy: { employeeName: 'asc' } })
    const departments = [...new Set(attendance.map((a) => a.department))]
    const present = attendance.filter((a) => a.status === 'present').length
    const absent = attendance.filter((a) => a.status === 'absent').length
    const onLeave = attendance.filter((a) => a.status === 'on_leave').length
    const late = attendance.filter((a) => a.late).length

    const departmentSummary = departments.map((dept) => {
      const deptEmployees = attendance.filter((a) => a.department === dept)
      return {
        department: dept,
        total: deptEmployees.length,
        present: deptEmployees.filter((e) => e.status === 'present').length,
        absent: deptEmployees.filter((e) => e.status === 'absent').length,
        onLeave: deptEmployees.filter((e) => e.status === 'on_leave').length,
        late: deptEmployees.filter((e) => e.late).length,
      }
    })

    return cachedJson({
      date: new Date().toISOString().split('T')[0],
      attendance,
      summary: { present, absent, onLeave, late, total: attendance.length },
      departmentSummary,
    }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Attendance API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch attendance', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { employeeId, employeeName, department, position, checkIn, checkOut, status, late, notes, date } = body

    const record = await db.attendance.create({
      data: {
        employeeId: employeeId || '',
        employeeName,
        department: department || '',
        position: position || '',
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status: status || 'present',
        late: late || false,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    broadcastEvent('attendance:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Attendance POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create attendance record', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    const record = await db.attendance.update({
      where: { id },
      data: {
        checkIn: data.checkIn ?? undefined,
        checkOut: data.checkOut ?? undefined,
        status: data.status ?? undefined,
        late: data.late ?? undefined,
        notes: data.notes ?? undefined,
      },
    })

    broadcastEvent('attendance:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Attendance PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update attendance record', 500, msg.substring(0, 300))
  }
}
