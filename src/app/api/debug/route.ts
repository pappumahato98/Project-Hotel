import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/debug — Diagnose Vercel deployment issues
// Returns the status of each component (env vars, DB connection, auth config)
export async function GET() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = []

  // 1. Check env vars
  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      checks.push({ name: key, ok: false, detail: 'MISSING' })
    } else {
      if (key === 'DATABASE_URL') {
        const hasPgbouncer = value.includes('pgbouncer=true')
        const hasPrepareFalse = value.includes('prepare=false')
        const port = value.match(/:(\d+)\//)?.[1]
        checks.push({
          name: key,
          ok: hasPgbouncer && hasPrepareFalse,
          detail: `port=${port}, pgbouncer=${hasPgbouncer}, prepare=false=${hasPrepareFalse}`,
        })
      } else if (key === 'DIRECT_URL') {
        const port = value.match(/:(\d+)\//)?.[1]
        checks.push({
          name: key,
          ok: port === '5432',
          detail: `port=${port} (should be 5432)`,
        })
      } else {
        checks.push({
          name: key,
          ok: true,
          detail: `${value.substring(0, 30)}...`,
        })
      }
    }
  }

  // 2. Test DB connection
  try {
    const userCount = await db.authUser.count()
    checks.push({
      name: 'db.connect',
      ok: true,
      detail: `${userCount} users in DB`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.push({
      name: 'db.connect',
      ok: false,
      detail: msg.substring(0, 200),
    })
  }

  // 3. Test Supabase Auth connection
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@meridian.com',
      password: 'password123',
    })
    if (error) {
      checks.push({
        name: 'supabase.auth',
        ok: false,
        detail: `Login failed: ${error.message}`,
      })
    } else if (data.user) {
      checks.push({
        name: 'supabase.auth',
        ok: true,
        detail: `Login OK, user ID: ${data.user.id.substring(0, 8)}...`,
      })

      // 4. Check if this user ID exists in our AuthUser table
      try {
        const profile = await db.authUser.findUnique({
          where: { id: data.user.id },
          select: { id: true, email: true, role: true },
        })
        if (profile) {
          checks.push({
            name: 'user.profile',
            ok: true,
            detail: `${profile.email} (${profile.role})`,
          })
        } else {
          checks.push({
            name: 'user.profile',
            ok: false,
            detail: `Supabase user ${data.user.id.substring(0, 8)}... NOT found in AuthUser table — run seed`,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        checks.push({
          name: 'user.profile',
          ok: false,
          detail: `DB query failed: ${msg.substring(0, 150)}`,
        })
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.push({
      name: 'supabase.auth',
      ok: false,
      detail: msg.substring(0, 200),
    })
  }

  const allOk = checks.every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'error',
      checks,
      hint:
        'If db.connect fails with "prepared statement already exists", ensure DATABASE_URL ends with ?pgbouncer=true&prepare=false',
    },
    { status: allOk ? 200 : 500 }
  )
}
