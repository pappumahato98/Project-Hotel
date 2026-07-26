/**
 * Supabase session-refresh middleware helper.
 *
 * Next.js middleware runs on every request. We use it to refresh the
 * Supabase auth session cookie so it stays current, and to allow
 * unauthenticated access to only the root route (login is rendered there).
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
  // Do not run any code between createServerClient and getUser.
  await supabase.auth.getUser()

  return supabaseResponse
}
