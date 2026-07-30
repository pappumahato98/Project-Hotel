import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Prisma.ChannelWhereInput = {}

    if (type) where.type = type
    if (status) where.status = status

    const channels = await db.channel.findMany({ where, orderBy: { name: 'asc' } })
    const allChannels = await db.channel.findMany({ where: {} })

    const connected = allChannels.filter((c) => c.status === 'connected').length
    const disconnected = allChannels.filter((c) => c.status === 'disconnected').length
    const totalBookings = allChannels.reduce((s, c) => s + c.totalBookings, 0)
    const totalCommission = allChannels.reduce((s, c) => s + c.monthlyCommission, 0)

    return NextResponse.json({
      channels,
      connected,
      disconnected,
      totalBookings,
      totalCommission,
    })
  } catch (error) {
    console.error('Channels API error:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const channel = await db.channel.create({
      data: {
        name: body.name,
        type: body.type || '',
        logo: body.logo || null,
        status: body.status || 'connected',
        lastSync: body.lastSync ? new Date(body.lastSync) : null,
        totalBookings: body.totalBookings || 0,
        monthlyCommission: body.monthlyCommission || 0,
        mappingStatus: body.mappingStatus || 'complete',
        commissionRate: body.commissionRate || 0,
        notes: body.notes || null,
      },
    })

    broadcastEvent('channel:created', channel)
    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error('Channels POST error:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
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

    const channel = await db.channel.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        type: data.type ?? undefined,
        logo: data.logo ?? undefined,
        status: data.status ?? undefined,
        lastSync: data.lastSync ? new Date(data.lastSync) : undefined,
        totalBookings: data.totalBookings ?? undefined,
        monthlyCommission: data.monthlyCommission ?? undefined,
        mappingStatus: data.mappingStatus ?? undefined,
        commissionRate: data.commissionRate ?? undefined,
        notes: data.notes ?? undefined,
      },
    })

    broadcastEvent('channel:updated', channel)
    return NextResponse.json(channel)
  } catch (error) {
    console.error('Channels PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}
