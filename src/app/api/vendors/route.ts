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

    const where: Prisma.VendorWhereInput = {}

    if (category) where.category = category
    if (status) where.status = status

    const vendors = await db.vendor.findMany({ where, orderBy: { name: 'asc' } })

    const total = vendors.length
    const active = vendors.filter((v) => v.status === 'active').length
    const categories = [...new Set(vendors.map((v) => v.category))]

    return cachedJson({ vendors, total, active, categories }, request, { tier: 'long' })
  } catch (error) {
    console.error('Vendors API error:', error)
    return cachedError('Failed to fetch vendors', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const vendor = await db.vendor.create({
      data: {
        name: body.name,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        category: body.category || '',
        rating: body.rating || 0,
        status: body.status || 'active',
        lastOrderDate: body.lastOrderDate ? new Date(body.lastOrderDate) : null,
        totalOrders: body.totalOrders || 0,
        address: body.address || null,
        notes: body.notes || null,
      },
    })

    broadcastEvent('vendor:created', vendor)
    return NextResponse.json(vendor, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Vendors POST error:', error)
    return cachedError('Failed to create vendor', 500)
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

    const vendor = await db.vendor.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        contact: data.contact ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        category: data.category ?? undefined,
        rating: data.rating ?? undefined,
        status: data.status ?? undefined,
        lastOrderDate: data.lastOrderDate ? new Date(data.lastOrderDate) : undefined,
        totalOrders: data.totalOrders ?? undefined,
        address: data.address ?? undefined,
        notes: data.notes ?? undefined,
      },
    })

    broadcastEvent('vendor:updated', vendor)
    return NextResponse.json(vendor, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Vendors PATCH error:', error)
    return cachedError('Failed to update vendor', 500)
  }
}
