/**
 * Safe fetch wrapper that handles non-JSON responses gracefully.
 * Automatically attaches Bearer token + CSRF token from auth store.
 * On 401, attempts silent token refresh before redirecting to login.
 */

// Cached reference to auth store (lazy to avoid import issues in SSR)
let _getToken: (() => string | null) | null = null
let _getUserId: (() => string | null) | null = null
let _getCsrfToken: (() => string | null) | null = null

// Prevent concurrent refresh attempts
let _refreshPromise: Promise<boolean> | null = null

/** Call once from client to register the token, user-id, and CSRF getters */
export function initAuthFetch(
  getToken: () => string | null,
  getUserId?: () => string | null,
  getCsrfToken?: () => string | null,
) {
  _getToken = getToken
  _getUserId = getUserId ?? null
  _getCsrfToken = getCsrfToken ?? null
}

/**
 * Attempt to refresh the access token using the refresh token cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {}
      if (_getCsrfToken) {
        const csrf = _getCsrfToken()
        if (csrf) headers['X-CSRF-Token'] = csrf
      }

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin', // Ensure cookies are sent
        headers,
      })

      if (!res.ok) return false

      const data = await res.json()
      if (data?.accessToken && data?.csrfToken) {
        const { useAuthStore } = await import('@/lib/store')
        const { setAccessToken, setCsrfToken } = await import('@/lib/supabase/client')

        setAccessToken(data.accessToken)
        setCsrfToken(data.csrfToken)

        if (data.user) {
          useAuthStore.getState().login(data.user, data.accessToken)
        }
        return true
      }
      return false
    } catch {
      return false
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Attach Bearer token, CSRF token, and x-user-id header if available
  if (_getToken) {
    const token = _getToken()
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        ...(!!_getCsrfToken && _getCsrfToken() ? { 'X-CSRF-Token': _getCsrfToken()! } : {}),
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

  // Handle 401 — try silent refresh, then logout
  if (res.status === 401 && typeof window !== 'undefined') {
    // Don't try to refresh the refresh endpoint itself
    if (url.includes('/auth/refresh')) {
      forceLogout()
      throw new Error('Session expired. Please log in again.')
    }

    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry the original request with new token
      if (_getToken) {
        const newToken = _getToken()
        if (newToken) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          }
        }
      }
      try {
        res = await fetch(url, options)
        if (res.ok) return res.json() as Promise<T>
      } catch {
        // Retry failed
      }
    }

    // Clear auth state without hard redirect — let the UI handle the transition
    try {
      const { useAuthStore } = await import('@/lib/store')
      const store = useAuthStore.getState()
      if (store.isAuthenticated) store.logout()
      const { setAccessToken, setCsrfToken } = await import('@/lib/supabase/client')
      setAccessToken(null)
      setCsrfToken(null)
    } catch {
      // Import failed
    }
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    // Handle 503 DB errors — provide clear setup instructions
    if (res.status === 503 && typeof window !== 'undefined') {
      let errData: Record<string, unknown> | null = null
      try { errData = await res.json() } catch {}
      const code = errData?.code as string | undefined
      if (code === 'DB_NOT_CONFIGURED' || code === 'DB_UNREACHABLE' || code === 'DB_SCHEMA_ERROR') {
        const detail = (errData?.detail as string) || ''
        const msg = code === 'DB_NOT_CONFIGURED'
          ? 'Database not configured. Please set DATABASE_URL in your deployment environment variables.'
          : code === 'DB_SCHEMA_ERROR'
            ? 'Database schema is being auto-fixed. Please wait a moment and retry.'
            : 'Database temporarily unavailable. Please try again in a moment.'
        // Dispatch a custom event that the app shell can listen to
        window.dispatchEvent(new CustomEvent('db-unavailable', { detail: { code, message: msg, detail } }))
        throw new Error(msg)
      }
    }

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
      if (errData.retryAfter && typeof errData.retryAfter === 'number') {
        throw new Error(`${errData.error} Try again in ${errData.retryAfter}s.`)
      }
      if (errData.detail && typeof errData.detail === 'string') {
        throw new Error(`${errData.error}: ${errData.detail}`)
      }
      throw new Error(errData.error)
    }
    throw new Error(`Request failed (HTTP ${res.status})`)
  }
  return res.json() as Promise<T>
}

async function forceLogout() {
  try {
    const { useAuthStore } = await import('@/lib/store')
    const store = useAuthStore.getState()
    if (store.isAuthenticated) {
      store.logout()
    }
    const { setAccessToken, setCsrfToken } = await import('@/lib/supabase/client')
    setAccessToken(null)
    setCsrfToken(null)
    // Use router-style navigation instead of hard redirect to avoid page reload
    // The login page is rendered at '/' when not authenticated
    window.location.href = '/'
  } catch {
    // Import failed
  }
}
