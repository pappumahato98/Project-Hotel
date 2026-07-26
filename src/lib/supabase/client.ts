/**
 * Supabase browser client + access-token cache.
 *
 * The token cache is kept in sync by the onAuthStateChange listener in
 * Providers.tsx. apiFetch reads from this cache synchronously to attach
 * the Bearer header to every API request.
 */
import { createBrowserClient } from '@supabase/ssr'

let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
