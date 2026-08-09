import { usePreferencesStore } from '@/lib/store'
import {
  formatNPR as _formatNPR,
  formatNPRDevanagari as _formatNPRDevanagari,
  formatDate as _formatDate,
  formatDateShort as _formatDateShort,
  formatDateDual as _formatDateDual,
  formatDateDualLong as _formatDateDualLong,
  formatTime as _formatTime,
  formatTimeDevanagari as _formatTimeDevanagari,
  formatDateTime as _formatDateTime,
  formatDateTimeShort as _formatDateTimeShort,
  formatDateISO as _formatDateISO,
  formatNumber,
  formatCurrencyCompact,
} from '@/lib/nepal-standards'

// ═══════════════════════════════════════════════════════════════════════════════
// Re-export Nepal standards formatters
// ═══════════════════════════════════════════════════════════════════════════════

export { formatNumber, formatCurrencyCompact, formatNPRDevanagari, formatTimeDevanagari, formatDateDual, formatDateDualLong }

/**
 * Format currency as Rs. with Indian/Nepali lakh/crore grouping.
 * Example: Rs. 1,50,000 Only | Rs. 1,00,00,000 Only
 */
export function formatCurrency(amount: number): string {
  return _formatNPR(amount)
}

/**
 * Format date as YYYY/MM/DD (Nepal standard)
 */
export function formatDate(date: string | Date): string {
  return _formatDate(date)
}

/**
 * Format date as YYYY-Mon-DD (e.g., 2025-Jul-15)
 */
export function formatDateShort(date: string | Date): string {
  return _formatDateShort(date)
}

/**
 * Format time as 12-hour with AM/PM
 */
export function formatTime(date: string | Date): string {
  return _formatTime(date)
}

/**
 * Format date + time as YYYY/MM/DD, hh:mm AM/PM
 */
export function formatDateTime(date: string | Date): string {
  return _formatDateTime(date)
}

export function formatDateISO(date: string | Date): string {
  return _formatDateISO(date)
}

export function getTodayString(): string {
  return toDateOnly(new Date())
}

/**
 * Convert a Date object to a YYYY-MM-DD string using LOCAL timezone.
 */
export function toDateOnly(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD date string to a Date at midnight LOCAL time.
 */
export function fromDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const start = typeof checkIn === 'string' ? fromDateOnly(checkIn) : new Date(checkIn)
  const end = typeof checkOut === 'string' ? fromDateOnly(checkOut) : new Date(checkOut)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Room Type & Bed Shortcut Helpers ─────────────────────────────────

const TYPE_SHORTCUTS: Record<string, string> = {
  deluxe: 'DLX', standard: 'STD', superior: 'SUP', executive: 'EXC',
  presidential: 'PRS', premium: 'PRM', suite: 'STE', family: 'FAM',
  economy: 'ECO', classic: 'CLS', premier: 'PMR', royal: 'ROY',
  penthouse: 'PNT', studio: 'STU', villa: 'VLA',
}

const BED_TYPE_NAMES: Record<string, string> = {
  single: 'Single', double: 'Double', twin: 'Twin', king: 'King',
  queen: 'Queen', master: 'Master', sofa: 'Sofa', bunk: 'Bunk',
  full: 'Full', twin_single: 'Twin/Single',
}

/** Extract readable bed type name(s) from bedConfig */
export function getBedTypeName(bedConfig: string | null | undefined): string {
  if (!bedConfig) return ''
  const lower = bedConfig.toLowerCase()
  if (lower.includes('+')) {
    const parts = lower.split('+').map(p => p.trim())
    const names: string[] = []
    for (const part of parts) {
      for (const [key, name] of Object.entries(BED_TYPE_NAMES)) {
        if (part.includes(key)) { names.push(name); break }
      }
    }
    return names.join('+') || ''
  }
  for (const [key, name] of Object.entries(BED_TYPE_NAMES)) {
    if (lower.includes(key)) return name
  }
  return ''
}

export function getTypeShortcut(typeName: string | null | undefined, typeCode?: string | null): string {
  if (!typeName && !typeCode) return ''
  if (typeName) {
    const lower = typeName.toLowerCase()
    for (const [key, shortcut] of Object.entries(TYPE_SHORTCUTS)) {
      if (lower.includes(key)) return shortcut
    }
  }
  if (typeCode) return typeCode.toUpperCase().slice(0, 3)
  if (typeName) return typeName.toUpperCase().slice(0, 3)
  return ''
}