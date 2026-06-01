import { NextResponse } from 'next/server'

const bookings = [
  { id: 'cb-001', confirmationNo: 'BK-20250712-001', guestName: 'John Smith', channel: 'Booking.com', roomType: 'Deluxe Room', checkIn: '2025-07-14', checkOut: '2025-07-17', nights: 3, totalAmount: 25500, commission: 3825, netAmount: 21675, status: 'confirmed' },
  { id: 'cb-002', confirmationNo: 'BK-20250712-002', guestName: 'Emily Chen', channel: 'Expedia', roomType: 'Executive Suite', checkIn: '2025-07-15', checkOut: '2025-07-18', nights: 3, totalAmount: 45000, commission: 6750, netAmount: 38250, status: 'confirmed' },
  { id: 'cb-003', confirmationNo: 'BK-20250711-003', guestName: 'Raj Patel', channel: 'Direct Website', roomType: 'Standard Room', checkIn: '2025-07-13', checkOut: '2025-07-15', nights: 2, totalAmount: 12000, commission: 0, netAmount: 12000, status: 'confirmed' },
  { id: 'cb-004', confirmationNo: 'BK-20250711-004', guestName: 'Sarah Johnson', channel: 'Agoda', roomType: 'Deluxe Room', checkIn: '2025-07-12', checkOut: '2025-07-16', nights: 4, totalAmount: 34000, commission: 5100, netAmount: 28900, status: 'checked_in' },
  { id: 'cb-005', confirmationNo: 'BK-20250710-005', guestName: 'Mike Wilson', channel: 'Trip.com', roomType: 'Standard Room', checkIn: '2025-07-10', checkOut: '2025-07-12', nights: 2, totalAmount: 11000, commission: 1650, netAmount: 9350, status: 'checked_out' },
  { id: 'cb-006', confirmationNo: 'BK-20250712-006', guestName: 'Aiko Tanaka', channel: 'Booking.com', roomType: 'Deluxe Room', checkIn: '2025-07-20', checkOut: '2025-07-25', nights: 5, totalAmount: 42500, commission: 6375, netAmount: 36125, status: 'confirmed' },
  { id: 'cb-007', confirmationNo: 'BK-20250712-007', guestName: 'Corporate - ABC Ltd', channel: 'Corporate Portal', roomType: 'Executive Suite', checkIn: '2025-07-16', checkOut: '2025-07-19', nights: 3, totalAmount: 45000, commission: 0, netAmount: 45000, status: 'confirmed' },
  { id: 'cb-008', confirmationNo: 'BK-20250712-008', guestName: 'Priya Sharma', channel: 'Direct Website', roomType: 'Deluxe Room', checkIn: '2025-07-14', checkOut: '2025-07-16', nights: 2, totalAmount: 17000, commission: 0, netAmount: 17000, status: 'confirmed' },
  { id: 'cb-009', confirmationNo: 'BK-20250711-009', guestName: 'David Lee', channel: 'Wholesale / B2B', roomType: 'Standard Room', checkIn: '2025-07-11', checkOut: '2025-07-14', nights: 3, totalAmount: 13500, commission: 2025, netAmount: 11475, status: 'checked_in' },
  { id: 'cb-010', confirmationNo: 'BK-20250712-010', guestName: 'Maria Garcia', channel: 'Expedia', roomType: 'Standard Room', checkIn: '2025-07-22', checkOut: '2025-07-24', nights: 2, totalAmount: 12000, commission: 1800, netAmount: 10200, status: 'confirmed' },
  { id: 'cb-011', confirmationNo: 'BK-20250709-011', guestName: 'Tom Baker', channel: 'Booking.com', roomType: 'Deluxe Room', checkIn: '2025-07-09', checkOut: '2025-07-11', nights: 2, totalAmount: 17000, commission: 2550, netAmount: 14450, status: 'checked_out' },
  { id: 'cb-012', confirmationNo: 'BK-20250712-012', guestName: 'Lisa Wong', channel: 'Agoda', roomType: 'Executive Suite', checkIn: '2025-07-18', checkOut: '2025-07-20', nights: 2, totalAmount: 30000, commission: 4500, netAmount: 25500, status: 'confirmed' },
]

export async function GET() {
  try {
    const total = bookings.length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const checkedIn = bookings.filter((b) => b.status === 'checked_in').length
    const checkedOut = bookings.filter((b) => b.status === 'checked_out').length
    const totalRevenue = bookings.reduce((s, b) => s + b.netAmount, 0)
    const totalCommission = bookings.reduce((s, b) => s + b.commission, 0)

    const channelBreakdown: Record<string, { count: number; revenue: number }> = {}
    for (const b of bookings) {
      if (!channelBreakdown[b.channel]) {
        channelBreakdown[b.channel] = { count: 0, revenue: 0 }
      }
      channelBreakdown[b.channel].count++
      channelBreakdown[b.channel].revenue += b.netAmount
    }

    return NextResponse.json({
      bookings,
      total,
      confirmed,
      checkedIn,
      checkedOut,
      totalRevenue,
      totalCommission,
      channelBreakdown,
    })
  } catch (error) {
    console.error('Channel Bookings API error:', error)
    return NextResponse.json({ error: 'Failed to fetch channel bookings' }, { status: 500 })
  }
}
