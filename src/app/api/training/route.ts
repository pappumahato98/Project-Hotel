import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const department = searchParams.get('department')

    const data = await getOrSet(
      `training:sessions:${status || ''}:${category || ''}:${department || ''}`,
      async () => {
        const where: Prisma.TrainingSessionWhereInput = {}

        if (status) where.status = status
        if (category) where.category = category
        if (department) where.department = department

        const sessions = await db.trainingSession.findMany({
          where,
          orderBy: { date: 'desc' },
          take: 100,
          include: {
            enrollments: true,
          },
        })

        // Compute summary stats
        const allSessions = await db.trainingSession.findMany({ take: 1000 })
        const upcoming = allSessions.filter((s) => s.status === 'Upcoming').length
        const inProgress = allSessions.filter((s) => s.status === 'In Progress').length
        const completed = allSessions.filter((s) => s.status === 'Completed').length
        const totalSessions = allSessions.length

        const allEnrollments = await db.trainingEnrollment.findMany({ take: 5000 })
        const totalEnrolled = allEnrollments.length

        const byCategory: Record<string, number> = {}
        for (const s of allSessions) {
          if (!byCategory[s.category]) {
            byCategory[s.category] = 0
          }
          byCategory[s.category]++
        }

        return {
          sessions,
          stats: { totalSessions, upcoming, inProgress, completed, totalEnrolled, byCategory },
        }
      },
      60000,
    ) // Cache for 60s

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    console.error('Training API GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch training sessions', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { courseName, instructor, date, duration, maxCapacity, category, status, description, location, department } = body

    if (!courseName || !instructor || !date || !duration || !maxCapacity || !category) {
      return cachedError(
        'Missing required fields: courseName, instructor, date, duration, maxCapacity, category',
        400,
      )
    }

    const record = await db.trainingSession.create({
      data: {
        courseName,
        instructor,
        date: new Date(date),
        duration,
        maxCapacity: parseInt(String(maxCapacity), 10),
        category,
        status: status || 'Upcoming',
        description: description || null,
        location: location || null,
        department: department || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('training:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Training API POST error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create training session', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, courseName, instructor, date, duration, maxCapacity, category, description, location, department } = body

    if (!id) {
      return cachedError('ID is required', 400)
    }

    const updateData: Prisma.TrainingSessionUpdateInput = {}

    if (courseName !== undefined) updateData.courseName = courseName
    if (instructor !== undefined) updateData.instructor = instructor
    if (date !== undefined) updateData.date = new Date(date)
    if (duration !== undefined) updateData.duration = duration
    if (maxCapacity !== undefined) updateData.maxCapacity = parseInt(String(maxCapacity), 10)
    if (category !== undefined) updateData.category = category
    if (description !== undefined) updateData.description = description || null
    if (location !== undefined) updateData.location = location || null
    if (department !== undefined) updateData.department = department || null

    if (status !== undefined) {
      if (!['Upcoming', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
        return cachedError(
          'Invalid status. Must be Upcoming, In Progress, Completed, or Cancelled',
          400,
        )
      }
      updateData.status = status
    }

    const record = await db.trainingSession.update({
      where: { id },
      data: updateData,
    })

    // Cascade status changes to enrollments
    if (status === 'Completed') {
      await db.trainingEnrollment.updateMany({
        where: { sessionId: id, status: 'Enrolled' },
        data: { status: 'Completed' },
      })
    } else if (status === 'Cancelled') {
      await db.trainingEnrollment.updateMany({
        where: { sessionId: id, status: 'Enrolled' },
        data: { status: 'Cancelled' },
      })
    }

    afterMutation('hr')
    broadcastEvent('training:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Training API PATCH error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update training session', 500, msg.substring(0, 300))
  }
}
