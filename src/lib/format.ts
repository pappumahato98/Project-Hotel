import { usePreferencesStore } from '@/lib/store'
import { adToBS, formatBSDateShort, isNepaliHoliday, getNepaliDayNameShort } from '@/lib/nepali-calendar'

function getCurrency() {
  try {
    return usePreferencesStore.getState().preferences.currency
  } catch {
    return 'NPR'
  }
}

function getLocale(): Intl.LocalesArgument {
  try {
    const lang = usePreferencesStore.getState().preferences.language
    if (lang === 'ne') return 'ne-NP'
    return 'en-GB' // DD/MM/YYYY default locale
  } catch {
    return 'en-GB'
  }
}

function isNepaliEnabled(): boolean {
  try {
    return usePreferencesStore.getState().preferences.nepaliStandards?.dualCalendar !== false
  } catch {
    return true
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: getCurrency(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: getCurrency(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date as DD-MM-YYYY (default) or based on user preference.
 * Uses en-GB locale which naturally produces DD/MM/YYYY.
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date as DD-Mon-YYYY (e.g., 15-Jul-2025) for compact display.
 */
export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date as "DD MMM YYYY" with month name (e.g., 15 July 2025).
 */
export function formatDateLong(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function getTodayString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Nepali-Aware Formatting Helpers ─────────────────────────────────────

/**
 * Format date with BS companion: "15/07/2025 | १/०४/२०८२"
 * Only shows BS if dual calendar is enabled in preferences.
 */
export function formatDateWithBS(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const ad = formatDate(d)
  if (!isNepaliEnabled()) return ad
  const bs = adToBS(d)
  const bsMonth = String(bs.month).padStart(2, '0')
  const bsDay = String(bs.day).padStart(2, '0')
  const bsYear = bs.year
  return `${ad} | ${bsDay}/${bsMonth}/${bsYear} BS`
}

/**
 * Format date with BS short companion: "15 Jul 2025 | 1 Shr 2082"
 */
export function formatDateShortWithBS(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const ad = formatDateShort(d)
  if (!isNepaliEnabled()) return ad
  const bs = adToBS(d)
  return `${ad} | ${formatBSDateShort(bs)}`
}

/**
 * Check if a date is a Nepali holiday (returns null if not, or the holiday name)
 */
export function getHolidayInfo(date: string | Date): { isHoliday: boolean; name?: string; nameEn?: string } | null {
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  const holiday = isNepaliHoliday(d)
  return holiday.isHoliday ? holiday : null
}

/**
 * Get Nepali day name for a date (e.g., "सोम" for Monday)
 */
export function getNepaliDayForDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return getNepaliDayNameShort(d)
}
