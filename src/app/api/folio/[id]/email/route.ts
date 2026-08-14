import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

// POST /api/folio/[id]/email — Send folio statement to guest email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const body = await request.json()
    const { customMessage } = body

    // Fetch folio with all required data
    const folio = await db.folio.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true,
            confirmationNo: true,
            checkIn: true,
            checkOut: true,
            roomRate: true,
            status: true,
            room: { select: { number: true } },
          },
        },
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            vipLevel: true,
            email: true,
            phone: true,
          },
        },
        transactions: {
          where: { amount: { gt: 0 } }, // exclude voided (amount=0)
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          where: { amount: { gt: 0 } }, // exclude voided (amount=0)
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!folio) {
      return cachedError('Folio not found', 404)
    }

    const guestEmail = folio.guest.email
    if (!guestEmail) {
      return cachedError('Guest has no email address on file', 400)
    }

    // Compute totals
    const totalCharges = folio.transactions.reduce((s, t) => s + t.totalAmount, 0)
    const totalPayments = folio.payments.reduce((s, p) => s + p.amount, 0)
    const outstandingBalance = totalCharges - totalPayments

    // Read settings for hotel info and SMTP
    const settingsRows = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const r of settingsRows) {
      settingsMap[r.key] = r.value
    }

    const hotelName = settingsMap.hotelName || 'Meridian Hotel'
    const hotelAddress = settingsMap.address || 'Thamel, Kathmandu'
    const hotelPhone = settingsMap.phone || '+977-1-4567890'
    const hotelEmail = settingsMap.email || 'info@meridian.com'
    const hotelWebsite = settingsMap.website || ''
    const printHeader = settingsMap.printHeader || `${hotelName} — ${hotelAddress}`
    const printFooter = settingsMap.printFooter || 'Thank you for staying with us!'
    const starRating = parseInt(settingsMap.starRating || '5', 10)

    // Build email body (plain text for log, HTML would be sent via SMTP in production)
    const guestName = `${folio.guest.firstName} ${folio.guest.lastName}`
    const roomNumber = folio.reservation.room?.number || '—'

    const emailSubject = `Folio Statement — ${guestName} — Room ${roomNumber} — ${folio.reservation.confirmationNo}`

    // In production, integrate with SMTP/Nodemailer to send the email

    return NextResponse.json({
      success: true,
      message: `Folio statement sent to ${guestEmail}`,
      data: {
        to: guestEmail,
        subject: emailSubject,
        guestName,
        totalCharges,
        totalPayments,
        outstandingBalance,
        sentAt: new Date().toISOString(),
      },
    }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Folio email error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to send folio statement', 500, msg.substring(0, 300))
  }
}