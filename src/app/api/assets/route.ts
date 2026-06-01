import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    const where: Prisma.AssetWhereInput = {}

    if (category) where.category = category
    if (status) where.status = status

    const assets = await db.asset.findMany({ where, orderBy: { name: 'asc' } })
    const allAssets = await db.asset.findMany({ where: {} })

    const total = allAssets.length
    const operational = allAssets.filter((a) => a.status === 'operational').length
    const needsRepair = allAssets.filter((a) => a.status === 'needs_repair').length
    const totalPurchaseValue = allAssets.reduce((s, a) => s + a.purchaseCost, 0)
    const totalCurrentValue = allAssets.reduce((s, a) => s + a.currentValue, 0)
    const categories = [...new Set(allAssets.map((a) => a.category))]

    return NextResponse.json({
      assets,
      total,
      operational,
      needsRepair,
      totalPurchaseValue,
      totalCurrentValue,
      categories,
    })
  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Assets POST error:', error)
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
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
    return NextResponse.json(asset)
  } catch (error) {
    console.error('Assets PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}
