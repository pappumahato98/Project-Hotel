import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { afterMutation, getOrSet } from '@/lib/cache'
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

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employees API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch employees', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const property = await db.property.findFirst()
    if (!property) {
      return cachedError('No property found', 400)
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
    return NextResponse.json({ employee }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employees POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create employee', 500, msg.substring(0, 300))
  }
}
