import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'

// GET /api/auth/activity-log — Fetch activity log
// Users can only see their own logs; admins can see all or filter by userId
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const module_ = searchParams.get('module')

    // Non-admin users can only see their own logs
    // Admins can optionally pass userId to view another user's logs
    let userId: string
    if (auth.user.role === 'admin' && searchParams.get('userId')) {
      userId = searchParams.get('userId')!
    } else {
      userId = auth.user.userId
    }

    const where: Record<string, unknown> = { userId }
    if (module_ && module_ !== 'all') {
      where.module = module_
    }

    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    })

    // Summary stats
    const totalCount = await db.activityLog.count({ where: { userId } })
    const loginCount = await db.activityLog.count({
      where: { userId, action: 'login' },
    })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = await db.activityLog.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    })

    // Get unique modules for filter
    const allLogs = await db.activityLog.findMany({
      where: { userId },
      select: { module: true },
      distinct: ['module'],
    })
    const modules = allLogs.map((l) => l.module)

    return NextResponse.json({
      logs,
      stats: { total: totalCount, logins: loginCount, today: todayCount },
      modules,
    })
  } catch (error) {
    console.error('Fetch activity log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/auth/activity-log — Log an activity
// Uses session-derived userId; ignores any userId in the body
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { action, module, details, ipAddress } = body

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }

    const log = await db.activityLog.create({
      data: {
        userId: auth.user.userId, // Session-derived, not from body
        userName: `${auth.user.firstName} ${auth.user.lastName}`.trim() || auth.user.email,
        action,
        module: module ?? 'General',
        details: details ?? null,
        ipAddress: ipAddress ?? null,
      },
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}