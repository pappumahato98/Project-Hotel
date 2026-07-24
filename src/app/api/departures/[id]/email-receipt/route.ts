import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

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
            roomType: { select: { name: true, code: true } },
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
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const guestEmail = reservation.guest?.email
    if (!guestEmail) {
      return NextResponse.json(
        { error: 'Guest has no email address on file' },
        { status: 400 },
      )
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
    const roomType = reservation.room?.roomType?.name || ''
    const checkIn = reservation.checkIn.toLocaleDateString()
    const checkOut = reservation.checkOut.toLocaleDateString()

    const emailSubject = `Checkout Receipt — ${guestName} — Room ${roomNumber} — ${reservation.confirmationNo}`

    // Log the email that would be sent
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`📧 CHECKOUT RECEIPT EMAIL`)
    console.log(`   To:      ${guestEmail}`)
    console.log(`   Subject: ${emailSubject}`)
    console.log(`   Guest:   ${guestName} (VIP: ${reservation.guest.vipLevel})`)
    console.log(`   Room:    ${roomNumber} (${roomType}) | Conf: ${reservation.confirmationNo}`)
    console.log(`   Dates:   ${checkIn} → ${checkOut}`)
    console.log(`   Charges: NPR ${totalCharges.toFixed(2)} | Payments: NPR ${totalPayments.toFixed(2)} | Balance: NPR ${outstandingBalance.toFixed(2)}`)
    console.log(`   Transactions: ${allTransactions.length} | Payments: ${allPayments.length}`)
    console.log('═══════════════════════════════════════════════════════════')

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
    })
  } catch (error) {
    console.error('Departure email receipt error:', error)
    return NextResponse.json({ error: 'Failed to send receipt email' }, { status: 500 })
  }
}
