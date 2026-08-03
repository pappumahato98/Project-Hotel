/**
 * POST /api/seed
 *
 * Comprehensive data seeder for the Meridian Hotel PMS.
 * Populates ALL missing operational data with realistic Nepal/Kathmandu hotel data.
 * Skips any table that already contains rows (idempotent).
 *
 * Auth: Requires admin/gm/manager role
 * Timeout: 120s (Vercel function limit)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export const maxDuration = 120

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Strip time component, returning a date at midnight Asia/Katmandu (UTC+5:45). */
function todayNepal(): Date {
  const now = new Date()
  // Approximate: Nepal is UTC+5:45. We shift so local midnight maps correctly.
  // Using UTC midday to keep it simple and consistent.
  const utcH = now.getUTCHours()
  // If it is before 05:45 UTC, Kathmandu is still on the previous day.
  if (utcH < 6) {
    now.setUTCDate(now.getUTCDate() - 1)
  }
  now.setUTCHours(0, 0, 0, 0)
  return now
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function setMidnight(d: Date): Date {
  d.setHours(0, 0, 0, 0)
  return d
}

function setHour(d: Date, h: number): Date {
  const r = new Date(d)
  r.setHours(h, 0, 0, 0)
  return r
}

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ─── Main handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check — require admin or gm (bypassed for initial seed with ?seed=true query)
  let authUser: { userId: string; firstName: string; lastName: string } | null = null
  if (req.nextUrl.searchParams.get('seed') !== 'true') {
    const auth = await requireAuth(req, ['admin', 'gm', 'manager'])
    if (auth instanceof NextResponse) return auth
    authUser = { userId: auth.user.userId, firstName: auth.user.firstName, lastName: auth.user.lastName }
  } else {
    // Use a default system user for seed mode
    authUser = { userId: 'system', firstName: 'System', lastName: 'Seeder' }
  }

  const t0 = Date.now()
  const counts: Record<string, number> = {}
  let roomIdsToOccupy: string[] = []

  try {
    // ── Step 0: Query reference data ───────────────────────────────────────
    const [property, roomTypes, allRooms] = await Promise.all([
      db.property.findFirst({ where: { code: 'MH' } }),
      db.roomType.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.room.findMany({ orderBy: { number: 'asc' } }),
    ])

    if (!property) {
      return NextResponse.json(
        { error: 'Property MH not found. Run the base seed first.' },
        { status: 400 },
      )
    }
    if (roomTypes.length === 0) {
      return NextResponse.json(
        { error: 'No room types found. Run the base seed first.' },
        { status: 400 },
      )
    }
    if (allRooms.length === 0) {
      return NextResponse.json(
        { error: 'No rooms found. Run the base seed first.' },
        { status: 400 },
      )
    }

    const today = todayNepal()
    const todayStr = fmtDate(today)

    // Build a map of roomTypeId → available rooms
    const roomsByType: Record<string, typeof allRooms> = {}
    for (const rt of roomTypes) {
      roomsByType[rt.id] = allRooms.filter((r) => r.typeId === rt.id)
    }

    // Available rooms (vacant_clean) for assigning
    const availableRooms = allRooms.filter((r) => r.status === 'available' || r.status === 'vacant_clean')

    // ── a) Rate Plans (skip if exist) ──────────────────────────────────────
    const existingRatePlans = await db.ratePlan.count()
    if (existingRatePlans === 0) {
      const plans: {
        name: string
        code: string
        roomTypeId: string
        baseRate: number
        channel: string
      }[] = []
      for (const rt of roomTypes) {
        plans.push(
          { name: `BAR - ${rt.name}`, code: `BAR-${rt.code}`, roomTypeId: rt.id, baseRate: getBaseRate(rt.code), channel: 'direct' },
          { name: `Corporate - ${rt.name}`, code: `CORP-${rt.code}`, roomTypeId: rt.id, baseRate: Math.round(getBaseRate(rt.code) * 0.85), channel: 'corporate' },
          { name: `OTA - ${rt.name}`, code: `OTA-${rt.code}`, roomTypeId: rt.id, baseRate: Math.round(getBaseRate(rt.code) * 1.1), channel: 'ota' },
        )
      }
      // Cap at 7 plans total (pick subset if more room types)
      const selectedPlans = plans.length > 7 ? plans.slice(0, 7) : plans

      for (const p of selectedPlans) {
        const plan = await db.ratePlan.create({
          data: {
            name: p.name,
            code: p.code,
            propertyId: property.id,
            roomTypeId: p.roomTypeId,
            baseRate: p.baseRate,
            channel: p.channel,
          },
        })
        // Create 30 days of daily rates
        const rateData = []
        for (let d = 0; d < 30; d++) {
          const date = addDays(today, d)
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const rate = isWeekend ? Math.round(p.baseRate * 1.15) : p.baseRate
          rateData.push({
            ratePlanId: plan.id,
            date: setMidnight(date),
            rate,
            available: Math.max(1, Math.floor(Math.random() * 10) + 1),
          })
        }
        await db.dailyRate.createMany({ data: rateData })
      }
      counts.ratePlans = selectedPlans.length
    }

    // ── b) Guests (15) ────────────────────────────────────────────────────
    const existingGuests = await db.guest.count()
    let guestIds: string[] = []
    if (existingGuests === 0) {
      const guestData = [
        { firstName: 'Rajesh', lastName: 'Sharma', nationality: 'Nepalese', vipLevel: 'gold', email: 'rajesh.sharma@email.com', phone: '+977-9841234567', city: 'Kathmandu', country: 'Nepal', loyaltyPoints: 12500, loyaltyTier: 'gold', totalStays: 18, totalRevenue: 485000 },
        { firstName: 'Priya', lastName: 'Patel', nationality: 'Indian', vipLevel: 'gold', email: 'priya.patel@email.com', phone: '+91-9876543210', city: 'New Delhi', country: 'India', loyaltyPoints: 18200, loyaltyTier: 'gold', totalStays: 22, totalRevenue: 620000 },
        { firstName: 'Sarah', lastName: 'Johnson', nationality: 'American', vipLevel: 'platinum', email: 'sarah.j@email.com', phone: '+1-555-0123', city: 'New York', country: 'USA', loyaltyPoints: 45000, loyaltyTier: 'platinum', totalStays: 35, totalRevenue: 1250000 },
        { firstName: 'James', lastName: 'Mitchell', nationality: 'British', vipLevel: 'silver', email: 'j.mitchell@email.com', phone: '+44-7700900123', city: 'London', country: 'UK', loyaltyPoints: 8900, loyaltyTier: 'silver', totalStays: 12, totalRevenue: 310000 },
        { firstName: 'Wei', lastName: 'Chen', nationality: 'Chinese', vipLevel: 'silver', email: 'wei.chen@email.com', phone: '+86-13901234567', city: 'Beijing', country: 'China', loyaltyPoints: 5500, loyaltyTier: 'silver', totalStays: 8, totalRevenue: 195000 },
        { firstName: 'Takeshi', lastName: 'Yamamoto', nationality: 'Japanese', vipLevel: 'none', email: 't.yamamoto@email.com', phone: '+81-90-1234-5678', city: 'Tokyo', country: 'Japan', loyaltyPoints: 1200, loyaltyTier: 'none', totalStays: 3, totalRevenue: 72000 },
        { firstName: 'Lena', lastName: 'Mueller', nationality: 'German', vipLevel: 'silver', email: 'lena.mueller@email.com', phone: '+49-170-1234567', city: 'Berlin', country: 'Germany', loyaltyPoints: 6700, loyaltyTier: 'silver', totalStays: 9, totalRevenue: 225000 },
        { firstName: 'Sophie', lastName: 'Dubois', nationality: 'French', vipLevel: 'gold', email: 'sophie.dubois@email.com', phone: '+33-6-12345678', city: 'Paris', country: 'France', loyaltyPoints: 22000, loyaltyTier: 'gold', totalStays: 28, totalRevenue: 780000 },
        { firstName: 'David', lastName: 'Kim', nationality: 'Korean', vipLevel: 'gold', email: 'david.kim@email.com', phone: '+82-10-1234-5678', city: 'Seoul', country: 'South Korea', loyaltyPoints: 15800, loyaltyTier: 'gold', totalStays: 15, totalRevenue: 430000 },
        { firstName: 'Arjun', lastName: 'Thapa', nationality: 'Nepalese', vipLevel: 'none', email: 'arjun.thapa@email.com', phone: '+977-9851234567', city: 'Pokhara', country: 'Nepal', loyaltyPoints: 500, loyaltyTier: 'none', totalStays: 1, totalRevenue: 12000 },
        { firstName: 'Suman', lastName: 'Rai', nationality: 'Nepalese', vipLevel: 'none', email: 'suman.rai@email.com', phone: '+977-9861234567', city: 'Biratnagar', country: 'Nepal', loyaltyPoints: 300, loyaltyTier: 'none', totalStays: 1, totalRevenue: 8500 },
        { firstName: 'Michael', lastName: 'Brown', nationality: 'Australian', vipLevel: 'none', email: 'm.brown@email.com', phone: '+61-412-345-678', city: 'Sydney', country: 'Australia', loyaltyPoints: 2000, loyaltyTier: 'none', totalStays: 4, totalRevenue: 95000 },
        { firstName: 'Anna', lastName: 'Kovalenko', nationality: 'Ukrainian', vipLevel: 'none', email: 'anna.k@email.com', phone: '+380-50-123-4567', city: 'Kyiv', country: 'Ukraine', loyaltyPoints: 600, loyaltyTier: 'none', totalStays: 2, totalRevenue: 38000 },
        { firstName: 'Ahmed', lastName: 'Al-Rashid', nationality: 'Emirati', vipLevel: 'platinum', email: 'ahmed.ar@email.com', phone: '+971-50-123-4567', city: 'Dubai', country: 'UAE', loyaltyPoints: 52000, loyaltyTier: 'platinum', totalStays: 42, totalRevenue: 1850000 },
        { firstName: 'Maria', lastName: 'Santos', nationality: 'Filipino', vipLevel: 'none', email: 'maria.s@email.com', phone: '+63-917-123-4567', city: 'Manila', country: 'Philippines', loyaltyPoints: 800, loyaltyTier: 'none', totalStays: 2, totalRevenue: 28000 },
      ]

      const created = await db.guest.createMany({
        data: guestData.map((g) => ({
          ...g,
          lastStayAt: addDays(today, -Math.floor(Math.random() * 30)),
          dateOfBirth: null,
          gender: null,
          address: null,
        })),
      })
      counts.guests = created.count

      // Fetch back the IDs
      const guests = await db.guest.findMany({ select: { id: true } })
      guestIds = guests.map((g) => g.id)
    } else {
      const guests = await db.guest.findMany({ select: { id: true } })
      guestIds = guests.map((g) => g.id)
    }

    // ── c) Reservations (30) ──────────────────────────────────────────────
    const existingReservations = await db.reservation.count()
    let checkedInResIds: string[] = []
    let checkedOutResIds: string[] = []
    let arrivingResIds: string[] = []
    let departingResIds: string[] = []

    if (existingReservations === 0) {
      const ratePlans = await db.ratePlan.findMany()
      const resIndex = { i: 0 }

      // Helper: get next sequential room from available pool
      let roomPointer = 0
      function nextAvailableRoom(): typeof availableRooms[0] {
        if (roomPointer >= availableRooms.length) roomPointer = 0
        return availableRooms[roomPointer++]
      }

      // 5 checked_in — checked in 1-3 days ago, departure in 1-4 days
      const checkedInResData = []
      for (let i = 0; i < 5; i++) {
        const room = nextAvailableRoom()
        const ci = addDays(today, -(Math.floor(Math.random() * 3) + 1))
        const co = addDays(today, Math.floor(Math.random() * 4) + 1)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        checkedInResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, 'checked_in'))
      }

      // 3 arriving today — checkIn = today, departure in 2-5 days
      const arrivingResData = []
      for (let i = 0; i < 3; i++) {
        const room = nextAvailableRoom()
        const ci = setHour(today, 14)
        const co = addDays(today, Math.floor(Math.random() * 4) + 2)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        arrivingResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, 'confirmed'))
      }

      // 2 departing today — checkIn a few days ago, checkOut = today
      const departingResData = []
      for (let i = 0; i < 2; i++) {
        const room = nextAvailableRoom()
        const ci = addDays(today, -(Math.floor(Math.random() * 3) + 1))
        const co = setHour(today, 12)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        departingResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, 'checked_in'))
      }

      // 5 future confirmed — checkIn in next 1-7 days
      const futureResData = []
      for (let i = 0; i < 5; i++) {
        const room = nextAvailableRoom()
        const ciOffset = Math.floor(Math.random() * 7) + 1
        const ci = addDays(today, ciOffset)
        const co = addDays(ci, Math.floor(Math.random() * 4) + 1)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        futureResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, 'confirmed'))
      }

      // 8 checked_out — past dates
      const checkedOutResData = []
      for (let i = 0; i < 8; i++) {
        const room = allRooms[Math.floor(Math.random() * allRooms.length)]
        const ci = addDays(today, -(Math.floor(Math.random() * 10) + 3))
        const co = addDays(ci, Math.floor(Math.random() * 5) + 1)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        checkedOutResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, 'checked_out'))
      }

      // 7 various (cancelled, no_show, etc.)
      const variousResData = []
      const variousStatuses = ['cancelled', 'cancelled', 'no_show', 'no_show', 'cancelled', 'tentative', 'tentative']
      for (let i = 0; i < 7; i++) {
        const room = allRooms[Math.floor(Math.random() * allRooms.length)]
        const ci = addDays(today, -(Math.floor(Math.random() * 7) + 1))
        const co = addDays(ci, Math.floor(Math.random() * 4) + 1)
        const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]
        const nights = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
        variousResData.push(makeReservation(room, ci, co, rp.baseRate, nights, resIndex, guestIds, property.id, ratePlans, variousStatuses[i]))
      }

      // Insert all reservations
      const allResData = [...checkedInResData, ...arrivingResData, ...departingResData, ...futureResData, ...checkedOutResData, ...variousResData]

      const createdRes = await db.reservation.createMany({ data: allResData })
      counts.reservations = createdRes.count

      // Fetch reservations with IDs
      const allCreatedReservations = await db.reservation.findMany({
        orderBy: { createdAt: 'asc' },
      })
      const offset = 0
      checkedInResIds = allCreatedReservations.filter((r) => r.status === 'checked_in').map((r) => r.id)
      checkedOutResIds = allCreatedReservations.filter((r) => r.status === 'checked_out').map((r) => r.id)
      arrivingResIds = allCreatedReservations.slice(offset, offset + 5).filter((r) => r.checkIn.toISOString().slice(0, 10) === todayStr).map((r) => r.id)
      departingResIds = allCreatedReservations.filter((r) => {
        return r.status === 'checked_in' && r.checkOut.toISOString().slice(0, 10) === todayStr
      }).map((r) => r.id)

      // Mark rooms as occupied for checked_in reservations
      for (const res of allCreatedReservations) {
        if (res.status === 'checked_in' && res.roomId) {
          roomIdsToOccupy.push(res.roomId)
        }
      }
    } else {
      // Existing reservations: just find the checked_in/checked_out ones
      const existingRes = await db.reservation.findMany()
      checkedInResIds = existingRes.filter((r) => r.status === 'checked_in').map((r) => r.id)
      checkedOutResIds = existingRes.filter((r) => r.status === 'checked_out').map((r) => r.id)
      for (const res of existingRes) {
        if (res.status === 'checked_in' && res.roomId) {
          roomIdsToOccupy.push(res.roomId)
        }
      }
    }

    // Update room statuses to occupied where needed
    if (roomIdsToOccupy.length > 0) {
      await db.room.updateMany({
        where: { id: { in: roomIdsToOccupy } },
        data: { status: 'occupied' },
      })
      counts.roomsOccupied = roomIdsToOccupy.length
    }

    // ── d) Folios & Transactions ──────────────────────────────────────────
    const existingFolios = await db.folio.count()
    if (existingFolios === 0) {
      const folioReservations = await db.reservation.findMany({
        where: { id: { in: [...checkedInResIds, ...checkedOutResIds] } },
        include: { room: { select: { number: true } } },
      })

      let totalTransactions = 0
      let totalPayments = 0

      for (const res of folioReservations) {
        if (!res.guestId) continue
        const isClosed = res.status === 'checked_out'

        // Create folio
        const folio = await db.folio.create({
          data: {
            reservationId: res.id,
            guestId: res.guestId,
            folioType: 'guest',
            status: isClosed ? 'closed' : 'open',
            balance: 0,
          },
        })

        // Room charges per night (only for nights that have passed)
        const nights = Math.ceil(
          (new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000,
        )
        const roomTxData: {
          folioId: string
          transactionType: string
          description: string
          amount: number
          taxAmount: number
          totalAmount: number
          quantity: number
          outlet: string
          postedBy: string
        }[] = []

        const effectiveEnd = isClosed ? new Date(res.checkOut) : new Date()
        for (let n = 0; n < nights; n++) {
          const nightDate = addDays(new Date(res.checkIn), n)
          if (nightDate >= effectiveEnd) break
          const roomNum = res.room?.number || 'TBD'
          const tax = Math.round(res.roomRate * 0.13)
          roomTxData.push({
            folioId: folio.id,
            transactionType: 'room',
            description: `Room ${roomNum} — Night ${n + 1} charge`,
            amount: res.roomRate,
            taxAmount: tax,
            totalAmount: res.roomRate + tax,
            quantity: 1,
            outlet: 'Front Desk',
            postedBy: 'Night Audit',
          })
        }

        // F&B charges (1-3 per reservation)
        const fbCharges = [
          { desc: 'Himalayan Restaurant — Dal Bhat Dinner', amount: 650 },
          { desc: 'Himalayan Restaurant — Grilled Salmon Lunch', amount: 2200 },
          { desc: 'Room Service — Breakfast Set', amount: 1200 },
          { desc: 'Summit Bar — Cocktails (2)', amount: 1800 },
          { desc: 'Summit Bar — Everest Beer x3', amount: 900 },
          { desc: 'Kathmandu Coffee House — Cappuccino & Cake', amount: 550 },
          { desc: 'Room Service — Chicken Momo Platter', amount: 750 },
        ]
        const numFb = Math.floor(Math.random() * 3) + 1
        for (let f = 0; f < numFb; f++) {
          const fb = pick(fbCharges)
          const tax = Math.round(fb.amount * 0.13)
          roomTxData.push({
            folioId: folio.id,
            transactionType: 'f_and_b',
            description: fb.desc,
            amount: fb.amount,
            taxAmount: tax,
            totalAmount: fb.amount + tax,
            quantity: 1,
            outlet: fb.desc.includes('Room Service') ? 'Room Service' : fb.desc.includes('Bar') ? 'Summit Bar' : fb.desc.includes('Coffee') ? 'Kathmandu Coffee House' : 'Himalayan Restaurant',
            postedBy: 'POS System',
          })
        }

        // Misc charges (1-2 per reservation)
        const miscCharges = [
          { desc: 'Laundry — Express Wash (5 items)', amount: 800, type: 'laundry' as const },
          { desc: 'Zen Spa — Full Body Massage', amount: 3500, type: 'spa' as const },
          { desc: 'Zen Spa — Facial Treatment', amount: 2500, type: 'spa' as const },
          { desc: 'Minibar — Beverages & Snacks', amount: 1200, type: 'minibar' as const },
          { desc: 'Business Center — Printing & Fax', amount: 450, type: 'business_center' as const },
          { desc: 'Laundry — Dry Cleaning (3 pcs)', amount: 600, type: 'laundry' as const },
          { desc: 'Gift Shop — Pashmina Scarf', amount: 3500, type: 'miscellaneous' as const },
        ]
        const numMisc = Math.floor(Math.random() * 2) + 1
        for (let m = 0; m < numMisc; m++) {
          const mc = pick(miscCharges)
          const tax = Math.round(mc.amount * 0.13)
          roomTxData.push({
            folioId: folio.id,
            transactionType: mc.type,
            description: mc.desc,
            amount: mc.amount,
            taxAmount: tax,
            totalAmount: mc.amount + tax,
            quantity: 1,
            outlet: mc.type === 'spa' ? 'Zen Spa' : mc.type === 'laundry' ? 'Laundry' : mc.type === 'business_center' ? 'Business Center' : 'Front Desk',
            postedBy: 'Front Desk',
          })
        }

        if (roomTxData.length > 0) {
          await db.folioTransaction.createMany({ data: roomTxData })
          totalTransactions += roomTxData.length
        }

        // Calculate folio balance
        const allTxs = await db.folioTransaction.findMany({ where: { folioId: folio.id } })
        const balance = allTxs.reduce((sum, t) => sum + t.totalAmount, 0)

        // Payments for checked_out
        if (isClosed) {
          const paymentMethods = ['cash', 'card', 'bank_transfer', 'card']
          const method = pick(paymentMethods)
          await db.folioPayment.create({
            data: {
              folioId: folio.id,
              paymentMethod: method,
              amount: balance,
              cardType: method === 'card' ? pick(['visa', 'mastercard']) : null,
              receivedBy: 'Front Desk',
              status: 'completed',
            },
          })
          totalPayments++
        }

        // Update folio balance
        const paidAmount = isClosed ? balance : 0
        await db.folio.update({
          where: { id: folio.id },
          data: { balance: balance - paidAmount },
        })
      }

      counts.folios = folioReservations.length
      counts.folioTransactions = totalTransactions
      counts.folioPayments = totalPayments
    }

    // ── e) Outlets & Menu (7 outlets) ──────────────────────────────────────
    const existingOutlets = await db.outlet.count()
    if (existingOutlets === 0) {
      const outlets = [
        { name: 'Himalayan Restaurant', code: 'HIMALAYAN', type: 'restaurant', description: 'Fine dining with authentic Nepali and international cuisine', location: 'Ground Floor' },
        { name: 'Summit Bar', code: 'SUMMIT', type: 'bar', description: 'Rooftop bar with mountain views and signature cocktails', location: 'Rooftop' },
        { name: 'Kathmandu Coffee House', code: 'KCH', type: 'restaurant', description: 'Cozy café specializing in Nepali tea and pastries', location: 'Lobby Level' },
        { name: 'Zen Spa', code: 'ZENSPA', type: 'spa', description: 'Full-service spa with Ayurvedic and Western treatments', location: 'Basement 1' },
        { name: 'Business Center', code: 'BIZCTR', type: 'business_center', description: 'Meeting rooms, printing, fax, and secretarial services', location: 'Mezzanine' },
        { name: 'Meridian Laundry', code: 'LAUNDRY', type: 'laundry', description: 'Express and standard laundry, dry cleaning service', location: 'Basement 2' },
        { name: 'Nepal Gift Shop', code: 'GIFTSHOP', type: 'gift_shop', description: 'Handicrafts, pashmina, tea, and souvenirs', location: 'Lobby' },
      ]

      const menuDataByType: Record<string, { name: string; category: string; price: number }[]> = {
        restaurant: [
          { name: 'Dal Bhat Set (Chicken)', category: 'Main Course', price: 650 },
          { name: 'Chicken Momo (10 pcs)', category: 'Appetizer', price: 450 },
          { name: 'Grilled Salmon Fillet', category: 'Main Course', price: 2200 },
          { name: 'Thali Special', category: 'Main Course', price: 800 },
          { name: 'Newari Choila', category: 'Appetizer', price: 550 },
          { name: 'Chicken Curry', category: 'Main Course', price: 750 },
          { name: 'Vegetable Spring Rolls', category: 'Appetizer', price: 380 },
          { name: 'Garden Fresh Salad', category: 'Salad', price: 420 },
          { name: 'Mango Lassi', category: 'Beverage', price: 250 },
          { name: 'Tibetan Bread with Honey', category: 'Breakfast', price: 350 },
        ],
        bar: [
          { name: 'Everest Cocktail', category: 'Cocktail', price: 800 },
          { name: 'Trekker\'s Gin & Tonic', category: 'Cocktail', price: 650 },
          { name: 'Nepali Khukuri Rum', category: 'Spirits', price: 550 },
          { name: 'Tuborg Beer (pint)', category: 'Beer', price: 350 },
          { name: 'Red Wine — Merlot (glass)', category: 'Wine', price: 600 },
          { name: 'White Wine — Chardonnay (glass)', category: 'Wine', price: 600 },
          { name: 'Whisky — Johnnie Walker Black', category: 'Spirits', price: 900 },
          { name: 'Mocktail — Himalayan Sunrise', category: 'Mocktail', price: 300 },
          { name: 'Assorted Bar Snacks', category: 'Snacks', price: 450 },
          { name: 'Cheese Platter', category: 'Snacks', price: 750 },
        ],
        spa: [
          { name: 'Full Body Massage (60 min)', category: 'Massage', price: 3500 },
          { name: 'Ayurvedic Massage (90 min)', category: 'Massage', price: 5000 },
          { name: 'Facial Treatment', category: 'Skin Care', price: 2500 },
          { name: 'Hot Stone Therapy', category: 'Massage', price: 4000 },
          { name: 'Hair Spa & Treatment', category: 'Hair', price: 1800 },
          { name: 'Manicure & Pedicure', category: 'Nail Care', price: 1500 },
          { name: 'Aromatherapy Session (45 min)', category: 'Wellness', price: 2800 },
        ],
        business_center: [
          { name: 'Meeting Room Rental (4 hrs)', category: 'Room', price: 5000 },
          { name: 'Boardroom (Full Day)', category: 'Room', price: 15000 },
          { name: 'Printing (B&W per page)', category: 'Print', price: 10 },
          { name: 'Printing (Color per page)', category: 'Print', price: 50 },
          { name: 'International Fax', category: 'Communication', price: 150 },
          { name: 'Lamination (A4)', category: 'Services', price: 80 },
          { name: 'Binding (per document)', category: 'Services', price: 200 },
        ],
        laundry: [
          { name: 'Shirt Wash & Iron', category: 'Wash', price: 120 },
          { name: 'Trousers Dry Clean', category: 'Dry Clean', price: 250 },
          { name: 'Suit Dry Clean (3 pc)', category: 'Dry Clean', price: 800 },
          { name: 'Saree Wash', category: 'Wash', price: 350 },
          { name: 'Bed Sheet Wash (per pc)', category: 'Linen', price: 150 },
          { name: 'Express Wash (surcharge)', category: 'Service', price: 200 },
          { name: 'Duvet Cover Dry Clean', category: 'Dry Clean', price: 400 },
        ],
        gift_shop: [
          { name: 'Pashmina Scarf', category: 'Souvenir', price: 3500 },
          { name: 'Prayer Flags Set', category: 'Souvenir', price: 500 },
          { name: 'Nepali Tea Box (Ilam Gold)', category: 'Food', price: 800 },
          { name: 'Postcard Pack (10)', category: 'Souvenir', price: 200 },
          { name: 'Singing Bowl (Small)', category: 'Souvenir', price: 2500 },
          { name: 'Tibetan Thangka (Mini)', category: 'Art', price: 4500 },
          { name: 'Khukuri Knife', category: 'Souvenir', price: 3000 },
          { name: 'Organic Honey (500g)', category: 'Food', price: 650 },
        ],
      }

      const createdOutlets = []
      for (const o of outlets) {
        const outlet = await db.outlet.create({ data: o })
        const items = menuDataByType[o.type] || []
        if (items.length > 0) {
          await db.menuItem.createMany({
            data: items.map((item, idx) => ({
              outletId: outlet.id,
              name: item.name,
              category: item.category,
              price: item.price,
              sortOrder: idx,
            })),
          })
        }
        createdOutlets.push(outlet)
      }
      counts.outlets = createdOutlets.length
    }

    // ── f) POS Orders (15) ────────────────────────────────────────────────
    const existingOrders = await db.posOrder.count()
    if (existingOrders === 0) {
      const outletRecords = await db.outlet.findMany()
      const statuses = ['open', 'in_progress', 'ready', 'closed', 'closed', 'closed']
      let totalOrderItems = 0

      for (let i = 0; i < 15; i++) {
        const outlet = outletRecords[Math.floor(Math.random() * Math.min(4, outletRecords.length))]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const order = await db.posOrder.create({
          data: {
            outletId: outlet.id,
            tableNumber: Math.floor(Math.random() * 15) + 1,
            status,
            serverName: pick(['Ramesh', 'Sunita', 'Bikash', 'Deepa', 'Anita', 'Kamal']),
            guestCount: Math.floor(Math.random() * 4) + 1,
            totalAmount: 0,
            taxAmount: 0,
            paymentStatus: status === 'closed' ? 'paid' : 'unpaid',
            createdAt: addDays(today, -(Math.floor(Math.random() * 2))),
          },
        })

        const menuItems = await db.menuItem.findMany({ where: { outletId: outlet.id } })
        const numItems = Math.floor(Math.random() * 4) + 1
        let orderTotal = 0
        const orderItemsData = []
        for (let j = 0; j < numItems; j++) {
          const mi = menuItems[Math.floor(Math.random() * menuItems.length)]
          const qty = Math.floor(Math.random() * 3) + 1
          const lineTotal = mi.price * qty
          orderTotal += lineTotal
          orderItemsData.push({
            orderId: order.id,
            menuItemId: mi.id,
            quantity: qty,
            unitPrice: mi.price,
            totalPrice: lineTotal,
            status: status === 'closed' ? 'served' : status === 'ready' ? 'ready' : 'pending',
          })
        }
        if (orderItemsData.length > 0) {
          await db.orderItem.createMany({ data: orderItemsData })
          totalOrderItems += orderItemsData.length
        }
        await db.posOrder.update({
          where: { id: order.id },
          data: { totalAmount: orderTotal, taxAmount: Math.round(orderTotal * 0.13) },
        })
      }
      counts.posOrders = 15
      counts.orderItems = totalOrderItems
    }

    // ── g) Employees (20) ──────────────────────────────────────────────────
    const existingEmployees = await db.employee.count()
    let employeeRecords: { id: string; firstName: string; lastName: string; department: string; position: string }[] = []

    if (existingEmployees === 0) {
      const employees = [
        { firstName: 'Ramesh', lastName: 'Karki', department: 'Front Office', position: 'Front Desk Manager', role: 'manager', salary: 55000, hireDate: '2020-03-15' },
        { firstName: 'Sunita', lastName: 'Thapa', department: 'Front Office', position: 'Receptionist', role: 'staff', salary: 25000, hireDate: '2022-06-01' },
        { firstName: 'Bikash', lastName: 'Gurung', department: 'Front Office', position: 'Night Auditor', role: 'staff', salary: 28000, hireDate: '2021-09-10' },
        { firstName: 'Anita', lastName: 'Magar', department: 'Housekeeping', position: 'HK Supervisor', role: 'supervisor', salary: 32000, hireDate: '2019-04-20' },
        { firstName: 'Srijana', lastName: 'Khadka', department: 'Housekeeping', position: 'Room Attendant', role: 'staff', salary: 18000, hireDate: '2023-01-15' },
        { firstName: 'Deepa', lastName: 'Rai', department: 'F&B', position: 'F&B Manager', role: 'manager', salary: 60000, hireDate: '2018-07-01' },
        { firstName: 'Prakash', lastName: 'Shrestha', department: 'F&B', position: 'Head Chef', role: 'staff', salary: 70000, hireDate: '2017-11-01' },
        { firstName: 'Kamal', lastName: 'Tamang', department: 'F&B', position: 'Waiter', role: 'staff', salary: 17000, hireDate: '2023-05-10' },
        { firstName: 'Sanjay', lastName: 'Mishra', department: 'Spa', position: 'Spa Manager', role: 'manager', salary: 45000, hireDate: '2020-08-15' },
        { firstName: 'Binita', lastName: 'Lama', department: 'Spa', position: 'Therapist', role: 'staff', salary: 22000, hireDate: '2022-03-01' },
        { firstName: 'Raju', lastName: 'Maharjan', department: 'Engineering', position: 'Maintenance Head', role: 'supervisor', salary: 35000, hireDate: '2019-06-01' },
        { firstName: 'Krishti', lastName: 'Poudel', department: 'Engineering', position: 'Electrician', role: 'staff', salary: 20000, hireDate: '2022-09-15' },
        { firstName: 'Kamal', lastName: 'Basnet', department: 'Accounting', position: 'Accountant', role: 'staff', salary: 40000, hireDate: '2020-02-01' },
        { firstName: 'Samjhana', lastName: 'Basnet', department: 'HR', position: 'HR Manager', role: 'manager', salary: 55000, hireDate: '2019-01-15' },
        { firstName: 'Hari', lastName: 'Budhathoki', department: 'Security', position: 'Security Supervisor', role: 'supervisor', salary: 28000, hireDate: '2021-04-01' },
        { firstName: 'Nirmal', lastName: 'Dangi', department: 'Security', position: 'Security Guard', role: 'staff', salary: 18000, hireDate: '2023-02-20' },
        { firstName: 'Dipendra', lastName: 'Shah', department: 'Management', position: 'General Manager', role: 'gm', salary: 120000, hireDate: '2016-01-10' },
        { firstName: 'Srijana', lastName: 'Tamang', department: 'Management', position: 'Executive Assistant', role: 'staff', salary: 35000, hireDate: '2021-07-01' },
        { firstName: 'Pradeep', lastName: 'Neupane', department: 'Management', position: 'Revenue Manager', role: 'manager', salary: 55000, hireDate: '2020-05-15' },
        { firstName: 'Laxmi', lastName: 'Pokharel', department: 'Housekeeping', position: 'Laundry Supervisor', role: 'supervisor', salary: 25000, hireDate: '2021-11-01' },
      ]

      const createdEmps = await db.employee.createMany({
        data: employees.map((e) => ({
          ...e,
          propertyId: property.id,
          email: `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}@meridianhotel.com`,
          phone: `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 17),
          hireDate: new Date(e.hireDate),
          status: 'active',
        })),
      })
      counts.employees = createdEmps.count

      employeeRecords = await db.employee.findMany({
        select: { id: true, firstName: true, lastName: true, department: true, position: true },
      })
    } else {
      employeeRecords = await db.employee.findMany({
        select: { id: true, firstName: true, lastName: true, department: true, position: true },
      })
    }

    // ── h) Housekeeping Tasks (12) ────────────────────────────────────────
    const existingHkTasks = await db.hkTask.count()
    if (existingHkTasks === 0) {
      const hkStatuses = ['pending', 'pending', 'assigned', 'assigned', 'in_progress', 'in_progress', 'in_progress', 'cleaned', 'cleaned', 'cleaned', 'inspected', 'failed']
      const hkTypes = ['checkout', 'stayover', 'turndown', 'deep_clean', 'checkout', 'stayover', 'checkout', 'stayover', 'stayover', 'turndown', 'stayover', 'checkout']
      const hkPriorities = ['normal', 'normal', 'high', 'vip', 'rush', 'normal', 'normal', 'normal', 'normal', 'normal', 'high', 'normal']

      // Pick 12 different rooms
      const taskRooms = pickN(allRooms, 12)
      const hkAttendants = employeeRecords.filter((e) => e.department === 'Housekeeping')

      const hkTaskData = taskRooms.map((room, idx) => ({
        roomId: room.id,
        taskType: hkTypes[idx],
        status: hkStatuses[idx],
        priority: hkPriorities[idx],
        assignedTo: hkAttendants.length > 0 ? pick(hkAttendants).id : null,
        inspectedBy: null,
        scheduledTime: setHour(today, 8 + Math.floor(Math.random() * 4)),
        completedTime: ['cleaned', 'inspected'].includes(hkStatuses[idx]) ? setHour(today, 10 + Math.floor(Math.random() * 4)) : null,
        estimatedMinutes: pick([25, 30, 35, 40, 45, 60]),
        notes: null,
      }))

      await db.hkTask.createMany({ data: hkTaskData })
      counts.hkTasks = hkTaskData.length
    }

    // ── i) HK Workflows (6) ────────────────────────────────────────────────
    const existingHkWorkflows = await db.hkWorkFlow.count()
    if (existingHkWorkflows === 0) {
      const wfStatuses = ['open', 'open', 'in_progress', 'in_progress', 'completed', 'completed']
      const wfRooms = pickN(allRooms, 6)
      const hkStaff = employeeRecords.filter((e) => e.department === 'Housekeeping')

      const wfData = [
        { title: 'Deep Clean — Suite preparation', description: 'Full deep clean for VIP arrival', priority: 'high', category: 'service', status: 'open', roomId: wfRooms[0]?.id, assignedTo: hkStaff[0]?.id, assignedByName: 'Anita Magar' },
        { title: 'Carpet shampooing — Floor 2 corridor', description: 'Annual carpet deep clean for F2', priority: 'medium', category: 'maintenance', status: 'open', roomId: null, assignedTo: null, assignedByName: null },
        { title: 'Pest control inspection — Room 205', description: 'Scheduled pest control follow-up', priority: 'low', category: 'inspection', status: 'in_progress', roomId: wfRooms[1]?.id, assignedTo: hkStaff[1]?.id, assignedByName: 'Anita Magar' },
        { title: 'Curtain replacement — Floor 3', description: 'Replace faded curtains in all F3 rooms', priority: 'medium', category: 'maintenance', status: 'in_progress', roomId: wfRooms[2]?.id, assignedTo: hkStaff[0]?.id, assignedByName: 'Anita Magar' },
        { title: 'Pillow sanitization batch', description: 'Quarterly pillow sanitization', priority: 'low', category: 'service', status: 'completed', roomId: null, assignedTo: hkStaff[1]?.id, assignedByName: 'Anita Magar', completedAt: addDays(today, -1) },
        { title: 'Mattress rotation — Deluxe rooms', description: 'Rotate and flip mattresses in DLX rooms', priority: 'medium', category: 'service', status: 'completed', roomId: wfRooms[3]?.id, assignedTo: hkStaff[0]?.id, assignedByName: 'Anita Magar', completedAt: addDays(today, -2) },
      ]

      await db.hkWorkFlow.createMany({
        data: wfData.map((w) => ({
          ...w,
          requestedDate: addDays(today, -(Math.floor(Math.random() * 5) + 1)),
          dueDate: w.status === 'completed' ? addDays(today, -1) : addDays(today, Math.floor(Math.random() * 3) + 1),
        })),
      })
      counts.hkWorkflows = wfData.length
    }

    // ── j) Work Orders (8) ─────────────────────────────────────────────────
    const existingWorkOrders = await db.workOrder.count()
    if (existingWorkOrders === 0) {
      const engStaff = employeeRecords.filter((e) => e.department === 'Engineering')
      const woRooms = pickN(allRooms, 6)

      const workOrders = [
        { title: 'AC unit not cooling — Room 101', description: 'Guest reports AC blowing warm air. Compressor may need servicing.', priority: 'high', status: 'open', category: 'hvac', roomId: woRooms[0]?.id, assignedTo: null, reportedBy: 'Front Desk' },
        { title: 'Leaking faucet — Room 203', description: 'Bathroom faucet dripping continuously. Washer replacement needed.', priority: 'normal', status: 'in_progress', category: 'plumbing', roomId: woRooms[1]?.id, assignedTo: engStaff[0]?.id, reportedBy: 'HK Supervisor' },
        { title: 'Broken window latch — Room 307', description: 'Window does not latch properly. Security concern.', priority: 'high', status: 'open', category: 'general', roomId: woRooms[2]?.id, assignedTo: engStaff[1]?.id, reportedBy: 'Guest' },
        { title: 'Electrical socket sparking — Room 108', description: 'Socket near bedside emitting sparks when used.', priority: 'emergency', status: 'in_progress', category: 'electrical', roomId: woRooms[3]?.id, assignedTo: engStaff[0]?.id, reportedBy: 'Night Auditor' },
        { title: 'Repaint scuffed walls — Corridor F2', description: 'Multiple scuff marks on F2 east wing corridor walls.', priority: 'low', status: 'completed', category: 'painting', roomId: null, assignedTo: engStaff[1]?.id, reportedBy: 'HK Supervisor', completedAt: addDays(today, -1) },
        { title: 'Replace TV remote — Room 405', description: 'Remote control buttons not responding.', priority: 'normal', status: 'completed', category: 'general', roomId: woRooms[4]?.id, assignedTo: engStaff[0]?.id, reportedBy: 'Guest', completedAt: addDays(today, -2) },
        { title: 'Fix door hinge — Room 210', description: 'Room door creaks loudly. Hinge lubrication/replacement.', priority: 'normal', status: 'open', category: 'general', roomId: woRooms[5]?.id, assignedTo: null, reportedBy: 'Guest' },
        { title: 'Gym equipment maintenance', description: 'Treadmill belt slipping. Annual service required.', priority: 'low', status: 'completed', category: 'general', roomId: null, assignedTo: engStaff[1]?.id, reportedBy: 'Management', completedAt: addDays(today, -3) },
      ]

      await db.workOrder.createMany({ data: workOrders })
      counts.workOrders = workOrders.length
    }

    // ── k) Night Audits (5) ───────────────────────────────────────────────
    const existingNightAudits = await db.nightAudit.count()
    if (existingNightAudits === 0) {
      const nightAuditData = []
      for (let d = 4; d >= 0; d--) {
        const bizDate = addDays(today, -d)
        const roomRev = 85000 + Math.floor(Math.random() * 60000)
        const fbRev = 25000 + Math.floor(Math.random() * 20000)
        const otherRev = 5000 + Math.floor(Math.random() * 8000)
        const totalRev = roomRev + fbRev + otherRev
        const occupiedRooms = 35 + Math.floor(Math.random() * 30)
        const totalTax = Math.round(totalRev * 0.13)
        nightAuditData.push({
          businessDate: setMidnight(bizDate),
          status: 'completed',
          startedBy: pick(['Bikash Gurung', 'Ramesh Karki']),
          completedBy: pick(['Bikash Gurung', 'Ramesh Karki']),
          startedAt: setHour(addDays(today, -d), 23),
          completedAt: setHour(today, 1),
          roomRevenue: roomRev,
          fAndBRevenue: fbRev,
          otherRevenue: otherRev,
          totalRevenue: totalRev,
          totalTax,
          occupancy: Math.round((occupiedRooms / allRooms.length) * 10000) / 100,
          adr: Math.round(roomRev / occupiedRooms),
          revpar: Math.round(roomRev / allRooms.length),
          notes: d === 0 ? 'Shift handover complete' : null,
        })
      }
      await db.nightAudit.createMany({ data: nightAuditData })
      counts.nightAudits = nightAuditData.length
    }

    // ── l) Events & Banquets (4) ──────────────────────────────────────────
    const existingEvents = await db.event.count()
    if (existingEvents === 0) {
      const events = [
        {
          name: 'TechCorp Annual Strategy Meeting',
          organizerName: 'TechCorp Nepal Pvt Ltd',
          organizerPhone: '+977-1-4567890',
          organizerEmail: 'events@techcorp.com.np',
          eventType: 'corporate',
          venue: 'Grand Ballroom',
          startDate: setHour(addDays(today, 1), 9),
          endDate: setHour(addDays(today, 1), 17),
          expectedPax: 80,
          status: 'confirmed',
          totalRevenue: 180000,
          depositAmount: 50000,
          depositPaid: 50000,
          notes: 'Requires projector, microphone system, tea breaks at 11am and 3pm. Lunch for 80 pax.',
        },
        {
          name: 'Sharma-Patel Wedding Reception',
          organizerName: 'Mr. Raj Sharma',
          organizerPhone: '+977-9841234567',
          organizerEmail: 'raj.sharma@email.com',
          eventType: 'wedding',
          venue: 'Rooftop Terrace',
          startDate: setHour(addDays(today, 3), 18),
          endDate: setHour(addDays(today, 3), 23),
          expectedPax: 150,
          status: 'confirmed',
          totalRevenue: 450000,
          depositAmount: 100000,
          depositPaid: 75000,
          notes: 'Traditional Nepali wedding. Mandap setup required. Live band arranged separately.',
        },
        {
          name: 'Nepal Tourism Conference 2025',
          organizerName: 'Nepal Tourism Board',
          organizerPhone: '+977-1-4256789',
          organizerEmail: 'conference@ntb.gov.np',
          eventType: 'conference',
          venue: 'Convention Hall',
          startDate: setHour(addDays(today, 7), 8),
          endDate: setHour(addDays(today, 9), 17),
          expectedPax: 200,
          status: 'tentative',
          totalRevenue: 750000,
          depositAmount: 150000,
          depositPaid: 0,
          notes: '3-day conference with breakout sessions. AV setup, simultaneous translation needed.',
        },
        {
          name: 'Birthday Celebration — Mr. Chen Wei',
          organizerName: 'Wei Chen',
          organizerPhone: '+86-13901234567',
          organizerEmail: 'wei.chen@email.com',
          eventType: 'birthday',
          venue: 'Private Dining Room',
          startDate: setHour(addDays(today, -2), 19),
          endDate: setHour(addDays(today, -2), 22),
          expectedPax: 20,
          status: 'completed',
          totalRevenue: 35000,
          depositAmount: 10000,
          depositPaid: 35000,
          notes: 'Custom cake ordered. Special vegetarian menu requested.',
        },
      ]
      await db.event.createMany({ data: events })
      counts.events = events.length
    }

    // ── m) Inventory Items (15) ───────────────────────────────────────────
    const existingInventory = await db.inventoryItem.count()
    if (existingInventory === 0) {
      const invItems = [
        { name: 'Bed Sheets (King)', category: 'Linen', unit: 'piece', currentStock: 200, reorderPoint: 80, unitCost: 850, location: 'Linen Store' },
        { name: 'Bath Towels (White)', category: 'Linen', unit: 'piece', currentStock: 300, reorderPoint: 120, unitCost: 450, location: 'Linen Store' },
        { name: 'Pillow Cases', category: 'Linen', unit: 'piece', currentStock: 250, reorderPoint: 100, unitCost: 200, location: 'Linen Store' },
        { name: 'Hand Towels', category: 'Linen', unit: 'piece', currentStock: 150, reorderPoint: 60, unitCost: 280, location: 'Linen Store' },
        { name: 'Toilet Paper Rolls', category: 'Amenities', unit: 'pack', currentStock: 500, reorderPoint: 200, unitCost: 65, location: 'Main Store' },
        { name: 'Shampoo Bottles (60ml)', category: 'Toiletries', unit: 'piece', currentStock: 400, reorderPoint: 150, unitCost: 85, location: 'Amenity Store' },
        { name: 'Body Lotion Bottles (60ml)', category: 'Toiletries', unit: 'piece', currentStock: 350, reorderPoint: 120, unitCost: 95, location: 'Amenity Store' },
        { name: 'Soap Bars (Guest)', category: 'Toiletries', unit: 'piece', currentStock: 500, reorderPoint: 200, unitCost: 45, location: 'Amenity Store' },
        { name: 'Slippers (Pair)', category: 'Amenities', unit: 'pair', currentStock: 200, reorderPoint: 80, unitCost: 75, location: 'Amenity Store' },
        { name: 'Laundry Detergent (5L)', category: 'HK Supplies', unit: 'can', currentStock: 30, reorderPoint: 15, unitCost: 850, location: 'Chemical Store' },
        { name: 'Floor Cleaner (5L)', category: 'HK Supplies', unit: 'can', currentStock: 20, reorderPoint: 10, unitCost: 620, location: 'Chemical Store' },
        { name: 'Glass Cleaner (1L)', category: 'HK Supplies', unit: 'piece', currentStock: 40, reorderPoint: 20, unitCost: 280, location: 'Chemical Store' },
        { name: 'LED Light Bulbs', category: 'Maintenance', unit: 'piece', currentStock: 80, reorderPoint: 30, unitCost: 120, location: 'Maintenance Store' },
        { name: 'Tissue Boxes', category: 'Amenities', unit: 'piece', currentStock: 180, reorderPoint: 80, unitCost: 60, location: 'Main Store' },
        { name: 'Bathrobes (White)', category: 'Linen', unit: 'piece', currentStock: 60, reorderPoint: 30, unitCost: 1200, location: 'Linen Store' },
      ]

      await db.inventoryItem.createMany({
        data: invItems.map((item) => ({
          ...item,
          minStock: Math.floor(item.reorderPoint * 0.5),
          maxStock: item.reorderPoint * 3,
          active: true,
        })),
      })
      counts.inventoryItems = invItems.length
    }

    // ── n) Vendors (8) ────────────────────────────────────────────────────
    const existingVendors = await db.vendor.count()
    if (existingVendors === 0) {
      const vendors = [
        { name: 'Nepal Fresh Produce', contact: 'Krishna Bhandari', phone: '+977-1-4234567', email: 'krishna@nepalfresh.com', category: 'Food & Beverage', rating: 4.5, status: 'active', lastOrderDate: addDays(today, -3), totalOrders: 156, address: 'Kalanki, Kathmandu' },
        { name: 'Kathmandu Linen Supply', contact: 'Sunita Sharma', phone: '+977-1-4345678', email: 'info@ktmlinens.com', category: 'Housekeeping', rating: 4.2, status: 'active', lastOrderDate: addDays(today, -7), totalOrders: 89, address: 'Balaju Industrial Area' },
        { name: 'Himalayan Cleaning Solutions', contact: 'Deepak Rai', phone: '+977-1-4456789', email: 'sales@himalayanclean.com', category: 'Cleaning Supplies', rating: 3.8, status: 'active', lastOrderDate: addDays(today, -10), totalOrders: 45, address: 'Jorpati, Kathmandu' },
        { name: 'Royal Spirits & Wines', contact: 'Arjun Thapa', phone: '+977-1-4678901', email: 'arjun@royalspirits.com', category: 'Beverages', rating: 4.7, status: 'active', lastOrderDate: addDays(today, -2), totalOrders: 203, address: 'Thamel, Kathmandu' },
        { name: 'Everest Maintenance Parts', contact: 'Bikash Tamang', phone: '+977-1-4789012', email: 'everestparts@gmail.com', category: 'Maintenance', rating: 3.5, status: 'active', lastOrderDate: addDays(today, -14), totalOrders: 23, address: 'Baneshwor, Kathmandu' },
        { name: 'Valley Toiletries Pvt Ltd', contact: 'Prakash Shrestha', phone: '+977-1-4901234', email: 'info@valleytoiletries.com', category: 'Amenities', rating: 4.1, status: 'active', lastOrderDate: addDays(today, -5), totalOrders: 178, address: 'Sanepa, Lalitpur' },
        { name: 'Thamel Textile House', contact: 'Anita Lama', phone: '+977-1-4890123', email: 'textile@thamelhouse.com', category: 'Uniforms', rating: 4.3, status: 'active', lastOrderDate: addDays(today, -45), totalOrders: 12, address: 'Thamel, Kathmandu' },
        { name: 'Digital Tech Nepal', contact: 'Suman Karki', phone: '+977-1-4123456', email: 'tech@digitalnepal.com', category: 'IT & Electronics', rating: 4.4, status: 'active', lastOrderDate: addDays(today, -8), totalOrders: 56, address: 'Putalisadak, Kathmandu' },
      ]
      await db.vendor.createMany({ data: vendors })
      counts.vendors = vendors.length
    }

    // ── o) Purchase Orders (5) ───────────────────────────────────────────
    const existingPurchaseOrders = await db.purchaseOrder.count()
    if (existingPurchaseOrders === 0) {
      const vendorRecords = await db.vendor.findMany({ select: { id: true, name: true } })
      const poData = [
        {
          poNumber: 'PO-2025-001',
          vendor: vendorRecords[0]?.name || 'Nepal Fresh Produce',
          vendorId: vendorRecords[0]?.id || '',
          expectedDelivery: fmtDate(addDays(today, 2)),
          items: JSON.stringify([{ name: 'Chicken Breast', quantity: 50, unitPrice: 650, unit: 'kg' }, { name: 'Basmati Rice', quantity: 100, unitPrice: 120, unit: 'kg' }]),
          totalAmount: 44500,
          priority: 'high',
          status: 'approved',
          approvedBy: 'Deepa Rai',
          approvedAt: addDays(today, -1),
        },
        {
          poNumber: 'PO-2025-002',
          vendor: vendorRecords[1]?.name || 'Kathmandu Linen Supply',
          vendorId: vendorRecords[1]?.id || '',
          expectedDelivery: fmtDate(addDays(today, 5)),
          items: JSON.stringify([{ name: 'Bed Sheets (King)', quantity: 100, unitPrice: 850, unit: 'piece' }, { name: 'Pillow Cases', quantity: 200, unitPrice: 200, unit: 'piece' }]),
          totalAmount: 125000,
          priority: 'normal',
          status: 'ordered',
          approvedBy: 'Anita Magar',
          approvedAt: addDays(today, -2),
        },
        {
          poNumber: 'PO-2025-003',
          vendor: vendorRecords[3]?.name || 'Royal Spirits & Wines',
          vendorId: vendorRecords[3]?.id || '',
          expectedDelivery: fmtDate(addDays(today, 1)),
          items: JSON.stringify([{ name: 'Tuborg Beer (case)', quantity: 24, unitPrice: 2400, unit: 'piece' }, { name: 'Red Wine Merlot', quantity: 12, unitPrice: 3500, unit: 'piece' }]),
          totalAmount: 96600,
          priority: 'high',
          status: 'delivered',
          approvedBy: 'Deepa Rai',
          approvedAt: addDays(today, -4),
        },
        {
          poNumber: 'PO-2025-004',
          vendor: vendorRecords[4]?.name || 'Everest Maintenance Parts',
          vendorId: vendorRecords[4]?.id || '',
          expectedDelivery: fmtDate(addDays(today, 7)),
          items: JSON.stringify([{ name: 'LED Bulbs (60W)', quantity: 100, unitPrice: 120, unit: 'piece' }, { name: 'PVC Pipes (1 inch)', quantity: 20, unitPrice: 350, unit: 'piece' }]),
          totalAmount: 19000,
          priority: 'normal',
          status: 'pending',
        },
        {
          poNumber: 'PO-2025-005',
          vendor: vendorRecords[5]?.name || 'Valley Toiletries Pvt Ltd',
          vendorId: vendorRecords[5]?.id || '',
          expectedDelivery: fmtDate(addDays(today, 3)),
          items: JSON.stringify([{ name: 'Shampoo Bottles (60ml)', quantity: 500, unitPrice: 85, unit: 'piece' }, { name: 'Soap Bars', quantity: 500, unitPrice: 45, unit: 'piece' }, { name: 'Body Lotion (60ml)', quantity: 300, unitPrice: 95, unit: 'piece' }]),
          totalAmount: 86000,
          priority: 'normal',
          status: 'approved',
          approvedBy: 'Anita Magar',
          approvedAt: addDays(today, -1),
        },
      ]
      for (const po of poData) {
        try { await db.purchaseOrder.create({ data: po }) } catch (e) { console.error('[SEED PO ERROR]', e); }
      }
      counts.purchaseOrders = poData.length
    }

    // ── p) Channels (4) ──────────────────────────────────────────────────
    const existingChannels = await db.channel.count()
    if (existingChannels === 0) {
      const channels = [
        { name: 'Booking.com', type: 'OTA', logo: 'B', status: 'connected', lastSync: new Date(), totalBookings: 342, monthlyCommission: 125000, mappingStatus: 'complete', commissionRate: 15, notes: 'Primary OTA channel. Rate parity maintained.' },
        { name: 'Expedia', type: 'OTA', logo: 'E', status: 'connected', lastSync: new Date(), totalBookings: 198, monthlyCommission: 78000, mappingStatus: 'complete', commissionRate: 15, notes: 'Second largest OTA channel.' },
        { name: 'Direct Website', type: 'Direct', logo: 'W', status: 'connected', lastSync: new Date(), totalBookings: 278, monthlyCommission: 0, mappingStatus: 'complete', commissionRate: 0, notes: 'Hotel website booking engine.' },
        { name: 'Corporate Portal', type: 'Corporate', logo: 'C', status: 'connected', lastSync: new Date(), totalBookings: 201, monthlyCommission: 0, mappingStatus: 'complete', commissionRate: 0, notes: 'Corporate rate portal for partner companies.' },
      ]
      await db.channel.createMany({ data: channels })
      counts.channels = channels.length
    }

    // ── q) Support Tickets (5) ────────────────────────────────────────────
    const existingTickets = await db.supportTicket.count()
    if (existingTickets === 0) {
      const tickets = [
        { ticketNo: 'ST-001', subject: 'POS system slow during peak hours', description: 'Restaurant POS becomes unresponsive between 7-9 PM when orders peak. Needs performance optimization.', category: 'technical', priority: 'high', status: 'open', createdBy: authUser.userId, createdByName: `${authUser.firstName} ${authUser.lastName}`, department: 'F&B', assignedTo: null, assignedName: null },
        { ticketNo: 'ST-002', subject: 'Dashboard charts not loading', description: 'Revenue dashboard charts show blank. Data API returns correct values but frontend rendering fails.', category: 'bug', priority: 'normal', status: 'in_progress', createdBy: authUser.userId, createdByName: `${authUser.firstName} ${authUser.lastName}`, department: 'Management', assignedTo: authUser.userId, assignedName: `${authUser.firstName} ${authUser.lastName}` },
        { ticketNo: 'ST-003', subject: 'Add multi-currency support', description: 'Request to add USD, EUR, GBP alongside NPR for international guests.', category: 'feature_request', priority: 'normal', status: 'open', createdBy: authUser.userId, createdByName: `${authUser.firstName} ${authUser.lastName}`, department: 'Front Office', assignedTo: null, assignedName: null },
        { ticketNo: 'ST-004', subject: 'Printer connectivity issue at front desk', description: 'Receipt printer intermittently disconnects from USB. Reinstalling drivers resolves temporarily.', category: 'technical', priority: 'high', status: 'resolved', createdBy: authUser.userId, createdByName: `${authUser.firstName} ${authUser.lastName}`, department: 'Front Office', assignedTo: authUser.userId, assignedName: `${authUser.firstName} ${authUser.lastName}`, resolution: 'Replaced USB cable and updated printer firmware. Issue resolved.', resolvedAt: addDays(today, -1) },
        { ticketNo: 'ST-005', subject: 'Housekeeping app training needed', description: 'New HK staff need training on the mobile HK task app before next shift.', category: 'training', priority: 'normal', status: 'open', createdBy: authUser.userId, createdByName: `${authUser.firstName} ${authUser.lastName}`, department: 'Housekeeping', assignedTo: null, assignedName: null },
      ]
      await db.supportTicket.createMany({ data: tickets })
      counts.supportTickets = tickets.length
    }

    // ── r) Ledger Accounts (40+ hospitality accounts) ───────────────
    const existingLedger = await db.ledgerAccount.count()
    let ledgerMap: Record<string, string> = {}
    if (existingLedger === 0) {
      const accounts = [
        // ASSETS (1xxx)
        { code: '1000', name: 'Cash on Hand', type: 'asset', subtype: 'cash', description: 'Physical cash at front desk and cashier' },
        { code: '1010', name: 'Cash in Safe', type: 'asset', subtype: 'cash', description: 'Cash stored in hotel safe' },
        { code: '1100', name: 'Bank Account Nabil', type: 'asset', subtype: 'bank', description: 'Primary operating bank account — Nabil Bank' },
        { code: '1101', name: 'Bank Account NIC Asia', type: 'asset', subtype: 'bank', description: 'Secondary bank account — NIC Asia Bank' },
        { code: '1200', name: 'Accounts Receivable', type: 'asset', subtype: 'receivable', department: 'Front Office', description: 'Outstanding guest and city ledger balances' },
        { code: '1201', name: 'City Ledger Receivable', type: 'asset', subtype: 'receivable', description: 'Corporate account receivables' },
        { code: '1210', name: 'Credit Card Receivable', type: 'asset', subtype: 'receivable', description: 'Credit card settlements pending' },
        { code: '1220', name: 'OTA Receivables', type: 'asset', subtype: 'receivable', description: 'Online Travel Agent receivables' },
        { code: '1300', name: 'Advances to Staff', type: 'asset', subtype: 'receivable', department: 'HR', description: 'Employee salary advances' },
        { code: '1310', name: 'Prepaid Expenses', type: 'asset', subtype: 'current', description: 'Prepaid insurance, rent, subscriptions' },
        { code: '1400', name: 'Food & Beverage Inventory', type: 'asset', subtype: 'current', department: 'F&B', description: 'Raw food, beverages, and supplies inventory' },
        { code: '1411', name: 'Laundry Supplies', type: 'asset', subtype: 'current', department: 'Laundry', description: 'Detergents, chemicals, linens for laundry' },
        { code: '1420', name: 'Housekeeping Supplies', type: 'asset', subtype: 'current', department: 'Housekeeping', description: 'Cleaning agents, amenities, guest supplies' },
        { code: '1430', name: 'Gift Shop Inventory', type: 'asset', subtype: 'current', description: 'Merchandise and goods for sale' },
        { code: '1500', name: 'Furniture & Fixtures', type: 'asset', subtype: 'non_current', description: 'Hotel furniture and fixtures' },
        { code: '1510', name: 'Equipment', type: 'asset', subtype: 'non_current', description: 'Kitchen, HVAC, and other equipment' },
        { code: '1520', name: 'Buildings', type: 'asset', subtype: 'non_current', description: 'Hotel building and structures' },
        { code: '1530', name: 'Land', type: 'asset', subtype: 'non_current', description: 'Land on which hotel is built' },
        { code: '1540', name: 'Accumulated Depreciation', type: 'asset', subtype: 'non_current', description: 'Contra-asset: cumulative depreciation of fixed assets' },

        // LIABILITIES (2xxx)
        { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'payable', description: 'Amounts owed to vendors and suppliers' },
        { code: '2010', name: 'Accrued Expenses', type: 'liability', subtype: 'payable', description: 'Accrued but unpaid expenses' },
        { code: '2020', name: 'Tax Payable (VAT)', type: 'liability', subtype: 'payable', description: 'VAT collected from guests, payable to IRD' },
        { code: '2030', name: 'Tax Payable (Income Tax/TDS)', type: 'liability', subtype: 'payable', description: 'Income tax and TDS liabilities' },
        { code: '2040', name: 'Staff Advances Payable', type: 'liability', subtype: 'payable', department: 'HR', description: 'Staff salary advance deductions payable' },
        { code: '2050', name: 'Advance Deposits', type: 'liability', subtype: 'payable', description: 'Prepayments received for future stays' },
        { code: '2060', name: 'Deferred Revenue', type: 'liability', subtype: 'payable', description: 'Revenue received in advance' },
        { code: '2100', name: 'Long-term Loans', type: 'liability', subtype: 'non_current', description: 'Bank loans and long-term borrowings' },

        // EQUITY (3xxx)
        { code: '3000', name: 'Owner Capital', type: 'equity', subtype: 'equity_account', description: "Owner's capital investment" },
        { code: '3010', name: 'Retained Earnings', type: 'equity', subtype: 'equity_account', description: 'Accumulated retained earnings' },

        // REVENUE (4xxx)
        { code: '4000', name: 'Room Revenue', type: 'revenue', subtype: 'revenue_account', department: 'Front Office', description: 'Revenue from room rentals' },
        { code: '4010', name: 'Room Revenue — Corporate', type: 'revenue', subtype: 'revenue_account', department: 'Front Office', description: 'Corporate negotiated room rates revenue' },
        { code: '4020', name: 'F&B Revenue — Restaurant', type: 'revenue', subtype: 'revenue_account', department: 'F&B', description: 'Restaurant food and beverage revenue' },
        { code: '4030', name: 'F&B Revenue — Bar', type: 'revenue', subtype: 'revenue_account', department: 'F&B', description: 'Bar beverage and snack revenue' },
        { code: '4040', name: 'F&B Revenue — Room Service', type: 'revenue', subtype: 'revenue_account', department: 'F&B', description: 'In-room dining revenue' },
        { code: '4050', name: 'Banquet & Events Revenue', type: 'revenue', subtype: 'revenue_account', department: 'Events', description: 'Banquet hall and event hosting revenue' },
        { code: '4060', name: 'Spa Revenue', type: 'revenue', subtype: 'revenue_account', department: 'Spa', description: 'Spa treatments and wellness revenue' },
        { code: '4070', name: 'Laundry Revenue', type: 'revenue', subtype: 'revenue_account', department: 'Laundry', description: 'Guest and commercial laundry services' },
        { code: '4080', name: 'Business Center Revenue', type: 'revenue', subtype: 'revenue_account', description: 'Business center services revenue' },
        { code: '4090', name: 'Gift Shop Revenue', type: 'revenue', subtype: 'revenue_account', description: 'Gift shop merchandise sales' },
        { code: '4100', name: 'Other Revenue', type: 'revenue', subtype: 'revenue_account', department: 'Miscellaneous', description: 'Miscellaneous operating revenue' },
        { code: '4110', name: 'Commission Income', type: 'revenue', subtype: 'revenue_account', description: 'Commission earned from travel agents, tours' },
        { code: '4120', name: 'Interest Income', type: 'revenue', subtype: 'revenue_account', description: 'Interest earned on bank deposits' },

        // EXPENSES (5xxx)
        { code: '5000', name: 'Salary & Wages', type: 'expense', subtype: 'expense_account', department: 'HR', description: 'Employee base compensation' },
        { code: '5010', name: 'Overtime Pay', type: 'expense', subtype: 'expense_account', department: 'HR', description: 'Overtime compensation' },
        { code: '5020', name: 'Employee Benefits', type: 'expense', subtype: 'expense_account', department: 'HR', description: 'Provident fund, insurance, allowances' },
        { code: '5030', name: 'Training Expenses', type: 'expense', subtype: 'expense_account', department: 'HR', description: 'Staff training and development' },
        { code: '5100', name: 'F&B Cost of Goods Sold', type: 'expense', subtype: 'expense_account', department: 'F&B', description: 'Cost of food and beverage ingredients' },
        { code: '5110', name: 'Laundry Expenses', type: 'expense', subtype: 'expense_account', department: 'Laundry', description: 'Laundry supplies, outsourced laundry costs' },
        { code: '5120', name: 'Purchase Cost — Gift Shop', type: 'expense', subtype: 'expense_account', description: 'Cost of goods sold for gift shop' },
        { code: '5200', name: 'Utilities — Electricity', type: 'expense', subtype: 'expense_account', description: 'Electricity charges' },
        { code: '5201', name: 'Utilities — Water', type: 'expense', subtype: 'expense_account', description: 'Water supply charges' },
        { code: '5202', name: 'Utilities — Internet & Phone', type: 'expense', subtype: 'expense_account', description: 'Internet, telephone, and ISP charges' },
        { code: '5203', name: 'Utilities — Gas', type: 'expense', subtype: 'expense_account', description: 'LPG and natural gas charges' },
        { code: '5300', name: 'Repairs & Maintenance', type: 'expense', subtype: 'expense_account', department: 'Maintenance', description: 'Building and equipment repairs' },
        { code: '5310', name: 'Housekeeping Supplies Expense', type: 'expense', subtype: 'expense_account', department: 'Housekeeping', description: 'Consumable housekeeping supplies' },
        { code: '5400', name: 'Marketing & Advertising', type: 'expense', subtype: 'expense_account', description: 'Digital marketing, print, and promotions' },
        { code: '5500', name: 'Depreciation Expense', type: 'expense', subtype: 'expense_account', description: 'Depreciation of fixed assets' },
        { code: '5600', name: 'Insurance', type: 'expense', subtype: 'expense_account', description: 'Property, liability, and other insurance' },
        { code: '5700', name: 'Office Supplies & Printing', type: 'expense', subtype: 'expense_account', description: 'Stationery, printing, and office supplies' },
        { code: '5800', name: 'Travel & Entertainment', type: 'expense', subtype: 'expense_account', description: 'Business travel and guest entertainment' },
        { code: '5900', name: 'Bank Charges & Interest', type: 'expense', subtype: 'expense_account', description: 'Bank fees, service charges, loan interest' },
        { code: '5999', name: 'Miscellaneous Expenses', type: 'expense', subtype: 'expense_account', description: 'Other miscellaneous operating expenses' },
      ]

      for (const a of accounts) {
        const acct = await db.ledgerAccount.create({ data: a })
        ledgerMap[a.code] = acct.id
      }
      counts.ledgerAccounts = accounts.length
    } else {
      const existing = await db.ledgerAccount.findMany({ select: { code: true, id: true } })
      for (const a of existing) ledgerMap[a.code] = a.id
    }

    // ── s) Journal Entries (5 existing + 4 new) ─────────────────────────
    const existingJournals = await db.journalEntry.count()
    if (existingJournals === 0) {
      // Need at least some ledger accounts
      if (Object.keys(ledgerMap).length > 0) {
        const cashId = ledgerMap['1000']
        const bankId = ledgerMap['1100']
        const apId = ledgerMap['2000']
        const depositId = ledgerMap['2050']
        const roomRevId = ledgerMap['4000']
        const fbRestId = ledgerMap['4020']
        const fbBarId = ledgerMap['4030']
        const otaReceivableId = ledgerMap['1220']
        const commissionId = ledgerMap['4110']
        const salaryId = ledgerMap['5000']
        const utilityElecId = ledgerMap['5200']
        const utilityWaterId = ledgerMap['5201']
        const utilityNetId = ledgerMap['5202']
        const utilityGasId = ledgerMap['5203']
        const depreciationId = ledgerMap['5500']
        const spaId = ledgerMap['4060']

        const journalEntries: {
          date: Date
          description: string
          reference: string
          status: string
          createdBy: string
          lines: { accountId: string; debit: number; credit: number; narration: string }[]
        }[] = []

        // JE1: Daily room revenue posting
        if (cashId && roomRevId) {
          journalEntries.push({
            date: addDays(today, -1),
            description: 'Room revenue posting — daily sales',
            reference: 'JE-ROOM-' + fmtDate(addDays(today, -1)),
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: cashId, debit: 125000, credit: 0, narration: 'Room revenue collected (cash)' },
              { accountId: roomRevId, debit: 0, credit: 125000, narration: 'Room revenue earned' },
            ],
          })
        }

        // JE2: F&B revenue
        if (cashId && fbRestId) {
          journalEntries.push({
            date: addDays(today, -1),
            description: 'F&B revenue — restaurant and bar sales',
            reference: 'JE-FB-' + fmtDate(addDays(today, -1)),
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: cashId, debit: 45000, credit: 0, narration: 'F&B cash sales' },
              { accountId: fbRestId, debit: 0, credit: 32000, narration: 'Restaurant revenue' },
              { accountId: fbBarId, debit: 0, credit: 13000, narration: 'Bar revenue' },
            ],
          })
        }

        // JE3: Vendor payment
        if (bankId && apId) {
          journalEntries.push({
            date: addDays(today, -2),
            description: 'Payment to Nepal Fresh Produce — food supplies',
            reference: 'JE-PAY-001',
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: apId, debit: 85000, credit: 0, narration: 'Settled vendor liability' },
              { accountId: bankId, debit: 0, credit: 85000, narration: 'Bank transfer to vendor' },
            ],
          })
        }

        // JE4: Payroll expense
        if (bankId && salaryId) {
          journalEntries.push({
            date: addDays(today, -3),
            description: 'Monthly payroll processing',
            reference: 'JE-PAYROLL-' + todayStr.slice(0, 7),
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: salaryId, debit: 450000, credit: 0, narration: 'Total salary expense' },
              { accountId: bankId, debit: 0, credit: 450000, narration: 'Payroll bank transfer' },
            ],
          })
        }

        // JE5: Guest advance deposit
        if (cashId && depositId) {
          journalEntries.push({
            date: today,
            description: 'Advance deposit received — upcoming group booking',
            reference: 'JE-DEP-001',
            status: 'draft',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: cashId, debit: 75000, credit: 0, narration: 'Cash received as advance' },
              { accountId: depositId, debit: 0, credit: 75000, narration: 'Advance deposit liability' },
            ],
          })
        }

        // ── New Journal Entries referencing new accounts ─────────────────

        // JE6: Spa revenue — treatments and packages
        if (bankId && spaId) {
          journalEntries.push({
            date: addDays(today, -1),
            description: 'Spa revenue — massage treatments and wellness packages',
            reference: 'JE-SPA-' + fmtDate(addDays(today, -1)),
            status: 'posted',
            createdBy: 'Srijana Khadka',
            lines: [
              { accountId: bankId, debit: 35000, credit: 0, narration: 'Spa payments via card/transfer' },
              { accountId: spaId, debit: 0, credit: 35000, narration: 'Spa treatments and packages revenue' },
            ],
          })
        }

        // JE7: OTA commission expense and receivable settlement
        if (otaReceivableId && commissionId && bankId) {
          journalEntries.push({
            date: addDays(today, -2),
            description: 'OTA settlement — Booking.com net of 15% commission',
            reference: 'JE-OTA-001',
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: bankId, debit: 85000, credit: 0, narration: 'OTA payout received (net)' },
              { accountId: commissionId, debit: 15000, credit: 0, narration: 'OTA commission expense (15%)' },
              { accountId: otaReceivableId, debit: 0, credit: 100000, narration: 'OTA receivable settled' },
            ],
          })
        }

        // JE8: Utility payments — electricity, water, internet, gas
        if (bankId && utilityElecId && utilityWaterId && utilityNetId && utilityGasId) {
          journalEntries.push({
            date: addDays(today, -5),
            description: 'Monthly utility payments — NEA, NWSC, WorldLink, HP Gas',
            reference: 'JE-UTIL-' + todayStr.slice(0, 7),
            status: 'posted',
            createdBy: 'Kamal Basnet',
            lines: [
              { accountId: utilityElecId, debit: 45000, credit: 0, narration: 'NEA electricity bill' },
              { accountId: utilityWaterId, debit: 12000, credit: 0, narration: 'NWSC water supply' },
              { accountId: utilityNetId, debit: 8500, credit: 0, narration: 'WorldLink internet service' },
              { accountId: utilityGasId, debit: 6500, credit: 0, narration: 'HP Gas LPG supply' },
              { accountId: bankId, debit: 0, credit: 72000, narration: 'Utility payments via bank transfer' },
            ],
          })
        }

        // JE9: Monthly depreciation — furniture, equipment, building
        if (depreciationId) {
          const accumDepId = ledgerMap['1540']
          if (accumDepId) {
            journalEntries.push({
              date: addDays(today, -3),
              description: 'Monthly depreciation — fixed assets',
              reference: 'JE-DEPR-' + todayStr.slice(0, 7),
              status: 'posted',
              createdBy: 'Kamal Basnet',
              lines: [
                { accountId: depreciationId, debit: 75000, credit: 0, narration: 'Monthly depreciation expense' },
                { accountId: accumDepId, debit: 0, credit: 75000, narration: 'Accumulated depreciation — contra asset' },
              ],
            })
          }
        }

        for (const je of journalEntries) {
          await db.journalEntry.create({
            data: {
              date: je.date,
              description: je.description,
              reference: je.reference,
              status: je.status,
              createdBy: je.createdBy,
              lines: { create: je.lines },
            },
          })
        }
        counts.journalEntries = journalEntries.length
      }
    }

    // ── t) Attendance records (10) ─────────────────────────────────────────
    const existingAttendance = await db.attendance.count()
    if (existingAttendance === 0) {
      const emps = employeeRecords.length > 0 ? employeeRecords : await db.employee.findMany({ select: { id: true, firstName: true, lastName: true, department: true, position: true } })
      const selectedEmps = pickN(emps, Math.min(10, emps.length))

      const attData = selectedEmps.map((emp, idx) => {
        const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'absent', 'on_leave', 'half_day', 'present']
        const status = statuses[idx] || 'present'
        const isLate = status === 'present' && Math.random() > 0.6
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          position: emp.position,
          checkIn: status !== 'absent' && status !== 'on_leave' ? `${String(8 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${isLate ? String(Math.floor(Math.random() * 30) + 15).padStart(2, '0') : String(Math.floor(Math.random() * 30)).padStart(2, '0')}` : null,
          checkOut: null,
          status,
          late: isLate,
          notes: null,
        }
      })

      await db.attendance.createMany({ data: attData })
      counts.attendance = attData.length
    }

    // ── u) Payroll records (5) ─────────────────────────────────────────────
    const existingPayroll = await db.payroll.count()
    if (existingPayroll === 0) {
      const emps = employeeRecords.length > 0 ? employeeRecords : await db.employee.findMany({ select: { id: true, firstName: true, lastName: true, department: true, position: true } })
      const selectedEmps = pickN(emps, Math.min(5, emps.length))
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7)

      const payrollData = selectedEmps.map((emp) => {
        const baseSalary = [25000, 55000, 32000, 60000, 18000][Math.floor(Math.random() * 5)]
        const variablePay = Math.round(baseSalary * (0.05 + Math.random() * 0.1))
        const overtime = Math.round(baseSalary * Math.random() * 0.05)
        const deductions = Math.round((baseSalary + variablePay) * 0.1)
        const netPay = baseSalary + variablePay + overtime - deductions
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          position: emp.position,
          month: lastMonth,
          baseSalary,
          variablePay,
          overtime,
          deductions,
          netPay,
          status: 'paid',
          processedBy: 'Samjhana Basnet',
          processedAt: addDays(today, -5),
        }
      })

      await db.payroll.createMany({ data: payrollData })
      counts.payroll = payrollData.length
    }

    // ── v) Lost & Found (4) ──────────────────────────────────────────────
    const existingLostFound = await db.lostFound.count()
    if (existingLostFound === 0) {
      const lfRooms = pickN(allRooms, 3)
      const lostFound = [
        { roomId: lfRooms[0]?.id, itemName: 'iPhone 15 Pro', category: 'electronics', description: 'Left in bedside drawer. Black case with gold trim.', storageLocation: 'Safe — Front Desk', foundBy: 'Srijana Khadka', foundDate: addDays(today, -1), claimedBy: null, claimDate: null, status: 'found', identityVerified: false },
        { roomId: lfRooms[1]?.id, itemName: 'Passport (Germany)', category: 'documents', description: 'German passport found in room safe after checkout.', storageLocation: 'GM Office Safe', foundBy: 'Anita Magar', foundDate: addDays(today, -3), claimedBy: 'Lena Mueller', claimDate: addDays(today, -1), status: 'claimed', identityVerified: true },
        { roomId: null, itemName: 'Gold Necklace', category: 'jewelry', description: 'Found in restaurant — Himalayan, Table 7.', storageLocation: 'Safe — Front Desk', foundBy: 'Kamal Tamang', foundDate: addDays(today, -5), claimedBy: null, claimDate: null, status: 'found', identityVerified: false },
        { roomId: lfRooms[2]?.id, itemName: 'Black Leather Jacket', category: 'clothing', description: 'Hanging in closet, size L. No name tag.', storageLocation: 'Lost & Found Room B1', foundBy: 'Srijana Khadka', foundDate: addDays(today, -7), claimedBy: null, claimDate: null, status: 'found', identityVerified: false },
      ]
      await db.lostFound.createMany({ data: lostFound })
      counts.lostFound = lostFound.length
    }

    // ── w) Wake-up Calls (3) ─────────────────────────────────────────────
    const existingWakeUpCalls = await db.wakeUpCall.count()
    if (existingWakeUpCalls === 0) {
      // Use checked_in reservations that have rooms
      const checkedInWithRoom = await db.reservation.findMany({
        where: { status: 'checked_in', roomId: { not: null } },
        include: { room: true, guest: { select: { firstName: true, lastName: true } } },
      })
      const wakeCalls = [
        { reservationId: checkedInWithRoom[0]?.id, roomId: checkedInWithRoom[0]?.roomId, roomNumber: checkedInWithRoom[0]?.room?.number || '101', guestName: checkedInWithRoom[0]?.guest ? `${checkedInWithRoom[0].guest.firstName} ${checkedInWithRoom[0].guest.lastName}` : 'Guest', scheduledTime: '05:30', status: 'Pending', phoneExtension: checkedInWithRoom[0]?.room?.ipPhoneExt || '100101', notes: 'Airport pickup at 6:30 AM', snoozeCount: 0, date: todayStr },
        { reservationId: checkedInWithRoom[1]?.id, roomId: checkedInWithRoom[1]?.roomId, roomNumber: checkedInWithRoom[1]?.room?.number || '102', guestName: checkedInWithRoom[1]?.guest ? `${checkedInWithRoom[1].guest.firstName} ${checkedInWithRoom[1].guest.lastName}` : 'Guest', scheduledTime: '06:00', status: 'Pending', phoneExtension: checkedInWithRoom[1]?.room?.ipPhoneExt || '100102', notes: 'Trek departure at 7 AM', snoozeCount: 0, date: todayStr },
        { reservationId: checkedInWithRoom[2]?.id, roomId: checkedInWithRoom[2]?.roomId, roomNumber: checkedInWithRoom[2]?.room?.number || '103', guestName: checkedInWithRoom[2]?.guest ? `${checkedInWithRoom[2].guest.firstName} ${checkedInWithRoom[2].guest.lastName}` : 'Guest', scheduledTime: '07:00', status: 'Pending', phoneExtension: checkedInWithRoom[2]?.room?.ipPhoneExt || '100103', notes: 'Business meeting at 9 AM', snoozeCount: 0, date: todayStr },
      ].filter((wc) => wc.roomId) // only keep those with valid rooms

      if (wakeCalls.length > 0) {
        await db.wakeUpCall.createMany({ data: wakeCalls })
        counts.wakeUpCalls = wakeCalls.length
      }
    }

    // ── x) Waitlist Entries (3) ───────────────────────────────────────────
    const existingWaitlist = await db.waitlistEntry.count()
    if (existingWaitlist === 0) {
      const rtIds = roomTypes.map((rt) => rt.id)
      const waitlist = [
        { guestName: 'Carlos Rodriguez', contactPhone: '+34-612-345-678', contactEmail: 'carlos.r@email.com', roomPreference: 'Mountain View', roomTypeId: rtIds[0], checkInDate: fmtDate(addDays(today, 2)), checkOutDate: fmtDate(addDays(today, 6)), adults: 2, children: 0, priority: 'High', status: 'Waiting', notes: 'Recurring guest from previous year.' },
        { guestName: 'Yuki Tanaka', contactPhone: '+81-80-9876-5432', contactEmail: 'yuki.tanaka@email.com', roomPreference: 'Any Suite', roomTypeId: rtIds[2] || rtIds[0], checkInDate: fmtDate(addDays(today, 3)), checkOutDate: fmtDate(addDays(today, 8)), adults: 1, children: 0, priority: 'Normal', status: 'Waiting', notes: 'Solo traveler, prefers quiet floor.' },
        { guestName: 'Ravi Kumar', contactPhone: '+91-9988776655', contactEmail: 'ravi.kumar@email.com', roomPreference: 'Deluxe Room', roomTypeId: rtIds[1] || rtIds[0], checkInDate: fmtDate(addDays(today, 1)), checkOutDate: fmtDate(addDays(today, 4)), adults: 2, children: 1, priority: 'Normal', status: 'Waiting', notes: 'Family with one child (age 8).' },
      ]
      await db.waitlistEntry.createMany({ data: waitlist })
      counts.waitlistEntries = waitlist.length
    }

    // ── Done ──────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    return NextResponse.json({
      success: true,
      message: 'Seed completed successfully',
      elapsed: `${elapsed}s`,
      seeded: counts,
    })
  } catch (error) {
    console.error('[SEED ERROR]', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Seed failed', detail: msg.substring(0, 2000) },
      { status: 500 },
    )
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Get base room rate from room type code */
function getBaseRate(code: string): number {
  const rates: Record<string, number> = {
    STD: 4500,
    DLX: 6500,
    DLV: 8500,
    SUT: 15000,
    PSU: 35000,
    PRS: 18000,
    HMS: 22000,
  }
  return rates[code] || 6000
}

/** Build a reservation data object */
function makeReservation(
  room: { id: string; typeId: string },
  checkIn: Date,
  checkOut: Date,
  roomRate: number,
  nights: number,
  index: { i: number },
  guestIds: string[],
  propertyId: string,
  ratePlans: { id: string; roomTypeId: string }[],
  status: string,
) {
  const i = index.i++
  const totalAmount = roomRate * Math.max(1, nights)
  const sources = ['direct', 'booking_com', 'expedia', 'walk_in', 'phone', 'email', 'corporate']
  const rp = ratePlans.find((r) => r.roomTypeId === room.typeId) || ratePlans[0]

  return {
    confirmationNo: `MH-2025-${String(i + 1).padStart(3, '0')}`,
    propertyId,
    guestId: guestIds[i % guestIds.length],
    roomId: room.id,
    roomTypeId: room.typeId,
    ratePlanId: rp?.id,
    status,
    reservationType: i % 7 === 0 ? 'corporate' : 'individual',
    adults: Math.random() > 0.4 ? 2 : 1,
    children: Math.random() > 0.8 ? 1 : 0,
    checkIn: setHour(checkIn, 14),
    checkOut: setHour(checkOut, 12),
    roomRate,
    totalAmount,
    paidAmount: status === 'checked_out' ? totalAmount : Math.random() > 0.5 ? Math.round(totalAmount * 0.3) : 0,
    creditLimit: 15000,
    source: sources[i % sources.length],
    paymentStatus: status === 'checked_out' ? 'paid' : 'unpaid',
    guaranteed: Math.random() > 0.3,
    company: i % 7 === 0 ? 'TechCorp Nepal' : null,
    poNumber: null,
    notes: null,
    bookedBy: 'System',
  }
}
