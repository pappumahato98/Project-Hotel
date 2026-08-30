/**
 * Pure business-logic layer for the Day Book view.
 */

export type VoucherType = "all" | "journal" | "receipt" | "payment" | "contra";

export interface JournalLineForDayBook {
  debit: number;
  credit: number;
}

export interface JournalEntryForDayBook {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  is_posted: boolean;
  lines?: JournalLineForDayBook[];
}

export interface DayBookEntry {
  id: string;
  entryNumber: string;
  voucherType: string;
  description: string;
  debitTotal: number;
  creditTotal: number;
  isPosted: boolean;
}

export interface DayBookTotals {
  totalDebit: number;
  totalCredit: number;
  count: number;
}

export const FISCAL_YEARS = [
  { value: "2081", label: "2081/82" },
  { value: "2080", label: "2080/81" },
  { value: "2079", label: "2079/80" },
  { value: "2078", label: "2078/79" },
] as const;

/**
 * Determine if a journal entry matches the selected voucher type filter.
 */
export function matchesVoucherType(entryNumber: string, voucherType: VoucherType): boolean {
  if (voucherType === "all") return true;
  const num = entryNumber.toLowerCase();
  switch (voucherType) {
    case "journal":
      return num.startsWith("jv") || num.startsWith("je");
    case "receipt":
      return num.startsWith("rv") || num.startsWith("rc");
    case "payment":
      return num.startsWith("pv") || num.startsWith("py");
    case "contra":
      return num.startsWith("cv") || num.startsWith("ct");
    default:
      return true;
  }
}

/**
 * Extract the voucher type prefix from an entry number (e.g. "JE-001" → "JE").
 * Returns "JV" as a fallback if the entry number has no dash prefix.
 */
export function extractVoucherType(entryNumber: string): string {
  if (!entryNumber || !entryNumber.includes("-")) return "JV";
  return entryNumber.split("-")[0] || "JV";
}

/**
 * Compute the debit and credit totals for a single journal entry.
 */
export function computeEntryTotals(entry: JournalEntryForDayBook): { debit: number; credit: number } {
  const lines = entry.lines || [];
  return {
    debit: lines.reduce((s, l) => s + (l.debit || 0), 0),
    credit: lines.reduce((s, l) => s + (l.credit || 0), 0),
  };
}

/**
 * Compute the day book totals (sum of all entries' debit/credit).
 */
export function computeDayBookTotals(entries: JournalEntryForDayBook[]): DayBookTotals {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of entries) {
    const { debit, credit } = computeEntryTotals(entry);
    totalDebit += debit;
    totalCredit += credit;
  }
  return { totalDebit, totalCredit, count: entries.length };
}

/**
 * Filter journal entries by voucher type.
 */
export function filterByVoucherType(
  entries: JournalEntryForDayBook[],
  voucherType: VoucherType
): JournalEntryForDayBook[] {
  if (voucherType === "all") return entries;
  return entries.filter((e) => matchesVoucherType(e.entry_number, voucherType));
}
