import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, code: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Employee GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.firstName) data.firstName = body.firstName
    if (body.lastName) data.lastName = body.lastName
    if (body.email !== undefined) data.email = body.email
    if (body.phone !== undefined) data.phone = body.phone
    if (body.department) data.department = body.department
    if (body.position) data.position = body.position
    if (body.role) data.role = body.role
    if (body.hireDate) data.hireDate = new Date(body.hireDate)
    if (body.salary !== undefined) data.salary = body.salary
    if (body.status) data.status = body.status
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl

    const employee = await db.employee.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true, code: true } },
      },
    })

    broadcastEvent('employee:updated', employee)
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Employee PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.employee.delete({ where: { id } })
    broadcastEvent('employee:deleted', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Employee DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
