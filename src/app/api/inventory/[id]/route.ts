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
    const item = await db.inventoryItem.findUnique({ where: { id } })

    if (!item) {
      return cachedError('Inventory item not found', 404)
    }

    return cachedJson({ item }, request, { tier: 'medium' })
  } catch (error) {
    console.error('Inventory Item GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch inventory item', 500, msg.substring(0, 300))
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

    const item = await withRetry(() =>
      db.inventoryItem.update({
        where: { id },
        data,
      }),
    )

    afterMutation('inventory')
    broadcastEvent('inventory:updated', item)
    return NextResponse.json({ item }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Inventory Item PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update inventory item', 500, msg.substring(0, 300))
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
    await withRetry(() => db.inventoryItem.delete({ where: { id } }))
    afterMutation('inventory')
    broadcastEvent('inventory:deleted', { id })
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Inventory Item DELETE error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete inventory item', 500, msg.substring(0, 300))
  }
}
