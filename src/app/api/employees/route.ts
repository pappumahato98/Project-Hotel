import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const where: Prisma.EmployeeWhereInput = {}

    if (department) {
      where.department = department
    }

    if (status) {
      where.status = status
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    })

    const total = await db.employee.count({ where })

    // Department breakdown
    const deptBreakdown = await db.employee.groupBy({
      by: ['department'],
      _count: { department: true },
    })

    const deptMap: Record<string, number> = {}
    for (const item of deptBreakdown) {
      deptMap[item.department] = item._count.department
    }

    return NextResponse.json({ employees, total, departmentBreakdown: deptMap })
  } catch (error) {
    console.error('Employees API error:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}
