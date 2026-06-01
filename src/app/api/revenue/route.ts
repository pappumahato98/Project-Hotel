import { NextResponse } from 'next/server'

// Generate demand calendar for the next 30 days
function generateDemandCalendar() {
  const days = []
  const today = new Date()
  const pattern = [
    'medium', 'high', 'high', 'high', 'medium', 'high', 'high',
    'medium', 'medium', 'low', 'low', 'medium', 'medium', 'low',
    'low', 'medium', 'high', 'high', 'medium', 'medium',
    'high', 'high', 'high', 'medium', 'medium', 'low', 'low',
    'medium', 'medium', 'high',
  ]

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dayOfWeek = date.getDay()
    const level = pattern[i % pattern.length]
    const adjustedLevel = (dayOfWeek === 0 || dayOfWeek === 6) && level === 'low' ? 'medium' : level

    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      demandLevel: adjustedLevel,
      occupancy: adjustedLevel === 'high' ? Math.floor(Math.random() * 10) + 85 : adjustedLevel === 'medium' ? Math.floor(Math.random() * 15) + 60 : Math.floor(Math.random() * 20) + 30,
    })
  }

  return days
}

const ratePlans = [
  { id: 'rp-001', name: 'BAR - Best Available Rate', roomType: 'Deluxe Room', baseRate: 8500, channel: 'Direct', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-002', name: 'Corporate Rate', roomType: 'Deluxe Room', baseRate: 7000, channel: 'Corporate', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-003', name: 'Long Stay (7+)', roomType: 'Deluxe Room', baseRate: 6500, channel: 'Direct', active: true, minStay: 7, maxStay: 0 },
  { id: 'rp-004', name: 'BAR - Suite', roomType: 'Executive Suite', baseRate: 15000, channel: 'Direct', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-005', name: 'OTA Standard', roomType: 'Standard Room', baseRate: 6000, channel: 'OTA', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-006', name: 'OTA Premium', roomType: 'Deluxe Room', baseRate: 9500, channel: 'OTA', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-007', name: 'Group Rate (10+)', roomType: 'Standard Room', baseRate: 4500, channel: 'Group', active: true, minStay: 1, maxStay: 0 },
  { id: 'rp-008', name: 'Weekend Getaway', roomType: 'Deluxe Room', baseRate: 9000, channel: 'Direct', active: false, minStay: 2, maxStay: 0 },
]

const pricingRules = [
  { id: 'rule-001', name: 'High Season Surcharge', type: 'surcharge', value: 20, appliesTo: 'All Room Types', dates: 'Oct 1 - Dec 31', active: true },
  { id: 'rule-002', name: 'Early Bird Discount', type: 'discount', value: 15, appliesTo: 'All Room Types', dates: 'Book 14+ days in advance', active: true },
  { id: 'rule-003', name: 'Last Minute Premium', type: 'surcharge', value: 10, appliesTo: 'Standard & Deluxe', dates: 'Same day booking', active: true },
  { id: 'rule-004', name: 'Festival Season Premium', type: 'surcharge', value: 30, appliesTo: 'All Room Types', dates: 'Dashain & Tihar period', active: false },
  { id: 'rule-005', name: 'Extended Stay Discount', type: 'discount', value: 25, appliesTo: 'All Room Types', dates: 'Stay 14+ nights', active: true },
]

export async function GET() {
  try {
    const demandCalendar = generateDemandCalendar()
    const highDays = demandCalendar.filter((d) => d.demandLevel === 'high').length
    const mediumDays = demandCalendar.filter((d) => d.demandLevel === 'medium').length
    const lowDays = demandCalendar.filter((d) => d.demandLevel === 'low').length

    return NextResponse.json({
      demandCalendar,
      ratePlans,
      pricingRules,
      summary: { highDays, mediumDays, lowDays },
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 })
  }
}
