/**
 * Supabase Client — Dynamic Configuration
 *
 * Auth is self-contained JWT. This client is ONLY used for:
 *   - Supabase Realtime (postgres_changes, broadcast, presence)
 *
 * The client is initialized lazily when realtime config is fetched from the server.
 * Falls back to null if Supabase is not configured.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseUrl: string | null = null
let _supabaseAnonKey: string | null = null
let _initPromise: Promise<SupabaseClient | null> | null = null

// ─── Auth token management (JWT self-contained auth) ────────

let _accessToken: string | null = null
let _csrfToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function setCsrfToken(token: string | null) {
  _csrfToken = token
}

export function getCsrfToken(): string | null {
  return _csrfToken
}

// ─── Supabase Realtime Client ───────────────────────────────

/**
 * Initialize the Supabase client with the given config.
 * Called once when the realtime config is fetched from the server.
 */
export function initSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (_supabase && _supabaseUrl === url && _supabaseAnonKey === anonKey) {
    return _supabase
  }
  _supabaseUrl = url
  _supabaseAnonKey = anonKey
  _supabase = createSupabaseClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return _supabase
}

/**
 * Fetch realtime config from the server and initialize the client.
 * Returns the Supabase client or null if not configured.
 * Deduplicates concurrent calls.
 */
export async function ensureSupabaseClient(): Promise<SupabaseClient | null> {
  // Already initialized
  if (_supabase) return _supabase

  // Deduplicate concurrent calls
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    try {
      const res = await fetch('/api/config/realtime')
      if (!res.ok) {
        console.warn('[Realtime] Config endpoint returned', res.status)
        return null
      }
      const data = await res.json()
      if (!data.url || !data.anonKey || !data.configured) {
        console.warn('[Realtime] Not configured:', data.error || 'missing url or anonKey')
        return null
      }
      return initSupabaseClient(data.url, data.anonKey)
    } catch (err) {
      console.warn('[Realtime] Failed to fetch config:', err)
      return null
    } finally {
      _initPromise = null
    }
  })()

  return _initPromise
}

/**
 * Get the current Supabase client (may be null if not yet initialized).
 * For use in synchronous contexts where async initialization is handled elsewhere.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return _supabase
}

/**
 * Backward-compatible createClient.
 * Returns the Supabase client if initialized, or null.
 *
 * NOTE: For new code, prefer ensureSupabaseClient() (async) or
 * useRealtimeProvider() which handles initialization.
 */
export function createClient(): SupabaseClient | null {
  return _supabase
}

export function isDemoMode(): boolean {
  return false
}
