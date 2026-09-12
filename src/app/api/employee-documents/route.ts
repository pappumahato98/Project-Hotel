import { NextRequest, NextResponse } from 'next/server'
import { db, isPoolTimeoutError, poolTimeoutResponse } from '@/lib/db'
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
    const employeeId = searchParams.get('employeeId')
    const documentType = searchParams.get('documentType')
    const verified = searchParams.get('verified')
    const expiringDays = searchParams.get('expiringDays')

    const cacheKey = `employee-documents:${employeeId || ''}:${documentType || ''}:${verified || ''}:${expiringDays || ''}`
    const data = await getOrSet(cacheKey, async () => {
      const where: Prisma.EmployeeDocumentWhereInput = {}

      if (employeeId) where.employeeId = employeeId
      if (documentType) where.documentType = documentType
      if (verified === 'true') where.verified = true
      if (verified === 'false') where.verified = false

      const documents = await db.employeeDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      // Compute expiry stats
      const now = new Date()
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      const totalDocuments = documents.length
      const verifiedCount = documents.filter(d => d.verified).length
      const pendingVerification = documents.filter(d => !d.verified).length
      const expiringWithin90 = documents.filter(d => {
        if (!d.expiryDate) return false
        const exp = new Date(d.expiryDate)
        return exp <= ninetyDaysFromNow && exp >= now
      }).length
      const expiredCount = documents.filter(d => {
        if (!d.expiryDate) return false
        return new Date(d.expiryDate) < now
      }).length

      // Filter for expiring soon tab
      let filteredDocuments = documents
      if (expiringDays) {
        const days = parseInt(expiringDays, 10)
        const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        filteredDocuments = documents.filter(d => {
          if (!d.expiryDate) return false
          const exp = new Date(d.expiryDate)
          return exp <= threshold && exp >= now
        })
      }

      return {
        documents: filteredDocuments,
        stats: { totalDocuments, verifiedCount, pendingVerification, expiringWithin90, expiredCount },
      }
    }, 60000)

    return cachedJson(data, request, { tier: 'medium' })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employee Documents API GET error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to fetch employee documents', 500, msg.substring(0, 300))
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      employeeId, employeeName, documentType, title,
      documentNumber, issueDate, expiryDate,
      fileUrl, fileSize, mimeType,
      verified, verifiedBy, notes, tags,
    } = body

    if (!employeeId || !employeeName || !documentType || !title) {
      return cachedError('Missing required fields: employeeId, employeeName, documentType, title', 400)
    }

    const record = await db.employeeDocument.create({
      data: {
        employeeId,
        employeeName,
        documentType,
        title,
        documentNumber: documentNumber || null,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        fileUrl: fileUrl || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        verified: verified ?? false,
        verifiedBy: verifiedBy || null,
        verifiedAt: verifiedBy ? new Date().toISOString() : null,
        notes: notes || null,
        tags: tags || null,
      },
    })

    afterMutation('hr')
    broadcastEvent('employee-document:created', record)
    return NextResponse.json(record, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employee Documents API POST error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to create employee document', 500, msg.substring(0, 300))
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return cachedError('Document ID is required', 400)
    }

    // Handle verify action
    if (updates.action === 'verify') {
      const record = await db.employeeDocument.update({
        where: { id },
        data: {
          verified: true,
          verifiedBy: updates.verifiedBy || auth.firstName + ' ' + auth.lastName,
          verifiedAt: new Date().toISOString(),
        },
      })
      afterMutation('hr')
      broadcastEvent('employee-document:verified', record)
      return NextResponse.json(record, { headers: clearCacheHeaders() })
    }

    // General update
    const allowedFields = [
      'employeeId', 'employeeName', 'documentType', 'title',
      'documentNumber', 'issueDate', 'expiryDate',
      'fileUrl', 'fileSize', 'mimeType', 'notes', 'tags',
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        data[field] = updates[field] || null
      }
    }

    const record = await db.employeeDocument.update({
      where: { id },
      data,
    })

    afterMutation('hr')
    broadcastEvent('employee-document:updated', record)
    return NextResponse.json(record, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employee Documents API PATCH error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to update employee document', 500, msg.substring(0, 300))
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'gm'])
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return cachedError('Document ID is required', 400)
    }

    const record = await db.employeeDocument.delete({ where: { id } })
    afterMutation('hr')
    broadcastEvent('employee-document:deleted', record)
    return NextResponse.json({ success: true }, { headers: clearCacheHeaders() })
  } catch (error) {
    if (isPoolTimeoutError(error)) return poolTimeoutResponse()
    console.error('Employee Documents API DELETE error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to delete employee document', 500, msg.substring(0, 300))
  }
}
