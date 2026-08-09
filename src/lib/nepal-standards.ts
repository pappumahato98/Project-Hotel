/**
 * Nepal Standards — Unified formatting for Meridian PMS
 * 
 * Target audience: Nepal hotels with foreign guests.
 * All currency, number, date, and phone formatting is centralized here.
 * 
 * Standards:
 *   Currency: NPR (Nepalese Rupee) with Indian/Nepali grouping (lakhs/crores)
 *   Dates: YYYY/MM/DD (Nepal standard), YYYY-Mon-DD short, BS optional via dual calendar
 *   Time: 12-hour with AM/PM, Asia/Katmandu (UTC+5:45)
 *   Phone: +977 format
 *   Tax: 13% VAT (Nepal standard), TDS rates
 *   Fiscal Year: Shrawan–Ashadh (mid-Jul to mid-Jul) in BS
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Nepal standard VAT rate */
export const NEPAL_VAT_RATE = 13

/** Tourism fee per foreign guest per night (NPR) — configurable per property */
export const NEPAL_TOURISM_FEE_DEFAULT = 500

/** Common TDS rates in Nepal */
export const NEPAL_TDS_RATES = {
  salary: 1,        // 1% on salary
  contractor: 2,    // 2% on contractor payments  
  rent: 15,         // 15% on rent
  service: 5,       // 5% on service
  dividend: 5,      // 5% on dividends
  interest: 5,      // 5% on interest
  lottery: 15,      // 15% on lottery winnings
  commission: 5,    // 5% on commission
} as const

/** Nepal fiscal year months: Shrawan(4) to Ashadh(3) in BS */
export const NEPAL_FY_START_MONTH_AD = 7  // July
export const NEPAL_FY_START_DAY_AD = 16   // 16th July

/** Currency display options */
export const CURRENCY = {
  code: 'NPR' as const,
  symbol: 'Rs.' as const,
  name: 'Nepalese Rupee' as const,
} as const

/** Standard Nepal timezone */
export const NEPAL_TIMEZONE = 'Asia/Katmandu'

// ═══════════════════════════════════════════════════════════════════════
// NUMBER FORMATTING — Indian/Nepali Grouping (##,##,###)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format a number with Indian/Nepali grouping: 1,00,000 (1 lakh), 1,00,00,000 (1 crore)
 * Uses the en-IN locale which produces the correct ##,##,### grouping.
 */
export function formatNumber(value: number, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })
}

// ═══════════════════════════════════════════════════════════════════════
// CURRENCY FORMATTING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format an amount as NPR with Indian/Nepali number grouping.
 * Examples: Rs. 1,000 | Rs. 1,50,000 | Rs. 1,00,00,000
 */
export function formatNPR(amount: number, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showCode?: boolean
}): string {
  const formatted = formatNumber(amount, options)
  if (options?.showCode) return `NPR ${formatted}`
  return `Rs. ${formatted}`
}

/** Alias for consistency */
export const formatCurrency = formatNPR

/**
 * Format currency compact for tables: Rs. 1.5L (1.5 lakh), Rs. 2.3Cr (2.3 crore)
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_00_00_000) {
    return `Rs. ${(amount / 1_00_00_000).toFixed(1)}Cr`
  }
  if (amount >= 1_00_000) {
    return `Rs. ${(amount / 1_00_000).toFixed(1)}L`
  }
  return formatNPR(amount)
}

// ═══════════════════════════════════════════════════════════════════════
// DATE/TIME FORMATTING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format date as YYYY/MM/DD (Nepal standard format)
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Format date as YYYY-Mon-DD (e.g., 2025-Jul-15) — Nepal short format
 */
export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const year = d.getFullYear()
  const month = MONTHS_EN[d.getMonth()]
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date as YYYY-MM-DD (ISO format for inputs/API)
 */
export function formatDateISO(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format time as 12-hour with AM/PM (Nepal standard)
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

/** Devanagari digit map: 0-9 → ०-९ */
const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] as const

/**
 * Format time in Devanagari script (e.g., ११:३० अपराह्न / ०८:१५ पूर्वाह्न)
 */
export function formatTimeDevanagari(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'अपराह्न' : 'पूर्वाह्न'
  const h12 = hours % 12 || 12

  const toDevanagari = (n: number | string) =>
    String(n).split('').map(ch => DEVANAGARI_DIGITS[parseInt(ch)] ?? ch).join('')

  return `${toDevanagari(String(h12).padStart(2, '0'))}:${toDevanagari(minutes)} ${ampm}`
}

/**
 * Format date + time as YYYY/MM/DD, hh:mm AM/PM
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${formatDate(d)}, ${formatTime(d)}`
}

/**
 * Format date + time short as YYYY-Mon-DD, hh:mm AM/PM
 */
export function formatDateTimeShort(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${formatDateShort(d)}, ${formatTime(d)}`
}

// ═══════════════════════════════════════════════════════════════════════
// PHONE FORMATTING
// ═══════════════════════════════════════════════════════════════════════

const NEPAL_MOBILE_REGEX = /^(\+977|977|0)?(98|97|96|95|94|93|92|91|88|87|86|85|84|83|82|81)\d{8}$/
const NEPAL_LANDLINE_REGEX = /^(\+977|977|0)?(1)\d{7}$/

/**
 * Validate a Nepal phone number (mobile or landline)
 * Accepts: +977-98XXXXXXXX, 97798XXXXXXXX, 98XXXXXXXX, 01-XXXXXXX
 */
export function isValidNepalPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return NEPAL_MOBILE_REGEX.test(cleaned) || NEPAL_LANDLINE_REGEX.test(cleaned)
}

/**
 * Format a Nepal phone number to standard +977-XXXXXXXXXX format
 */
export function formatNepalPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Already has country code
  if (cleaned.startsWith('+977')) {
    return cleaned.replace(/(\+977)(\d{10})/, '$1-$2')
  }
  // Has 977 prefix
  if (cleaned.startsWith('977') && cleaned.length >= 13) {
    return `+${cleaned.replace(/(977)(\d{10})/, '$1-$2')}`
  }
  // Starts with 0
  if (cleaned.startsWith('0')) {
    const local = cleaned.slice(1) // remove leading 0
    return `+977-${local}`
  }
  // Just the number
  return `+977-${cleaned}`
}

/**
 * Get phone type: 'mobile' | 'landline' | 'unknown'
 */
export function getNepalPhoneType(phone: string): 'mobile' | 'landline' | 'unknown' {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  if (NEPAL_MOBILE_REGEX.test(cleaned)) return 'mobile'
  if (NEPAL_LANDLINE_REGEX.test(cleaned)) return 'landline'
  return 'unknown'
}

// ═══════════════════════════════════════════════════════════════════════
// AREA CONVERSION (sq ft ↔ sq m)
// ═══════════════════════════════════════════════════════════════════════

const SQ_FT_TO_SQ_M = 0.092903
const SQ_M_TO_SQ_FT = 10.7639

/** Convert square feet to square meters */
export function sqFtToSqM(sqft: number): number {
  return Math.round(sqft * SQ_FT_TO_SQ_M * 100) / 100
}

/** Convert square meters to square feet */
export function sqMToSqFt(sqm: number): number {
  return Math.round(sqm * SQ_M_TO_SQ_FT * 100) / 100
}

/** Format area in sq m (Nepal standard) */
export function formatAreaSqM(sqft: number | null | undefined): string {
  if (sqft == null) return '—'
  return `${sqFtToSqM(sqft).toLocaleString('en-IN')} sq m`
}

/** Format area in sq ft (for international guests) */
export function formatAreaSqFt(sqft: number | null | undefined): string {
  if (sqft == null) return '—'
  return `${sqft.toLocaleString('en-IN')} sq ft`
}

// ═══════════════════════════════════════════════════════════════════════
// FISCAL YEAR HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get Nepal fiscal year in BS short format (e.g., '2082/83')
 * Nepal FY: Shrawan 1 (mid-July AD) to Ashadh 30 (mid-July AD)
 */
export function getNepalFiscalYearShort(date?: Date): string {
  const d = date || new Date()
  const month = d.getMonth() // 0-indexed
  const day = d.getDate()
  
  // After July 15 = new fiscal year in AD → add offset
  const adYear = (month > 6 || (month === 6 && day >= 16)) ? d.getFullYear() + 1 : d.getFullYear()
  // Approximate BS offset (56-57 years ahead)
  const bsYear = adYear + 57
  return `${bsYear}/${(bsYear + 1) % 100}`
}

/**
 * Get Nepal fiscal year in BS long format (e.g., '2082/2083')
 */
export function getNepalFiscalYearLong(date?: Date): string {
  const short = getNepalFiscalYearShort(date)
  const [start] = short.split('/')
  return `${start}/${parseInt(start) + 1}`
}
