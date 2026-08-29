/**
 * Pure business-logic layer for the Cash & Bank Reconciliation view.
 *
 * Extracted from `src/components/finance/transactions/CashBankReconcileService.tsx`
 * as the second worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - Reuse where possible: `computeReconciliationSummary` shares logic
 *     with `computeSummary` in `ledgerService.ts` but adds the
 *     statement-balance and reconciled-count dimensions.
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

import type { Account, LedgerEntry } from "@/hooks/useFinance";

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

export interface ReconcileFilters {
  fiscalYear: string;
  selectedAccount: string; // "none" or account id
  statementDate: string;
  fromDate: string;
  toDate: string;
  applied: boolean;
}

export interface ReconciliationSummary {
  totalDebit: number;
  totalCredit: number;
  bookBalance: number;
  stmtBal: number;
  reconciledCount: number;
  difference: number;
}

/**
 * Default filters for the reconciliation view. `statementDate` defaults
 * to today (caller must compute), the rest to FY 2081/82.
 */
export function makeDefaultFilters(today: string): ReconcileFilters {
  return {
    fiscalYear: "2081",
    selectedAccount: "none",
    statementDate: today,
    fromDate: FY_RANGES["2081"].start,
    toDate: FY_RANGES["2081"].end,
    applied: false,
  };
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Filter accounts to only Cash/Bank assets.
 *
 * Heuristic: account.type === "asset" AND name or code matches /cash|bank/i.
 * This is the same heuristic used in the original component; promote to a
 * dedicated DB column or tag if reconciliation becomes a first-class
 * concern.
 */
export function selectCashBankAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) =>
      a.type === "asset" &&
      (/cash|bank/i.test(a.name) || /cash|bank/i.test(a.code))
  );
}

/**
 * Toggle a single id within a Set, returning a new Set (immutable).
 *
 * Useful for checkbox state in reconciliation tables.
 */
export function toggleInSet<T>(set: Set<T>, id: T): Set<T> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Compute the reconciliation summary.
 *
 * @param entries ledger entries for the selected account+date range
 * @param reconciledIds set of entry IDs the user has marked reconciled
 * @param statementBalance the balance from the bank statement (string
 *   because it comes from an <Input type="number">; parseFloat inside)
 */
export function computeReconciliationSummary(
  entries: LedgerEntry[],
  reconciledIds: Set<string>,
  statementBalance: string
): ReconciliationSummary {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const bookBalance =
    entries.length > 0
      ? entries[entries.length - 1]?.running_balance ?? 0
      : 0;
  const stmtBal = parseFloat(statementBalance) || 0;
  const reconciledCount = reconciledIds.size;
  const difference = bookBalance - stmtBal;
  return { totalDebit, totalCredit, bookBalance, stmtBal, reconciledCount, difference };
}

/**
 * Determine whether the reconciliation is balanced (difference within
 * 0.01 tolerance for floating-point safety).
 */
export function isBalanced(summary: ReconciliationSummary): boolean {
  return Math.abs(summary.difference) < 0.01;
}

/**
 * Categorize an entry as reconciled or pending, for UI styling.
 */
export function getReconcileStatus(
  entry: LedgerEntry,
  reconciledIds: Set<string>
): "reconciled" | "pending" {
  return reconciledIds.has(entry.id) ? "reconciled" : "pending";
}

/**
 * Produce the next filter state when the user changes the fiscal year.
 * Resets fromDate/toDate to the FY range.
 */
export function withFiscalYear(
  filters: ReconcileFilters,
  fy: string
): Partial<ReconcileFilters> {
  const range = FY_RANGES[fy];
  if (!range) return { fiscalYear: fy };
  return { fiscalYear: fy, fromDate: range.start, toDate: range.end };
}
