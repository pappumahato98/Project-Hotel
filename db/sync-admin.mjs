import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const SUPABASE_URL = 'https://kiqnyuwypqhpjwamrqob.supabase.co'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcW55dXd5cHFocGp3YW1ycW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA3NDQyNiwiZXhwIjoyMTAwNjUwNDI2fQ.1iwbnY8Jyzb8B59u_WKRLm9z2XJTCHmDad2UwbDFJJs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.kiqnyuwypqhpjwamrqob:MayaBarima%4098%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' } }
})

// List existing Supabase Auth users
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
if (error) {
  console.error('Error listing users:', error.message)
  process.exit(1)
}

console.log(`Found ${data.users.length} Supabase Auth users:`)
for (const u of data.users) {
  console.log(`  ${u.id} | ${u.email} | ${u.email_confirmed_at ? 'confirmed' : 'unconfirmed'}`)
}

// Find admin profile
const adminProfile = await prisma.authUser.findFirst({
  where: { role: 'admin', active: true },
  select: { id: true, email: true, firstName: true, lastName: true }
})
console.log('\nAdmin profile:', adminProfile)

// Check if any Supabase user matches the admin email
const matchingUser = data.users.find(u => u.email === adminProfile.email)
if (matchingUser) {
  console.log('\nFound matching Supabase user:', matchingUser.id, matchingUser.email)
  
  // Update password
  const { error: pwdError } = await supabase.auth.admin.updateUserById(matchingUser.id, {
    password: 'Admin@123',
    email_confirm: true
  })
  if (pwdError) {
    console.error('Password update error:', pwdError.message)
  } else {
    console.log('Password set to Admin@123')
  }
  
  // Update AuthUser profile ID to match Supabase UUID
  if (adminProfile.id !== matchingUser.id) {
    // First delete activity logs referencing old ID
    const deletedLogs = await prisma.activityLog.deleteMany({ where: { userId: adminProfile.id } })
    console.log(`Deleted ${deletedLogs.count} activity logs with old ID`)
    
    // Update AuthUser record
    await prisma.authUser.update({
      where: { id: adminProfile.id },
      data: { id: matchingUser.id }
    })
    console.log(`Updated AuthUser ID from ${adminProfile.id} to ${matchingUser.id}`)
  }
} else {
  // Create new Supabase Auth user
  const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
    email: adminProfile.email,
    password: 'Admin@123',
    email_confirm: true,
    user_metadata: {
      first_name: adminProfile.firstName,
      last_name: adminProfile.lastName,
    }
  })
  if (createError) {
    console.error('Create user error:', createError.message)
  } else {
    console.log('Created new user:', newUserData.user.id, newUserData.user.email)
    
    // Update AuthUser ID to match
    const deletedLogs = await prisma.activityLog.deleteMany({ where: { userId: adminProfile.id } })
    console.log(`Deleted ${deletedLogs.count} activity logs with old ID`)
    
    await prisma.authUser.update({
      where: { id: adminProfile.id },
      data: { id: newUserData.user.id }
    })
    console.log(`Updated AuthUser ID from ${adminProfile.id} to ${newUserData.user.id}`)
  }
}

await prisma.$disconnect()
console.log('\nDone!')
