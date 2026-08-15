import { db } from '../src/lib/db'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'

const today = new Date()
function daysFromNow(n: number): Date { const d = new Date(today); d.setDate(d.getDate() + n); d.setHours(12,0,0,0); return d }
function daysFromNowStr(n: number): string { return daysFromNow(n).toISOString().split('T')[0] }
function daysAgoStr(n: number): string { return daysFromNow(-n).toISOString().split('T')[0] }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randFloat(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }

async function main() {
  console.log('🌱 Seeding Meridian Hotel PMS...')

  // Clear all tables
  const tablenames = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  for (const t of tablenames as { name: string }[]) {
    await db.$executeRawUnsafe(`DELETE FROM "${t.name}"`)
  }
  console.log('  ✅ Cleared tables')

  // ─── 1. Auth Users ────────────────────────────────────────
  const adminId = 'admin-001'
  const gmId = 'gm-001'
  const staffId = 'staff-001'

  // Hash admin password so login works immediately after seed
  const adminPasswordHash = await hash('admin123', 10)
  const gmPasswordHash = await hash('gm123', 10)

  await db.authUser.createMany({ data: [
    { id: adminId, email: 'admin@meridian.com', passwordHash: adminPasswordHash, firstName: 'Rajesh', lastName: 'Sharma', role: 'admin', department: 'Management', position: 'General Manager', active: true, lastLoginAt: new Date() },
    { id: gmId, email: 'gm@meridian.com', passwordHash: gmPasswordHash, firstName: 'Sita', lastName: 'Thapa', role: 'gm', department: 'Management', position: 'Deputy GM', active: true },
    { id: staffId, email: 'staff@meridian.com', firstName: 'Hari', lastName: 'Bahadur', role: 'staff', department: 'Front Desk', position: 'Receptionist', active: true },
    { id: 'staff-002', email: 'ram@meridian.com', firstName: 'Ram', lastName: 'Kumar', role: 'staff', department: 'Housekeeping', position: 'HK Supervisor', active: true },
    { id: 'staff-003', email: 'anita@meridian.com', firstName: 'Anita', lastName: 'Gurung', role: 'manager', department: 'F&B', position: 'F&B Manager', active: true },
  ]})
  console.log('  ✅ Auth users')

  // ─── 2. Property ──────────────────────────────────────────
  const prop1 = await db.property.create({ data: { id: 'prop-1', name: 'Meridian Hotel', code: 'MH', address: 'Thamel, Kathmandu', city: 'Kathmandu', country: 'Nepal', currency: 'NPR', taxRate: 13, serviceCharge: 10, starRating: 5, totalRooms: 81, phone: '+977-1-4567890', email: 'info@meridianhotel.com' }})
  console.log('  ✅ Property')

  // ─── 3. System Settings ───────────────────────────────────
  await db.systemSetting.createMany({ data: [
    { category: 'general', key: 'hotelName', value: 'Meridian Hotel' },
    { category: 'general', key: 'hotelCode', value: 'MH' },
    { category: 'tax', key: 'taxRate', value: '13' },
    { category: 'tax', key: 'serviceCharge', value: '10' },
    { category: 'policies', key: 'defaultCheckIn', value: '14:00' },
    { category: 'policies', key: 'defaultCheckOut', value: '11:00' },
    { category: 'policies', key: 'cancellationPolicy', value: 'moderate' },
    { category: 'payment', key: 'acceptCash', value: 'true' },
    { category: 'payment', key: 'acceptCard', value: 'true' },
    { category: 'security', key: 'autoLogout', value: '30min' },
  ]})
  console.log('  ✅ Settings')

  // ─── 4. Room Types ────────────────────────────────────────
  const roomTypes = await Promise.all([
    db.roomType.create({ data: { name: 'Standard Room', code: 'STD', baseOccupancy: 2, maxOccupancy: 2, bedConfig: 'Twin', amenities: JSON.stringify(['WiFi','TV','AC']), sortOrder: 1 }}),
    db.roomType.create({ data: { name: 'Deluxe Room', code: 'DLX', baseOccupancy: 2, maxOccupancy: 3, bedConfig: 'Double', amenities: JSON.stringify(['WiFi','TV','AC','Mini Bar','Safe']), sortOrder: 2 }}),
    db.roomType.create({ data: { name: 'Superior Room', code: 'SPR', baseOccupancy: 2, maxOccupancy: 3, bedConfig: 'King', amenities: JSON.stringify(['WiFi','TV','AC','Mini Bar','Safe','City View']), sortOrder: 3 }}),
    db.roomType.create({ data: { name: 'Suite', code: 'STE', baseOccupancy: 2, maxOccupancy: 4, bedConfig: 'King', amenities: JSON.stringify(['WiFi','TV','AC','Mini Bar','Safe','Living Room','Bathtub']), sortOrder: 4 }}),
    db.roomType.create({ data: { name: 'Deluxe Suite', code: 'DST', baseOccupancy: 2, maxOccupancy: 4, bedConfig: 'King', amenities: JSON.stringify(['WiFi','TV','AC','Mini Bar','Safe','Living Room','Mountain View','Butler']), sortOrder: 5 }}),
    db.roomType.create({ data: { name: 'Presidential Suite', code: 'PST', baseOccupancy: 2, maxOccupancy: 6, bedConfig: 'King + Twin', amenities: JSON.stringify(['WiFi','TV','AC','Mini Bar','Safe','Living Room','Dining Room','Jacuzzi','Butler']), sortOrder: 6 }}),
  ])
  const basePrices = [3500, 5500, 7500, 12000, 18000, 25000]
  console.log('  ✅ Room types')

  // ─── 5. Rooms (81 rooms) ───────────────────────────────────
  const roomTypeMap = [
    { typeId: roomTypes[0].id, count: 24 },
    { typeId: roomTypes[1].id, count: 20 },
    { typeId: roomTypes[2].id, count: 15 },
    { typeId: roomTypes[3].id, count: 10 },
    { typeId: roomTypes[4].id, count: 7 },
    { typeId: roomTypes[5].id, count: 5 },
  ]
  const roomStatuses = ['vacant_clean','vacant_clean','vacant_clean','occupied','occupied','occupied','occupied','dirty','out_of_order']
  const wings = ['East','West','North']
  const rooms: { number: string; typeId: string; floor: number; wing: string; building: string; status: string; propertyId: string }[] = []
  let roomIdx = 0
  for (const config of roomTypeMap) {
    for (let i = 0; i < config.count; i++) {
      const floor = Math.floor(roomIdx / 27) + 1
      const roomOnFloor = roomIdx % 27 + 1
      rooms.push({ number: `${floor}${String(roomOnFloor).padStart(2, '0')}`, typeId: config.typeId, floor, wing: wings[i % 3], building: 'Main Building', status: pick(roomStatuses), propertyId: prop1.id })
      roomIdx++
    }
  }
  await db.room.createMany({ data: rooms })
  console.log('  ✅ Rooms:', rooms.length)

  // ─── 6. Rate Plans ────────────────────────────────────────
  const ratePlans = await Promise.all([
    db.ratePlan.create({ data: { name: 'Best Available Rate', code: 'BAR', propertyId: prop1.id, baseRate: 5500, channel: 'direct', active: true }}),
    db.ratePlan.create({ data: { name: 'Corporate Rate', code: 'CORP', propertyId: prop1.id, baseRate: 4700, channel: 'corporate', active: true }}),
    db.ratePlan.create({ data: { name: 'OTA Rate', code: 'OTA', propertyId: prop1.id, baseRate: 6000, channel: 'ota', active: true }}),
    db.ratePlan.create({ data: { name: 'Group Rate', code: 'GRP', propertyId: prop1.id, baseRate: 4400, channel: 'group', active: true }}),
  ])
  console.log('  ✅ Rate plans')

  // ─── 7. Daily Rates ───────────────────────────────────────
  const dailyRates: { ratePlanId: string; date: Date; rate: number; available: number }[] = []
  for (const rp of ratePlans) {
    for (let d = -7; d <= 30; d++) {
      const date = daysFromNow(d)
      const dow = date.getDay()
      const mult = (dow === 0 || dow === 5 || dow === 6) ? 1.2 : 1.0
      dailyRates.push({ ratePlanId: rp.id, date, rate: Math.round(rp.baseRate * mult), available: 81 - rand(20, 50) })
    }
  }
  await db.dailyRate.createMany({ data: dailyRates })
  console.log('  ✅ Daily rates:', dailyRates.length)

  // ─── 8. Guests ────────────────────────────────────────────
  const guestsData = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '+1-555-0101', nationality: 'American', vipLevel: 'platinum', city: 'New York', country: 'USA' },
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com', phone: '+91-98765-43210', nationality: 'Indian', vipLevel: 'gold', city: 'Delhi', country: 'India' },
    { firstName: 'David', lastName: 'Chen', email: 'david.chen@email.com', phone: '+86-139-1234-5678', nationality: 'Chinese', vipLevel: 'silver', city: 'Beijing', country: 'China' },
    { firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@email.com', phone: '+81-90-1234-5678', nationality: 'Japanese', vipLevel: 'gold', city: 'Tokyo', country: 'Japan' },
    { firstName: 'Rajesh', lastName: 'Adhikari', email: 'rajesh.a@email.com', phone: '+977-98510-12345', nationality: 'Nepali', vipLevel: 'none', city: 'Kathmandu', country: 'Nepal' },
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', phone: '+44-7700-900123', nationality: 'British', vipLevel: 'silver', city: 'London', country: 'UK' },
    { firstName: 'Michael', lastName: 'Brown', email: 'michael.b@email.com', phone: '+1-555-0202', nationality: 'American', vipLevel: 'none', city: 'Los Angeles', country: 'USA' },
    { firstName: 'Anita', lastName: 'Magar', email: 'anita.m@email.com', phone: '+977-98510-54321', nationality: 'Nepali', vipLevel: 'gold', city: 'Pokhara', country: 'Nepal' },
    { firstName: 'Tenzing', lastName: 'Sherpa', email: 'tenzing.s@email.com', phone: '+977-98410-12345', nationality: 'Nepali', vipLevel: 'none', city: 'Namche', country: 'Nepal' },
    { firstName: 'Emma', lastName: 'Wilson', email: 'emma.w@email.com', phone: '+61-4-1234-5678', nationality: 'Australian', vipLevel: 'platinum', city: 'Sydney', country: 'Australia' },
    { firstName: 'Mohammed', lastName: 'Al-Rashid', email: 'mohammed.a@email.com', phone: '+971-50-123-4567', nationality: 'Emirati', vipLevel: 'gold', city: 'Dubai', country: 'UAE' },
    { firstName: 'Lisa', lastName: 'Müller', email: 'lisa.m@email.com', phone: '+49-170-1234567', nationality: 'German', vipLevel: 'none', city: 'Berlin', country: 'Germany' },
    { firstName: 'Arjun', lastName: 'Karki', email: 'arjun.k@email.com', phone: '+977-98512-34567', nationality: 'Nepali', vipLevel: 'silver', city: 'Kathmandu', country: 'Nepal' },
    { firstName: 'Sophie', lastName: 'Dubois', email: 'sophie.d@email.com', phone: '+33-6-12-34-56-78', nationality: 'French', vipLevel: 'none', city: 'Paris', country: 'France' },
    { firstName: 'Kenji', lastName: 'Watanabe', email: 'kenji.w@email.com', phone: '+81-80-9876-5432', nationality: 'Japanese', vipLevel: 'gold', city: 'Osaka', country: 'Japan' },
  ]
  await db.guest.createMany({ data: guestsData.map((g, i) => ({
    ...g, gender: i % 2 === 0 ? 'male' : 'female', totalStays: rand(1, 15), totalRevenue: randFloat(5000, 500000), loyaltyPoints: rand(100, 10000), loyaltyTier: g.vipLevel === 'none' ? 'none' : g.vipLevel === 'silver' ? 'silver' : g.vipLevel === 'gold' ? 'gold' : 'platinum',
    preferences: JSON.stringify({ pillowType: pick(['firm','soft']), roomPreference: pick(['high floor','quiet']) }),
  }))})
  console.log('  ✅ Guests')

  const allGuests = await db.guest.findMany()
  const allRooms = await db.room.findMany()
  const occupiedRooms = allRooms.filter(r => r.status === 'occupied')

  // ─── 9. Reservations ──────────────────────────────────────
  const reservations: { confirmationNo: string; propertyId: string; guestId: string; roomTypeId: string; roomId: string | null; status: string; checkIn: Date; checkOut: Date; adults: number; children: number; totalAmount: number; roomRate: number; source: string; notes: string | null }[] = []
  const statuses = ['confirmed','confirmed','confirmed','checked_in','checked_in','checked_in','checked_out','checked_out','tentative','cancelled','no_show']
  const sources = ['direct','ota','corporate','walk_in','phone','email']

  for (let i = 0; i < 25; i++) {
    const guest = pick(allGuests)
    const rtIdx = rand(0, roomTypes.length - 1)
    const rt = roomTypes[rtIdx]
    const status = pick(statuses)
    const source = pick(sources)
    const nights = rand(1, 7)
    let checkIn: Date, checkOut: Date
    let roomId: string | null = null

    if (status === 'checked_out' || status === 'no_show') {
      const daysBack = rand(2, 14)
      checkIn = daysFromNow(-(daysBack + nights))
      checkOut = daysFromNow(-daysBack)
    } else if (status === 'checked_in') {
      checkIn = daysFromNow(-rand(0, 3))
      checkOut = daysFromNow(rand(1, 5))
      roomId = occupiedRooms.length > 0 ? pick(occupiedRooms).id : null
    } else {
      checkIn = daysFromNow(rand(0, 14))
      checkOut = daysFromNow(nights + rand(0, 14))
    }
    const roomRate = basePrices[rtIdx]
    const totalAmount = roomRate * nights
    reservations.push({ confirmationNo: `MH-${String(1000 + i).padStart(6, '0')}`, propertyId: prop1.id, guestId: guest.id, roomTypeId: rt.id, roomId, status, checkIn, checkOut, adults: rand(1, 2), children: Math.random() > 0.7 ? rand(1, 2) : 0, totalAmount, roomRate, source, notes: null })
  }
  await db.reservation.createMany({ data: reservations })
  console.log('  ✅ Reservations:', reservations.length)

  const allReservations = await db.reservation.findMany({ include: { guest: true } })
  const checkedInReservations = allReservations.filter(r => r.status === 'checked_in')

  // ─── 10. Folios & Transactions ────────────────────────────
  for (let i = 0; i < 12; i++) {
    const res = allReservations[i % allReservations.length]
    if (!res.guestId) continue
    const folio = await db.folio.create({ data: { reservationId: res.id, guestId: res.guestId, folioType: i % 4 === 0 ? 'master' : 'guest', status: i < 8 ? 'open' : 'closed' }})

    // Room charges
    const nights = Math.max(1, Math.ceil((res.checkOut.getTime() - res.checkIn.getTime()) / 86400000))
    for (let d = 0; d < Math.min(nights, 5); d++) {
      const amt = randFloat(3000, 15000)
      await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'room', description: `Room charge - ${roomTypes.find(rt => rt.id === res.roomTypeId)?.name || 'Room'}`, amount: amt, totalAmount: amt, quantity: 1, outlet: 'Room' }})
    }
    if (Math.random() > 0.4) { const amt = randFloat(1500, 5000); await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'f_and_b', description: 'The Terrace Restaurant', amount: amt, totalAmount: amt, quantity: 1, outlet: 'Restaurant' }}) }
    if (Math.random() > 0.6) { const amt = randFloat(800, 3000); await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'f_and_b', description: 'Sky Lounge Bar', amount: amt, totalAmount: amt, quantity: 1, outlet: 'Bar' }}) }
    if (Math.random() > 0.8) { const amt = randFloat(3000, 8000); await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'spa', description: 'Himalayan Spa Treatment', amount: amt, totalAmount: amt, quantity: 1, outlet: 'Spa' }}) }
    if (Math.random() > 0.7) { const amt = randFloat(300, 1500); await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'laundry', description: 'Laundry Service', amount: amt, totalAmount: amt, quantity: 1, outlet: 'Laundry' }}) }

    // Payments
    if (folio.status === 'closed' || Math.random() > 0.5) {
      const methods = ['cash','card','bank_transfer','digital_wallet']
      const method = pick(methods)
      await db.folioPayment.create({ data: { folioId: folio.id, paymentMethod: method, amount: randFloat(5000, 50000), reference: `PAY-${randomBytes(4).toString('hex').toUpperCase()}`, cardType: method === 'card' ? pick(['visa','mastercard']) : null }})
    }
  }
  console.log('  ✅ Folios & transactions')

  // ─── 11. POS Outlets ──────────────────────────────────────
  const outlets = await Promise.all([
    db.outlet.create({ data: { name: 'The Terrace Restaurant', code: 'REST', type: 'restaurant' }}),
    db.outlet.create({ data: { name: 'Sky Lounge Bar', code: 'BAR', type: 'bar' }}),
    db.outlet.create({ data: { name: 'Himalayan Spa', code: 'SPA', type: 'spa' }}),
    db.outlet.create({ data: { name: 'Room Service', code: 'RS', type: 'business_center' }}),
  ])

  // ─── 12. Menu Items ───────────────────────────────────────
  const menuItemsData = [
    { name: 'Dal Bhat Set', category: 'Main Course', price: 650, outletId: outlets[0].id },
    { name: 'Chicken Momo', category: 'Starter', price: 450, outletId: outlets[0].id },
    { name: 'Thukpa', category: 'Soup', price: 350, outletId: outlets[0].id },
    { name: 'Grilled Chicken', category: 'Main Course', price: 1200, outletId: outlets[0].id },
    { name: 'Paneer Tikka', category: 'Starter', price: 550, outletId: outlets[0].id },
    { name: 'Fish Curry', category: 'Main Course', price: 950, outletId: outlets[0].id },
    { name: 'Garden Salad', category: 'Salad', price: 400, outletId: outlets[0].id },
    { name: 'Chocolate Cake', category: 'Dessert', price: 350, outletId: outlets[0].id },
    { name: 'Mojito', category: 'Cocktail', price: 600, outletId: outlets[1].id },
    { name: 'Draft Beer', category: 'Beer', price: 450, outletId: outlets[1].id },
    { name: 'Whiskey Sour', category: 'Cocktail', price: 750, outletId: outlets[1].id },
    { name: 'Red Wine (Glass)', category: 'Wine', price: 800, outletId: outlets[1].id },
    { name: 'Swedish Massage', category: 'Massage', price: 4500, outletId: outlets[2].id },
    { name: 'Facial Treatment', category: 'Facial', price: 3000, outletId: outlets[2].id },
    { name: 'Club Sandwich', category: 'Main Course', price: 800, outletId: outlets[3].id },
    { name: 'Coffee', category: 'Beverage', price: 250, outletId: outlets[3].id },
    { name: 'Fresh Juice', category: 'Beverage', price: 300, outletId: outlets[3].id },
  ]
  await db.menuItem.createMany({ data: menuItemsData.map(m => ({ ...m, available: true })) })
  console.log('  ✅ POS outlets & menu')

  // ─── 13. POS Orders ───────────────────────────────────────
  const allMenuItems = await db.menuItem.findMany()
  for (let i = 0; i < 20; i++) {
    const outlet = pick(outlets)
    const outletItems = allMenuItems.filter(m => m.outletId === outlet.id)
    if (outletItems.length === 0) continue
    const order = await db.posOrder.create({
      data: { outletId: outlet.id, status: pick(['closed','closed','closed','served','ready','in_progress','open','voided']), tableNumber: Math.random() > 0.5 ? rand(1, 15) : null, serverName: pick(['Ramesh','Sunita','Pramila']), guestCount: rand(1, 4), totalAmount: 0 }
    })
    let total = 0
    for (let j = 0; j < rand(1, 4); j++) {
      const item = pick(outletItems)
      const qty = rand(1, 3)
      total += item.price * qty
      await db.orderItem.create({ data: { orderId: order.id, menuItemId: item.id, quantity: qty, unitPrice: item.price, totalPrice: item.price * qty, status: pick(['served','ready','in_progress']) }})
    }
    await db.posOrder.update({ where: { id: order.id }, data: { totalAmount: total } })
  }
  console.log('  ✅ POS orders')

  // ─── 14. Housekeeping Tasks ───────────────────────────────
  const hkStatuses = ['pending','assigned','in_progress','cleaned','inspected']
  const hkPriorities = ['low','normal','normal','high','high','rush']
  const dirtyRooms = allRooms.filter(r => r.status === 'dirty' || r.status === 'occupied')
  for (let i = 0; i < 25; i++) {
    const room = dirtyRooms.length > 0 ? pick(dirtyRooms) : pick(allRooms)
    await db.hkTask.create({ data: { roomId: room.id, taskType: pick(['checkout','stayover','turndown','deep_clean','maintenance']), priority: pick(hkPriorities), status: pick(hkStatuses), assignedTo: pick([staffId, 'staff-002', null] as string[]), scheduledTime: daysFromNow(rand(-1, 2)), estimatedMinutes: rand(20, 60), notes: i % 5 === 0 ? 'VIP guest' : null }})
  }
  console.log('  ✅ HK tasks')

  // ─── 15. HK WorkFlow ──────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    await db.hkWorkFlow.create({ data: { title: pick(['AC Repair','Plumbing Issue','TV Replacement','Wi-Fi Fix','Furniture Repair','Light Replacement']), category: pick(['maintenance','repair','service']), priority: pick(hkPriorities), status: pick(['open','in_progress','completed']), roomId: pick(allRooms).id, assignedTo: pick([staffId, 'staff-002']), requestedDate: daysFromNow(-rand(0, 5)) }})
  }
  console.log('  ✅ HK workflow')

  // ─── 16. Employees ────────────────────────────────────────
  const empData = [
    { firstName: 'Ramesh', lastName: 'Shrestha', department: 'Front Desk', position: 'Receptionist' },
    { firstName: 'Sunita', lastName: 'Tamang', department: 'Front Desk', position: 'Night Auditor' },
    { firstName: 'Bikash', lastName: 'Rai', department: 'Housekeeping', position: 'Room Attendant' },
    { firstName: 'Kamala', lastName: 'Lama', department: 'Housekeeping', position: 'Room Attendant' },
    { firstName: 'Deepak', lastName: 'Maharjan', department: 'F&B', position: 'Chef' },
    { firstName: 'Pramila', lastName: 'Pokharel', department: 'F&B', position: 'Waitress' },
    { firstName: 'Suresh', lastName: 'Koirala', department: 'Maintenance', position: 'Technician' },
    { firstName: 'Gita', lastName: 'Devkota', department: 'Accounts', position: 'Accountant' },
    { firstName: 'Nabin', lastName: 'Poudel', department: 'Security', position: 'Security Guard' },
    { firstName: 'Srijana', lastName: 'Rijal', department: 'Spa', position: 'Therapist' },
    { firstName: 'Bishnu', lastName: 'Gautam', department: 'Concierge', position: 'Bell Boy' },
    { firstName: 'Mina', lastName: 'Bhandari', department: 'Reservation', position: 'Agent' },
    { firstName: 'Dipak', lastName: 'Acharya', department: 'F&B', position: 'Sous Chef' },
    { firstName: 'Asha', lastName: 'KC', department: 'Housekeeping', position: 'Laundry Supervisor' },
    { firstName: 'Raju', lastName: 'Thapa', department: 'Maintenance', position: 'Electrician' },
    { firstName: 'Nirmala', lastName: 'Subedi', department: 'Front Desk', position: 'Shift Leader' },
    { firstName: 'Prakash', lastName: 'Dahal', department: 'F&B', position: 'Bar Manager' },
    { firstName: 'Sarita', lastName: 'Nepal', department: 'HR', position: 'HR Manager' },
    { firstName: 'Manoj', lastName: 'Basnet', department: 'IT', position: 'IT Officer' },
    { firstName: 'Kavita', lastName: 'Mishra', department: 'Sales', position: 'Sales Manager' },
  ]
  await db.employee.createMany({ data: empData.map(e => ({ ...e, email: `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}@meridian.com`, phone: `+977-98${rand(4,5)}${rand(10,99)}-${rand(1000,9999)}`, hireDate: daysFromNow(-rand(30, 1000)), salary: randFloat(15000, 80000), propertyId: prop1.id }))})
  console.log('  ✅ Employees')

  const allEmployees = await db.employee.findMany()

  // ─── 17. Attendance ───────────────────────────────────────
  for (let d = -7; d <= 0; d++) {
    const date = daysFromNow(d)
    const dateStr = date.toISOString().split('T')[0]
    for (const emp of allEmployees.slice(0, 15)) {
      await db.attendance.create({ data: { employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`, department: emp.department, position: emp.position, date, status: pick(['present','present','present','absent','on_leave']), checkIn: `${String(rand(7,10)).padStart(2,'0')}:00`, checkOut: `${String(rand(17,20)).padStart(2,'0')}:00` }})
    }
  }
  console.log('  ✅ Attendance')

  // ─── 18. Payroll ──────────────────────────────────────────
  const months = ['2025-12','2026-01','2026-02']
  for (const month of months) {
    for (const emp of allEmployees.slice(0, 10)) {
      const base = emp.salary || 20000
      await db.payroll.create({ data: { employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`, department: emp.department, position: emp.position, month, baseSalary: base, variablePay: Math.random() > 0.7 ? randFloat(2000, 10000) : 0, overtime: randFloat(0, 5000), deductions: randFloat(500, 2000), netPay: base + randFloat(0, 5000) - randFloat(500, 2000), status: month === '2026-02' ? 'pending' : 'paid' }})
    }
  }
  console.log('  ✅ Payroll')

  // ─── 19. Inventory ────────────────────────────────────────
  const invData = [
    { name: 'Bath Towels', category: 'Housekeeping', unit: 'piece', currentStock: 250, reorderPoint: 100, minStock: 50, maxStock: 500, unitCost: 350 },
    { name: 'Bed Sheets (King)', category: 'Housekeeping', unit: 'piece', currentStock: 180, reorderPoint: 80, minStock: 40, maxStock: 300, unitCost: 800 },
    { name: 'Pillow Covers', category: 'Housekeeping', unit: 'piece', currentStock: 300, reorderPoint: 100, minStock: 50, maxStock: 500, unitCost: 150 },
    { name: 'Toilet Paper', category: 'Housekeeping', unit: 'pack', currentStock: 500, reorderPoint: 200, minStock: 100, maxStock: 1000, unitCost: 45 },
    { name: 'Shampoo Bottles', category: 'Amenities', unit: 'piece', currentStock: 200, reorderPoint: 80, minStock: 40, maxStock: 400, unitCost: 120 },
    { name: 'Soap Bars', category: 'Amenities', unit: 'piece', currentStock: 350, reorderPoint: 150, minStock: 75, maxStock: 600, unitCost: 80 },
    { name: 'Coffee Capsules', category: 'F&B', unit: 'pack', currentStock: 400, reorderPoint: 100, minStock: 50, maxStock: 800, unitCost: 500 },
    { name: 'Cooking Oil (5L)', category: 'F&B', unit: 'liter', currentStock: 15, reorderPoint: 5, minStock: 3, maxStock: 30, unitCost: 1200 },
    { name: 'Rice (25kg)', category: 'F&B', unit: 'kg', currentStock: 200, reorderPoint: 50, minStock: 25, maxStock: 500, unitCost: 80 },
    { name: 'Light Bulbs (LED)', category: 'Maintenance', unit: 'piece', currentStock: 50, reorderPoint: 20, minStock: 10, maxStock: 100, unitCost: 250 },
    { name: 'Printer Paper A4', category: 'Office', unit: 'pack', currentStock: 20, reorderPoint: 5, minStock: 3, maxStock: 50, unitCost: 450 },
    { name: 'Ink Cartridges', category: 'Office', unit: 'piece', currentStock: 8, reorderPoint: 3, minStock: 2, maxStock: 15, unitCost: 3500 },
    { name: 'Laundry Detergent', category: 'Housekeeping', unit: 'liter', currentStock: 12, reorderPoint: 5, minStock: 3, maxStock: 25, unitCost: 300 },
    { name: 'Wine Glasses', category: 'F&B', unit: 'piece', currentStock: 100, reorderPoint: 30, minStock: 15, maxStock: 200, unitCost: 200 },
    { name: 'Dinner Plates', category: 'F&B', unit: 'piece', currentStock: 150, reorderPoint: 50, minStock: 25, maxStock: 300, unitCost: 350 },
    { name: 'AC Filters', category: 'Maintenance', unit: 'piece', currentStock: 10, reorderPoint: 5, minStock: 3, maxStock: 20, unitCost: 2000 },
    { name: 'Fire Extinguishers', category: 'Safety', unit: 'piece', currentStock: 15, reorderPoint: 5, minStock: 3, maxStock: 30, unitCost: 3500 },
    { name: 'Table Cloths', category: 'F&B', unit: 'piece', currentStock: 40, reorderPoint: 15, minStock: 8, maxStock: 80, unitCost: 600 },
    { name: 'Paint (White 10L)', category: 'Maintenance', unit: 'liter', currentStock: 5, reorderPoint: 2, minStock: 1, maxStock: 10, unitCost: 1500 },
    { name: 'Sugar Packets', category: 'F&B', unit: 'pack', currentStock: 1000, reorderPoint: 300, minStock: 150, maxStock: 2000, unitCost: 10 },
  ]
  await db.inventoryItem.createMany({ data: invData.map(item => ({ ...item, supplier: pick(['Nepal Linen','Kathmandu Fresh','Himalayan Amenity','Valley Maint']), location: pick(['Main Store','Kitchen Store','HK Store','Bar Store']) }))})
  console.log('  ✅ Inventory')

  // ─── 20. Vendors ──────────────────────────────────────────
  await db.vendor.createMany({ data: [
    { name: 'Nepal Linen Supply', contact: 'Krishna Shrestha', email: 'krishna@nepallinen.com', phone: '+977-1-4234567', category: 'Housekeeping', rating: 4.5 },
    { name: 'Kathmandu Fresh Foods', contact: 'Bhim Gurung', email: 'bhim@kathmandufresh.com', phone: '+977-1-4345678', category: 'F&B', rating: 4.2 },
    { name: 'Himalayan Amenity Co.', contact: 'Anil Pandey', email: 'anil@himalayanamenity.com', phone: '+977-1-4456789', category: 'Amenities', rating: 4.8 },
    { name: 'Tech Solutions Nepal', contact: 'Rajan Shakya', email: 'rajan@technepal.com', phone: '+977-1-4567890', category: 'IT', rating: 4.0 },
    { name: 'Valley Maintenance', contact: 'Dipendra KC', email: 'dipendra@valleymaint.com', phone: '+977-1-4678901', category: 'Maintenance', rating: 4.3 },
    { name: 'Nepal Wine House', contact: 'Suman Basnet', email: 'suman@nepalwine.com', phone: '+977-1-4789012', category: 'Beverages', rating: 4.6 },
    { name: 'Office World Nepal', contact: 'Mina Maharjan', email: 'mina@officeworld.com', phone: '+977-1-4890123', category: 'Office', rating: 3.9 },
    { name: 'Royal Laundry Services', contact: 'Gopal Rai', email: 'gopal@royallaundry.com', phone: '+977-1-4901234', category: 'Laundry', rating: 4.1 },
    { name: 'Peak Safety Equipment', contact: 'Hari Lama', email: 'hari@peaksafety.com', phone: '+977-1-4012345', category: 'Safety', rating: 4.7 },
    { name: 'Green Clean Nepal', contact: 'Sita Devi', email: 'sita@greenclean.com', phone: '+977-1-4123456', category: 'Cleaning', rating: 4.4 },
  ]})
  console.log('  ✅ Vendors')

  const allVendors = await db.vendor.findMany()
  const allInventory = await db.inventoryItem.findMany()

  // ─── 21. Purchase Orders ───────────────────────────────────
  for (let i = 0; i < 8; i++) {
    const vendor = pick(allVendors)
    const item = pick(allInventory)
    await db.purchaseOrder.create({ data: { poNumber: `PO-${String(1000 + i).padStart(5, '0')}`, vendor: vendor.name, vendorId: vendor.id, expectedDelivery: daysFromNowStr(rand(1, 14)), items: JSON.stringify([{ name: item.name, quantity: rand(10, 100), unitPrice: item.unitCost, unit: item.unit }]), totalAmount: item.unitCost * rand(10, 100), status: pick(['pending','approved','ordered','delivered','delivered']), notes: null }})
  }
  console.log('  ✅ Purchase orders')

  // ─── 22. Requisitions ──────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const emp = pick(allEmployees)
    const item = pick(allInventory)
    await db.requisition.create({ data: { department: pick(['Housekeeping','F&B','Maintenance','Front Desk']), requestor: `${emp.firstName} ${emp.lastName}`, items: JSON.stringify([{ name: item.name, quantity: rand(5, 50), unit: item.unit }]), status: pick(['pending','approved','received']), priority: pick(['low','normal','high']), totalItems: rand(1, 5) }})
  }
  console.log('  ✅ Requisitions')

  // ─── 23. Assets ───────────────────────────────────────────
  await db.asset.createMany({ data: [
    { name: 'Central AC Unit', category: 'HVAC', location: 'Main Building', purchaseDate: daysFromNow(-730), purchaseCost: 500000, currentValue: 350000, status: 'operational' },
    { name: 'Elevator #1', category: 'Infrastructure', location: 'Main Lobby', purchaseDate: daysFromNow(-1095), purchaseCost: 2000000, currentValue: 1200000, status: 'operational' },
    { name: 'Commercial Kitchen Range', category: 'F&B', location: 'Kitchen', purchaseDate: daysFromNow(-365), purchaseCost: 350000, currentValue: 300000, status: 'operational' },
    { name: 'Laundry Machine (Industrial)', category: 'Housekeeping', location: 'Laundry Room', purchaseDate: daysFromNow(-540), purchaseCost: 200000, currentValue: 140000, status: 'operational' },
    { name: 'Standby Generator 500KVA', category: 'Infrastructure', location: 'Generator Room', purchaseDate: daysFromNow(-900), purchaseCost: 1500000, currentValue: 900000, status: 'operational' },
    { name: 'Water Heater System', category: 'Plumbing', location: 'Boiler Room', purchaseDate: daysFromNow(-600), purchaseCost: 300000, currentValue: 200000, status: 'needs_repair' },
    { name: 'Fire Alarm System', category: 'Safety', location: 'All Floors', purchaseDate: daysFromNow(-400), purchaseCost: 250000, currentValue: 190000, status: 'operational' },
    { name: 'POS System', category: 'IT', location: 'Restaurant', purchaseDate: daysFromNow(-200), purchaseCost: 150000, currentValue: 120000, status: 'operational' },
    { name: 'Conference Room Projector', category: 'AV', location: 'Conference Room', purchaseDate: daysFromNow(-300), purchaseCost: 80000, currentValue: 55000, status: 'operational' },
    { name: 'Gym Equipment Set', category: 'Recreation', location: 'Gym', purchaseDate: daysFromNow(-450), purchaseCost: 200000, currentValue: 120000, status: 'operational' },
  ]})
  console.log('  ✅ Assets')

  // ─── 24. Channels ─────────────────────────────────────────
  await db.channel.createMany({ data: [
    { name: 'Booking.com', type: 'OTA', commissionRate: 15, status: 'connected' },
    { name: 'Agoda', type: 'OTA', commissionRate: 12, status: 'connected' },
    { name: 'Expedia', type: 'OTA', commissionRate: 14, status: 'connected' },
    { name: 'Direct Website', type: 'Direct', commissionRate: 0, status: 'connected' },
    { name: 'Corporate Accounts', type: 'Corporate', commissionRate: 0, status: 'connected' },
    { name: 'Travel Agents', type: 'Wholesale', commissionRate: 10, status: 'connected' },
  ]})
  console.log('  ✅ Channels')

  // ─── 25. Events ───────────────────────────────────────────
  await db.event.createMany({ data: [
    { name: 'Sharma-Poudel Wedding', organizerName: 'Raj Sharma', organizerPhone: '+977-98510-11111', eventType: 'wedding', venue: 'Grand Ballroom', startDate: daysFromNow(7), endDate: daysFromNow(7), expectedPax: 200, totalRevenue: 500000, depositAmount: 500000, depositPaid: 250000, status: 'confirmed' },
    { name: 'TechCorp Annual Conference', organizerName: 'Bikash Neupane', organizerPhone: '+977-98510-22222', eventType: 'conference', venue: 'Conference Hall A', startDate: daysFromNow(14), endDate: daysFromNow(15), expectedPax: 150, totalRevenue: 300000, depositAmount: 300000, depositPaid: 300000, status: 'confirmed' },
    { name: 'Board Meeting - ABC Ltd', organizerName: 'Sita Basnet', organizerPhone: '+977-98510-33333', eventType: 'meeting', venue: 'Board Room', startDate: daysFromNow(3), endDate: daysFromNow(3), expectedPax: 20, totalRevenue: 25000, depositAmount: 25000, depositPaid: 25000, status: 'confirmed' },
  ]})
  console.log('  ✅ Events')

  // ─── 26. Activity Logs ────────────────────────────────────
  const logActions = [
    { action: 'check_in', module: 'Front Desk', details: 'Guest checked in to Room 201' },
    { action: 'check_out', module: 'Front Desk', details: 'Guest checked out from Room 305' },
    { action: 'reservation_created', module: 'Reservations', details: 'New reservation created' },
    { action: 'payment_received', module: 'Accounting', details: 'Payment of NPR 25,000 received' },
    { action: 'room_status_change', module: 'Rooms', details: 'Room 112 status changed to dirty' },
    { action: 'hk_completed', module: 'Housekeeping', details: 'Room 208 cleaning completed' },
    { action: 'pos_order', module: 'POS', details: 'Order placed at Restaurant' },
    { action: 'night_audit', module: 'Operations', details: 'Night audit completed' },
    { action: 'rate_update', module: 'Revenue', details: 'BAR rate updated' },
    { action: 'guest_update', module: 'CRM', details: 'Guest profile updated' },
  ]
  const authUsers = [adminId, gmId, staffId]
  for (let i = 0; i < 20; i++) {
    const a = pick(logActions)
    const uid = pick(authUsers)
    const user = await db.authUser.findUnique({ where: { id: uid } })
    await db.activityLog.create({ data: { userId: uid, userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown', action: a.action, module: a.module, details: a.details, ipAddress: `192.168.1.${rand(1, 254)}`, createdAt: daysFromNow(-rand(0, 7)) }})
  }
  console.log('  ✅ Activity logs')

  // ─── 27. Cashier Shifts ───────────────────────────────────
  let sessionCounter = 0
  for (let d = -9; d <= 0; d++) {
    const emp = pick(allEmployees)
    const isClosed = d < 0
    const payments = randFloat(20000, 80000)
    const refunds = randFloat(0, 3000)
    const closing = isClosed ? randFloat(45000, 55000) : null
    const variance = closing !== null ? closing - 50000 - payments + refunds : null
    const txnCount = Math.floor(rand(8, 45))
    sessionCounter++
    await db.cashierShift.create({
      data: {
        sessionNo: sessionCounter,
        cashierName: `${emp.firstName} ${emp.lastName}`,
        cashierId: emp.id,
        shiftType: d < 0 ? (d % 2 === 0 ? 'morning' : 'evening') : 'evening',
        startDate: daysFromNow(d),
        endDate: isClosed ? daysFromNow(d) : null,
        openingFloat: 50000,
        closingFloat: closing,
        totalPayments: payments,
        totalRefunds: refunds,
        variance,
        transactionCount: txnCount,
        status: isClosed ? 'closed' : 'open',
      },
    })
  }
  console.log('  ✅ Cashier shifts')

  // ─── 28. Support Tickets ──────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const emp = pick(allEmployees)
    await db.supportTicket.create({ data: { ticketNo: `TKT-${String(1000 + i).padStart(5, '0')}`, subject: pick(['WiFi not working in Room 305','Request for extra pillows','Billing discrepancy','Training for POS system','AC noise in Room 410']), description: 'Guest reported issue requiring attention', category: pick(['general','technical','billing','training','bug']), priority: pick(['low','normal','high','urgent']), status: pick(['open','in_progress','resolved']), createdBy: emp.id, createdByName: `${emp.firstName} ${emp.lastName}`, department: emp.department }})
  }
  console.log('  ✅ Support tickets')

  // ─── 29. Work Orders ──────────────────────────────────────
  for (let i = 0; i < 8; i++) {
    await db.workOrder.create({ data: { roomId: pick(allRooms).id, title: pick(['AC Repair','Plumbing Fix','TV Replacement','Wi-Fi Fix','Furniture Repair','Light Fix','Door Lock Repair','Paint Touch-up']), description: 'Maintenance request from housekeeping', priority: pick(['low','normal','high','emergency']), status: pick(['open','assigned','in_progress','completed']), category: pick(['electrical','plumbing','hvac','furniture','painting','general']), assignedTo: pick(allEmployees).id, reportedBy: pick(authUsers) }})
  }
  console.log('  ✅ Work orders')

  // ─── 30. Security Events, Waitlist, WakeUpCalls ────────────
  await db.securityEvent.createMany({ data: [
    { type: 'auth_success', level: 'info', userId: adminId, path: '/api/auth/profile', method: 'GET' },
    { type: 'auth_failure', level: 'warning', email: 'unknown@test.com', path: '/api/auth/profile', method: 'GET' },
  ]})
  await db.waitlistEntry.createMany({ data: [
    { guestName: 'Corporate Client', contactPhone: '+977-98510-99999', roomPreference: 'Deluxe Suite', roomTypeId: roomTypes[4].id, checkInDate: daysFromNowStr(5), checkOutDate: daysFromNowStr(8), adults: 2, priority: 'High', notes: 'VIP corporate' },
    { guestName: 'Walk-in Guest', contactPhone: '+977-98510-88888', roomTypeId: roomTypes[0].id, checkInDate: daysFromNowStr(7), checkOutDate: daysFromNowStr(10), adults: 1, priority: 'Normal' },
  ]})
  await db.wakeUpCall.createMany({ data: [
    { roomNumber: '201', guestName: 'John Smith', scheduledTime: '06:00', date: daysFromNowStr(1), status: 'Pending' },
    { roomNumber: '305', guestName: 'Priya Sharma', scheduledTime: '05:30', date: daysFromNowStr(1), status: 'Pending' },
  ]})
  console.log('  ✅ Security, waitlist, wake-up calls')

  // ─── 31. Room Restrictions ────────────────────────────────
  await db.roomRestriction.createMany({ data: [
    { roomTypeId: roomTypes[0].id, date: daysFromNow(10), restrictionType: 'stop_sell', reason: 'Floor maintenance' },
    { roomTypeId: roomTypes[2].id, date: daysFromNow(5), restrictionType: 'min_los', value: 3, reason: 'Festival season' },
  ]})
  console.log('  ✅ Room restrictions')

  console.log('\n🎉 Seed completed!')
}

main().then(() => process.exit(0)).catch(e => { console.error('Seed failed:', e); process.exit(1) })
