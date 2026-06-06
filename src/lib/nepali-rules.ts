// ─── Nepali Tax & Business Rules Utility ─────────────────────────────────
// Nepal-specific tax configuration, billing rules, and formatting for NPR

// ─── Nepal Tax Configuration ───────────────────────────────────────────

export const NEPAL_TAX_CONFIG = {
  vatRate: 13, // 13% VAT (standard for hotels in Nepal)
  serviceChargeRate: 10, // 10% service charge (standard hospitality industry)
  tourismFee: 500, // NPR 500 per night tourism fee
  localBodyTax: 0, // Variable by municipality — configured separately
  telexTransferFee: 500, // NPR for bank/wire transfers
}

// ─── Nepal Business Rules ───────────────────────────────────────────────

export const NEPAL_BUSINESS_RULES = {
  defaultCheckInTime: '14:00', // 2:00 PM
  defaultCheckOutTime: '11:00', // 11:00 AM
  nightAuditTime: '23:00', // 11:00 PM (end of business day)
  maxOccupancyPerRoom: 4,
  minGuestAge: 18, // For ID verification
  passportRequired: true, // For foreign nationals
  idVerificationRequired: true,
  policeReportThreshold: 50000, // Transaction > NPR 50,000 needs police reporting
  cashTransactionLimit: 200000, // NPR 200,000 cash limit per transaction
  folioCreditLimitDefault: 15000, // NPR default credit limit
}

// ─── Calculate Nepali Bill ─────────────────────────────────────────────

export interface NepaliBillResult {
  roomCharge: number
  extras: number
  subtotal: number
  vatAmount: number
  serviceCharge: number
  tourismFee: number
  totalAmount: number
  taxBreakdown: string
}

export function calculateNepaliBill(
  roomCharge: number,
  extras: number = 0,
  tourismFee: number = NEPAL_TAX_CONFIG.tourismFee,
): NepaliBillResult {
  const subtotal = roomCharge + extras
  const vatAmount = Math.round(subtotal * NEPAL_TAX_CONFIG.vatRate / 100)
  const serviceCharge = Math.round(subtotal * NEPAL_TAX_CONFIG.serviceChargeRate / 100)
  const totalAmount = subtotal + vatAmount + serviceCharge + tourismFee

  const lines: string[] = [
    `Room: ${formatNPR(roomCharge)}`,
  ]
  if (extras > 0) {
    lines.push(`Extras: ${formatNPR(extras)}`)
  }
  lines.push(
    `VAT (${NEPAL_TAX_CONFIG.vatRate}%): ${formatNPR(vatAmount)}`,
    `Service Charge (${NEPAL_TAX_CONFIG.serviceChargeRate}%): ${formatNPR(serviceCharge)}`,
  )
  if (tourismFee > 0) {
    lines.push(`Tourism Fee: ${formatNPR(tourismFee)}`)
  }

  return {
    roomCharge,
    extras,
    subtotal,
    vatAmount,
    serviceCharge,
    tourismFee,
    totalAmount,
    taxBreakdown: lines.join(', '),
  }
}

// ─── Format Currency in Nepali Style (NPR) ────────────────────────────────

export function formatNPR(amount: number): string {
  // Nepali number grouping: last 3 digits, then groups of 2
  const isNegative = amount < 0
  const absAmount = Math.abs(Math.round(amount))
  const str = absAmount.toString()

  let formatted: string
  if (str.length <= 3) {
    formatted = str
  } else {
    const lastThree = str.slice(-3)
    const remaining = str.slice(0, -3)
    // Group remaining in pairs from right
    let groups: string[] = []
    let pos = remaining.length
    while (pos > 0) {
      const start = Math.max(0, pos - 2)
      groups.unshift(remaining.slice(start, pos))
      pos = start
    }
    formatted = groups.join(',') + ',' + lastThree
  }

  return `${isNegative ? '-' : ''}Rs. ${formatted}`
}

// ─── Format Currency with decimal places ───────────────────────────────

export function formatNPRDecimal(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const intPart = Math.floor(rounded)
  const decPart = Math.abs(Math.round((rounded - intPart) * 100))

  const intStr = (() => {
    const str = Math.abs(intPart).toString()
    if (str.length <= 3) return str
    const lastThree = str.slice(-3)
    const remaining = str.slice(0, -3)
    let groups: string[] = []
    let pos = remaining.length
    while (pos > 0) {
      const start = Math.max(0, pos - 2)
      groups.unshift(remaining.slice(start, pos))
      pos = start
    }
    return groups.join(',') + ',' + lastThree
  })()

  return `${intPart < 0 ? '-' : ''}Rs. ${intStr}.${String(decPart).padStart(2, '0')}`
}

// ─── Amount in Nepali Words (for invoices) ──────────────────────────────

const NPR_UNITS = ['', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दस']
const NPR_TEENS = [
  'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र',
  'सोह्र', 'सत्र', 'अठार', 'उन्नाइस', 'बीस',
]
const NPR_TENS = [
  '', '', 'बीस', 'तीस', 'चालीस', 'पचास',
  'साठी', 'सत्तरी', 'असी', 'नब्बे',
]

function numberToNepaliWords(n: number): string {
  if (n === 0) return 'शून्य'

  let words = ''

  function convertBelow100(num: number): string {
    if (num < 11) return NPR_UNITS[num]
    if (num < 21) return NPR_TEENS[num - 10]
    const tens = NPR_TENS[Math.floor(num / 10)]
    const units = NPR_UNITS[num % 10]
    return units ? `${tens} ${units}` : tens
  }

  if (n >= 10000000) {
    words += numberToNepaliWords(Math.floor(n / 10000000)) + ' करोड '
    n %= 10000000
  }
  if (n >= 100000) {
    words += numberToNepaliWords(Math.floor(n / 100000)) + ' लाख '
    n %= 100000
  }
  if (n >= 1000) {
    words += numberToNepaliWords(Math.floor(n / 1000)) + ' हजार '
    n %= 1000
  }
  if (n >= 100) {
    words += NPR_UNITS[Math.floor(n / 100)] + ' सय '
    n %= 100
  }
  if (n > 0) {
    words += convertBelow100(n)
  }

  return words.trim()
}

export function amountInNepaliWords(amount: number): string {
  const rounded = Math.round(amount)
  const words = numberToNepaliWords(Math.abs(rounded))
  return `${rounded < 0 ? 'माइनस ' : ''}${words} रुपैयाँ मात्र`
}

// ─── Get Applicable Tax Rate by Service Type ──────────────────────────

export function getTaxRate(serviceType: string): { vat: number; serviceCharge: number; tourismFee: number } {
  // Most services have 13% VAT + 10% service charge
  // Some exempt categories
  const exemptTypes = ['laundry_service', 'complimentary', 'discount']

  if (exemptTypes.includes(serviceType)) {
    return { vat: 0, serviceCharge: 0, tourismFee: 0 }
  }

  // Room rates have tourism fee
  if (serviceType === 'room_charge') {
    return {
      vat: NEPAL_TAX_CONFIG.vatRate,
      serviceCharge: NEPAL_TAX_CONFIG.serviceChargeRate,
      tourismFee: NEPAL_TAX_CONFIG.tourismFee,
    }
  }

  // F&B and other services
  return {
    vat: NEPAL_TAX_CONFIG.vatRate,
    serviceCharge: NEPAL_TAX_CONFIG.serviceChargeRate,
    tourismFee: 0,
  }
}

// ─── Forex Declaration Check ───────────────────────────────────────────

export function needsForexDeclaration(amount: number): boolean {
  // Amount > NPR 500,000 needs foreign exchange declaration
  return amount > 500000
}

// ─── Cash Transaction Compliance Check ──────────────────────────────────

export function isCashTransactionCompliant(amount: number): { compliant: boolean; message: string } {
  if (amount > NEPAL_BUSINESS_RULES.cashTransactionLimit) {
    return {
      compliant: false,
      message: `Cash transaction exceeds NPR ${formatNPR(NEPAL_BUSINESS_RULES.cashTransactionLimit)} limit. Bank transfer or card required.`,
    }
  }
  if (amount > NEPAL_BUSINESS_RULES.policeReportThreshold) {
    return {
      compliant: true,
      message: `Transaction above NPR ${formatNPR(NEPAL_BUSINESS_RULES.policeReportThreshold)} — police report may be required.`,
    }
  }
  return { compliant: true, message: '' }
}
