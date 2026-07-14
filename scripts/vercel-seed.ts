/**
 * vercel-seed.ts — Auto-seeds Turso database on Vercel build.
 *
 * Runs as part of the build pipeline ONLY when the DB is empty.
 * Uses the adapter-aware db client (Turso on Vercel, local SQLite for dev).
 * Importing db from @/lib/db so it handles Turso vs SQLite automatically.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function createDb() {
  const url = process.env.DATABASE_URL!
  if (url.startsWith('libsql://') || url.startsWith('https://')) {
    const libsql = createClient({ url })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

async function main() {
  const db = createDb()
  try {
    // Check if DB already has data
    const propCount = await db.property.count()
    if (propCount > 0) {
      console.log('⏭️  vercel-seed: database already has data, skipping seed')
      return
    }

    console.log('🌱 vercel-seed: database is empty, seeding...')

    // ─── PROPERTY ────────────────────────────────────────
    await db.property.create({
      data: {
        name: 'Meridian Hotel', code: 'MH',
        address: 'Durbar Marg, Thamel', city: 'Kathmandu', country: 'Nepal',
        currency: 'NPR', phone: '+977-1-4225678', email: 'info@grandktm.com',
        starRating: 4, totalRooms: 48, taxRate: 13.0, serviceCharge: 10.0,
      },
    })
    console.log('  ✅ Property')

    // ─── ROOM TYPES ──────────────────────────────────────
    const roomTypes = await Promise.all([
      db.roomType.create({ data: { name: 'Standard Room', code: 'STD', baseOccupancy: 1, maxOccupancy: 2, bedConfig: '1 Queen Bed', areaSqFt: 250, sortOrder: 1 } }),
      db.roomType.create({ data: { name: 'Deluxe Room', code: 'DLX', baseOccupancy: 2, maxOccupancy: 3, bedConfig: '1 King Bed', areaSqFt: 320, view: 'Garden', sortOrder: 2 } }),
      db.roomType.create({ data: { name: 'Premium Suite', code: 'PRS', baseOccupancy: 2, maxOccupancy: 4, bedConfig: '1 King + Sofa Bed', areaSqFt: 550, view: 'City', sortOrder: 3 } }),
      db.roomType.create({ data: { name: 'Honeymoon Suite', code: 'HMS', baseOccupancy: 2, maxOccupancy: 2, bedConfig: '1 King Bed', areaSqFt: 600, view: 'Mountain', sortOrder: 4 } }),
    ])
    console.log('  ✅ 4 Room Types')

    // ─── ROOMS (48 rooms) ────────────────────────────────
    const rooms: { number: string; typeId: string; floor: number; status: string }[] = []
    const floors = [
      { range: [100, 112], typeId: roomTypes[0].id },  // STD: 100-112
      { range: [200, 212], typeId: roomTypes[0].id },  // STD: 200-212
      { range: [300, 312], typeId: roomTypes[0].id },  // STD: 300-312
      { range: [120, 129], typeId: roomTypes[1].id },  // DLX: 120-129
      { range: [220, 229], typeId: roomTypes[1].id },  // DLX: 220-229
      { range: [320, 329], typeId: roomTypes[1].id },  // DLX: 320-329
      { range: [130, 133], typeId: roomTypes[2].id },  // PRS: 130-133
      { range: [230, 233], typeId: roomTypes[2].id },  // PRS: 230-233
      { range: [901, 904], typeId: roomTypes[3].id },  // HMS: 901-904
    ]

    for (const f of floors) {
      for (let r = f.range[0]; r <= f.range[1]; r++) {
        const floorNum = Math.floor(r / 100)
        rooms.push({ number: String(r), typeId: f.typeId, floor: floorNum, status: 'available' })
      }
    }

    await db.room.createMany({ data: rooms })
    console.log(`  ✅ ${rooms.length} Rooms`)

    // ─── AUTH USERS ──────────────────────────────────────
    const password = 'password123'
    const hashed = hashPassword(password)
    const users = [
      { email: 'admin@meridian.com', firstName: 'Admin', lastName: 'User', role: 'admin', department: 'Management', position: 'Administrator' },
      { email: 'gm@meridian.com', firstName: 'Raj', lastName: 'Sharma', role: 'gm', department: 'Management', position: 'General Manager' },
      { email: 'ramesh@meridian.com', firstName: 'Ramesh', lastName: 'Karki', role: 'manager', department: 'Front Office', position: 'Front Desk Manager' },
      { email: 'sunita@meridian.com', firstName: 'Sunita', lastName: 'Thapa', role: 'staff', department: 'Front Office', position: 'Receptionist' },
      { email: 'deepa@meridian.com', firstName: 'Deepa', lastName: 'Rai', role: 'manager', department: 'F&B', position: 'F&B Manager' },
      { email: 'kamal@meridian.com', firstName: 'Kamal', lastName: 'Poudel', role: 'manager', department: 'Finance', position: 'Accountant' },
    ]

    for (const u of users) {
      await db.authUser.create({ data: { ...u, password: hashed } })
    }
    console.log(`  ✅ ${users.length} Auth Users (password: ${password})`)

    // ─── SETTINGS (minimal defaults) ─────────────────────
    await db.setting.createMany({
      data: [
        { key: 'hotel_name', value: 'Meridian Hotel', category: 'general' },
        { key: 'currency', value: 'NPR', category: 'general' },
        { key: 'timezone', value: 'Asia/Katmandu', category: 'general' },
        { key: 'tax_rate', value: '13', category: 'billing' },
        { key: 'service_charge', value: '10', category: 'billing' },
      ],
    })
    console.log('  ✅ Settings')

    console.log('🎉 vercel-seed: database seeded successfully')
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('❌ vercel-seed failed:', err)
  // Non-fatal: don't block the build
  process.exit(0)
})