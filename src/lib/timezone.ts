/**
 * Shared timezone utilities for Meridian PMS.
 *
 * Default timezone: Asia/Katmandu (UTC+5:45, no DST).
 * Reads the property timezone from SystemSettings when available,
 * falls back to the default.
 */

export const DEFAULT_TIMEZONE = 'Asia/Katmandu'

/**
 * Get the current date/time in the hotel's configured timezone.
 * Uses Intl API — no manual offset math.
 */
export function getHotelNow(tz?: string): Date {
  const timezone = tz || DEFAULT_TIMEZONE
  // Get the current time parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const now = new Date()
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second')),
  )
}

/**
 * Get today's date (YYYY-MM-DD) in the hotel's timezone.
 */
export function getHotelToday(tz?: string): string {
  const d = getHotelNow(tz)
  return d.toISOString().split('T')[0]
}

/**
 * Get a Date object for the start of today in the hotel's timezone.
 */
export function getHotelStartOfDay(tz?: string): Date {
  const d = getHotelNow(tz)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get a Date object for the end of today in the hotel's timezone.
 */
export function getHotelEndOfDay(tz?: string): Date {
  const d = getHotelNow(tz)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Format a date in the hotel's timezone.
 */
export function formatHotelDate(date: Date, options?: Intl.DateTimeFormatOptions, tz?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz || DEFAULT_TIMEZONE,
    ...options,
  }).format(date)
}

/**
 * Format a date as YYYY-MM-DD in the hotel's timezone.
 */
export function formatHotelDateISO(date: Date, tz?: string): string {
  return formatHotelDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }, tz).split('/').reverse().join('-')
}
