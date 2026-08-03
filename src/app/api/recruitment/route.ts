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

    const data = await getOrSet(
      `recruitment:postings:${status || ''}:${department || ''}`,
      async () => {
        const where: Prisma.JobPostingWhereInput = {}

        if (status) where.status = status
        if (department) where.department = department

        const postings = await db.jobPosting.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            applications: true,
          },
        })

        // Compute summary stats
        const allPostings = await db.jobPosting.findMany({ take: 1000, include: { applications: true } })
        const totalOpen = allPostings.filter((p) => p.status === 'Open').length
        const totalApplicants = allPostings.reduce((sum, p) => sum + p.appliedCount, 0)

        const byDepartment: Record<string, { open: number; total: number; hired: number }> = {}
        for (const p of allPostings) {
          if (!byDepartment[p.department]) {
            byDepartment[p.department] = { open: 0, total: 0, hired: 0 }
          }
          byDepartment[p.department].total++
          if (p.status === 'Open') byDepartment[p.department].open++
          const hiredCount = p.applications.filter((a) => a.status === 'Hired').length
          if (hiredCount > 0) byDepartment[p.department].hired += hiredCount
        }

        return {
          postings,
          stats: { totalOpen, totalApplicants, byDepartment },
        }
      },
      60000,
    ) // Cache for 60s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Recruitment API GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch job postings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { position, department, employmentType, description, requirements, salaryMin, salaryMax, status, postedBy, deadline } = body

    if (!position || !department || !employmentType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: position, department, employmentType',
        },
        { status: 400 },
      )
    }

    const postingStatus = status || 'Draft'
    const postedAt = postingStatus === 'Open' ? new Date() : null

    const record = await db.jobPosting.create({
      data: {
        position,
        department,
        employmentType,
        description: description || null,
        requirements: requirements || null,
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        status: postingStatus,
        postedBy: postedBy || null,
        postedAt,
        deadline: deadline ? new Date(deadline) : null,
      },
    })

    afterMutation('hr')
    broadcastEvent('recruitment:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Recruitment API POST error:', error)
    return NextResponse.json({ error: 'Failed to create job posting' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, position, department, employmentType, description, requirements, salaryMin, salaryMax, deadline } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: Prisma.JobPostingUpdateInput = {}

    if (position !== undefined) updateData.position = position
    if (department !== undefined) updateData.department = department
    if (employmentType !== undefined) updateData.employmentType = employmentType
    if (description !== undefined) updateData.description = description || null
    if (requirements !== undefined) updateData.requirements = requirements || null
    if (salaryMin !== undefined) updateData.salaryMin = salaryMin ?? null
    if (salaryMax !== undefined) updateData.salaryMax = salaryMax ?? null
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null

    if (status !== undefined) {
      if (!['Draft', 'Open', 'Closed', 'Filled'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be Draft, Open, Closed, or Filled' },
          { status: 400 },
        )
      }

      if (status === 'Open') {
        ;(updateData as Record<string, unknown>).postedAt = new Date()
        updateData.status = 'Open'
      } else if (status === 'Filled') {
        updateData.status = 'Closed'
      } else {
        updateData.status = status
      }
    }

    const record = await db.jobPosting.update({
      where: { id },
      data: updateData,
    })

    afterMutation('hr')
    broadcastEvent('recruitment:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Recruitment API PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update job posting' }, { status: 500 })
  }
}
