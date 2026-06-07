import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/activity-log?userId=xxx&limit=50&module=xxx — Fetch activity log
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const module_ = searchParams.get('module')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, userName, action, module, details, ipAddress } = body

    if (!userId || !userName || !action) {
      return NextResponse.json(
        { error: 'userId, userName, and action are required' },
        { status: 400 }
      )
    }

    const log = await db.activityLog.create({
      data: {
        userId,
        userName,
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
