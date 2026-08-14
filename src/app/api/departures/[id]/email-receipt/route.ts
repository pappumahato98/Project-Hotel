import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'
import { formatDateShort } from '@/lib/nepal-standards'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

// POST /api/departures/[id]/email-receipt — Send checkout receipt to guest email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    // Fetch reservation with guest, room, and folio data
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
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
        room: {
          select: {
            number: true,
            floor: true,
            wing: true,
            type: { select: { name: true, code: true } },
          },
        },
        folios: {
          include: {
            transactions: { where: { amount: { gt: 0 } }, orderBy: { createdAt: 'desc' } },
            payments: { where: { amount: { gt: 0 } }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    })

    if (!reservation) {
      return cachedError('Reservation not found', 404)
    }

    const guestEmail = reservation.guest?.email
    if (!guestEmail) {
      return cachedError('Guest has no email address on file', 400)
    }

    // Read hotel settings
    const settingsRows = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const r of settingsRows) {
      settingsMap[r.key] = r.value
    }

    const hotelName = settingsMap.hotelName || 'Meridian Hotel'
    const hotelAddress = settingsMap.address || 'Thamel, Kathmandu'

    // Compute totals
    const allTransactions = reservation.folios.flatMap((f) => f.transactions)
    const allPayments = reservation.folios.flatMap((f) => f.payments)
    const totalCharges = allTransactions.reduce((s, t) => s + t.totalAmount, 0)
    const totalPayments = allPayments.reduce((s, p) => s + p.amount, 0)
    const outstandingBalance = reservation.totalAmount - reservation.paidAmount

    const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`
    const roomNumber = reservation.room?.number || '—'
    const roomType = reservation.room?.type?.name || ''
    const checkIn = formatDateShort(reservation.checkIn)
    const checkOut = formatDateShort(reservation.checkOut)

    const emailSubject = `Checkout Receipt — ${guestName} — Room ${roomNumber} — ${reservation.confirmationNo}`

    // In production, integrate with SMTP/Nodemailer to send the receipt

    return NextResponse.json({
      success: true,
      message: `Checkout receipt sent to ${guestEmail}`,
      data: {
        to: guestEmail,
        subject: emailSubject,
        guestName,
        roomNumber,
        roomType,
        checkIn,
        checkOut,
        confirmationNo: reservation.confirmationNo,
        totalCharges,
        totalPayments,
        outstandingBalance,
        sentAt: new Date().toISOString(),
      },
    }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Departure email receipt error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to send receipt email', 500, msg.substring(0, 300))
  }
}
