import { NextResponse } from 'next/server'

const vendors = [
  { id: 'v-001', name: 'Nepal Fresh Produce', contact: 'Krishna Bhandari', phone: '+977-1-4234567', email: 'krishna@nepalfresh.com', category: 'Food & Beverage', rating: 4.5, status: 'active', lastOrderDate: '2025-07-08', totalOrders: 156 },
  { id: 'v-002', name: 'Kathmandu Linen Supply', contact: 'Sunita Sharma', phone: '+977-1-4345678', email: 'info@ktmlinens.com', category: 'Housekeeping', rating: 4.2, status: 'active', lastOrderDate: '2025-07-10', totalOrders: 89 },
  { id: 'v-003', name: 'Himalayan Cleaning Solutions', contact: 'Deepak Rai', phone: '+977-1-4456789', email: 'sales@himalayanclean.com', category: 'Housekeeping', rating: 3.8, status: 'active', lastOrderDate: '2025-07-05', totalOrders: 45 },
  { id: 'v-004', name: 'Pashupati Paper Industries', contact: 'Ramesh Gupta', phone: '+977-1-4567890', email: 'orders@pashupatipaper.com', category: 'Office Supplies', rating: 4.0, status: 'active', lastOrderDate: '2025-06-28', totalOrders: 67 },
  { id: 'v-005', name: 'Royal Spirits & Wines', contact: 'Arjun Thapa', phone: '+977-1-4678901', email: 'arjun@royalspirits.com', category: 'Beverages', rating: 4.7, status: 'active', lastOrderDate: '2025-07-12', totalOrders: 203 },
  { id: 'v-006', name: 'Everest Maintenance Parts', contact: 'Bikash Tamang', phone: '+977-1-4789012', email: 'everestparts@gmail.com', category: 'Maintenance', rating: 3.5, status: 'active', lastOrderDate: '2025-07-01', totalOrders: 23 },
  { id: 'v-007', name: 'Thamel Textile House', contact: 'Anita Lama', phone: '+977-1-4890123', email: 'textile@thamelhouse.com', category: 'Uniforms', rating: 4.3, status: 'active', lastOrderDate: '2025-05-15', totalOrders: 12 },
  { id: 'v-008', name: 'Valley Toiletries Pvt Ltd', contact: 'Prakash Shrestha', phone: '+977-1-4901234', email: 'info@valleytoiletries.com', category: 'Amenities', rating: 4.1, status: 'active', lastOrderDate: '2025-07-09', totalOrders: 178 },
  { id: 'v-009', name: 'Nepal Gas Company', contact: 'Hari Bohara', phone: '+977-1-4012345', email: 'nepalgas@ntc.net.np', category: 'Kitchen Supplies', rating: 3.9, status: 'inactive', lastOrderDate: '2025-03-20', totalOrders: 34 },
  { id: 'v-010', name: 'Digital Tech Nepal', contact: 'Suman Karki', phone: '+977-1-4123456', email: 'tech@digitalnepal.com', category: 'IT & Electronics', rating: 4.4, status: 'active', lastOrderDate: '2025-07-11', totalOrders: 56 },
]

export async function GET() {
  try {
    const total = vendors.length
    const active = vendors.filter((v) => v.status === 'active').length
    const categories = [...new Set(vendors.map((v) => v.category))]

    return NextResponse.json({ vendors, total, active, categories })
  } catch (error) {
    console.error('Vendors API error:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}
