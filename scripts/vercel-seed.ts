/**
 * vercel-seed.ts — Auto-seeds Supabase Auth users + Postgres data on Vercel build.
 *
 * Runs as part of the build pipeline ONLY when the DB is empty.
 * Creates:
 *   1. Supabase Auth users (email + password) via Admin API
 *   2. Prisma AuthUser (profile) rows linked by Supabase user ID
 *   3. Property, room types, rooms, and system settings
 */
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DATABASE_URL = process.env.DATABASE_URL!

function validateEnv() {
  if (!DATABASE_URL) {
    console.error('')
    console.error('❌ FATAL: DATABASE_URL is not set.')
    console.error('   Set it to your Supabase Postgres connection string.')
    console.error('')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('')
    console.error('❌ FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.')
    console.error('   These are required to create Supabase Auth users during seeding.')
    console.error('')
    process.exit(1)
  }
}

async function main() {
  validateEnv()

  const db = new PrismaClient({ log: ['error'] })
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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
    const property = await db.property.findFirst()
    const rooms: { number: string; typeId: string; propertyId: string; floor: number; status: string }[] = []
    const floors = [
      { range: [100, 112], typeId: roomTypes[0].id },
      { range: [200, 212], typeId: roomTypes[0].id },
      { range: [300, 312], typeId: roomTypes[0].id },
      { range: [120, 129], typeId: roomTypes[1].id },
      { range: [220, 229], typeId: roomTypes[1].id },
      { range: [320, 329], typeId: roomTypes[1].id },
      { range: [130, 133], typeId: roomTypes[2].id },
      { range: [230, 233], typeId: roomTypes[2].id },
      { range: [901, 904], typeId: roomTypes[3].id },
    ]

    for (const f of floors) {
      for (let r = f.range[0]; r <= f.range[1]; r++) {
        const floorNum = Math.floor(r / 100)
        rooms.push({ number: String(r), typeId: f.typeId, propertyId: property!.id, floor: floorNum, status: 'available' })
      }
    }

    await db.room.createMany({ data: rooms })
    console.log(`  ✅ ${rooms.length} Rooms`)

    // ─── AUTH USERS (Supabase Auth + Prisma Profile) ─────
    const password = 'password123'
    const users = [
      { email: 'admin@meridian.com', firstName: 'Admin', lastName: 'User', role: 'admin', department: 'Management', position: 'Administrator' },
      { email: 'gm@meridian.com', firstName: 'Raj', lastName: 'Sharma', role: 'gm', department: 'Management', position: 'General Manager' },
      { email: 'ramesh@meridian.com', firstName: 'Ramesh', lastName: 'Karki', role: 'manager', department: 'Front Office', position: 'Front Desk Manager' },
      { email: 'sunita@meridian.com', firstName: 'Sunita', lastName: 'Thapa', role: 'staff', department: 'Front Office', position: 'Receptionist' },
      { email: 'deepa@meridian.com', firstName: 'Deepa', lastName: 'Rai', role: 'manager', department: 'F&B', position: 'F&B Manager' },
      { email: 'kamal@meridian.com', firstName: 'Kamal', lastName: 'Poudel', role: 'manager', department: 'Finance', position: 'Accountant' },
    ]

    let created = 0
    for (const u of users) {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true, // Skip email verification for demo accounts
      })

      if (authError) {
        // If user already exists, fetch them by email
        if (authError.message.includes('already') || authError.message.includes('exists')) {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
          const found = existing?.users?.find((x: { email?: string }) => x.email === u.email)
          if (found) {
            await db.authUser.create({
              data: { id: found.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, department: u.department, position: u.position },
            }).catch(() => {}) // Profile may already exist too
            created++
            continue
          }
        }
        console.error(`  ⚠️  Failed to create Supabase auth user ${u.email}:`, authError.message)
        continue
      }

      // Create Prisma profile row linked to Supabase user ID
      await db.authUser.create({
        data: {
          id: authData.user.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          department: u.department,
          position: u.position,
        },
      })
      created++
    }
    console.log(`  ✅ ${created} Auth Users (password: ${password})`)

    // ─── SETTINGS (minimal defaults) ─────────────────────
    await db.systemSetting.createMany({
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
  console.error('')
  console.error('❌ vercel-seed failed:', err?.message || err)
  console.error('')
  console.error('   Check that DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and')
  console.error('   SUPABASE_SERVICE_ROLE_KEY are set correctly.')
  console.error('')
  process.exit(1)
})
