export interface Holiday {
  month: number;
  day: number;
  name: string;
  name_np: string;
  is_national: boolean;
}

/**
 * Common Nepali Public Holidays (Fixed BS Dates)
 * Note: Many festivals vary based on lunar calendar,
 * these are some fixed date national holidays.
 */
export const NEPALI_HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: "Nepali New Year", name_np: "नयाँ वर्ष", is_national: true },
  { month: 1, day: 11, name: "Loktantra Diwas", name_np: "लोकतन्त्र दिवस", is_national: true },
  { month: 1, day: 18, name: "Majdur Diwas", name_np: "मजदुर दिवस", is_national: true },
  { month: 2, day: 15, name: "Ganatantra Diwas", name_np: "गणतन्त्र दिवस", is_national: true },
  { month: 6, day: 3, name: "Constituion Day", name_np: "संविधान दिवस", is_national: true },
  { month: 10, day: 16, name: "Sahid Diwas", name_np: "शहीद दिवस", is_national: true },
  { month: 11, day: 7, name: "Prajatantra Diwas", name_np: "प्रजातन्त्र दिवस", is_national: true },
  { month: 12, day: 24, name: "Janaki Nawami", name_np: "जानकी नवमी", is_national: false },
];

export function getHoliday(month: number, day: number): Holiday | undefined {
  return NEPALI_HOLIDAYS.find(h => h.month === month && h.day === day);
}
