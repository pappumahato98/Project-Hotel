import { NextResponse } from 'next/server'

const channels = [
  { id: 'ch-001', name: 'Booking.com', type: 'OTA', logo: 'B', status: 'connected', lastSync: '2025-07-12T08:30:00', totalBookings: 342, monthlyCommission: 125000, mappingStatus: 'complete' },
  { id: 'ch-002', name: 'Expedia', type: 'OTA', logo: 'E', status: 'connected', lastSync: '2025-07-12T08:30:00', totalBookings: 198, monthlyCommission: 78000, mappingStatus: 'complete' },
  { id: 'ch-003', name: 'Agoda', type: 'OTA', logo: 'A', status: 'connected', lastSync: '2025-07-12T08:28:00', totalBookings: 156, monthlyCommission: 52000, mappingStatus: 'complete' },
  { id: 'ch-004', name: 'Direct Website', type: 'Direct', logo: 'W', status: 'connected', lastSync: '2025-07-12T08:30:00', totalBookings: 278, monthlyCommission: 0, mappingStatus: 'complete' },
  { id: 'ch-005', name: 'Walk-in', type: 'Direct', logo: 'D', status: 'active', lastSync: null, totalBookings: 124, monthlyCommission: 0, mappingStatus: 'n/a' },
  { id: 'ch-006', name: 'Phone / Email', type: 'Direct', logo: 'P', status: 'active', lastSync: null, totalBookings: 89, monthlyCommission: 0, mappingStatus: 'n/a' },
  { id: 'ch-007', name: 'Airbnb', type: 'OTA', logo: 'N', status: 'disconnected', lastSync: '2025-06-15T14:00:00', totalBookings: 12, monthlyCommission: 4500, mappingStatus: 'incomplete' },
  { id: 'ch-008', name: 'Trip.com', type: 'OTA', logo: 'T', status: 'connected', lastSync: '2025-07-12T08:29:00', totalBookings: 67, monthlyCommission: 28000, mappingStatus: 'complete' },
  { id: 'ch-009', name: 'Corporate Portal', type: 'Corporate', logo: 'C', status: 'connected', lastSync: '2025-07-12T06:00:00', totalBookings: 201, monthlyCommission: 0, mappingStatus: 'complete' },
  { id: 'ch-010', name: 'Wholesale / B2B', type: 'Wholesale', logo: 'S', status: 'connected', lastSync: '2025-07-12T08:30:00', totalBookings: 95, monthlyCommission: 15000, mappingStatus: 'complete' },
]

export async function GET() {
  try {
    const connected = channels.filter((c) => c.status === 'connected').length
    const disconnected = channels.filter((c) => c.status === 'disconnected').length
    const totalBookings = channels.reduce((s, c) => s + c.totalBookings, 0)
    const totalCommission = channels.reduce((s, c) => s + c.monthlyCommission, 0)

    return NextResponse.json({
      channels,
      connected,
      disconnected,
      totalBookings,
      totalCommission,
    })
  } catch (error) {
    console.error('Channels API error:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}
