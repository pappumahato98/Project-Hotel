/**
 * Supabase browser client + access-token cache.
 * Supports demo mode when Supabase is not configured.
 */
import { createBrowserClient } from '@supabase/ssr'

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL

let _accessToken: string | null = IS_DEMO ? 'demo-token' : null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function isDemoMode(): boolean {
  return IS_DEMO
}

export function createClient() {
  if (IS_DEMO) {
    return null as any // Won't be called in demo mode
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
