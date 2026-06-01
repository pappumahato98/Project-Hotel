import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding hotel database...');

  // ─── PROPERTY ───────────────────────────────────────────
  const property = await db.property.create({
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

  // ─── ROOM TYPES ─────────────────────────────────────────
  const roomTypes = await Promise.all([
    db.roomType.create({ data: { name: 'Standard Room', code: 'STD', baseOccupancy: 1, maxOccupancy: 2, bedConfig: '1 Queen Bed', areaSqFt: 250, sortOrder: 1 } }),
    db.roomType.create({ data: { name: 'Deluxe Room', code: 'DLX', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 320, view: 'Garden', sortOrder: 2 } }),
    db.roomType.create({ data: { name: 'Deluxe Pool View', code: 'DLV', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 350, view: 'Pool', sortOrder: 3 } }),
    db.roomType.create({ data: { name: 'Premium Suite', code: 'SUT', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King + Sofa Bed', areaSqFt: 550, view: 'City', sortOrder: 4 } }),
    db.roomType.create({ data: { name: 'Presidential Suite', code: 'PSU', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King + Living Room', areaSqFt: 800, view: 'Mountain', sortOrder: 5 } }),
  ]);
  console.log(`✅ Room types created: ${roomTypes.length}`);

  // ─── ROOMS ──────────────────────────────────────────────
  const rooms: { number: string; floor: number; typeId: string; wing?: string }[] = [];
  const wings = ['East', 'West'];
  let roomNum = 100;
  
  // Floor 1-4: Standard (20 rooms)
  for (let f = 1; f <= 4; f++) {
    for (let r = 0; r < 5; r++) {
      rooms.push({ number: String(roomNum), floor: f, typeId: roomTypes[0].id, wing: wings[r % 2] });
      roomNum++;
    }
  }
  // Floor 5-6: Deluxe (10 rooms)
  for (let f = 5; f <= 6; f++) {
    for (let r = 0; r < 5; r++) {
      rooms.push({ number: String(roomNum), floor: f, typeId: roomTypes[1].id, wing: wings[r % 2] });
      roomNum++;
    }
  }
  // Floor 7: Deluxe Pool View (6 rooms)
  for (let r = 0; r < 6; r++) {
    rooms.push({ number: String(roomNum), floor: 7, typeId: roomTypes[2].id, wing: wings[r % 2] });
    roomNum++;
  }
  // Floor 8: Premium Suite (6 rooms)
  for (let r = 0; r < 6; r++) {
    rooms.push({ number: String(roomNum), floor: 8, typeId: roomTypes[3].id, wing: wings[r % 2] });
    roomNum++;
  }
  // Floor 9: Presidential Suite (2 rooms)
  rooms.push({ number: '901', floor: 9, typeId: roomTypes[4].id, wing: 'East' });
  rooms.push({ number: '902', floor: 9, typeId: roomTypes[4].id, wing: 'West' });

  const roomStatuses = ['vacant_clean', 'occupied', 'vacant_dirty', 'cleaning', 'inspected', 'out_of_order'];
  
  for (const r of rooms) {
    const status = r.number === '203' ? 'out_of_order' : roomStatuses[Math.floor(Math.random() * 5)];
    await db.room.create({
      data: {
        number: r.number,
        floor: r.floor,
        wing: r.wing,
        typeId: r.typeId,
        propertyId: property.id,
        status,
        ipPhoneExt: `100${r.number}`,
      },
    });
  }
  console.log(`✅ Rooms created: ${rooms.length}`);

  // ─── RATE PLANS ─────────────────────────────────────────
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
      data: {
        name: rp.name,
        code: rp.code,
        propertyId: property.id,
        roomTypeId: rp.roomTypeId,
        baseRate: rp.baseRate,
        channel: rp.channel || 'direct',
      },
    });

    // Daily rates for next 30 days
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const rate = weekend ? rp.baseRate * 1.15 : rp.baseRate;
      await db.dailyRate.create({
        data: {
          ratePlanId: plan.id,
          date,
          rate: Math.round(rate),
          available: Math.floor(Math.random() * 5),
        },
      });
    }
  }
  console.log(`✅ Rate plans created: ${ratePlans.length}`);

  // ─── GUESTS ─────────────────────────────────────────────
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

  const guests: { id: string; firstName: string; lastName: string }[] = [];
  for (const g of guestData) {
    const guest = await db.guest.create({
      data: {
        ...g,
        email: `${g.firstName.toLowerCase()}.${g.lastName.toLowerCase()}@email.com`,
        phone: `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 17),
        lastStayAt: new Date(today.getTime() - Math.random() * 30 * 86400000),
      },
    });
    guests.push(guest);
  }
  console.log(`✅ Guests created: ${guests.length}`);

  // ─── RESERVATIONS ───────────────────────────────────────
  const statuses = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
  const sources = ['direct', 'booking_com', 'expedia', 'walk_in', 'phone', 'email', 'corporate'];
  const allRooms = await db.room.findMany({ where: { status: 'occupied' } });
  
  const reservations: { id: string; confirmationNo: string; status: string; guestId: string; roomNumber?: string; checkIn: Date; checkOut: Date; roomRate: number; totalAmount: number; paidAmount: number }[] = [];

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

    const res = await db.reservation.create({
      data: {
        confirmationNo: `TKH-${String(2025000 + i)}`,
        propertyId: property.id,
        guestId: guest.id,
        roomId: room?.id || null,
        ratePlanId: ratePlans[Math.floor(Math.random() * 3)].code,
        status,
        reservationType: i % 5 === 0 ? 'corporate' : 'individual',
        adults: Math.random() > 0.5 ? 2 : 1,
        children: Math.random() > 0.8 ? 1 : 0,
        checkIn,
        checkOut,
        roomRate,
        totalAmount,
        paidAmount,
        creditLimit: 15000,
        source: sources[Math.floor(Math.random() * sources.length)],
        guaranteed: Math.random() > 0.2,
        paymentStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        bookedBy: 'System',
      },
    });
    reservations.push({
      id: res.id,
      confirmationNo: res.confirmationNo,
      status: res.status,
      guestId: res.guestId || '',
      roomNumber: room?.number,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      roomRate: res.roomRate,
      totalAmount: res.totalAmount,
      paidAmount: res.paidAmount,
    });
  }
  console.log(`✅ Reservations created: ${reservations.length}`);

  // ─── FOLIOS & TRANSACTIONS ──────────────────────────────
  const txTypes = ['room', 'f_and_b', 'laundry', 'spa', 'minibar', 'business_center', 'phone', 'miscellaneous'];
  const txDescriptions: Record<string, string[]> = {
    room: ['Room charge', 'Room revenue - Night'],
    f_and_b: ['Restaurant - Dinner', 'Room Service - Breakfast', 'Bar - Cocktails', 'Restaurant - Lunch', 'Coffee Shop'],
    laundry: ['Dry Cleaning - 3 items', 'Laundry - Express Wash', 'Laundry - Shirts x4'],
    spa: ['Full Body Massage', 'Facial Treatment', 'Couples Spa Package'],
    minibar: ['Minibar - Beverages', 'Minibar - Snacks'],
    business_center: ['Meeting Room - 4 hours', 'Internet Access', 'Printing Services'],
    phone: ['International Call - 15 min', 'Local Call'],
    miscellaneous: ['Gift Shop Purchase', 'Late Check-out Fee', 'Airport Transfer'],
  };

  for (const res of reservations) {
    if (res.status === 'confirmed' || res.status === 'cancelled') continue;

    const folio = await db.folio.create({
      data: {
        reservationId: res.id,
        guestId: res.guestId,
        status: res.status === 'checked_out' ? 'closed' : 'open',
        balance: 0,
      },
    });

    // Room charges
    const nights = Math.ceil((res.checkOut.getTime() - res.checkIn.getTime()) / 86400000);
    for (let n = 0; n < nights; n++) {
      const date = new Date(res.checkIn);
      date.setDate(date.getDate() + n);
      if (date > today) break;
      
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionType: 'room',
          description: `Room revenue - Night ${n + 1} (Room ${res.roomNumber || 'TBD'})`,
          amount: res.roomRate,
          taxAmount: Math.round(res.roomRate * 0.13),
          totalAmount: Math.round(res.roomRate * 1.13),
          outlet: 'Front Desk',
          postedBy: 'System',
          createdAt: date,
        },
      });
    }

    // Random charges
    const numCharges = Math.floor(Math.random() * 5);
    for (let c = 0; c < numCharges; c++) {
      const txType = txTypes[Math.floor(Math.random() * txTypes.length)];
      const descs = txDescriptions[txType];
      const desc = descs[Math.floor(Math.random() * descs.length)];
      const amount = Math.floor(Math.random() * 5000) + 200;
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionType: txType,
          description: desc,
          amount,
          taxAmount: Math.round(amount * 0.13),
          totalAmount: Math.round(amount * 1.13),
          outlet: txType === 'f_and_b' ? 'Restaurant' : txType === 'spa' ? 'Spa' : 'Front Desk',
          postedBy: 'System',
          createdAt: new Date(res.checkIn.getTime() + Math.random() * (res.checkOut.getTime() - res.checkIn.getTime())),
        },
      });
    }

    // Update folio balance
    const txs = await db.folioTransaction.findMany({ where: { folioId: folio.id } });
    const total = txs.reduce((sum, t) => sum + t.totalAmount, 0);
    await db.folio.update({ where: { id: folio.id }, data: { balance: total } });

    // Payments for checked-out reservations
    if (res.status === 'checked_out') {
      const methods = ['cash', 'card', 'bank_transfer'];
      await db.folioPayment.create({
        data: {
          folioId: folio.id,
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          amount: total,
          cardType: 'visa',
          receivedBy: 'Front Desk',
        },
      });
    }
  }
  console.log(`✅ Folios created with transactions`);

  // ─── OUTLETS & POS ──────────────────────────────────────
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
      { name: 'Dal Bhat Set', category: 'Main Course', price: 650 },
      { name: 'Chicken Momo (10 pcs)', category: 'Appetizer', price: 450 },
      { name: 'Grilled Salmon', category: 'Main Course', price: 2200 },
      { name: 'Thali Special', category: 'Main Course', price: 800 },
      { name: 'Caesar Salad', category: 'Salad', price: 550 },
      { name: 'Mushroom Soup', category: 'Soup', price: 350 },
      { name: 'Butter Chicken', category: 'Main Course', price: 850 },
      { name: 'Garlic Naan', category: 'Bread', price: 200 },
      { name: 'Continental Breakfast', category: 'Breakfast', price: 1200 },
      { name: 'Fresh Fruit Platter', category: 'Dessert', price: 500 },
    ],
    bar: [
      { name: ' Everest Lager', category: 'Beer', price: 450 },
      { name: 'Gorkha Strong', category: 'Beer', price: 400 },
      { name: 'Mojito', category: 'Cocktail', price: 650 },
      { name: 'Old Fashioned', category: 'Cocktail', price: 750 },
      { name: 'House Red Wine (Glass)', category: 'Wine', price: 650 },
      { name: 'Coffee Martini', category: 'Cocktail', price: 700 },
      { name: 'French Fries', category: 'Snack', price: 350 },
      { name: 'Chicken Wings', category: 'Snack', price: 550 },
    ],
    spa: [
      { name: 'Full Body Massage (60 min)', category: 'Massage', price: 3500 },
      { name: 'Deep Tissue Massage (60 min)', category: 'Massage', price: 4000 },
      { name: 'Facial Treatment (45 min)', category: 'Facial', price: 2500 },
      { name: 'Hot Stone Therapy (75 min)', category: 'Massage', price: 4500 },
      { name: 'Couple\'s Retreat (90 min)', category: 'Package', price: 7000 },
      { name: 'Head & Shoulder Massage (30 min)', category: 'Massage', price: 1800 },
    ],
    business_center: [
      { name: 'Meeting Room (per hour)', category: 'Rental', price: 2000 },
      { name: 'Workstation (per hour)', category: 'Rental', price: 300 },
      { name: 'Printing (per page B&W)', category: 'Service', price: 10 },
      { name: 'Printing (per page Color)', category: 'Service', price: 50 },
      { name: 'International Call (per min)', category: 'Service', price: 25 },
    ],
    laundry: [
      { name: 'Shirt Wash & Iron', category: 'Wash', price: 80 },
      { name: 'Trousers Dry Clean', category: 'Dry Clean', price: 250 },
      { name: 'Saree Dry Clean', category: 'Dry Clean', price: 500 },
      { name: 'Suit Dry Clean', category: 'Dry Clean', price: 800 },
      { name: 'Express Wash (surcharge)', category: 'Service', price: 200 },
    ],
    gift_shop: [
      { name: 'Pashmina Scarf', category: 'Souvenir', price: 3500 },
      { name: 'Prayer Flags Set', category: 'Souvenir', price: 500 },
      { name: 'Nepali Tea Box', category: 'Food', price: 800 },
      { name: 'Postcard Pack (10)', category: 'Souvenir', price: 200 },
      { name: 'Singing Bowl', category: 'Souvenir', price: 2500 },
    ],
  };

  for (const outlet of outlets) {
    const o = await db.outlet.create({ data: outlet });
    const items = menuData[outlet.type] || [];
    for (const item of items) {
      await db.menuItem.create({
        data: { outletId: o.id, name: item.name, category: item.category, price: item.price },
      });
    }
  }
  console.log(`✅ Outlets & Menu created`);

  // ─── POS ORDERS ──────────────────────────────────────────
  const outletRecords = await db.outlet.findMany();
  for (let i = 0; i < 15; i++) {
    const outlet = outletRecords[Math.floor(Math.random() * Math.min(3, outletRecords.length))];
    const orderStatuses = ['open', 'in_progress', 'ready', 'served', 'closed'];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    
    const order = await db.posOrder.create({
      data: {
        outletId: outlet.id,
        tableNumber: Math.floor(Math.random() * 15) + 1,
        status,
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
      await db.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: qty,
          unitPrice: menuItem.price,
          totalPrice: itemTotal,
          status: status === 'closed' ? 'served' : status === 'served' ? 'served' : 'pending',
        },
      });
    }

    await db.posOrder.update({
      where: { id: order.id },
      data: { totalAmount, taxAmount: Math.round(totalAmount * 0.13) },
    });
  }
  console.log(`✅ POS Orders created`);

  // ─── HK TASKS ────────────────────────────────────────────
  const occupiedRooms = await db.room.findMany({ where: { status: 'occupied' } });
  const dirtyRooms = await db.room.findMany({ where: { status: 'vacant_dirty' } });
  const cleaningRooms = await db.room.findMany({ where: { status: 'cleaning' } });
  const allHkRooms = [...occupiedRooms, ...dirtyRooms, ...cleaningRooms];
  const attendants = ['Maya', 'Laxmi', 'Sita', 'Gita', 'Ram Kumari', 'Sushila'];

  for (const room of allHkRooms) {
    const taskType = room.status === 'occupied' ? 'stayover' : 'checkout';
    const status = room.status === 'cleaning' ? 'in_progress' : room.status === 'vacant_dirty' ? 'pending' : 'assigned';
    await db.hkTask.create({
      data: {
        roomId: room.id,
        taskType,
        status,
        priority: Math.random() > 0.8 ? 'vip' : 'normal',
        assignedTo: attendants[Math.floor(Math.random() * attendants.length)],
        scheduledTime: new Date(),
        estimatedMinutes: taskType === 'checkout' ? 45 : 25,
      },
    });
  }
  console.log(`✅ HK Tasks created`);

  // ─── EMPLOYEES ──────────────────────────────────────────
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
      data: {
        ...emp,
        propertyId: property.id,
        salary: 25000 + Math.floor(Math.random() * 75000),
        hireDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@grandktm.com`,
        phone: `+977-98${Math.floor(10000000 + Math.random() * 90000000)}`.slice(0, 17),
      },
    });
  }
  console.log(`✅ Employees created: ${employees.length}`);

  // ─── NIGHT AUDITS ───────────────────────────────────────
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    await db.nightAudit.create({
      data: {
        businessDate: date,
        status: 'completed',
        roomRevenue: 120000 + Math.floor(Math.random() * 80000),
        fAndBRevenue: 45000 + Math.floor(Math.random() * 30000),
        otherRevenue: 15000 + Math.floor(Math.random() * 20000),
        totalRevenue: 180000 + Math.floor(Math.random() * 130000),
        totalTax: 25000 + Math.floor(Math.random() * 18000),
        occupancy: 60 + Math.floor(Math.random() * 30),
        adr: 6000 + Math.floor(Math.random() * 5000),
        revpar: 4000 + Math.floor(Math.random() * 4000),
        completedBy: 'Bikash Gurung',
        startedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 30),
        completedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 58),
      },
    });
  }
  console.log(`✅ Night Audits created`);

  // ─── CASHIER SHIFTS ─────────────────────────────────────
  await db.cashierShift.create({
    data: {
      cashierName: 'Sunita Thapa',
      shiftType: 'morning',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0),
      openingFloat: 50000,
      totalPayments: 185000,
      totalRefunds: 5000,
      status: 'closed',
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      closingFloat: 52000,
      variance: 2000,
    },
  });
  await db.cashierShift.create({
    data: {
      cashierName: 'Ramesh Karki',
      shiftType: 'evening',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      openingFloat: 52000,
      totalPayments: 0,
      status: 'open',
    },
  });
  console.log(`✅ Cashier Shifts created`);

  // ─── EVENTS ────────────────────────────────────────────
  await db.event.create({
    data: {
      name: 'Annual Tech Conference 2025',
      organizerName: 'Tech Nepal Pvt. Ltd.',
      organizerPhone: '+977-1-4455667',
      organizerEmail: 'events@technepal.com',
      eventType: 'conference',
      venue: 'Grand Ballroom',
      startDate: new Date(today.getTime() + 3 * 86400000),
      endDate: new Date(today.getTime() + 5 * 86400000),
      expectedPax: 250,
      status: 'confirmed',
      totalRevenue: 850000,
      depositAmount: 425000,
      depositPaid: 425000,
    },
  });
  await db.event.create({
    data: {
      name: 'Sharma-Patel Wedding',
      organizerName: 'Rajesh Sharma',
      organizerPhone: '+977-9841234567',
      eventType: 'wedding',
      venue: 'Garden Terrace',
      startDate: new Date(today.getTime() + 10 * 86400000),
      endDate: new Date(today.getTime() + 10 * 86400000),
      expectedPax: 300,
      status: 'confirmed',
      totalRevenue: 650000,
      depositAmount: 325000,
      depositPaid: 200000,
    },
  });
  await db.event.create({
    data: {
      name: 'Corporate Team Building',
      organizerName: 'Nepal Bank Ltd.',
      organizerPhone: '+977-1-4221234',
      eventType: 'corporate',
      venue: 'Meeting Room A, B, C',
      startDate: new Date(today.getTime() + 7 * 86400000),
      endDate: new Date(today.getTime() + 7 * 86400000),
      expectedPax: 50,
      status: 'tentative',
      totalRevenue: 120000,
      depositAmount: 60000,
      depositPaid: 0,
    },
  });
  console.log(`✅ Events created`);

  // ─── WORK ORDERS ─────────────────────────────────────────
  const workOrders = [
    { title: 'AC not cooling in Room 305', description: 'Guest complained AC is blowing warm air. Compressor may need servicing.', priority: 'high', category: 'hvac', roomId: '305' },
    { title: 'Leaking faucet in Room 201', description: 'Bathroom faucet dripping continuously. Water wastage concern.', priority: 'normal', category: 'plumbing', roomId: '201' },
    { title: 'TV remote not working - Room 412', description: 'Remote batteries replaced but still unresponsive.', priority: 'low', category: 'electrical', roomId: '412' },
    { title: 'Broken window latch - Room 603', description: 'Window cannot be locked properly. Security issue.', priority: 'high', category: 'general', roomId: '603' },
    { title: 'Elevator #2 intermittent stops', description: 'Elevator stopping between floors randomly. Needs immediate inspection.', priority: 'emergency', category: 'electrical', roomId: null },
    { title: 'Repaint hallway - Floor 3', description: 'Scuff marks and peeling paint on 3rd floor east wing.', priority: 'low', category: 'painting', roomId: null },
  ];

  const roomIds = await db.room.findMany({ select: { id: true, number: true } });
  for (const wo of workOrders) {
    const room = wo.roomId ? roomIds.find(r => r.number === wo.roomId) : null;
    await db.workOrder.create({
      data: {
        ...wo,
        roomId: room?.id || null,
        reportedBy: 'Front Desk',
        status: wo.priority === 'emergency' ? 'in_progress' : 'open',
        assignedTo: wo.priority === 'emergency' ? 'Raju Maharjan' : null,
      },
    });
  }
  console.log(`✅ Work Orders created`);

  // ─── INVENTORY ───────────────────────────────────────────
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
  ];

  for (const item of invItems) {
    await db.inventoryItem.create({
      data: { ...item, location: 'Main Store', minStock: Math.floor(item.reorderPoint * 0.5), maxStock: item.reorderPoint * 3 },
    });
  }
  console.log(`✅ Inventory created`);

  // ─── LOST & FOUND ───────────────────────────────────────
  await db.lostFound.create({
    data: { itemName: 'Gold Necklace', category: 'jewelry', roomId: '405', description: 'Thin gold chain with small pendant', storageLocation: 'Safe Locker #3', foundBy: 'Maya', status: 'found' },
  });
  await db.lostFound.create({
    data: { itemName: 'Passport (Indian)', category: 'documents', roomId: '302', description: 'Indian passport - Mr. Arun Kumar', storageLocation: 'Manager Office', foundBy: 'Laxmi', claimedBy: 'Guest', claimDate: new Date(), status: 'claimed' },
  });
  await db.lostFound.create({
    data: { itemName: 'Blue Backpack', category: 'bags', description: 'North Face backpack, blue color', storageLocation: 'HK Storage Room', foundBy: 'Sita', status: 'found' },
  });
  console.log(`✅ Lost & Found created`);

  // ─── ACCOUNTS ────────────────────────────────────────────
  const accounts = [
    { code: '1000', name: 'Cash', type: 'asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset' },
    { code: '1200', name: 'Credit Card Receivable', type: 'asset' },
    { code: '2000', name: 'Accounts Payable', type: 'liability' },
    { code: '2100', name: 'Advance Deposits', type: 'liability' },
    { code: '2200', name: 'Tax Payable', type: 'liability' },
    { code: '3000', name: 'Owner Equity', type: 'equity' },
    { code: '4000', name: 'Room Revenue', type: 'revenue' },
    { code: '4100', name: 'F&B Revenue', type: 'revenue' },
    { code: '4200', name: 'Spa Revenue', type: 'revenue' },
    { code: '4300', name: 'Other Revenue', type: 'revenue' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
    { code: '5100', name: 'Salaries & Wages', type: 'expense' },
    { code: '5200', name: 'Utilities', type: 'expense' },
    { code: '5300', name: 'Maintenance', type: 'expense' },
    { code: '5400', name: 'Marketing', type: 'expense' },
  ];

  for (const acc of accounts) {
    await db.ledgerAccount.create({ data: acc });
  }
  console.log(`✅ Ledger Accounts created`);

  console.log('');
  console.log('🎉 Hotel database seeded successfully!');
  console.log(`🏨 Property: Meridian Hotel (MH)`);
  console.log(`🛏️  Rooms: ${rooms.length}`);
  console.log(`📋 Reservations: ${reservations.length}`);
  console.log(`👥 Guests: ${guests.length}`);
  console.log(`👔 Employees: ${employees.length}`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
