/**
 * Supabase session-refresh proxy helper.
 *
 * Called by src/proxy.ts (Next.js 16 proxy convention).
 * Refreshes the Supabase auth cookie on each page navigation.
 * Has a 3-second timeout to prevent request hanging on Vercel edge.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Timeout for the getUser() call — prevents edge function hanging */
const PROXY_TIMEOUT_MS = 3000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function updateSession(request: NextRequest) {
  // If Supabase isn't configured yet, skip session refresh
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() must be called to refresh the session cookie.
  // Wrapped in a timeout to prevent hanging on slow networks (Vercel edge).
  try {
    await withTimeout(supabase.auth.getUser(), PROXY_TIMEOUT_MS)
  } catch {
    // If getUser() fails, still return the response — don't block the request
  }

  return supabaseResponse
}
