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
    const postingId = searchParams.get('postingId')
    const status = searchParams.get('status')

    const data = await getOrSet(
      `recruitment:applications:${postingId || ''}:${status || ''}`,
      async () => {
        const where: Prisma.JobApplicationWhereInput = {}

        if (postingId) where.postingId = postingId
        if (status) where.status = status

        const applications = await db.jobApplication.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 200,
        })

        return { applications }
      },
      60000,
    ) // Cache for 60s

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    console.error('Recruitment Applications API GET error:', error)
    return cachedError('Failed to fetch job applications', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { postingId, applicantName, applicantEmail, applicantPhone, resumeUrl, notes } = body

    if (!postingId || !applicantName) {
      return cachedError('Missing required fields: postingId, applicantName', 400)
    }

    const record = await db.jobApplication.create({
      data: {
        postingId,
        applicantName,
        applicantEmail: applicantEmail || null,
        applicantPhone: applicantPhone || null,
        resumeUrl: resumeUrl || null,
        notes: notes || null,
      },
    })

    // Increment appliedCount on the posting
    await db.jobPosting.update({
      where: { id: postingId },
      data: { appliedCount: { increment: 1 } },
    })

    afterMutation('hr')
    broadcastEvent('recruitment:application_created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Recruitment Applications API POST error:', error)
    return cachedError('Failed to create job application', 500)
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, status, notes } = body

    if (!id || !status) {
      return cachedError('ID and status are required', 400)
    }

    if (!['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Hired'].includes(status)) {
      return cachedError('Invalid status. Must be Applied, Screening, Interview, Offer, Rejected, or Hired', 400)
    }

    // Fetch existing application to get postingId and current status
    const existing = await db.jobApplication.findUnique({ where: { id } })
    if (!existing) {
      return cachedError('Application not found', 404)
    }

    const updateData: Prisma.JobApplicationUpdateInput = {
      status,
    }

    if (notes !== undefined) updateData.notes = notes || null

    const record = await db.jobApplication.update({
      where: { id },
      data: updateData,
    })

    // Increment posting counters based on new status
    const postingUpdateData: Prisma.JobPostingUpdateInput = {}

    if (status === 'Screening') {
      postingUpdateData.screeningCount = { increment: 1 }
    } else if (status === 'Interview') {
      postingUpdateData.interviewCount = { increment: 1 }
    } else if (status === 'Offer') {
      postingUpdateData.offerCount = { increment: 1 }
    } else if (status === 'Hired') {
      postingUpdateData.offerCount = { increment: 1 }

      // Check if all offers are hired for this posting
      const posting = await db.jobPosting.findUnique({
        where: { id: existing.postingId },
        include: { applications: true },
      })

      if (posting) {
        const offersCount = posting.applications.filter((a) => a.status === 'Offer').length
        const hiredCount = posting.applications.filter((a) => a.status === 'Hired').length

        if (hiredCount === offersCount && offersCount > 0) {
          postingUpdateData.status = 'Closed'
        }
      }
    }

    // Only update posting if there's something to update
    if (Object.keys(postingUpdateData).length > 0) {
      await db.jobPosting.update({
        where: { id: existing.postingId },
        data: postingUpdateData,
      })
    }

    afterMutation('hr')
    broadcastEvent('recruitment:application_updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Recruitment Applications API PATCH error:', error)
    return cachedError('Failed to update job application', 500)
  }
}
