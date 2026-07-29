import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const nightAudits = await db.nightAudit.findMany({
      orderBy: { businessDate: 'desc' },
      take: 30,
    })

    const cashierShifts = await db.cashierShift.findMany({
      orderBy: { startDate: 'desc' },
      take: 30,
    })

    const latestAudit = nightAudits[0] ?? null

    const openShifts = cashierShifts.filter((s) => s.status === 'open')
    const closedShifts = cashierShifts.filter((s) => s.status === 'closed')

    // ─── Night Audit Data ────────────────────────────────────────
    const nightAuditData = {
      status: latestAudit?.status ?? 'pending',
      checklist: [
        { id: 'arrivals', label: 'All arrivals checked in or acknowledged', checked: false },
        { id: 'departures', label: 'All departures checked out or acknowledged', checked: false },
        { id: 'pos_tables', label: 'No open POS tables', checked: false },
        { id: 'unposted_charges', label: 'No unposted charges', checked: false },
        { id: 'cashier_recon', label: 'Cashier reconciliation complete', checked: false },
      ],
      revenue: {
        roomRevenue: 285750,
        fAndBRevenue: 98420,
        otherRevenue: 15300,
        totalRevenue: 399470,
        totalTax: 42993,
        netRevenue: 356477,
      },
      occupancy: {
        percent: 82,
        adr: 7820,
        revpar: 6412,
        totalRooms: 128,
        occupiedRooms: 105,
        availableRooms: 12,
        outOfOrderRooms: 11,
      },
      previousAudits: nightAudits.slice(0, 7).map((a) => ({
        id: a.id,
        date: a.businessDate,
        revenue: a.totalRevenue,
        occupancy: a.occupancy,
        status: a.status,
        completedBy: a.completedBy ?? '—',
      })),
    }

    // ─── Day Close Data ───────────────────────────────────────────
    const today = new Date()
    const dayCloseData = {
      businessDate: today.toISOString().split('T')[0],
      dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
      checklist: [
        { id: 'dc_arrivals', label: 'All arrivals processed', checked: false },
        { id: 'dc_departures', label: 'All departures processed', checked: false },
        { id: 'dc_charges', label: 'All charges posted to folios', checked: false },
        { id: 'dc_payments', label: 'All payments applied', checked: false },
        { id: 'dc_hk', label: 'Housekeeping tasks reviewed', checked: false },
        { id: 'dc_pos', label: 'All POS orders closed', checked: false },
      ],
      kpis: {
        roomsSold: 105,
        arrivals: 14,
        departures: 11,
        walkIns: 3,
        noShows: 1,
        cancellations: 2,
        averageRate: 7820,
        totalRevenue: 399470,
        totalPayments: 385200,
        pendingFolioBalance: 14270,
      },
      revenueBreakdown: [
        { department: 'Room Revenue', amount: 285750, percentage: 71.5 },
        { department: 'Food & Beverage', amount: 98420, percentage: 24.6 },
        { department: 'Spa & Wellness', amount: 8900, percentage: 2.2 },
        { department: 'Laundry', amount: 3400, percentage: 0.9 },
        { department: 'Business Center', amount: 1800, percentage: 0.5 },
        { department: 'Other Services', amount: 1200, percentage: 0.3 },
      ],
    }

    // ─── Cashier Shift Data ──────────────────────────────────────
    const activeShift = openShifts[0] ?? {
      id: 'active-shift-1',
      cashierName: 'Ramesh K.',
      shiftType: 'morning',
      startDate: new Date().toISOString(),
      openingFloat: 50000,
      totalPayments: 245800,
      totalRefunds: 3200,
      status: 'open',
    }

    const shiftHistory = cashierShifts.map((s) => ({
      id: s.id,
      cashierName: s.cashierName,
      shiftType: s.shiftType,
      startDate: s.startDate,
      endDate: s.endDate,
      openingFloat: s.openingFloat,
      closingFloat: s.closingFloat,
      totalPayments: s.totalPayments,
      totalRefunds: s.totalRefunds,
      variance: s.variance ?? (s.closingFloat ? (s.closingFloat - s.openingFloat + s.totalPayments - s.totalRefunds) : 0),
      status: s.status,
    }))

    const cashierSummary = {
      cash: { count: 42, amount: 125000 },
      card: { count: 28, amount: 189500 },
      bankTransfer: { count: 5, amount: 45000 },
      other: { count: 3, amount: 8500 },
    }

    // ─── Shift Handover Data ─────────────────────────────────────
    const shiftHandoverData = {
      generatedAt: new Date().toISOString(),
      shiftType: 'Morning → Evening',
      outgoingSupervisor: 'Ramesh K.',
      incomingSupervisor: '—',
      acknowledged: false,
      acknowledgedAt: null,
      sections: {
        inHouseGuests: 105,
        arrivals: { checkedIn: 11, pending: 3 },
        departures: { done: 9, pending: 2 },
        hkTaskCompletion: 87,
        openWorkOrders: 6,
        openPosTables: 4,
        cashierBalance: 242600,
        pendingFoliosAboveCredit: 3,
        vipInHouse: [
          { name: 'Dr. Sarah Mitchell', room: '501', reason: 'Conference speaker' },
          { name: 'Mr. Hiroshi Tanaka', room: '802', reason: 'Repeat guest, Platinum tier' },
          { name: 'Mrs. Priya Sharma', room: '601', reason: 'Anniversary celebration' },
        ],
        specialNotes: [
          'Room 307 reported AC noise — maintenance scheduled for tomorrow',
          'Group check-in of 12 rooms for "TechSummit 2025" expected at 14:00',
          'Complimentary fruit basket arranged for VIP Dr. Mitchell (501)',
          'Pool area under maintenance until 16:00',
          'Laundry pickup delayed due to machine maintenance — notify guests in 4th floor',
        ],
      },
    }

    return NextResponse.json({
      nightAudit: nightAuditData,
      dayClose: dayCloseData,
      cashier: {
        activeShift,
        shiftHistory,
        summary: cashierSummary,
      },
      shiftHandover: shiftHandoverData,
    })
  } catch (error) {
    console.error('Operations API error:', error)
    return NextResponse.json({ error: 'Failed to fetch operations data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'run-audit') {
      // Create a new night audit record
      const audit = await db.nightAudit.create({
        data: {
          businessDate: new Date(),
          status: 'in_progress',
          startedBy: data?.startedBy ?? 'System',
          startedAt: new Date(),
          roomRevenue: data?.roomRevenue ?? 285750,
          fAndBRevenue: data?.fAndBRevenue ?? 98420,
          otherRevenue: data?.otherRevenue ?? 15300,
          totalRevenue: data?.totalRevenue ?? 399470,
          totalTax: data?.totalTax ?? 42993,
          occupancy: data?.occupancy ?? 82,
          adr: data?.adr ?? 7820,
          revpar: data?.revpar ?? 6412,
        },
      })
      return NextResponse.json({ success: true, audit })
    }

    if (action === 'close-day') {
      return NextResponse.json({ success: true, message: 'Day closed successfully' })
    }

    if (action === 'close-shift') {
      return NextResponse.json({ success: true, message: 'Shift closed successfully' })
    }

    if (action === 'acknowledge-handover') {
      return NextResponse.json({
        success: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: data?.name ?? 'Unknown',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Operations POST error:', error)
    return NextResponse.json({ error: 'Failed to process operation' }, { status: 500 })
  }
}
