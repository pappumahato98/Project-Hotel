import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.kiqnyuwypqhpjwamrqob:MayaBarima%4098%23@aws-1-ap-south-1.pooler.supabase.com:6543/postgres' } }
})

console.log('Testing PgBouncer connection...')
const counts = {}
const models = ['property','roomType','room','guest','reservation','folio','folioTransaction','posOrder','employee','nightAudit','systemSetting','authUser','workOrder','hkTask','inventoryItem','vendor']
for (const m of models) {
  try {
    counts[m] = await prisma[m].count()
    console.log(`  ${m}: ${counts[m]}`)
  } catch(e) {
    console.log(`  ${m}: ERROR - ${e.message.substring(0,100)}`)
  }
}

// Test dashboard KPI queries
console.log('\nTesting KPI queries (like _data.ts)...')
const totalRooms = await prisma.room.count()
const occupied = await prisma.room.count({ where: { status: 'occupied' } })
const vacantClean = await prisma.room.count({ where: { status: 'vacant_clean' } })
const today = new Date(); today.setHours(0,0,0,0)
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
const arrivals = await prisma.reservation.count({ where: { checkIn: { gte: today, lt: tomorrow }, status: 'confirmed' } })
const departures = await prisma.reservation.count({ where: { checkOut: { gte: today, lt: tomorrow }, status: 'checked_in' } })
const settings = await prisma.systemSetting.findMany()
console.log(`  totalRooms: ${totalRooms}`)
console.log(`  occupied: ${occupied}`)
console.log(`  vacantClean: ${vacantClean}`)
console.log(`  arrivals today: ${arrivals}`)
console.log(`  departures today: ${departures}`)
console.log(`  settings: ${settings.length}`)

// Test auth user lookup (the one we synced)
console.log('\nTesting auth user lookup...')
const admin = await prisma.authUser.findFirst({ where: { role: 'admin', active: true } })
console.log(`  Admin: ${admin.email} (id: ${admin.id})`)
console.log(`  ID is UUID: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admin.id)}`)

await prisma.$disconnect()
console.log('\nAll checks passed!')
