/**
 * Safe fetch wrapper that handles non-JSON responses gracefully.
 * Prevents "Unexpected token '<', '<!DOCTYPE'... is not valid JSON" errors
 * when the backend server is temporarily unavailable.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Server unavailable. Please try again.')
  }
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      throw new Error('Server unavailable. Please try again.')
    }
    try {
      const errData = await res.json()
      throw new Error(errData.error || `Request failed (HTTP ${res.status})`)
    } catch (e) {
      if (e instanceof Error && e.message.includes('Server unavailable')) throw e
      throw new Error(`Request failed (HTTP ${res.status})`)
    }
  }
  return res.json() as Promise<T>
}