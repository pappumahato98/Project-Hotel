import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

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
    const allAttendance = await db.attendance.findMany({ where })

    const departments = [...new Set(allAttendance.map((a) => a.department))]
    const present = allAttendance.filter((a) => a.status === 'present').length
    const absent = allAttendance.filter((a) => a.status === 'absent').length
    const onLeave = allAttendance.filter((a) => a.status === 'on_leave').length
    const late = allAttendance.filter((a) => a.late).length

    const departmentSummary = departments.map((dept) => {
      const deptEmployees = allAttendance.filter((a) => a.department === dept)
      return {
        department: dept,
        total: deptEmployees.length,
        present: deptEmployees.filter((e) => e.status === 'present').length,
        absent: deptEmployees.filter((e) => e.status === 'absent').length,
        onLeave: deptEmployees.filter((e) => e.status === 'on_leave').length,
        late: deptEmployees.filter((e) => e.late).length,
      }
    })

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      attendance,
      summary: { present, absent, onLeave, late, total: allAttendance.length },
      departmentSummary,
    })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
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
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
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
    return NextResponse.json(record)
  } catch (error) {
    console.error('Attendance PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
  }
}
