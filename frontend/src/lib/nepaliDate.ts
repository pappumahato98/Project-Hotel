/**
 * Nepali Bikram Sambat (BS) Date Converter
 * Accurate AD ↔ BS conversion using lookup tables for BS 2000–2090
 */

// BS month days for years 2000–2090
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

const BS_MONTHS_NP = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
];

const BS_MONTHS_EN = [
  "Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

// Reference date: BS 2000/01/01 = AD 1943/04/14
const BS_REF_YEAR = 2000;
const AD_REF = new Date(1943, 3, 14); // April 14, 1943

function getTotalDaysInBSYear(year: number): number {
  const months = BS_CALENDAR_DATA[year];
  if (!months) return 365;
  return months.reduce((sum, d) => sum + d, 0);
}

export interface NepaliDate {
  year: number;
  month: number; // 1-indexed
  day: number;
}

/**
 * Convert AD date to BS date
 */
export function adToBS(adDate: Date): NepaliDate {
  // Calculate total days from reference
  const diffTime = adDate.getTime() - AD_REF.getTime();
  let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let bsYear = BS_REF_YEAR;
  let bsMonth = 0;
  let bsDay = 1;

  // Walk through BS years
  while (totalDays >= 0) {
    const yearData = BS_CALENDAR_DATA[bsYear];
    if (!yearData) break;

    let yearDays = yearData.reduce((sum, d) => sum + d, 0);
    if (totalDays < yearDays) {
      // Within this year
      for (bsMonth = 0; bsMonth < 12; bsMonth++) {
        if (totalDays < yearData[bsMonth]) {
          bsDay = totalDays + 1;
          return { year: bsYear, month: bsMonth + 1, day: bsDay };
        }
        totalDays -= yearData[bsMonth];
      }
    }
    totalDays -= yearDays;
    bsYear++;
  }

  return { year: bsYear, month: bsMonth + 1, day: bsDay };
}

/**
 * Convert BS date to AD date
 */
export function bsToAD(bsDate: NepaliDate): Date {
  let totalDays = 0;

  // Add days for complete years
  for (let y = BS_REF_YEAR; y < bsDate.year; y++) {
    totalDays += getTotalDaysInBSYear(y);
  }

  // Add days for complete months in the target year
  const yearData = BS_CALENDAR_DATA[bsDate.year];
  if (yearData) {
    for (let m = 0; m < bsDate.month - 1; m++) {
      totalDays += yearData[m];
    }
  }

  // Add remaining days
  totalDays += bsDate.day - 1;

  const result = new Date(AD_REF);
  result.setDate(result.getDate() + totalDays);
  return result;
}

/**
 * Format BS date as string
 */
export function formatBSDate(
  bsDate: NepaliDate,
  format: "short" | "long" | "nepali" = "short"
): string {
  const { year, month, day } = bsDate;
  switch (format) {
    case "nepali":
      return `${toNepaliDigits(day)} ${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(year)}`;
    case "long":
      return `${day} ${BS_MONTHS_EN[month - 1]} ${year}`;
    case "short":
    default:
      return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
  }
}

/**
 * Get BS date from an ISO date string (YYYY-MM-DD)
 */
export function isoToBS(isoDate: string): NepaliDate {
  const [y, m, d] = isoDate.split("-").map(Number);
  return adToBS(new Date(y, m - 1, d));
}

/**
 * Format an ISO date string as BS
 */
export function formatISOasBS(
  isoDate: string,
  format: "short" | "long" | "nepali" = "short"
): string {
  return formatBSDate(isoToBS(isoDate), format);
}

/**
 * Get today's date in BS
 */
export function todayBS(): NepaliDate {
  return adToBS(new Date());
}

/**
 * Convert number to Nepali digits
 */
export function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)]);
}

/**
 * Convert Nepali digits to English digits
 */
export function toEnglishDigits(num: string): string {
  const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return num.replace(/[०-९]/g, (d) => String(nepaliDigits.indexOf(d)));
}

/**
 * Get BS month name
 */
export function getBSMonthName(month: number, lang: "en" | "np" = "en"): string {
  return lang === "np" ? BS_MONTHS_NP[month - 1] : BS_MONTHS_EN[month - 1];
}

/**
 * Get days in a BS month
 */
export function getDaysInBSMonth(year: number, month: number): number {
  const yearData = BS_CALENDAR_DATA[year];
  if (!yearData) return 30;
  return yearData[month - 1] || 30;
}
