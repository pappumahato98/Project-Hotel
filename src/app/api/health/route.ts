import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isDemoMode } from '@/lib/supabase/client'

export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // 1. DATABASE_URL presence
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'not set' })
  } else if (dbUrl.startsWith('file:')) {
    checks.push({ name: 'DATABASE_URL', ok: false, detail: 'file: URL does not work on Vercel serverless — use Supabase Postgres URL' })
  } else {
    checks.push({ name: 'DATABASE_URL', ok: true, detail: dbUrl.split('@')[1]?.split('.')[0] ? 'postgresql://***@***.supabase.co' : dbUrl.split(':')[0] + '://' })
  }

  // 2. Supabase Auth configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseAnon) {
    checks.push({ name: 'supabase.auth', ok: false, detail: 'NEXT_PUBLIC_SUPABASE_URL or ANON_KEY not set — login will not work' })
  } else {
    checks.push({ name: 'supabase.auth', ok: true, detail: 'configured' })
  }
  if (!supabaseService) {
    checks.push({ name: 'supabase.service_role', ok: false, detail: 'SUPABASE_SERVICE_ROLE_KEY not set — admin operations may fail' })
  } else {
    checks.push({ name: 'supabase.service_role', ok: true })
  }

  // 3. App mode
  checks.push({ name: 'app.mode', ok: true, detail: isDemoMode() ? 'DEMO (no Supabase)' : 'PRODUCTION (Supabase)' })

  // 4. DB connectivity + has data
  try {
    const userCount = await db.authUser.count()
    checks.push({ name: 'db.connect', ok: true })
    checks.push({ name: 'db.seeded', ok: userCount > 0, detail: userCount > 0 ? `${userCount} users` : '0 users — run seed or check Supabase tables' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    checks.push({ name: 'db.connect', ok: false, detail: msg.slice(0, 200) })
  }

  const allOk = checks.every((c) => c.ok)
  return NextResponse.json(
    { status: allOk ? 'ok' : 'error', checks },
    { status: allOk ? 200 : 500 },
  )
}
