import { NextResponse } from 'next/server'

const requisitions = [
  { id: 'req-001', requestDate: '2025-07-12', department: 'Kitchen', requestor: 'Dipak KC', items: [{ name: 'Chicken Breast', quantity: '50 kg', unit: 'kg' }, { name: 'Basmati Rice', quantity: '100 kg', unit: 'kg' }, { name: 'Cooking Oil', quantity: '20 L', unit: 'liter' }], status: 'approved', priority: 'high', totalItems: 3 },
  { id: 'req-002', requestDate: '2025-07-12', department: 'Housekeeping', requestor: 'Hari Adhikari', items: [{ name: 'Bed Sheets (King)', quantity: '40', unit: 'piece' }, { name: 'Pillow Cases', quantity: '80', unit: 'piece' }, { name: 'Towels (Bath)', quantity: '60', unit: 'piece' }, { name: 'Toilet Paper', quantity: '200', unit: 'pack' }], status: 'pending', priority: 'normal', totalItems: 4 },
  { id: 'req-003', requestDate: '2025-07-11', department: 'Front Desk', requestor: 'Sita Thapa', items: [{ name: 'Welcome Kits', quantity: '100', unit: 'pack' }, { name: 'Key Cards', quantity: '50', unit: 'piece' }], status: 'approved', priority: 'low', totalItems: 2 },
  { id: 'req-004', requestDate: '2025-07-11', department: 'F&B', requestor: 'Bikash Lama', items: [{ name: 'Red Wine (Merlot)', quantity: '24', unit: 'piece' }, { name: 'Sparkling Water', quantity: '48', unit: 'piece' }, { name: 'Fresh Orange Juice', quantity: '100', unit: 'liter' }], status: 'pending', priority: 'normal', totalItems: 3 },
  { id: 'req-005', requestDate: '2025-07-10', department: 'Engineering', requestor: 'Krishti Poudel', items: [{ name: 'LED Bulbs (60W)', quantity: '50', unit: 'piece' }, { name: 'PVC Pipes (1 inch)', quantity: '20', unit: 'piece' }, { name: 'Electrical Tape', quantity: '10', unit: 'pack' }], status: 'approved', priority: 'high', totalItems: 3 },
  { id: 'req-006', requestDate: '2025-07-10', department: 'Spa', requestor: 'Binita Magar', items: [{ name: 'Massage Oil (Lavender)', quantity: '10', unit: 'liter' }, { name: 'Candles (Scented)', quantity: '50', unit: 'piece' }, { name: 'Towels (Hand)', quantity: '30', unit: 'piece' }], status: 'received', priority: 'normal', totalItems: 3 },
  { id: 'req-007', requestDate: '2025-07-09', department: 'Banquet', requestor: 'Tika Ram', items: [{ name: 'Foldable Tables (6ft)', quantity: '15', unit: 'piece' }, { name: 'Chairs (Folding)', quantity: '200', unit: 'piece' }, { name: 'Table Cloths', quantity: '20', unit: 'piece' }, { name: 'Centerpieces (Floral)', quantity: '20', unit: 'piece' }], status: 'approved', priority: 'high', totalItems: 4 },
  { id: 'req-008', requestDate: '2025-07-08', department: 'Security', requestor: 'Ramesh Budhathoki', items: [{ name: 'Walkie Talkie Batteries', quantity: '8', unit: 'piece' }, { name: 'Flashlights', quantity: '4', unit: 'piece' }], status: 'received', priority: 'low', totalItems: 2 },
]

export async function GET() {
  try {
    const total = requisitions.length
    const pending = requisitions.filter((r) => r.status === 'pending').length
    const approved = requisitions.filter((r) => r.status === 'approved').length
    const received = requisitions.filter((r) => r.status === 'received').length

    return NextResponse.json({ requisitions, total, summary: { pending, approved, received } })
  } catch (error) {
    console.error('Requisitions API error:', error)
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 })
  }
}
