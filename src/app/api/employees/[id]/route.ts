import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

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
      return cachedError('Employee not found', 404)
    }

    return cachedJson({ employee }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Employee GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch employee', 500, msg.substring(0, 300))
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

    const employee = await withRetry(() =>
      db.employee.update({
        where: { id },
        data,
        include: {
          property: { select: { id: true, name: true, code: true } },
        },
      }),
    )

    afterMutation('employees')
    broadcastEvent('employee:updated', employee)
    return NextResponse.json({ employee }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Employee PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update employee', 500, msg.substring(0, 300))
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
    await withRetry(() => db.employee.delete({ where: { id } }))
    afterMutation('employees')
    broadcastEvent('employee:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Employee DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete employee', 500, msg.substring(0, 300))
  }
}
