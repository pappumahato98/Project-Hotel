import { NextResponse } from 'next/server'

/**
 * GET /api/config/realtime
 *
 * Returns the Supabase Realtime configuration needed by the client.
 * This keeps the anon key server-side (not in NEXT_PUBLIC_ vars).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If NEXT_PUBLIC vars are set, use them directly
  if (supabaseUrl && supabaseAnonKey) {
    return NextResponse.json({ url: supabaseUrl, anonKey: supabaseAnonKey })
  }

  // Derive from DATABASE_URL (extract project ref)
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json(
      { error: 'No database configured', configured: false },
      { status: 503 }
    )
  }

  // Extract project ref from: postgresql://postgres.<REF>:...@...pooler.supabase.com/...
  const refMatch = dbUrl.match(/postgres\.([a-z0-9]+)@/)
  const projectRef = refMatch?.[1]

  if (!projectRef) {
    return NextResponse.json(
      { error: 'Could not extract Supabase project ref', configured: false },
      { status: 503 }
    )
  }

  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!anonKey) {
    return NextResponse.json(
      {
        error: 'SUPABASE_ANON_KEY not set',
        configured: false,
        hint: 'Add SUPABASE_ANON_KEY to your environment variables. Find it in Supabase Dashboard → Settings → API → Project API keys → anon public',
      },
      { status: 503 }
    )
  }

  const url = `https://${projectRef}.supabase.co`
  return NextResponse.json({ url, anonKey, configured: true })
}
