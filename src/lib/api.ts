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
    let errData: Record<string, unknown> | null = null
    try {
      errData = await res.json()
    } catch {
      // JSON parse failed — fall through to generic message
    }
    if (errData?.error && typeof errData.error === 'string') {
      throw new Error(errData.error)
    }
    throw new Error(`Request failed (HTTP ${res.status})`)
  }
  return res.json() as Promise<T>
}