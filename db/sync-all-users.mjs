import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const SUPABASE_URL = 'https://kiqnyuwypqhpjwamrqob.supabase.co'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcW55dXd5cHFocGp3YW1ycW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA3NDQyNiwiZXhwIjoyMTAwNjUwNDI2fQ.1iwbnY8Jyzb8B59u_WKRLm9z2XJTCHmDad2UwbDFJJs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.kiqnyuwypqhpjwamrqob:MayaBarima%4098%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' } }
})

// Get all Supabase Auth users
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
const supabaseUsers = new Map(data.users.map(u => [u.email, u.id]))

// Get all AuthUser profiles
const profiles = await prisma.authUser.findMany({ select: { id: true, email: true } })

for (const profile of profiles) {
  const supabaseId = supabaseUsers.get(profile.email)
  if (!supabaseId) {
    console.log(`No Supabase user for ${profile.email} - skipping`)
    continue
  }
  if (profile.id === supabaseId) {
    console.log(`Already synced: ${profile.email}`)
    continue
  }
  
  console.log(`Syncing: ${profile.email} (${profile.id} -> ${supabaseId})`)
  
  // Delete activity logs
  const del = await prisma.activityLog.deleteMany({ where: { userId: profile.id } })
  if (del.count > 0) console.log(`  Deleted ${del.count} activity logs`)
  
  // Update profile ID
  try {
    await prisma.authUser.update({ where: { id: profile.id }, data: { id: supabaseId } })
    console.log(`  Updated AuthUser ID`)
  } catch(e) {
    console.error(`  Error: ${e.message.substring(0,100)}`)
  }
}

await prisma.$disconnect()
console.log('\nDone!')
