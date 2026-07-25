import { usePreferencesStore } from '@/lib/store'

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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: getCurrency(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  return toDateOnly(new Date())
}

/**
 * Convert a Date object to a YYYY-MM-DD string using LOCAL timezone.
 * Unlike `toISOString().split('T')[0]` which uses UTC, this respects the user's timezone.
 * Critical for Nepal (UTC+5:45) where UTC conversion shifts dates.
 */
export function toDateOnly(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD date string to a Date at midnight LOCAL time.
 * Unlike `new Date('2025-06-15')` which parses as UTC midnight, this creates
 * a local-timezone date so the Calendar component displays the correct day.
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

const BED_SHORTCUTS: Record<string, string> = {
  single: 'SGL', double: 'DBL', twin: 'Twin', king: 'Kng',
  queen: 'Qun', master: 'Mas', sofa: 'Sfa', bunk: 'Bnk',
  full: 'Full', twin_single: 'TS',
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

export function getBedShortcut(bedConfig: string | null | undefined): string {
  if (!bedConfig) return ''
  const lower = bedConfig.toLowerCase()
  if (lower.includes('+')) {
    const parts = lower.split('+').map(p => p.trim())
    const shortcuts: string[] = []
    for (const part of parts) {
      for (const [key, shortcut] of Object.entries(BED_SHORTCUTS)) {
        if (part.includes(key)) { shortcuts.push(shortcut); break }
      }
    }
    return shortcuts.join('+') || ''
  }
  for (const [key, shortcut] of Object.entries(BED_SHORTCUTS)) {
    if (lower.includes(key)) return shortcut
  }
  return ''
}

export function getRoomTypeBedShort(typeName: string | null | undefined, bedConfig: string | null | undefined, typeCode?: string | null): string {
  const t = getTypeShortcut(typeName, typeCode)
  const b = getBedShortcut(bedConfig)
  if (t && b) return `${t} ${b}`
  if (t) return t
  if (b) return b
  return ''
}
