import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding hotel database...');

  // ─── PROPERTY ───────────────────────────────────────────
  const existingProperty = await db.property.findFirst();
  if (existingProperty) {
    console.log('⏭️  Property already exists, skipping initial seed');
    console.log(`   Found: ${existingProperty.name}`);
    
    // Check if we already have basic data seeded
    const roomCount = await db.room.count();
    if (roomCount > 0) {
      console.log(`   Already has ${roomCount} rooms seeded`);
    }
  }

  let property = existingProperty;
  if (!property) {
    property = await db.property.create({
      data: {
        name: 'Meridian Hotel',
        code: 'MH',
        address: 'Durbar Marg, Thamel',
        city: 'Kathmandu',
        country: 'Nepal',
        currency: 'NPR',
        phone: '+977-1-4225678',
        email: 'info@grandktm.com',
        starRating: 4,
        totalRooms: 48,
        taxRate: 13.0,
        serviceCharge: 10.0,
      },
    });
    console.log(`✅ Property created: ${property.name}`);
  }

  // ─── ROOM TYPES ─────────────────────────────────────────
  const existingRoomTypes = await db.roomType.count();
  let roomTypes = await db.roomType.findMany({ orderBy: { sortOrder: 'asc' } });

  if (existingRoomTypes === 0) {
    const std = await db.roomType.create({ data: { name: 'Standard Room', code: 'STD', baseOccupancy: 1, maxOccupancy: 2, bedConfig: '1 Queen Bed', areaSqFt: 250, sortOrder: 1 } });
    const dlx = await db.roomType.create({ data: { name: 'Deluxe Room', code: 'DLX', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 320, view: 'Garden', sortOrder: 2 } });
    const dlv = await db.roomType.create({ data: { name: 'Deluxe Pool View', code: 'DLV', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 350, view: 'Pool', sortOrder: 3 } });
    const sut = await db.roomType.create({ data: { name: 'Premium Suite', code: 'SUT', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King + Sofa Bed', areaSqFt: 550, view: 'City', sortOrder: 4 } });
    const psu = await db.roomType.create({ data: { name: 'Presidential Suite', code: 'PSU', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King + Living Room', areaSqFt: 800, view: 'Mountain', sortOrder: 5 } });
    roomTypes = [std, dlx, dlv, sut, psu];
    console.log(`✅ Room types created: ${roomTypes.length}`);
  }

  // ─── ROOMS ──────────────────────────────────────────────
  const existingRooms = await db.room.count();
  if (existingRooms === 0) {
    const rooms: { number: string; floor: number; typeId: string; wing?: string }[] = [];
    const wings = ['East', 'West'];
    let roomNum = 100;

    for (let f = 1; f <= 4; f++) {
      for (let r = 0; r < 5; r++) {
        rooms.push({ number: String(roomNum), floor: f, typeId: roomTypes[0].id, wing: wings[r % 2] });
        roomNum++;
      }
    }
    for (let f = 5; f <= 6; f++) {
      for (let r = 0; r < 5; r++) {
        rooms.push({ number: String(roomNum), floor: f, typeId: roomTypes[1].id, wing: wings[r % 2] });
        roomNum++;
      }
    }
    for (let r = 0; r < 6; r++) {
      rooms.push({ number: String(roomNum), floor: 7, typeId: roomTypes[2].id, wing: wings[r % 2] });
      roomNum++;
    }
    for (let r = 0; r < 6; r++) {
      rooms.push({ number: String(roomNum), floor: 8, typeId: roomTypes[3].id, wing: wings[r % 2] });
      roomNum++;
    }
    rooms.push({ number: '901', floor: 9, typeId: roomTypes[4].id, wing: 'East' });
    rooms.push({ number: '902', floor: 9, typeId: roomTypes[4].id, wing: 'West' });

    const roomStatuses = ['vacant_clean', 'occupied', 'vacant_dirty', 'cleaning', 'inspected', 'out_of_order'];

    for (const r of rooms) {
      const status = r.number === '203' ? 'out_of_order' : roomStatuses[Math.floor(Math.random() * 5)];
      await db.room.create({
        data: { number: r.number, floor: r.floor, wing: r.wing, typeId: r.typeId, propertyId: property.id, status, ipPhoneExt: `100${r.number}` },
      });
    }
    console.log(`✅ Rooms created: ${rooms.length}`);
  }

  // ─── RATE PLANS ─────────────────────────────────────────
  const existingRatePlans = await db.ratePlan.count();
  if (existingRatePlans === 0) {
    const today = new Date();
    const ratePlans = [
      { name: 'Best Available Rate', code: 'BAR', roomTypeId: roomTypes[0].id, baseRate: 4500 },
      { name: 'Deluxe Rate', code: 'DLX-RATE', roomTypeId: roomTypes[1].id, baseRate: 6500 },
      { name: 'Pool View Rate', code: 'PV-RATE', roomTypeId: roomTypes[2].id, baseRate: 8500 },
      { name: 'Suite Rate', code: 'SUT-RATE', roomTypeId: roomTypes[3].id, baseRate: 15000 },
      { name: 'Presidential Rate', code: 'PSU-RATE', roomTypeId: roomTypes[4].id, baseRate: 35000 },
      { name: 'Corporate Rate', code: 'CORP', roomTypeId: roomTypes[0].id, baseRate: 3800, channel: 'corporate' },
      { name: 'OTA Rate', code: 'OTA', roomTypeId: roomTypes[0].id, baseRate: 5000, channel: 'ota' },
    ];

    for (const rp of ratePlans) {
      const plan = await db.ratePlan.create({
        data: { name: rp.name, code: rp.code, propertyId: property.id, roomTypeId: rp.roomTypeId, baseRate: rp.baseRate, channel: rp.channel || 'direct' },
      });

      for (let d = 0; d < 30; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const weekend = date.getDay() === 0 || date.getDay() === 6;
        const rate = weekend ? rp.baseRate * 1.15 : rp.baseRate;
        await db.dailyRate.create({
          data: { ratePlanId: plan.id, date, rate: Math.round(rate), available: Math.floor(Math.random() * 5) },
        });
      }
    }
    console.log(`✅ Rate plans created: ${ratePlans.length}`);
  }

  // ─── GUESTS ─────────────────────────────────────────────
  const existingGuests = await db.guest.count();
  if (existingGuests === 0) {
    const today = new Date();
    const guestData = [
      { firstName: 'Rajesh', lastName: 'Sharma', nationality: 'Nepalese', vipLevel: 'gold', loyaltyPoints: 12500, loyaltyTier: 'gold', totalStays: 18, totalRevenue: 485000 },
      { firstName: 'Sarah', lastName: 'Johnson', nationality: 'American', vipLevel: 'platinum', loyaltyPoints: 45000, loyaltyTier: 'platinum', totalStays: 35, totalRevenue: 1250000 },
      { firstName: 'Wei', lastName: 'Chen', nationality: 'Chinese', vipLevel: 'silver', loyaltyPoints: 5500, loyaltyTier: 'silver', totalStays: 8, totalRevenue: 195000 },
      { firstName: 'Priya', lastName: 'Patel', nationality: 'Indian', vipLevel: 'gold', loyaltyPoints: 18200, loyaltyTier: 'gold', totalStays: 22, totalRevenue: 620000 },
      { firstName: 'Takeshi', lastName: 'Yamamoto', nationality: 'Japanese', vipLevel: 'none', loyaltyPoints: 1200, loyaltyTier: 'none', totalStays: 3, totalRevenue: 72000 },
      { firstName: 'Emily', lastName: 'Williams', nationality: 'British', vipLevel: 'silver', loyaltyPoints: 8900, loyaltyTier: 'silver', totalStays: 12, totalRevenue: 310000 },
      { firstName: 'Ahmed', lastName: 'Al-Rashid', nationality: 'Emirati', vipLevel: 'platinum', loyaltyPoints: 52000, loyaltyTier: 'platinum', totalStays: 42, totalRevenue: 1850000 },
      { firstName: 'Maria', lastName: 'Santos', nationality: 'Filipino', vipLevel: 'none', loyaltyPoints: 800, loyaltyTier: 'none', totalStays: 2, totalRevenue: 28000 },
      { firstName: 'David', lastName: 'Kim', nationality: 'Korean', vipLevel: 'gold', loyaltyPoints: 15800, loyaltyTier: 'gold', totalStays: 15, totalRevenue: 430000 },
      { firstName: 'Lena', lastName: 'Mueller', nationality: 'German', vipLevel: 'silver', loyaltyPoints: 6700, loyaltyTier: 'silver', totalStays: 9, totalRevenue: 225000 },
      { firstName: 'Arjun', lastName: 'Thapa', nationality: 'Nepalese', vipLevel: 'none', loyaltyPoints: 500, loyaltyTier: 'none', totalStays: 1, totalRevenue: 12000 },
      { firstName: 'Sophie', lastName: 'Dubois', nationality: 'French', vipLevel: 'gold', loyaltyPoints: 22000, loyaltyTier: 'gold', totalStays: 28, totalRevenue: 780000 },
    ];

    for (const g of guestData) {
      await db.guest.create({
        data: { ...g, email: `${g.firstName.toLowerCase()}.${g.lastName.toLowerCase()}@email.com`, phone: `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 17), lastStayAt: new Date(today.getTime() - Math.random() * 30 * 86400000) },
      });
    }
    console.log(`✅ Guests created: ${guestData.length}`);
  }

  // ─── RESERVATIONS ───────────────────────────────────────
  const existingReservations = await db.reservation.count();
  if (existingReservations === 0) {
    const today = new Date();
    const guests = await db.guest.findMany();
    const statuses = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
    const sources = ['direct', 'booking_com', 'expedia', 'walk_in', 'phone', 'email', 'corporate'];
    const allRooms = await db.room.findMany({ where: { status: 'occupied' } });
    const ratePlans = await db.ratePlan.findMany();

    for (let i = 0; i < 25; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const room = allRooms[Math.floor(Math.random() * allRooms.length)] || null;
      const checkInOffset = Math.floor(Math.random() * 7) - 2;
      const stayNights = Math.floor(Math.random() * 5) + 1;
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + checkInOffset);
      checkIn.setHours(14, 0, 0, 0);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + stayNights);
      checkOut.setHours(12, 0, 0, 0);

      let status = 'confirmed';
      if (checkInOffset < -1) status = Math.random() > 0.1 ? 'checked_out' : 'checked_in';
      if (checkInOffset === -1) status = Math.random() > 0.3 ? 'checked_in' : 'checked_out';
      if (checkInOffset === 0) status = Math.random() > 0.2 ? 'confirmed' : 'checked_in';
      if (checkInOffset > 0) status = Math.random() > 0.05 ? 'confirmed' : 'cancelled';

      const roomRate = 4500 + Math.floor(Math.random() * 30000);
      const totalAmount = roomRate * stayNights;
      const paidAmount = status === 'checked_out' ? totalAmount : Math.random() * totalAmount * 0.5;

      await db.reservation.create({
        data: {
          confirmationNo: `TKH-${String(2025000 + i)}`, propertyId: property.id,
          guestId: guest.id, roomId: room?.id || null,
          status, reservationType: i % 5 === 0 ? 'corporate' : 'individual',
          adults: Math.random() > 0.5 ? 2 : 1, children: Math.random() > 0.8 ? 1 : 0,
          checkIn, checkOut, roomRate, totalAmount, paidAmount, creditLimit: 15000,
          source: sources[Math.floor(Math.random() * sources.length)],
          guaranteed: Math.random() > 0.2,
          paymentStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
          bookedBy: 'System',
        },
      });
    }
    console.log(`✅ Reservations created: 25`);
  }

  // ─── FOLIOS & TRANSACTIONS ──────────────────────────────
  const existingFolios = await db.folio.count();
  if (existingFolios === 0) {
    const reservations = await db.reservation.findMany({ where: { status: { in: ['checked_in', 'checked_out'] } }, include: { room: { select: { number: true } } } });
    const txTypes = ['room', 'f_and_b', 'laundry', 'spa', 'minibar', 'business_center', 'phone', 'miscellaneous'];
    const txDescriptions: Record<string, string[]> = {
      room: ['Room charge', 'Room revenue - Night'], f_and_b: ['Restaurant - Dinner', 'Room Service - Breakfast', 'Bar - Cocktails', 'Restaurant - Lunch'],
      laundry: ['Dry Cleaning - 3 items', 'Laundry - Express Wash'], spa: ['Full Body Massage', 'Facial Treatment'],
      minibar: ['Minibar - Beverages'], business_center: ['Meeting Room - 4 hours'], phone: ['International Call - 15 min'],
      miscellaneous: ['Gift Shop Purchase', 'Late Check-out Fee'],
    };

    for (const res of reservations) {
      const folio = await db.folio.create({ data: { reservationId: res.id, guestId: res.guestId || '', status: res.status === 'checked_out' ? 'closed' : 'open', balance: 0 } });

      const nights = Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000);
      for (let n = 0; n < nights; n++) {
        const date = new Date(res.checkIn);
        date.setDate(date.getDate() + n);
        if (date > new Date()) break;
        await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: 'room', description: `Room revenue - Night ${n + 1} (Room ${res.room?.number || 'TBD'})`, amount: res.roomRate, taxAmount: Math.round(res.roomRate * 0.13), totalAmount: Math.round(res.roomRate * 1.13), outlet: 'Front Desk', postedBy: 'System' } });
      }

      const numCharges = Math.floor(Math.random() * 4);
      for (let c = 0; c < numCharges; c++) {
        const txType = txTypes[Math.floor(Math.random() * txTypes.length)];
        const descs = txDescriptions[txType];
        const desc = descs[Math.floor(Math.random() * descs.length)];
        const amount = Math.floor(Math.random() * 5000) + 200;
        await db.folioTransaction.create({ data: { folioId: folio.id, transactionType: txType, description: desc, amount, taxAmount: Math.round(amount * 0.13), totalAmount: Math.round(amount * 1.13), outlet: txType === 'f_and_b' ? 'Restaurant' : 'Front Desk', postedBy: 'System' } });
      }

      const txs = await db.folioTransaction.findMany({ where: { folioId: folio.id } });
      const total = txs.reduce((sum, t) => sum + t.totalAmount, 0);
      await db.folio.update({ where: { id: folio.id }, data: { balance: total } });

      if (res.status === 'checked_out') {
        const methods = ['cash', 'card', 'bank_transfer'];
        await db.folioPayment.create({ data: { folioId: folio.id, paymentMethod: methods[Math.floor(Math.random() * methods.length)], amount: total, cardType: 'visa', receivedBy: 'Front Desk' } });
      }
    }
    console.log(`✅ Folios created with transactions`);
  }

  // ─── OUTLETS & POS ──────────────────────────────────────
  const existingOutlets = await db.outlet.count();
  if (existingOutlets === 0) {
    const outlets = [
      { name: 'The Himalayan Restaurant', code: 'HIMALAYAN', type: 'restaurant', location: 'Ground Floor' },
      { name: 'Summit Bar & Lounge', code: 'SUMMIT', type: 'bar', location: 'Rooftop' },
      { name: 'Kathmandu Coffee House', code: 'KCH', type: 'restaurant', location: 'Lobby' },
      { name: 'Zen Spa & Wellness', code: 'ZENSPA', type: 'spa', location: 'Basement 1' },
      { name: 'Business Center', code: 'BIZCTR', type: 'business_center', location: 'Mezzanine' },
      { name: 'Grand Laundry', code: 'GRNDLAUN', type: 'laundry', location: 'Basement 2' },
      { name: 'Gift & Souvenir Shop', code: 'GIFTSHOP', type: 'gift_shop', location: 'Lobby' },
    ];

    const menuData: Record<string, { name: string; category: string; price: number }[]> = {
      restaurant: [
        { name: 'Dal Bhat Set', category: 'Main Course', price: 650 }, { name: 'Chicken Momo (10 pcs)', category: 'Appetizer', price: 450 },
        { name: 'Grilled Salmon', category: 'Main Course', price: 2200 }, { name: 'Thali Special', category: 'Main Course', price: 800 },
        { name: 'Caesar Salad', category: 'Salad', price: 550 }, { name: 'Mushroom Soup', category: 'Soup', price: 350 },
        { name: 'Butter Chicken', category: 'Main Course', price: 850 }, { name: 'Garlic Naan', category: 'Bread', price: 200 },
        { name: 'Continental Breakfast', category: 'Breakfast', price: 1200 }, { name: 'Fresh Fruit Platter', category: 'Dessert', price: 500 },
      ],
      bar: [
        { name: 'Everest Lager', category: 'Beer', price: 450 }, { name: 'Gorkha Strong', category: 'Beer', price: 400 },
        { name: 'Mojito', category: 'Cocktail', price: 650 }, { name: 'Old Fashioned', category: 'Cocktail', price: 750 },
        { name: 'House Red Wine (Glass)', category: 'Wine', price: 650 }, { name: 'Coffee Martini', category: 'Cocktail', price: 700 },
        { name: 'French Fries', category: 'Snack', price: 350 }, { name: 'Chicken Wings', category: 'Snack', price: 550 },
      ],
      spa: [
        { name: 'Full Body Massage (60 min)', category: 'Massage', price: 3500 }, { name: 'Deep Tissue Massage (60 min)', category: 'Massage', price: 4000 },
        { name: 'Facial Treatment (45 min)', category: 'Facial', price: 2500 }, { name: 'Hot Stone Therapy (75 min)', category: 'Massage', price: 4500 },
        { name: "Couple's Retreat (90 min)", category: 'Package', price: 7000 }, { name: 'Head & Shoulder Massage (30 min)', category: 'Massage', price: 1800 },
      ],
      business_center: [
        { name: 'Meeting Room (per hour)', category: 'Rental', price: 2000 }, { name: 'Workstation (per hour)', category: 'Rental', price: 300 },
        { name: 'Printing (per page B&W)', category: 'Service', price: 10 }, { name: 'Printing (per page Color)', category: 'Service', price: 50 },
        { name: 'International Call (per min)', category: 'Service', price: 25 },
      ],
      laundry: [
        { name: 'Shirt Wash & Iron', category: 'Wash', price: 80 }, { name: 'Trousers Dry Clean', category: 'Dry Clean', price: 250 },
        { name: 'Saree Dry Clean', category: 'Dry Clean', price: 500 }, { name: 'Suit Dry Clean', category: 'Dry Clean', price: 800 },
        { name: 'Express Wash (surcharge)', category: 'Service', price: 200 },
      ],
      gift_shop: [
        { name: 'Pashmina Scarf', category: 'Souvenir', price: 3500 }, { name: 'Prayer Flags Set', category: 'Souvenir', price: 500 },
        { name: 'Nepali Tea Box', category: 'Food', price: 800 }, { name: 'Postcard Pack (10)', category: 'Souvenir', price: 200 },
        { name: 'Singing Bowl', category: 'Souvenir', price: 2500 },
      ],
    };

    for (const outlet of outlets) {
      const o = await db.outlet.create({ data: outlet });
      const items = menuData[outlet.type] || [];
      for (const item of items) {
        await db.menuItem.create({ data: { outletId: o.id, name: item.name, category: item.category, price: item.price } });
      }
    }
    console.log(`✅ Outlets & Menu created`);
  }

  // ─── POS ORDERS ──────────────────────────────────────────
  const existingOrders = await db.posOrder.count();
  if (existingOrders === 0) {
    const today = new Date();
    const outletRecords = await db.outlet.findMany();
    for (let i = 0; i < 15; i++) {
      const outlet = outletRecords[Math.floor(Math.random() * Math.min(3, outletRecords.length))];
      const orderStatuses = ['open', 'in_progress', 'ready', 'served', 'closed'];
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const order = await db.posOrder.create({
        data: {
          outletId: outlet.id, tableNumber: Math.floor(Math.random() * 15) + 1, status,
          serverName: ['Ram', 'Sita', 'Hari', 'Gita', 'Krishna'][Math.floor(Math.random() * 5)],
          guestCount: Math.floor(Math.random() * 4) + 1,
          createdAt: new Date(today.getTime() - Math.random() * 86400000),
        },
      });

      const menuItems = await db.menuItem.findMany({ where: { outletId: outlet.id } });
      const numItems = Math.floor(Math.random() * 4) + 1;
      let totalAmount = 0;
      for (let j = 0; j < numItems; j++) {
        const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = menuItem.price * qty;
        totalAmount += itemTotal;
        await db.orderItem.create({ data: { orderId: order.id, menuItemId: menuItem.id, quantity: qty, unitPrice: menuItem.price, totalPrice: itemTotal, status: status === 'closed' ? 'served' : status === 'served' ? 'served' : 'pending' } });
      }
      await db.posOrder.update({ where: { id: order.id }, data: { totalAmount, taxAmount: Math.round(totalAmount * 0.13) } });
    }
    console.log(`✅ POS Orders created`);
  }

  // ─── HK TASKS ────────────────────────────────────────────
  const existingHkTasks = await db.hkTask.count();
  if (existingHkTasks === 0) {
    const occupiedRooms = await db.room.findMany({ where: { status: 'occupied' } });
    const dirtyRooms = await db.room.findMany({ where: { status: 'vacant_dirty' } });
    const cleaningRooms = await db.room.findMany({ where: { status: 'cleaning' } });
    const allHkRooms = [...occupiedRooms, ...dirtyRooms, ...cleaningRooms];
    const attendants = ['Maya', 'Laxmi', 'Sita', 'Gita', 'Ram Kumari', 'Sushila'];

    for (const room of allHkRooms) {
      const taskType = room.status === 'occupied' ? 'stayover' : 'checkout';
      const status = room.status === 'cleaning' ? 'in_progress' : room.status === 'vacant_dirty' ? 'pending' : 'assigned';
      await db.hkTask.create({ data: { roomId: room.id, taskType, status, priority: Math.random() > 0.8 ? 'vip' : 'normal', assignedTo: attendants[Math.floor(Math.random() * attendants.length)], scheduledTime: new Date(), estimatedMinutes: taskType === 'checkout' ? 45 : 25 } });
    }
    console.log(`✅ HK Tasks created`);
  }

  // ─── EMPLOYEES ──────────────────────────────────────────
  const existingEmployees = await db.employee.count();
  if (existingEmployees === 0) {
    const employees = [
      { firstName: 'Ramesh', lastName: 'Karki', department: 'Front Office', position: 'Front Desk Manager', role: 'manager' },
      { firstName: 'Sunita', lastName: 'Thapa', department: 'Front Office', position: 'Receptionist', role: 'staff' },
      { firstName: 'Bikash', lastName: 'Gurung', department: 'Front Office', position: 'Night Auditor', role: 'staff' },
      { firstName: 'Anita', lastName: 'Magar', department: 'Housekeeping', position: 'HK Supervisor', role: 'supervisor' },
      { firstName: 'Deepa', lastName: 'Rai', department: 'F&B', position: 'F&B Manager', role: 'manager' },
      { firstName: 'Prakash', lastName: 'Shrestha', department: 'F&B', position: 'Head Chef', role: 'staff' },
      { firstName: 'Kamal', lastName: 'Tamang', department: 'Finance', position: 'Accountant', role: 'staff' },
      { firstName: 'Bishnu', lastName: 'Poudel', department: 'Revenue', position: 'Revenue Manager', role: 'manager' },
      { firstName: 'Samjhana', lastName: 'Basnet', department: 'HR', position: 'HR Manager', role: 'manager' },
      { firstName: 'Raju', lastName: 'Maharjan', department: 'Maintenance', position: 'Maintenance Head', role: 'supervisor' },
      { firstName: 'Sanjay', lastName: 'Mishra', department: 'Spa', position: 'Spa Manager', role: 'manager' },
      { firstName: 'Nisha', lastName: 'KC', department: 'Front Office', position: 'Concierge', role: 'staff' },
      { firstName: 'Dipak', lastName: 'Adhikari', department: 'IT', position: 'IT Manager', role: 'manager' },
      { firstName: 'Ashok', lastName: 'Rana', department: 'Management', position: 'General Manager', role: 'gm' },
      { firstName: 'Srijana', lastName: 'Ghimire', department: 'Events', position: 'Events Manager', role: 'manager' },
    ];

    for (const emp of employees) {
      await db.employee.create({
        data: { ...emp, propertyId: property.id, salary: 25000 + Math.floor(Math.random() * 75000), hireDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1), email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@grandktm.com`, phone: `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 17) },
      });
    }
    console.log(`✅ Employees created: ${employees.length}`);
  }

  // ─── NIGHT AUDITS ───────────────────────────────────────
  const existingAudits = await db.nightAudit.count();
  if (existingAudits === 0) {
    const today = new Date();
    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      await db.nightAudit.create({ data: { businessDate: date, status: 'completed', roomRevenue: 120000 + Math.floor(Math.random() * 80000), fAndBRevenue: 45000 + Math.floor(Math.random() * 30000), otherRevenue: 15000 + Math.floor(Math.random() * 20000), totalRevenue: 180000 + Math.floor(Math.random() * 130000), totalTax: 25000 + Math.floor(Math.random() * 18000), occupancy: 60 + Math.floor(Math.random() * 30), adr: 6000 + Math.floor(Math.random() * 5000), revpar: 4000 + Math.floor(Math.random() * 4000), completedBy: 'Bikash Gurung', startedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 30), completedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 58) } });
    }
    console.log(`✅ Night Audits created`);
  }

  // ─── CASHIER SHIFTS ─────────────────────────────────────
  const existingShifts = await db.cashierShift.count();
  if (existingShifts === 0) {
    const today = new Date();
    await db.cashierShift.create({ data: { cashierName: 'Sunita Thapa', shiftType: 'morning', startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0), openingFloat: 50000, totalPayments: 185000, totalRefunds: 5000, status: 'closed', endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), closingFloat: 52000, variance: 2000 } });
    await db.cashierShift.create({ data: { cashierName: 'Ramesh Karki', shiftType: 'evening', startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), openingFloat: 52000, totalPayments: 0, status: 'open' } });
    console.log(`✅ Cashier Shifts created`);
  }

  // ─── EVENTS ────────────────────────────────────────────
  const existingEvents = await db.event.count();
  if (existingEvents === 0) {
    const today = new Date();
    await db.event.create({ data: { name: 'Annual Tech Conference 2025', organizerName: 'Tech Nepal Pvt. Ltd.', organizerPhone: '+977-1-4455667', organizerEmail: 'events@technepal.com', eventType: 'conference', venue: 'Grand Ballroom', startDate: new Date(today.getTime() + 3 * 86400000), endDate: new Date(today.getTime() + 5 * 86400000), expectedPax: 250, status: 'confirmed', totalRevenue: 850000, depositAmount: 425000, depositPaid: 425000 } });
    await db.event.create({ data: { name: 'Sharma-Patel Wedding', organizerName: 'Rajesh Sharma', organizerPhone: '+977-9841234567', eventType: 'wedding', venue: 'Garden Terrace', startDate: new Date(today.getTime() + 10 * 86400000), endDate: new Date(today.getTime() + 10 * 86400000), expectedPax: 300, status: 'confirmed', totalRevenue: 650000, depositAmount: 325000, depositPaid: 200000 } });
    await db.event.create({ data: { name: 'Corporate Team Building', organizerName: 'Nepal Bank Ltd.', organizerPhone: '+977-1-4221234', eventType: 'corporate', venue: 'Meeting Room A, B, C', startDate: new Date(today.getTime() + 7 * 86400000), endDate: new Date(today.getTime() + 7 * 86400000), expectedPax: 50, status: 'tentative', totalRevenue: 120000, depositAmount: 60000, depositPaid: 0 } });
    await db.event.create({ data: { name: 'Rana Family Birthday', organizerName: 'Bikash Rana', organizerPhone: '+977-9845678901', eventType: 'birthday', venue: 'Rooftop Garden', startDate: new Date(today.getTime() + 18 * 86400000), endDate: new Date(today.getTime() + 18 * 86400000), expectedPax: 40, status: 'confirmed', totalRevenue: 32000, depositAmount: 16000, depositPaid: 16000 } });
    await db.event.create({ data: { name: 'Product Launch - ABC Electronics', organizerName: 'ABC Electronics', organizerEmail: 'events@abcelectronics.com', eventType: 'corporate', venue: 'Grand Ballroom', startDate: new Date(today.getTime() + 23 * 86400000), endDate: new Date(today.getTime() + 23 * 86400000), expectedPax: 100, status: 'tentative', totalRevenue: 175000, depositAmount: 87500, depositPaid: 0 } });
    console.log(`✅ Events created`);
  }

  // ─── WORK ORDERS ─────────────────────────────────────────
  const existingWorkOrders = await db.workOrder.count();
  if (existingWorkOrders === 0) {
    const workOrders = [
      { title: 'AC not cooling in Room 305', description: 'Guest complained AC is blowing warm air. Compressor may need servicing.', priority: 'high', category: 'hvac', roomId: '305' },
      { title: 'Leaking faucet in Room 201', description: 'Bathroom faucet dripping continuously. Water wastage concern.', priority: 'normal', category: 'plumbing', roomId: '201' },
      { title: 'TV remote not working - Room 412', description: 'Remote batteries replaced but still unresponsive.', priority: 'low', category: 'electrical', roomId: '412' },
      { title: 'Broken window latch - Room 603', description: 'Window cannot be locked properly. Security issue.', priority: 'high', category: 'general', roomId: '603' },
      { title: 'Elevator #2 intermittent stops', description: 'Elevator stopping between floors randomly. Needs immediate inspection.', priority: 'emergency', category: 'electrical', roomId: null },
      { title: 'Repaint hallway - Floor 3', description: 'Scuff marks and peeling paint on 3rd floor east wing.', priority: 'low', category: 'painting', roomId: null },
      { title: 'Hot water not working - Room 108', description: 'No hot water in bathroom. Guest requested immediate fix.', priority: 'high', category: 'plumbing', roomId: '108' },
      { title: 'Internet down in conference room', description: 'WiFi router needs reset. No connectivity.', priority: 'normal', category: 'electrical', roomId: null },
      { title: 'Carpet stain - Room 405', description: 'Large coffee stain on carpet needs professional cleaning.', priority: 'low', category: 'general', roomId: '405' },
      { title: 'Door lock malfunction - Room 710', description: 'Electronic door lock not responding to key card.', priority: 'high', category: 'general', roomId: '710' },
    ];

    const roomIds = await db.room.findMany({ select: { id: true, number: true } });
    for (const wo of workOrders) {
      const room = wo.roomId ? roomIds.find(r => r.number === wo.roomId) : null;
      await db.workOrder.create({ data: { ...wo, roomId: room?.id || null, reportedBy: 'Front Desk', status: wo.priority === 'emergency' ? 'in_progress' : 'open', assignedTo: wo.priority === 'emergency' ? 'Raju Maharjan' : null } });
    }
    console.log(`✅ Work Orders created`);
  }

  // ─── INVENTORY ───────────────────────────────────────────
  const existingInventory = await db.inventoryItem.count();
  if (existingInventory === 0) {
    const invItems = [
      { name: 'Towels (Bath)', category: 'Linen', unit: 'piece', currentStock: 250, reorderPoint: 100, unitCost: 450 },
      { name: 'Bed Sheets (King)', category: 'Linen', unit: 'piece', currentStock: 120, reorderPoint: 50, unitCost: 800 },
      { name: 'Pillow Covers', category: 'Linen', unit: 'piece', currentStock: 200, reorderPoint: 80, unitCost: 150 },
      { name: 'Toilet Paper', category: 'Amenities', unit: 'roll', currentStock: 500, reorderPoint: 200, unitCost: 45 },
      { name: 'Shampoo Bottles (50ml)', category: 'Amenities', unit: 'piece', currentStock: 300, reorderPoint: 150, unitCost: 35 },
      { name: 'Soap Bars', category: 'Amenities', unit: 'piece', currentStock: 400, reorderPoint: 200, unitCost: 25 },
      { name: 'Bottled Water (1L)', category: 'F&B', unit: 'piece', currentStock: 600, reorderPoint: 200, unitCost: 35 },
      { name: 'Coffee Pods', category: 'F&B', unit: 'pack', currentStock: 150, reorderPoint: 50, unitCost: 80 },
      { name: 'Cleaning Solution', category: 'HK Supplies', unit: 'liter', currentStock: 45, reorderPoint: 20, unitCost: 250 },
      { name: 'Light Bulbs (LED)', category: 'Maintenance', unit: 'piece', currentStock: 80, reorderPoint: 30, unitCost: 120 },
      { name: 'Tissue Boxes', category: 'Amenities', unit: 'piece', currentStock: 180, reorderPoint: 80, unitCost: 60 },
      { name: 'Slippers (Pair)', category: 'Amenities', unit: 'pair', currentStock: 100, reorderPoint: 50, unitCost: 75 },
      { name: 'Laundry Detergent', category: 'HK Supplies', unit: 'liter', currentStock: 30, reorderPoint: 15, unitCost: 320 },
      { name: 'Paint (White 5L)', category: 'Maintenance', unit: 'can', currentStock: 12, reorderPoint: 5, unitCost: 850 },
      { name: 'Toothbrush Kits', category: 'Amenities', unit: 'piece', currentStock: 200, reorderPoint: 100, unitCost: 40 },
      { name: 'Bathrobes', category: 'Linen', unit: 'piece', currentStock: 60, reorderPoint: 30, unitCost: 1200 },
    ];

    for (const item of invItems) {
      await db.inventoryItem.create({ data: { ...item, location: 'Main Store', minStock: Math.floor(item.reorderPoint * 0.5), maxStock: item.reorderPoint * 3 } });
    }
    console.log(`✅ Inventory created`);
  }

  // ─── LOST & FOUND ───────────────────────────────────────
  const existingLostFound = await db.lostFound.count();
  if (existingLostFound === 0) {
    await db.lostFound.create({ data: { itemName: 'Gold Necklace', category: 'jewelry', roomId: '405', description: 'Thin gold chain with small pendant', storageLocation: 'Safe Locker #3', foundBy: 'Maya', status: 'found' } });
    await db.lostFound.create({ data: { itemName: 'Passport (Indian)', category: 'documents', roomId: '302', description: 'Indian passport - Mr. Arun Kumar', storageLocation: 'Manager Office', foundBy: 'Laxmi', claimedBy: 'Guest', claimDate: new Date(), status: 'claimed' } });
    await db.lostFound.create({ data: { itemName: 'Blue Backpack', category: 'bags', description: 'North Face backpack, blue color', storageLocation: 'HK Storage Room', foundBy: 'Sita', status: 'found' } });
    console.log(`✅ Lost & Found created`);
  }

  // ─── LEDGER ACCOUNTS ──────────────────────────────────────
  const existingAccounts = await db.ledgerAccount.count();
  if (existingAccounts === 0) {
    const accounts = [
      { code: '1000', name: 'Cash', type: 'asset' }, { code: '1100', name: 'Accounts Receivable', type: 'asset' },
      { code: '1200', name: 'Credit Card Receivable', type: 'asset' }, { code: '2000', name: 'Accounts Payable', type: 'liability' },
      { code: '2100', name: 'Advance Deposits', type: 'liability' }, { code: '2200', name: 'Tax Payable', type: 'liability' },
      { code: '3000', name: 'Owner Equity', type: 'equity' }, { code: '4000', name: 'Room Revenue', type: 'revenue' },
      { code: '4100', name: 'F&B Revenue', type: 'revenue' }, { code: '4200', name: 'Spa Revenue', type: 'revenue' },
      { code: '4300', name: 'Other Revenue', type: 'revenue' }, { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
      { code: '5100', name: 'Salaries & Wages', type: 'expense' }, { code: '5200', name: 'Utilities', type: 'expense' },
      { code: '5300', name: 'Maintenance', type: 'expense' }, { code: '5400', name: 'Marketing', type: 'expense' },
    ];

    for (const acc of accounts) {
      await db.ledgerAccount.create({ data: acc });
    }

    console.log(`✅ Ledger Accounts created`);
  }

  // ─── JOURNAL ENTRIES (separate check) ─────────────────────
  const existingJournalEntries = await db.journalEntry.count();
  if (existingJournalEntries === 0) {
    const accounts = await db.ledgerAccount.findMany();
    const accountMap: Record<string, string> = {};
    for (const acc of accounts) {
      accountMap[acc.code] = acc.id;
    }

    const cashId = accountMap['1000'];
    const arId = accountMap['1100'];
    const roomRevId = accountMap['4000'];
    const fbRevId = accountMap['4100'];
    const taxPayId = accountMap['2200'];
    const depositId = accountMap['2100'];
    const salaryId = accountMap['5100'];
    const utilityId = accountMap['5200'];
    const equityId = accountMap['3000'];

    if (cashId && roomRevId && taxPayId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'Room revenue posting - daily', reference: 'REV-001', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: cashId, debit: 135600, credit: 0, narration: 'Room revenue - cash' },
              { accountId: arId, debit: 45000, credit: 0, narration: 'Room revenue - AR' },
              { accountId: roomRevId, debit: 0, credit: 159200, narration: 'Room revenue credit' },
              { accountId: taxPayId, debit: 0, credit: 21400, narration: 'VAT collected' },
            ],
          },
        },
      });
    }

    if (cashId && fbRevId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'F&B revenue - restaurant', reference: 'REV-002', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: cashId, debit: 48000, credit: 0, narration: 'F&B revenue - cash' },
              { accountId: fbRevId, debit: 0, credit: 42500, narration: 'F&B revenue credit' },
              { accountId: taxPayId, debit: 0, credit: 5500, narration: 'VAT on F&B' },
            ],
          },
        },
      });
    }

    if (cashId && salaryId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'Salary payment - monthly', reference: 'PAY-001', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: salaryId, debit: 680000, credit: 0, narration: 'Monthly salaries' },
              { accountId: cashId, debit: 0, credit: 680000, narration: 'Cash paid for salaries' },
            ],
          },
        },
      });
    }

    if (utilityId && cashId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'Utility bill payment', reference: 'UTL-001', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: utilityId, debit: 45000, credit: 0, narration: 'Electricity bill' },
              { accountId: cashId, debit: 0, credit: 45000, narration: 'Cash paid' },
            ],
          },
        },
      });
    }

    if (cashId && depositId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'Advance deposit received', reference: 'DEP-001', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: cashId, debit: 50000, credit: 0, narration: 'Cash received' },
              { accountId: depositId, debit: 0, credit: 50000, narration: 'Advance deposit liability' },
            ],
          },
        },
      });
    }

    if (cashId && equityId) {
      await db.journalEntry.create({
        data: {
          date: new Date(), description: 'Owner capital contribution', reference: 'EQ-001', status: 'posted', createdBy: 'System',
          lines: {
            create: [
              { accountId: cashId, debit: 500000, credit: 0, narration: 'Capital injection' },
              { accountId: equityId, debit: 0, credit: 500000, narration: 'Owner equity credit' },
            ],
          },
        },
      });
    }

    console.log(`✅ Journal Entries created`);
  }

  // ─── ATTENDANCE ──────────────────────────────────────────
  const existingAttendance = await db.attendance.count();
  if (existingAttendance === 0) {
    const today = new Date();
    const attendanceRecords = [
      { employeeId: 'emp-001', employeeName: 'Raj Sharma', department: 'Front Desk', position: 'Receptionist', checkIn: '08:55', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-002', employeeName: 'Sita Thapa', department: 'Front Desk', position: 'Shift Supervisor', checkIn: '09:12', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-003', employeeName: 'Hari Adhikari', department: 'Housekeeping', position: 'HK Supervisor', checkIn: '06:58', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-004', employeeName: 'Maya Gurung', department: 'Housekeeping', position: 'Room Attendant', checkIn: '07:15', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-005', employeeName: 'Bikash Lama', department: 'Food & Beverage', position: 'F&B Manager', checkIn: '08:45', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-006', employeeName: 'Anita Rai', department: 'Food & Beverage', position: 'Waitress', checkIn: '09:30', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-007', employeeName: 'Dipak KC', department: 'Kitchen', position: 'Head Chef', checkIn: '06:30', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-008', employeeName: 'Pramila Devi', department: 'Kitchen', position: 'Sous Chef', checkIn: '06:45', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-009', employeeName: 'Suman Maharjan', department: 'Engineering', position: 'Maintenance Tech', checkIn: null, checkOut: null, status: 'absent', late: false },
      { employeeId: 'emp-010', employeeName: 'Krishti Poudel', department: 'Engineering', position: 'Electrician', checkIn: '08:50', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-011', employeeName: 'Ramesh Budhathoki', department: 'Security', position: 'Security Guard', checkIn: '06:00', checkOut: '14:05', status: 'present', late: false },
      { employeeId: 'emp-012', employeeName: 'Nirmala Shrestha', department: 'Accounts', position: 'Accountant', checkIn: '09:45', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-013', employeeName: 'Gopal Basnet', department: 'Accounts', position: 'Finance Manager', checkIn: '09:00', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-014', employeeName: 'Srijana Tamang', department: 'Sales & Marketing', position: 'Sales Executive', checkIn: '09:30', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-015', employeeName: 'Arun Neupane', department: 'HR', position: 'HR Manager', checkIn: '09:02', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-016', employeeName: 'Binita Magar', department: 'Spa', position: 'Therapist', checkIn: null, checkOut: null, status: 'on_leave', late: false },
      { employeeId: 'emp-017', employeeName: 'Prakash Oli', department: 'IT', position: 'IT Manager', checkIn: '09:10', checkOut: null, status: 'present', late: true },
      { employeeId: 'emp-018', employeeName: 'Srijana Karki', department: 'Front Desk', position: 'Concierge', checkIn: null, checkOut: null, status: 'absent', late: false },
      { employeeId: 'emp-019', employeeName: 'Tika Ram', department: 'Banquet', position: 'Banquet Manager', checkIn: '08:30', checkOut: null, status: 'present', late: false },
      { employeeId: 'emp-020', employeeName: 'Laxmi Pokharel', department: 'Laundry', position: 'Laundry Staff', checkIn: '07:00', checkOut: null, status: 'present', late: false },
    ];

    for (const rec of attendanceRecords) {
      await db.attendance.create({ data: { ...rec, date: today } });
    }
    console.log(`✅ Attendance records created: ${attendanceRecords.length}`);
  }

  // ─── PAYROLL ──────────────────────────────────────────────
  const existingPayroll = await db.payroll.count();
  if (existingPayroll === 0) {
    const month = new Date().toISOString().slice(0, 7);
    const payrollData = [
      { employeeId: 'emp-001', employeeName: 'Raj Sharma', department: 'Front Desk', position: 'Receptionist', baseSalary: 25000, variablePay: 3000, overtime: 1500, deductions: 2750, netPay: 26750 },
      { employeeId: 'emp-002', employeeName: 'Sita Thapa', department: 'Front Desk', position: 'Shift Supervisor', baseSalary: 35000, variablePay: 5000, overtime: 0, deductions: 4000, netPay: 36000 },
      { employeeId: 'emp-003', employeeName: 'Hari Adhikari', department: 'Housekeeping', position: 'HK Supervisor', baseSalary: 30000, variablePay: 2000, overtime: 800, deductions: 3280, netPay: 29520 },
      { employeeId: 'emp-004', employeeName: 'Maya Gurung', department: 'Housekeeping', position: 'Room Attendant', baseSalary: 18000, variablePay: 1000, overtime: 1200, deductions: 2020, netPay: 18180 },
      { employeeId: 'emp-005', employeeName: 'Bikash Lama', department: 'Food & Beverage', position: 'F&B Manager', baseSalary: 55000, variablePay: 8000, overtime: 0, deductions: 6300, netPay: 56700 },
      { employeeId: 'emp-006', employeeName: 'Anita Rai', department: 'Food & Beverage', position: 'Waitress', baseSalary: 16000, variablePay: 2500, overtime: 500, deductions: 1900, netPay: 17100 },
      { employeeId: 'emp-007', employeeName: 'Dipak KC', department: 'Kitchen', position: 'Head Chef', baseSalary: 65000, variablePay: 10000, overtime: 0, deductions: 7500, netPay: 67500 },
      { employeeId: 'emp-008', employeeName: 'Pramila Devi', department: 'Kitchen', position: 'Sous Chef', baseSalary: 45000, variablePay: 6000, overtime: 0, deductions: 5100, netPay: 45900 },
      { employeeId: 'emp-010', employeeName: 'Krishti Poudel', department: 'Engineering', position: 'Maintenance Tech', baseSalary: 22000, variablePay: 1500, overtime: 2000, deductions: 2550, netPay: 22950 },
      { employeeId: 'emp-011', employeeName: 'Ramesh Budhathoki', department: 'Security', position: 'Security Guard', baseSalary: 18000, variablePay: 1000, overtime: 1500, deductions: 2050, netPay: 18450 },
      { employeeId: 'emp-012', employeeName: 'Nirmala Shrestha', department: 'Accounts', position: 'Accountant', baseSalary: 40000, variablePay: 4000, overtime: 0, deductions: 4400, netPay: 39600 },
      { employeeId: 'emp-013', employeeName: 'Gopal Basnet', department: 'Accounts', position: 'Finance Manager', baseSalary: 60000, variablePay: 7000, overtime: 0, deductions: 6700, netPay: 60300 },
      { employeeId: 'emp-014', employeeName: 'Srijana Tamang', department: 'Sales & Marketing', position: 'Sales Executive', baseSalary: 35000, variablePay: 12000, overtime: 0, deductions: 4700, netPay: 42300 },
      { employeeId: 'emp-015', employeeName: 'Arun Neupane', department: 'HR', position: 'HR Manager', baseSalary: 50000, variablePay: 5000, overtime: 0, deductions: 5500, netPay: 49500 },
      { employeeId: 'emp-017', employeeName: 'Prakash Oli', department: 'IT', position: 'IT Manager', baseSalary: 55000, variablePay: 6000, overtime: 0, deductions: 6100, netPay: 54900 },
      { employeeId: 'emp-019', employeeName: 'Tika Ram', department: 'Banquet', position: 'Banquet Manager', baseSalary: 40000, variablePay: 8000, overtime: 500, deductions: 4850, netPay: 43650 },
      { employeeId: 'emp-020', employeeName: 'Laxmi Pokharel', department: 'Laundry', position: 'Laundry Staff', baseSalary: 15000, variablePay: 800, overtime: 600, deductions: 1640, netPay: 14760 },
    ];

    for (const rec of payrollData) {
      await db.payroll.create({ data: { ...rec, month, status: 'pending' } });
    }
    console.log(`✅ Payroll records created: ${payrollData.length}`);
  }

  // ─── VENDORS ──────────────────────────────────────────────
  const existingVendors = await db.vendor.count();
  if (existingVendors === 0) {
    const vendors = [
      { name: 'Nepal Fresh Produce', contact: 'Krishna Bhandari', phone: '+977-1-4234567', email: 'krishna@nepalfresh.com', category: 'Food & Beverage', rating: 4.5, status: 'active', lastOrderDate: '2025-07-08', totalOrders: 156 },
      { name: 'Kathmandu Linen Supply', contact: 'Sunita Sharma', phone: '+977-1-4345678', email: 'info@ktmlinens.com', category: 'Housekeeping', rating: 4.2, status: 'active', lastOrderDate: '2025-07-10', totalOrders: 89 },
      { name: 'Himalayan Cleaning Solutions', contact: 'Deepak Rai', phone: '+977-1-4456789', email: 'sales@himalayanclean.com', category: 'Housekeeping', rating: 3.8, status: 'active', lastOrderDate: '2025-07-05', totalOrders: 45 },
      { name: 'Pashupati Paper Industries', contact: 'Ramesh Gupta', phone: '+977-1-4567890', email: 'orders@pashupatipaper.com', category: 'Office Supplies', rating: 4.0, status: 'active', lastOrderDate: '2025-06-28', totalOrders: 67 },
      { name: 'Royal Spirits & Wines', contact: 'Arjun Thapa', phone: '+977-1-4678901', email: 'arjun@royalspirits.com', category: 'Beverages', rating: 4.7, status: 'active', lastOrderDate: '2025-07-12', totalOrders: 203 },
      { name: 'Everest Maintenance Parts', contact: 'Bikash Tamang', phone: '+977-1-4789012', email: 'everestparts@gmail.com', category: 'Maintenance', rating: 3.5, status: 'active', lastOrderDate: '2025-07-01', totalOrders: 23 },
      { name: 'Thamel Textile House', contact: 'Anita Lama', phone: '+977-1-4890123', email: 'textile@thamelhouse.com', category: 'Uniforms', rating: 4.3, status: 'active', lastOrderDate: '2025-05-15', totalOrders: 12 },
      { name: 'Valley Toiletries Pvt Ltd', contact: 'Prakash Shrestha', phone: '+977-1-4901234', email: 'info@valleytoiletries.com', category: 'Amenities', rating: 4.1, status: 'active', lastOrderDate: '2025-07-09', totalOrders: 178 },
      { name: 'Nepal Gas Company', contact: 'Hari Bohara', phone: '+977-1-4012345', email: 'nepalgas@ntc.net.np', category: 'Kitchen Supplies', rating: 3.9, status: 'inactive', lastOrderDate: '2025-03-20', totalOrders: 34 },
      { name: 'Digital Tech Nepal', contact: 'Suman Karki', phone: '+977-1-4123456', email: 'tech@digitalnepal.com', category: 'IT & Electronics', rating: 4.4, status: 'active', lastOrderDate: '2025-07-11', totalOrders: 56 },
    ];

    for (const v of vendors) {
      await db.vendor.create({ data: { ...v, lastOrderDate: new Date(v.lastOrderDate) } });
    }
    console.log(`✅ Vendors created: ${vendors.length}`);
  }

  // ─── REQUISITIONS ──────────────────────────────────────────
  const existingRequisitions = await db.requisition.count();
  if (existingRequisitions === 0) {
    const requisitions = [
      { department: 'Kitchen', requestor: 'Dipak KC', items: JSON.stringify([{ name: 'Chicken Breast', quantity: '50 kg', unit: 'kg' }, { name: 'Basmati Rice', quantity: '100 kg', unit: 'kg' }, { name: 'Cooking Oil', quantity: '20 L', unit: 'liter' }]), status: 'approved', priority: 'high', totalItems: 3, requestDate: new Date() },
      { department: 'Housekeeping', requestor: 'Hari Adhikari', items: JSON.stringify([{ name: 'Bed Sheets (King)', quantity: '40', unit: 'piece' }, { name: 'Pillow Cases', quantity: '80', unit: 'piece' }, { name: 'Towels (Bath)', quantity: '60', unit: 'piece' }, { name: 'Toilet Paper', quantity: '200', unit: 'pack' }]), status: 'pending', priority: 'normal', totalItems: 4, requestDate: new Date() },
      { department: 'Front Desk', requestor: 'Sita Thapa', items: JSON.stringify([{ name: 'Welcome Kits', quantity: '100', unit: 'pack' }, { name: 'Key Cards', quantity: '50', unit: 'piece' }]), status: 'approved', priority: 'low', totalItems: 2, requestDate: new Date(Date.now() - 86400000) },
      { department: 'F&B', requestor: 'Bikash Lama', items: JSON.stringify([{ name: 'Red Wine (Merlot)', quantity: '24', unit: 'piece' }, { name: 'Sparkling Water', quantity: '48', unit: 'piece' }, { name: 'Fresh Orange Juice', quantity: '100', unit: 'liter' }]), status: 'pending', priority: 'normal', totalItems: 3, requestDate: new Date(Date.now() - 86400000) },
      { department: 'Engineering', requestor: 'Krishti Poudel', items: JSON.stringify([{ name: 'LED Bulbs (60W)', quantity: '50', unit: 'piece' }, { name: 'PVC Pipes (1 inch)', quantity: '20', unit: 'piece' }, { name: 'Electrical Tape', quantity: '10', unit: 'pack' }]), status: 'approved', priority: 'high', totalItems: 3, requestDate: new Date(Date.now() - 2 * 86400000) },
      { department: 'Spa', requestor: 'Binita Magar', items: JSON.stringify([{ name: 'Massage Oil (Lavender)', quantity: '10', unit: 'liter' }, { name: 'Candles (Scented)', quantity: '50', unit: 'piece' }, { name: 'Towels (Hand)', quantity: '30', unit: 'piece' }]), status: 'received', priority: 'normal', totalItems: 3, requestDate: new Date(Date.now() - 3 * 86400000) },
      { department: 'Banquet', requestor: 'Tika Ram', items: JSON.stringify([{ name: 'Foldable Tables (6ft)', quantity: '15', unit: 'piece' }, { name: 'Chairs (Folding)', quantity: '200', unit: 'piece' }, { name: 'Table Cloths', quantity: '20', unit: 'piece' }, { name: 'Centerpieces (Floral)', quantity: '20', unit: 'piece' }]), status: 'approved', priority: 'high', totalItems: 4, requestDate: new Date(Date.now() - 4 * 86400000) },
      { department: 'Security', requestor: 'Ramesh Budhathoki', items: JSON.stringify([{ name: 'Walkie Talkie Batteries', quantity: '8', unit: 'piece' }, { name: 'Flashlights', quantity: '4', unit: 'piece' }]), status: 'received', priority: 'low', totalItems: 2, requestDate: new Date(Date.now() - 5 * 86400000) },
    ];

    for (const r of requisitions) {
      await db.requisition.create({ data: r });
    }
    console.log(`✅ Requisitions created: ${requisitions.length}`);
  }

  // ─── ASSETS ────────────────────────────────────────────────
  const existingAssets = await db.asset.count();
  if (existingAssets === 0) {
    const assets = [
      { name: 'Central AC Unit - Main Building', category: 'HVAC', location: 'Roof - Main Building', purchaseDate: '2022-03-15', purchaseCost: 2500000, currentValue: 2000000, status: 'operational', warrantyExpiry: '2027-03-15', lastMaintenance: '2025-06-01' },
      { name: 'Elevator #1', category: 'Vertical Transport', location: 'Main Lobby', purchaseDate: '2021-01-10', purchaseCost: 3800000, currentValue: 2800000, status: 'operational', warrantyExpiry: '2026-01-10', lastMaintenance: '2025-05-15' },
      { name: 'Elevator #2', category: 'Vertical Transport', location: 'North Wing', purchaseDate: '2021-01-10', purchaseCost: 3800000, currentValue: 2800000, status: 'operational', warrantyExpiry: '2026-01-10', lastMaintenance: '2025-05-15' },
      { name: 'Commercial Laundry Machine', category: 'Equipment', location: 'Basement - Laundry', purchaseDate: '2023-06-20', purchaseCost: 450000, currentValue: 350000, status: 'operational', warrantyExpiry: '2026-06-20', lastMaintenance: '2025-07-01' },
      { name: 'Industrial Dryer', category: 'Equipment', location: 'Basement - Laundry', purchaseDate: '2023-06-20', purchaseCost: 380000, currentValue: 300000, status: 'operational', warrantyExpiry: '2026-06-20', lastMaintenance: '2025-07-01' },
      { name: 'Diesel Generator 500KVA', category: 'Power', location: 'Generator Room - B1', purchaseDate: '2020-11-05', purchaseCost: 5200000, currentValue: 3200000, status: 'operational', warrantyExpiry: '2025-11-05', lastMaintenance: '2025-06-15' },
      { name: 'Fire Alarm System', category: 'Safety', location: 'All Floors', purchaseDate: '2022-08-12', purchaseCost: 1200000, currentValue: 900000, status: 'operational', warrantyExpiry: '2025-08-12', lastMaintenance: '2025-04-20' },
      { name: 'CCTV System (64 cameras)', category: 'Security', location: 'All Areas', purchaseDate: '2023-02-28', purchaseCost: 800000, currentValue: 600000, status: 'operational', warrantyExpiry: '2026-02-28', lastMaintenance: '2025-06-10' },
      { name: 'Commercial Kitchen Range', category: 'Kitchen Equipment', location: 'Main Kitchen', purchaseDate: '2022-05-18', purchaseCost: 650000, currentValue: 480000, status: 'operational', warrantyExpiry: '2025-05-18', lastMaintenance: '2025-07-05' },
      { name: 'Water Treatment Plant', category: 'Plumbing', location: 'Utility Block', purchaseDate: '2021-09-01', purchaseCost: 1800000, currentValue: 1200000, status: 'needs_repair', warrantyExpiry: '2024-09-01', lastMaintenance: '2025-03-10' },
      { name: 'Swimming Pool Pump', category: 'Recreation', location: 'Pool Area - Roof', purchaseDate: '2023-12-15', purchaseCost: 120000, currentValue: 100000, status: 'operational', warrantyExpiry: '2026-12-15', lastMaintenance: '2025-06-20' },
      { name: 'PABX Telephone System', category: 'IT & Telecom', location: 'IT Room - B1', purchaseDate: '2022-01-20', purchaseCost: 350000, currentValue: 220000, status: 'operational', warrantyExpiry: '2025-01-20', lastMaintenance: '2025-05-01' },
    ];

    for (const a of assets) {
      await db.asset.create({
        data: {
          ...a,
          purchaseDate: new Date(a.purchaseDate),
          warrantyExpiry: a.warrantyExpiry ? new Date(a.warrantyExpiry) : null,
          lastMaintenance: a.lastMaintenance ? new Date(a.lastMaintenance) : null,
        },
      });
    }
    console.log(`✅ Assets created: ${assets.length}`);
  }

  // ─── CHANNELS ─────────────────────────────────────────────
  const existingChannels = await db.channel.count();
  if (existingChannels === 0) {
    const channels = [
      { name: 'Booking.com', type: 'OTA', logo: 'B', status: 'connected', lastSync: new Date(), totalBookings: 342, monthlyCommission: 125000, mappingStatus: 'complete', commissionRate: 15 },
      { name: 'Expedia', type: 'OTA', logo: 'E', status: 'connected', lastSync: new Date(), totalBookings: 198, monthlyCommission: 78000, mappingStatus: 'complete', commissionRate: 15 },
      { name: 'Agoda', type: 'OTA', logo: 'A', status: 'connected', lastSync: new Date(), totalBookings: 156, monthlyCommission: 52000, mappingStatus: 'complete', commissionRate: 15 },
      { name: 'Direct Website', type: 'Direct', logo: 'W', status: 'connected', lastSync: new Date(), totalBookings: 278, monthlyCommission: 0, mappingStatus: 'complete', commissionRate: 0 },
      { name: 'Walk-in', type: 'Direct', logo: 'D', status: 'active', lastSync: null, totalBookings: 124, monthlyCommission: 0, mappingStatus: 'n/a', commissionRate: 0 },
      { name: 'Phone / Email', type: 'Direct', logo: 'P', status: 'active', lastSync: null, totalBookings: 89, monthlyCommission: 0, mappingStatus: 'n/a', commissionRate: 0 },
      { name: 'Airbnb', type: 'OTA', logo: 'N', status: 'disconnected', lastSync: new Date('2025-06-15'), totalBookings: 12, monthlyCommission: 4500, mappingStatus: 'incomplete', commissionRate: 3 },
      { name: 'Trip.com', type: 'OTA', logo: 'T', status: 'connected', lastSync: new Date(), totalBookings: 67, monthlyCommission: 28000, mappingStatus: 'complete', commissionRate: 10 },
      { name: 'Corporate Portal', type: 'Corporate', logo: 'C', status: 'connected', lastSync: new Date(), totalBookings: 201, monthlyCommission: 0, mappingStatus: 'complete', commissionRate: 0 },
      { name: 'Wholesale / B2B', type: 'Wholesale', logo: 'S', status: 'connected', lastSync: new Date(), totalBookings: 95, monthlyCommission: 15000, mappingStatus: 'complete', commissionRate: 10 },
    ];

    for (const c of channels) {
      await db.channel.create({ data: c });
    }
    console.log(`✅ Channels created: ${channels.length}`);
  }

  console.log('');
  console.log('🎉 Hotel database seeded successfully!');
  console.log(`🏨 Property: Meridian Hotel (MH)`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
