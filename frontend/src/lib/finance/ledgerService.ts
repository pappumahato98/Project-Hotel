/**
 * Pure business-logic layer for the Ledger transaction view.
 *
 * Extracted from `src/components/finance/transactions/LedgerTransactionService.tsx`
 * as part of the finance-module split (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Functions are pure: same inputs → same outputs, no side effects.
 *   - All Supabase / TanStack Query concerns stay in the hook layer
 *     (`useLedgerTransactionView`). This module only operates on plain
 *     arrays and plain objects.
 *   - TypeScript types are exported so the hook and component can share them.
 */

import type {
  Account,
  JournalEntry,
  LedgerEntry,
} from "@/hooks/useFinance";

// ─── Domain constants ────────────────────────────────────────────────

export const FISCAL_YEARS = [
  { value: "2081", label: "2081/82" },
  { value: "2080", label: "2080/81" },
  { value: "2079", label: "2079/80" },
  { value: "2078", label: "2078/79" },
] as const;

export const FY_RANGES: Record<string, { start: string; end: string }> = {
  "2081": { start: "2024-07-16", end: "2025-07-15" },
  "2080": { start: "2023-07-16", end: "2024-07-15" },
  "2079": { start: "2022-07-16", end: "2023-07-15" },
  "2078": { start: "2021-07-16", end: "2022-07-15" },
};

export type ShowMode = "details" | "summary";

export interface LedgerFilters {
  fiscalYear: string;
  fromDate: string;
  toDate: string;
  selectedAccount: string; // "none" or account id
  showMode: ShowMode;
  linkedLedger: string; // "none" or account id
  applied: boolean;
}

export const DEFAULT_FILTERS: LedgerFilters = {
  fiscalYear: "2081",
  fromDate: FY_RANGES["2081"].start,
  toDate: FY_RANGES["2081"].end,
  selectedAccount: "none",
  showMode: "details",
  linkedLedger: "none",
  applied: false,
};

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Compute the set of accounts that share at least one journal entry with
 * the selected account. Used to populate the "Linked Ledger" dropdown.
 *
 * @param journalEntries all journal entries in the date range (with `lines`)
 * @param accountId the selected account id
 * @returns array of Account objects (excluding the selected account itself)
 */
export function computeLinkedAccounts(
  journalEntries: JournalEntry[],
  accountId: string | undefined,
  allAccounts: Account[]
): Account[] {
  if (!accountId || journalEntries.length === 0) return [];

  // Find journal-entry IDs that contain the selected account.
  const matchingEntryIds = new Set<string>();
  for (const je of journalEntries) {
    const lines = je.lines ?? [];
    if (lines.some((line) => line.account_id === accountId)) {
      matchingEntryIds.add(je.id);
    }
  }

  // Collect OTHER account IDs from those entries.
  const linkedAccountIds = new Set<string>();
  for (const je of journalEntries) {
    if (!matchingEntryIds.has(je.id)) continue;
    const lines = je.lines ?? [];
    for (const line of lines) {
      if (line.account_id !== accountId) {
        linkedAccountIds.add(line.account_id);
      }
    }
  }

  return allAccounts.filter((a) => linkedAccountIds.has(a.id));
}

/**
 * Filter ledger entries by the linked-ledger constraint.
 *
 * If `linkedLedger` is "none", returns `entries` unchanged.
 * Otherwise, returns only entries whose journal entry ALSO contains a line
 * hitting the linked-ledger account.
 */
export function filterByLinkedLedger(
  entries: LedgerEntry[],
  journalEntries: JournalEntry[],
  accountId: string | undefined,
  linkedLedger: string
): LedgerEntry[] {
  if (linkedLedger === "none" || !accountId) return entries;

  const matchingEntryIds = new Set<string>();
  for (const je of journalEntries) {
    const lines = je.lines ?? [];
    const hasSelected = lines.some((l) => l.account_id === accountId);
    const hasLinked = lines.some((l) => l.account_id === linkedLedger);
    if (hasSelected && hasLinked) matchingEntryIds.add(je.id);
  }

  return entries.filter((e) => matchingEntryIds.has(e.journal_entry_id));
}

export interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

/**
 * Compute totals and closing balance for a list of ledger entries.
 * Closing balance = running_balance of the last entry (chronological order
 * is assumed; caller is responsible for sort order).
 */
export function computeSummary(entries: LedgerEntry[]): LedgerSummary {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const closingBalance =
    entries.length > 0
      ? entries[entries.length - 1]?.running_balance ?? 0
      : 0;
  return { totalDebit, totalCredit, closingBalance };
}

export interface LedgerSummaryGroup {
  entryNumber: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  lines: LedgerEntry[];
}

/**
 * Group ledger entries by journal entry, summing debit/credit per group.
 * Used for the "summary" display mode.
 *
 * Returns an empty array if `showMode !== "summary"`.
 */
export function groupByJournalEntry(
  entries: LedgerEntry[],
  showMode: ShowMode
): LedgerSummaryGroup[] {
  if (showMode !== "summary") return [];

  const map = new Map<string, LedgerSummaryGroup>();
  for (const entry of entries) {
    const existing = map.get(entry.journal_entry_id);
    if (existing) {
      existing.debit += entry.debit;
      existing.credit += entry.credit;
      existing.lines.push(entry);
    } else {
      map.set(entry.journal_entry_id, {
        entryNumber: entry.entry_number,
        date: entry.date,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        lines: [entry],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Produce the next filter state when the user changes the fiscal year.
 * Resets fromDate/toDate to the FY range.
 */
export function withFiscalYear(
  filters: LedgerFilters,
  fy: string
): Partial<LedgerFilters> {
  const range = FY_RANGES[fy];
  if (!range) return { fiscalYear: fy };
  return { fiscalYear: fy, fromDate: range.start, toDate: range.end };
}

/**
 * Produce the next filter state when the user changes the selected account.
 * Resets linkedLedger to "none" because the linked set depends on the
 * selected account.
 */
export function withSelectedAccount(
  filters: LedgerFilters,
  accountId: string
): Partial<LedgerFilters> {
  return { selectedAccount: accountId, linkedLedger: "none" };
}
