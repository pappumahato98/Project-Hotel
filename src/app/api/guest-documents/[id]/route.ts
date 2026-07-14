import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

// Fields allowed to be updated via PATCH
const ALLOWED_FIELDS = new Set([
  'guestId',
  'docType',
  'docNumber',
  'docExpiry',
  'issueCountry',
  'issueDate',
  'placeOfIssue',
  'notes',
  'filePath',
  'fileName',
  'fileSize',
])

const DATE_FIELDS = ['docExpiry', 'issueDate'] as const

/**
 * GET /api/guest-documents/[id]
 * Fetch a single guest document by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const document = await db.guestDocument.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Fetch guest document error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guest document' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/guest-documents/[id]
 * Update guest document fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()

    // Verify document exists
    const existing = await db.guestDocument.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Build update data from whitelisted fields
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        // Convert date strings to Date objects for Prisma
        if (DATE_FIELDS.includes(key as typeof DATE_FIELDS[number]) && typeof value === 'string') {
          const parsed = new Date(value)
          if (!isNaN(parsed.getTime())) {
            updateData[key] = parsed
          } else {
            return NextResponse.json(
              { error: `Invalid date format for field: ${key}` },
              { status: 400 }
            )
          }
        } else {
          updateData[key] = value
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const document = await db.guestDocument.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Update guest document error:', error)
    return NextResponse.json({ error: 'Failed to update guest document' }, { status: 500 })
  }
}

/**
 * DELETE /api/guest-documents/[id]
 * Delete a guest document.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    // Verify document exists
    const existing = await db.guestDocument.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await db.guestDocument.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete guest document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete guest document' },
      { status: 500 }
    )
  }
}