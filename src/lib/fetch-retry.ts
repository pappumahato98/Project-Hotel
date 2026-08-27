/**
 * Resilient fetch with automatic retry for server instability.
 * Retries on network errors and 5xx server errors (not 4xx client errors).
 */

interface FetchRetryOptions extends RequestInit {
  /** Max retry attempts (default: 2, total 3 tries) */
  retries?: number
  /** Base delay in ms between retries (default: 1000, increases with each attempt) */
  baseDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const { retries = 2, baseDelay = 1000, ...fetchOptions } = options

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, fetchOptions)

      // Success or client error (4xx) — don't retry these
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res
      }

      // Server error (5xx) — retry if attempts remain
      if (i < retries) {
        await new Promise(r => setTimeout(r, baseDelay * (i + 1)))
        continue
      }

      return res
    } catch {
      // Network error (server down) — retry if attempts remain
      if (i < retries) {
        await new Promise(r => setTimeout(r, baseDelay * 1.5 * (i + 1)))
        continue
      }
      throw new Error('Server is temporarily unavailable. Please try again.')
    }
  }

  throw new Error('Server is temporarily unavailable.')
}
