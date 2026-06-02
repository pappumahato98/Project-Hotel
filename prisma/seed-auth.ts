import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function seed() {
  await db.authUser.deleteMany({})
  console.log('Cleared existing auth users...')

  const users = [
    { email: 'admin@meridian.com', firstName: 'Admin', lastName: 'User', role: 'admin', department: 'Management', position: 'Administrator' },
    { email: 'gm@meridian.com', firstName: 'Raj', lastName: 'Sharma', role: 'gm', department: 'Management', position: 'General Manager' },
    { email: 'ramesh@meridian.com', firstName: 'Ramesh', lastName: 'Karki', role: 'manager', department: 'Front Office', position: 'Front Desk Manager' },
    { email: 'sunita@meridian.com', firstName: 'Sunita', lastName: 'Thapa', role: 'staff', department: 'Front Office', position: 'Receptionist' },
    { email: 'deepa@meridian.com', firstName: 'Deepa', lastName: 'Rai', role: 'manager', department: 'F&B', position: 'F&B Manager' },
    { email: 'kamal@meridian.com', firstName: 'Kamal', lastName: 'Poudel', role: 'manager', department: 'Finance', position: 'Accountant' },
  ]

  const password = 'password123'

  for (const u of users) {
    const hashed = hashPassword(password)
    await db.authUser.create({
      data: { ...u, password: hashed },
    })
    console.log(`✅ User: ${u.email} (password: ${password})`)
  }

  console.log(`\n🎉 Auth users seeded. Default password: ${password}`)
}

seed().catch(console.error).finally(() => db.$disconnect())
