import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kiqnyuwypqhpjwamrqob.supabase.co'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcW55dXd5cHFocGp3YW1ycW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA3NDQyNiwiZXhwIjoyMTAwNjUwNDI2fQ.1iwbnY8Jyzb8B59u_WKRLm9z2XJTCHmDad2UwbDFJJs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// First, find the admin AuthUser record in the database
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.kiqnyuwypqhpjwamrqob:MayaBarima%4098%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres' } }
})

const adminProfile = await prisma.authUser.findFirst({
  where: { role: 'admin', active: true },
  select: { id: true, email: true, firstName: true, lastName: true }
})

if (!adminProfile) {
  console.error('No admin profile found in database!')
  process.exit(1)
}

console.log('Found admin profile:', adminProfile)

// Create Supabase Auth user with same ID
const { data, error } = await supabase.auth.admin.createUser({
  id: adminProfile.id, // Use the same ID as the AuthUser profile
  email: adminProfile.email,
  password: 'Admin@123',
  email_confirm: true,
  user_metadata: {
    first_name: adminProfile.firstName,
    last_name: adminProfile.lastName,
  }
})

if (error) {
  console.error('Error creating user:', error.message)
  // Try updating existing user instead
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    adminProfile.id,
    { password: 'Admin@123', email_confirm: true }
  )
  if (updateError) {
    console.error('Error updating user:', updateError.message)
  } else {
    console.log('Updated existing user:', updateData.user.email)
  }
} else {
  console.log('Created Supabase Auth user:', data.user.email, data.user.id)
}

await prisma.$disconnect()
