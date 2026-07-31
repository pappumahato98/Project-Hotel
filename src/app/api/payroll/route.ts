import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const month = searchParams.get('month')
    const status = searchParams.get('status')

    const where: Prisma.PayrollWhereInput = {}

    if (department) where.department = department
    if (month) where.month = month
    if (status) where.status = status

    const records = await db.payroll.findMany({ where, orderBy: { employeeName: 'asc' }, take: 100 })

    const totalBaseSalary = records.reduce((s, e) => s + e.baseSalary, 0)
    const totalVariablePay = records.reduce((s, e) => s + e.variablePay, 0)
    const totalOvertime = records.reduce((s, e) => s + e.overtime, 0)
    const totalDeductions = records.reduce((s, e) => s + e.deductions, 0)
    const totalNetPay = records.reduce((s, e) => s + e.netPay, 0)

    const departments = [...new Set(records.map((e) => e.department))]
    const departmentTotals = departments.map((dept) => {
      const deptEmployees = records.filter((e) => e.department === dept)
      return {
        department: dept,
        employeeCount: deptEmployees.length,
        totalBaseSalary: deptEmployees.reduce((s, e) => s + e.baseSalary, 0),
        totalVariablePay: deptEmployees.reduce((s, e) => s + e.variablePay, 0),
        totalDeductions: deptEmployees.reduce((s, e) => s + e.deductions, 0),
        totalNetPay: deptEmployees.reduce((s, e) => s + e.netPay, 0),
      }
    })

    const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

    return NextResponse.json({
      month: monthLabel,
      employees: records,
      departmentTotals,
      summary: { totalBaseSalary, totalVariablePay, totalOvertime, totalDeductions, totalNetPay, employeeCount: records.length },
    })
  } catch (error) {
    console.error('Payroll API error:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const record = await db.payroll.create({
      data: {
        employeeId: body.employeeId || '',
        employeeName: body.employeeName || '',
        department: body.department || '',
        position: body.position || '',
        month: body.month || new Date().toISOString().slice(0, 7),
        baseSalary: body.baseSalary || 0,
        variablePay: body.variablePay || 0,
        overtime: body.overtime || 0,
        deductions: body.deductions || 0,
        netPay: body.netPay || 0,
        status: body.status || 'pending',
      },
    })

    broadcastEvent('payroll:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Payroll POST error:', error)
    return NextResponse.json({ error: 'Failed to create payroll record' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const record = await db.payroll.update({
      where: { id },
      data: {
        baseSalary: data.baseSalary ?? undefined,
        variablePay: data.variablePay ?? undefined,
        overtime: data.overtime ?? undefined,
        deductions: data.deductions ?? undefined,
        netPay: data.netPay ?? undefined,
        status: data.status ?? undefined,
        processedBy: data.processedBy ?? undefined,
        processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      },
    })

    broadcastEvent('payroll:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Payroll PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update payroll record' }, { status: 500 })
  }
}
