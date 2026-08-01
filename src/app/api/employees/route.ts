import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation, getOrSet } from '@/lib/cache'
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

    const cacheKey = `employees:list:${department || ''}:${status || ''}`
    const data = await getOrSet(cacheKey, async () => {
      const where: Prisma.EmployeeWhereInput = {}

      if (department) where.department = department
      if (status) where.status = status

      const [employees, deptBreakdown] = await Promise.all([
        db.employee.findMany({
          where,
          include: {
            property: { select: { id: true, name: true, code: true } },
          },
          orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
        }),
        db.employee.groupBy({
          by: ['department'],
          _count: { department: true },
        }),
      ])

      const total = employees.length

      const deptMap: Record<string, number> = {}
      for (const item of deptBreakdown) {
        deptMap[item.department] = item._count.department
      }

      return { employees, total, departmentBreakdown: deptMap }
    }, 120000)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Employees API error:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const property = await db.property.findFirst()
    if (!property) {
      return NextResponse.json({ error: 'No property found' }, { status: 400 })
    }

    const employee = await withRetry(() =>
      db.employee.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email || null,
          phone: body.phone || null,
          department: body.department || '',
          position: body.position || '',
          role: body.role || 'staff',
          propertyId: body.propertyId || property.id,
          hireDate: body.hireDate ? new Date(body.hireDate) : null,
          salary: body.salary || null,
          status: body.status || 'active',
        },
      }),
    )

    afterMutation('employees')
    broadcastEvent('employee:created', employee)
    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    console.error('Employees POST error:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
