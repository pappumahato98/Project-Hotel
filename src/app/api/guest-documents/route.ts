import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

// ─── Valid document types ─────────────────────────────────
const VALID_DOC_TYPES = new Set([
  'passport',
  'national_id',
  'drivers_license',
  'visa',
  'birth_certificate',
])

/**
 * GET /api/guest-documents?reservationId=xxx
 * Fetch all guest documents for a reservation, sorted by createdAt desc.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify reservation exists
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const documents = await db.guestDocument.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Fetch guest documents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guest documents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/guest-documents
 * Create a new guest document record.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const {
      reservationId,
      guestId,
      docType,
      docNumber,
      docExpiry,
      issueCountry,
      issueDate,
      placeOfIssue,
      notes,
    } = body

    // Validate required fields
    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      )
    }

    if (!docType) {
      return NextResponse.json(
        { error: 'docType is required' },
        { status: 400 }
      )
    }

    if (!VALID_DOC_TYPES.has(docType)) {
      return NextResponse.json(
        { error: `Invalid docType. Must be one of: ${Array.from(VALID_DOC_TYPES).join(', ')}` },
        { status: 400 }
      )
    }

    // Verify reservation exists
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Parse optional date fields
    const parsedDocExpiry = docExpiry ? new Date(docExpiry) : null
    const parsedIssueDate = issueDate ? new Date(issueDate) : null

    if (docExpiry && isNaN(parsedDocExpiry!.getTime())) {
      return NextResponse.json(
        { error: 'Invalid docExpiry date format' },
        { status: 400 }
      )
    }

    if (issueDate && isNaN(parsedIssueDate!.getTime())) {
      return NextResponse.json(
        { error: 'Invalid issueDate format' },
        { status: 400 }
      )
    }

    const document = await db.guestDocument.create({
      data: {
        reservationId,
        guestId: guestId || null,
        docType,
        docNumber: docNumber || null,
        docExpiry: parsedDocExpiry,
        issueCountry: issueCountry || null,
        issueDate: parsedIssueDate,
        placeOfIssue: placeOfIssue || null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Create guest document error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create guest document'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}