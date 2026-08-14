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
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Prisma.ChannelWhereInput = {}

    if (type) where.type = type
    if (status) where.status = status

    const channels = await db.channel.findMany({ where, orderBy: { name: 'asc' } })

    const connected = channels.filter((c) => c.status === 'connected').length
    const disconnected = channels.filter((c) => c.status === 'disconnected').length
    const totalBookings = channels.reduce((s, c) => s + c.totalBookings, 0)
    const totalCommission = channels.reduce((s, c) => s + c.monthlyCommission, 0)

    return cachedJson({
      channels,
      connected,
      disconnected,
      totalBookings,
      totalCommission,
    }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Channels API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch channels', 500, msg.substring(0, 300))
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
    return NextResponse.json(channel, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Channels POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create channel', 500, msg.substring(0, 300))
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
    return NextResponse.json(channel, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Channels PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update channel', 500, msg.substring(0, 300))
  }
}
