/**
 * Safe fetch wrapper that handles non-JSON responses gracefully.
 * Automatically attaches Bearer token from auth store.
 * Prevents "Unexpected token '<', '<!DOCTYPE'... is not valid JSON" errors
 * when the backend server is temporarily unavailable.
 */

// Cached reference to auth store (lazy to avoid import issues in SSR)
let _getToken: (() => string | null) | null = null
let _getUserId: (() => string | null) | null = null

/** Call once from client to register the token and user-id getters */
export function initAuthFetch(
  getToken: () => string | null,
  getUserId?: () => string | null
) {
  _getToken = getToken
  _getUserId = getUserId ?? null
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Attach Bearer token and x-user-id header if available
  if (_getToken) {
    const token = _getToken()
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        ...(!!_getUserId ? { 'x-user-id': _getUserId() ?? '' } : {}),
      }
    }
  }

  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Server unavailable. Please try again.')
  }

  // Handle 401 — session expired or invalid, sign out from Supabase
  if (res.status === 401 && typeof window !== 'undefined') {
    try {
      const { useAuthStore } = await import('@/lib/store')
      const store = useAuthStore.getState()
      if (store.isAuthenticated) {
        store.logout()
        // Sign out from Supabase to clear the session
        const { createClient } = await import('@/lib/supabase/client')
        await createClient().auth.signOut()
        if (!window.location.pathname.includes('/login')) {
          window.location.reload()
        }
      }
    } catch {
      // Import failed — continue with error
    }
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      throw new Error('Server unavailable. Please try again.')
    }
    let errData: Record<string, unknown> | null = null
    try {
      errData = await res.json()
    } catch {
      // JSON parse failed — fall through to generic message
    }
    if (errData?.error && typeof errData.error === 'string') {
      // Add retryAfter info if present (rate limiting)
      if (errData.retryAfter && typeof errData.retryAfter === 'number') {
        throw new Error(`${errData.error} Try again in ${errData.retryAfter}s.`)
      }
      throw new Error(errData.error)
    }
    throw new Error(`Request failed (HTTP ${res.status})`)
  }
  return res.json() as Promise<T>
}