/**
 * Auth client utilities.
 *
 * Previously wrapped Supabase Auth. Now manages JWT access tokens
 * and CSRF tokens for our self-contained auth system.
 */

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

/**
 * Demo mode is no longer used — auth is always JWT-based.
 * Kept for backward compat with any remaining checks.
 */
export function isDemoMode(): boolean {
  return false
}

/**
 * No-op stub — Supabase client is no longer used.
 */
export function createClient() {
  return null as any
}
