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
    const item = await db.inventoryItem.findUnique({ where: { id } })

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Inventory Item GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.name) data.name = body.name
    if (body.category) data.category = body.category
    if (body.unit) data.unit = body.unit
    if (body.currentStock !== undefined) data.currentStock = body.currentStock
    if (body.reorderPoint !== undefined) data.reorderPoint = body.reorderPoint
    if (body.unitCost !== undefined) data.unitCost = body.unitCost
    if (body.supplier !== undefined) data.supplier = body.supplier
    if (body.location !== undefined) data.location = body.location
    if (body.minStock !== undefined) data.minStock = body.minStock
    if (body.maxStock !== undefined) data.maxStock = body.maxStock
    if (body.active !== undefined) data.active = body.active

    const item = await db.inventoryItem.update({
      where: { id },
      data,
    })

    broadcastEvent('inventory:updated', item)
    return NextResponse.json(item)
  } catch (error) {
    console.error('Inventory Item PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    await db.inventoryItem.delete({ where: { id } })
    broadcastEvent('inventory:deleted', { id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inventory Item DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 })
  }
}
