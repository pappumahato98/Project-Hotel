import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const vipLevel = searchParams.get('vipLevel')

    const where: Prisma.GuestWhereInput = {}

    if (search) {
      // Build OR conditions — only direct fields (PgBouncer compatible)
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nationality: { contains: search } },
      ]
    }

    if (vipLevel) {
      where.vipLevel = vipLevel
    }

    const cacheKey = `guests:list:${search || ''}:${vipLevel || ''}`
    const result = await getOrSet(cacheKey, async () => {
      const guests = await db.guest.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          vipLevel: true, nationality: true, createdAt: true, updatedAt: true,
        },
        // Limit results when searching to prevent flooding with single-char queries
        ...(search ? { take: 20 } : { take: 100 }),
        orderBy: { createdAt: 'desc' },
      })
      return { guests, total: guests.length }
    }, 60000)

    return cachedJson(result, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Guests API error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch guest profiles', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      firstName, lastName, email, phone, nationality,
      idType, idNumber, dateOfBirth, gender, address, city, country,
      vipLevel,
    } = body

    if (!firstName || !lastName) {
      return cachedError('First name and last name are required', 400)
    }

    const guest = await withRetry(() => db.guest.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        nationality: nationality || null,
        idType: idType || null,
        idNumber: idNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        address: address || null,
        city: city || null,
        country: country || null,
        vipLevel: vipLevel || 'none',
      },
    }))

    afterMutation('guests')
    return NextResponse.json({ guest }, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Create guest error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create guest', 500, msg.substring(0, 300))
  }
}