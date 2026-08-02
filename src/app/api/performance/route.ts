import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const reviewPeriod = searchParams.get('reviewPeriod')

    const data = await getOrSet(
      `performance:reviews:${status || ''}:${department || ''}:${reviewPeriod || ''}`,
      async () => {
        const where: Prisma.PerformanceReviewWhereInput = {}

        if (status) where.status = status
        if (department) where.department = department
        if (reviewPeriod) where.reviewPeriod = reviewPeriod

        const reviews = await db.performanceReview.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        // Compute summary stats
        const allReviews = await db.performanceReview.findMany({ take: 1000 })
        const totalReviews = allReviews.length
        const avgScore =
          totalReviews > 0
            ? allReviews.reduce((sum, r) => sum + r.overallScore, 0) / totalReviews
            : 0

        const byDepartment: Record<string, { count: number; avgScore: number }> = {}
        for (const r of allReviews) {
          if (!byDepartment[r.department]) {
            byDepartment[r.department] = { count: 0, avgScore: 0 }
          }
          byDepartment[r.department].count++
          byDepartment[r.department].avgScore += r.overallScore
        }
        for (const dept of Object.keys(byDepartment)) {
          byDepartment[dept].avgScore =
            Math.round((byDepartment[dept].avgScore / byDepartment[dept].count) * 100) / 100
        }

        return {
          reviews,
          stats: { totalReviews, avgScore: Math.round(avgScore * 100) / 100, byDepartment },
        }
      },
      60000,
    ) // Cache for 60s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Performance API GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      employeeId,
      employeeName,
      department,
      position,
      reviewPeriod,
      reviewDate,
      reviewerName,
      reviewerId,
      attendanceScore,
      taskScore,
      guestSatScore,
      punctualityScore,
      overallScore,
      strengths,
      improvements,
      goals,
      status,
      notes,
    } = body

    if (
      !employeeId ||
      !employeeName ||
      !department ||
      !position ||
      !reviewPeriod ||
      !reviewerName
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: employeeId, employeeName, department, position, reviewPeriod, reviewerName',
        },
        { status: 400 },
      )
    }

    const computedOverall =
      overallScore ??
      (attendanceScore + taskScore + guestSatScore + punctualityScore) / 4

    const record = await db.performanceReview.create({
      data: {
        employeeId,
        employeeName,
        department,
        position,
        reviewPeriod,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        reviewerName,
        reviewerId: reviewerId || null,
        attendanceScore: attendanceScore ?? 0,
        taskScore: taskScore ?? 0,
        guestSatScore: guestSatScore ?? 0,
        punctualityScore: punctualityScore ?? 0,
        overallScore: computedOverall,
        strengths: strengths || null,
        improvements: improvements || null,
        goals: goals || null,
        status: status || 'Draft',
        notes: notes || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('performance:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Performance API POST error:', error)
    return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, attendanceScore, taskScore, guestSatScore, punctualityScore, overallScore, notes, strengths, improvements, goals } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: Prisma.PerformanceReviewUpdateInput = {}

    if (status) {
      if (!['Draft', 'Submitted', 'Approved'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be Draft, Submitted, or Approved' },
          { status: 400 },
        )
      }
      updateData.status = status
      if (status === 'Approved') {
        ;(updateData as Record<string, unknown>).approvedAt = new Date()
      }
    }

    if (attendanceScore !== undefined) updateData.attendanceScore = attendanceScore
    if (taskScore !== undefined) updateData.taskScore = taskScore
    if (guestSatScore !== undefined) updateData.guestSatScore = guestSatScore
    if (punctualityScore !== undefined) updateData.punctualityScore = punctualityScore
    if (overallScore !== undefined) updateData.overallScore = overallScore
    if (notes !== undefined) updateData.notes = notes || null
    if (strengths !== undefined) updateData.strengths = strengths || null
    if (improvements !== undefined) updateData.improvements = improvements || null
    if (goals !== undefined) updateData.goals = goals || null

    const record = await db.performanceReview.update({
      where: { id },
      data: updateData,
    })

    afterMutation('hr')
    broadcastEvent('performance:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Performance API PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update performance review' }, { status: 500 })
  }
}
