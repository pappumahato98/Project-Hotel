import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Prisma.InventoryItemWhereInput = {}

    if (category) {
      where.category = category
    }

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
