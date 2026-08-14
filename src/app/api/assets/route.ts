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
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    const where: Prisma.AssetWhereInput = {}

    if (category) where.category = category
    if (status) where.status = status

    const assets = await db.asset.findMany({ where, orderBy: { name: 'asc' } })

    const total = assets.length
    const operational = assets.filter((a) => a.status === 'operational').length
    const needsRepair = assets.filter((a) => a.status === 'needs_repair').length
    const totalPurchaseValue = assets.reduce((s, a) => s + a.purchaseCost, 0)
    const totalCurrentValue = assets.reduce((s, a) => s + a.currentValue, 0)
    const categories = [...new Set(assets.map((a) => a.category))]

    return cachedJson({
      assets,
      total,
      operational,
      needsRepair,
      totalPurchaseValue,
      totalCurrentValue,
      categories,
    }, request, { tier: 'long' })
  } catch (error) {
    console.error('Assets API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch assets', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const asset = await db.asset.create({
      data: {
        name: body.name,
        category: body.category || '',
        location: body.location || '',
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseCost: body.purchaseCost || 0,
        currentValue: body.currentValue || 0,
        status: body.status || 'operational',
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        notes: body.notes || null,
      },
    })

    broadcastEvent('asset:created', asset)
    return NextResponse.json(asset, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Assets POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create asset', 500, msg.substring(0, 300))
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

    const asset = await db.asset.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        category: data.category ?? undefined,
        location: data.location ?? undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchaseCost: data.purchaseCost ?? undefined,
        currentValue: data.currentValue ?? undefined,
        status: data.status ?? undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : undefined,
        notes: data.notes ?? undefined,
      },
    })

    broadcastEvent('asset:updated', asset)
    return NextResponse.json(asset, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Assets PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update asset', 500, msg.substring(0, 300))
  }
}
