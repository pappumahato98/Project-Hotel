import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const tickets = await db.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Support Tickets GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const ticketNo = 'TKT-' + Math.random().toString().slice(2, 8)

    const ticket = await db.supportTicket.create({
      data: {
        ticketNo,
        subject: body.subject,
        description: body.description,
        category: body.category || 'general',
        priority: body.priority || 'normal',
        status: 'open',
        createdBy: body.createdBy,
        createdByName: body.createdByName,
        department: body.department || '',
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Support Tickets POST error:', error)
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
  }
}
