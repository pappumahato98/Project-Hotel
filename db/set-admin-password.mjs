import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const SUPABASE_DIRECT = 'postgresql://postgres.kiqnyuwypqhpjwamrqob:MayaBarima%4098%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
const prisma = new PrismaClient({ datasources: { db: { url: SUPABASE_DIRECT } } })

const ADMIN_EMAIL = process.argv[2] || 'admin@meridian.com'
const ADMIN_PASSWORD = process.argv[3] || 'Admin@123'

async function main() {
  const user = await prisma.authUser.findFirst({
    where: { role: 'admin', active: true },
    select: { id: true, email: true, firstName: true, lastName: true, passwordHash: true },
  })

  if (!user) {
    console.error('❌ No active admin user found in database')
    process.exit(1)
  }

  console.log(`Found admin: ${user.email} (${user.firstName} ${user.lastName})`)
  console.log(`Current passwordHash: ${user.passwordHash ? 'set (' + user.passwordHash.length + ' chars)' : 'EMPTY — login will fail'}`)

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await prisma.authUser.update({ where: { id: user.id }, data: { passwordHash: hash } })

  console.log(`✅ Password set for ${user.email}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`   Bcrypt hash: ${hash.substring(0, 20)}... (${hash.length} chars)`)
  console.log(`   Rounds: 12`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
