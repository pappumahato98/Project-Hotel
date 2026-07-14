import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Prisma.InventoryItemWhereInput = {}

    if (category) where.category = category

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    const total = await db.inventoryItem.count({ where })

    // Low stock alerts
    const lowStockItems = items.filter((item) => item.currentStock <= item.reorderPoint)

    // Category breakdown
    const categories = [...new Set(items.map((i) => i.category))]

    const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0)

    return NextResponse.json({
      items,
      total,
      categories,
      lowStockItems,
      totalValue,
    })
  } catch (error) {
    console.error('Inventory API error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const item = await db.inventoryItem.create({
      data: {
        name: body.name,
        category: body.category || '',
        unit: body.unit || 'piece',
        currentStock: body.currentStock || 0,
        reorderPoint: body.reorderPoint || 0,
        unitCost: body.unitCost || 0,
        supplier: body.supplier || null,
        location: body.location || null,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || 0,
        active: body.active !== false,
      },
    })

    broadcastEvent('inventory:created', item)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Inventory POST error:', error)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }
}
