import { NextResponse } from 'next/server'

const assets = [
  { id: 'ast-001', name: 'Central AC Unit - Main Building', category: 'HVAC', location: 'Roof - Main Building', purchaseDate: '2022-03-15', purchaseCost: 2500000, currentValue: 2000000, status: 'operational', warrantyExpiry: '2027-03-15', lastMaintenance: '2025-06-01' },
  { id: 'ast-002', name: 'Elevator #1', category: 'Vertical Transport', location: 'Main Lobby', purchaseDate: '2021-01-10', purchaseCost: 3800000, currentValue: 2800000, status: 'operational', warrantyExpiry: '2026-01-10', lastMaintenance: '2025-05-15' },
  { id: 'ast-003', name: 'Elevator #2', category: 'Vertical Transport', location: 'North Wing', purchaseDate: '2021-01-10', purchaseCost: 3800000, currentValue: 2800000, status: 'operational', warrantyExpiry: '2026-01-10', lastMaintenance: '2025-05-15' },
  { id: 'ast-004', name: 'Commercial Laundry Machine', category: 'Equipment', location: 'Basement - Laundry', purchaseDate: '2023-06-20', purchaseCost: 450000, currentValue: 350000, status: 'operational', warrantyExpiry: '2026-06-20', lastMaintenance: '2025-07-01' },
  { id: 'ast-005', name: 'Industrial Dryer', category: 'Equipment', location: 'Basement - Laundry', purchaseDate: '2023-06-20', purchaseCost: 380000, currentValue: 300000, status: 'operational', warrantyExpiry: '2026-06-20', lastMaintenance: '2025-07-01' },
  { id: 'ast-006', name: 'Diesel Generator 500KVA', category: 'Power', location: 'Generator Room - B1', purchaseDate: '2020-11-05', purchaseCost: 5200000, currentValue: 3200000, status: 'operational', warrantyExpiry: '2025-11-05', lastMaintenance: '2025-06-15' },
  { id: 'ast-007', name: 'Fire Alarm System', category: 'Safety', location: 'All Floors', purchaseDate: '2022-08-12', purchaseCost: 1200000, currentValue: 900000, status: 'operational', warrantyExpiry: '2025-08-12', lastMaintenance: '2025-04-20' },
  { id: 'ast-008', name: 'CCTV System (64 cameras)', category: 'Security', location: 'All Areas', purchaseDate: '2023-02-28', purchaseCost: 800000, currentValue: 600000, status: 'operational', warrantyExpiry: '2026-02-28', lastMaintenance: '2025-06-10' },
  { id: 'ast-009', name: 'Commercial Kitchen Range', category: 'Kitchen Equipment', location: 'Main Kitchen', purchaseDate: '2022-05-18', purchaseCost: 650000, currentValue: 480000, status: 'operational', warrantyExpiry: '2025-05-18', lastMaintenance: '2025-07-05' },
  { id: 'ast-010', name: 'Water Treatment Plant', category: 'Plumbing', location: 'Utility Block', purchaseDate: '2021-09-01', purchaseCost: 1800000, currentValue: 1200000, status: 'needs_repair', warrantyExpiry: '2024-09-01', lastMaintenance: '2025-03-10' },
  { id: 'ast-011', name: 'Swimming Pool Pump', category: 'Recreation', location: 'Pool Area - Roof', purchaseDate: '2023-12-15', purchaseCost: 120000, currentValue: 100000, status: 'operational', warrantyExpiry: '2026-12-15', lastMaintenance: '2025-06-20' },
  { id: 'ast-012', name: 'PABX Telephone System', category: 'IT & Telecom', location: 'IT Room - B1', purchaseDate: '2022-01-20', purchaseCost: 350000, currentValue: 220000, status: 'operational', warrantyExpiry: '2025-01-20', lastMaintenance: '2025-05-01' },
]

export async function GET() {
  try {
    const total = assets.length
    const operational = assets.filter((a) => a.status === 'operational').length
    const needsRepair = assets.filter((a) => a.status === 'needs_repair').length
    const totalPurchaseValue = assets.reduce((s, a) => s + a.purchaseCost, 0)
    const totalCurrentValue = assets.reduce((s, a) => s + a.currentValue, 0)
    const categories = [...new Set(assets.map((a) => a.category))]

    return NextResponse.json({
      assets,
      total,
      operational,
      needsRepair,
      totalPurchaseValue,
      totalCurrentValue,
      categories,
    })
  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}
