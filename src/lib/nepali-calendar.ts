// ─── Nepali Calendar (Bikram Sambat) Conversion Utility ─────────────────
// Provides BS ↔ AD conversion, formatting, holidays, and Nepali digit support
// Reference: BS 2070/01/01 = AD 2013/04/14

// Days per month for BS years 2070–2090 (index 0 = Baishakh)
const BS_MONTH_DAYS: Record<number, number[]> = {
  2070: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2077: [30, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2078: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [30, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
}

// Reference: BS 2070/01/01 = AD 2013/04/14
const REFERENCE_BS_YEAR = 2070
const REFERENCE_BS_MONTH = 1
const REFERENCE_BS_DAY = 1
const REFERENCE_AD = new Date(2013, 3, 14) // April 14, 2013 (month is 0-indexed)

// ─── Nepali Month Names ──────────────────────────────────────────────────

const NEPALI_MONTHS_NEPALI: string[] = [
  'बैशाख', 'जेष्ठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र',
]

const NEPALI_MONTHS_ENGLISH: string[] = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

const NEPALI_MONTHS_SHORT_ENGLISH: string[] = [
  'Bai', 'Jes', 'Ash', 'Shr', 'Bhd', 'Asw',
  'Kat', 'Mng', 'Pou', 'Mag', 'Fal', 'Cha',
]

// Nepali digits
const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

const NEPALI_DAYS_SHORT: string[] = [
  'आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि',
]

// ─── Public Holidays (BS dates, repeat every year) ──────────────────────

interface NepaliHoliday {
  bsMonth: number // 1-12
  bsDay: number
  name: string // Nepali name
  nameEn: string // English name
}

const NEPALI_HOLIDAYS: NepaliHoliday[] = [
  { bsMonth: 1, bsDay: 1, name: 'नव बर्ष', nameEn: 'Nepali New Year' },
  { bsMonth: 2, bsDay: 15, name: 'गणतन्त्र दिवस', nameEn: 'Republic Day' },
  { bsMonth: 3, bsDay: 1, name: 'अन्तर्राष्ट्रिय श्रम दिवस', nameEn: 'International Labour Day' },
  { bsMonth: 5, bsDay: 5, name: 'तीज', nameEn: 'Teej (Women\'s Festival)' },
  { bsMonth: 6, bsDay: 1, name: 'घटस्थापना', nameEn: 'Ghatasthapana (Dashain Start)' },
  { bsMonth: 6, bsDay: 7, name: 'फुलपाती', nameEn: 'Fulpati' },
  { bsMonth: 6, bsDay: 8, name: 'महाअष्टमी', nameEn: 'Maha Astami' },
  { bsMonth: 6, bsDay: 9, name: 'नवमी', nameEn: 'Maha Navami' },
  { bsMonth: 6, bsDay: 10, name: 'विजया दशमी', nameEn: 'Vijaya Dashami' },
  { bsMonth: 7, bsDay: 1, name: 'लक्ष्मी पूजा (तिहार)', nameEn: 'Laxmi Puja (Tihar)' },
  { bsMonth: 7, bsDay: 2, name: 'गोबर्धन पूजा / भाइ टीका', nameEn: 'Gobardhan Puja / Bhai Tika' },
  { bsMonth: 7, bsDay: 11, name: 'छठ पर्व', nameEn: 'Chhath Parva' },
  { bsMonth: 9, bsDay: 1, name: 'मकर संक्रान्ति / माघ सक्रान्ति', nameEn: 'Makar Sankranti' },
  { bsMonth: 10, bsDay: 11, name: 'बसन्त पञ्चमी (श्री पञ्चमी)', nameEn: 'Saraswati Puja' },
  { bsMonth: 11, bsDay: 5, name: 'महाशिवरात्री', nameEn: 'Maha Shivaratri' },
  { bsMonth: 11, bsDay: 19, name: 'होली (फागु पूर्णिमा)', nameEn: 'Holi' },
  { bsMonth: 12, bsDay: 8, name: 'राम नवमी', nameEn: 'Ram Navami' },
  { bsMonth: 12, bsDay: 14, name: 'नव बर्ष सन्ध्या', nameEn: 'Nepali New Year Eve' },
]

// ─── Helper: Get days in a BS month ────────────────────────────────────

function getBsMonthDays(bsYear: number, bsMonth: number): number {
  const months = BS_MONTH_DAYS[bsYear]
  if (!months || bsMonth < 1 || bsMonth > 12) return 30 // fallback
  return months[bsMonth - 1]
}

// ─── Core: AD to BS Conversion ──────────────────────────────────────────

export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  const target = new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate())
  target.setHours(0, 0, 0, 0)

  const refDate = new Date(REFERENCE_AD)
  refDate.setHours(0, 0, 0, 0)

  // Days difference from reference AD date
  const diffMs = target.getTime() - refDate.getTime()
  let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Start from BS 2070/01/01 and add days
  let bsYear = REFERENCE_BS_YEAR
  let bsMonth = REFERENCE_BS_MONTH
  let bsDay = REFERENCE_BS_DAY

  // Add days, adjusting year/month/day
  while (diffDays > 0) {
    const daysInMonth = getBsMonthDays(bsYear, bsMonth)
    const remainingInMonth = daysInMonth - bsDay

    if (diffDays <= remainingInMonth) {
      bsDay += diffDays
      diffDays = 0
    } else {
      diffDays -= (remainingInMonth + 1)
      bsDay = 1
      bsMonth++
      if (bsMonth > 12) {
        bsMonth = 1
        bsYear++
      }
    }
  }

  // Handle dates before reference (negative diff)
  while (diffDays < 0) {
    bsDay--
    if (bsDay < 1) {
      bsMonth--
      if (bsMonth < 1) {
        bsMonth = 12
        bsYear--
      }
      bsDay = getBsMonthDays(bsYear, bsMonth)
    }
    diffDays++
  }

  return { year: bsYear, month: bsMonth, day: bsDay }
}

// ─── Format BS Date in Nepali ───────────────────────────────────────────

export function formatBSDateNepali(bsDate: { year: number; month: number; day: number }): string {
  return `${toNepaliDigits(bsDate.day)} ${getNepaliMonthName(bsDate.month)} ${toNepaliDigits(bsDate.year)}`
}

// ─── Format BS Date in English ──────────────────────────────────────────

export function formatBSDateEnglish(bsDate: { year: number; month: number; day: number }): string {
  return `${bsDate.year}-${String(bsDate.month).padStart(2, '0')}-${String(bsDate.day).padStart(2, '0')} BS`
}

// ─── Format BS Date in short English ───────────────────────────────────

export function formatBSDateShort(bsDate: { year: number; month: number; day: number }): string {
  return `${bsDate.day} ${NEPALI_MONTHS_SHORT_ENGLISH[bsDate.month - 1]} ${bsDate.year}`
}

// ─── Get Nepali month name in Nepali ───────────────────────────────────

export function getNepaliMonthName(month: number): string {
  if (month < 1 || month > 12) return ''
  return NEPALI_MONTHS_NEPALI[month - 1]
}

// ─── Get Nepali month short name in English ─────────────────────────────

export function getNepaliMonthShortEnglish(month: number): string {
  if (month < 1 || month > 12) return ''
  return NEPALI_MONTHS_SHORT_ENGLISH[month - 1]
}

// ─── Get Nepali day name short ──────────────────────────────────────────

export function getNepaliDayNameShort(date: Date): string {
  const day = date.getDay()
  return NEPALI_DAYS_SHORT[day]
}

// ─── Convert number/string to Nepali digits ────────────────────────────

export function toNepaliDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => NEPALI_DIGITS[parseInt(d)])
}

// ─── Check if a date is a Nepali public holiday ────────────────────────

export function isNepaliHoliday(date: Date): { isHoliday: boolean; name?: string; nameEn?: string } {
  const bs = adToBS(date)
  const holidays = getNepaliHolidays(bs.year)
  const holiday = holidays.find((h) => h.bsMonth === bs.month && h.bsDay === bs.day)
  if (holiday) {
    return { isHoliday: true, name: holiday.name, nameEn: holiday.nameEn }
  }
  return { isHoliday: false }
}

// ─── Get list of Nepali public holidays for a BS year ──────────────────

export function getNepaliHolidays(bsYear: number): Array<{ bsMonth: number; bsDay: number; name: string; nameEn: string }> {
  return NEPALI_HOLIDAYS.map((h) => ({ ...h }))
}
