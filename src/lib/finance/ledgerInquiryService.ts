/**
 * Pure business-logic layer for the Ledger Inquiry (read-only) view.
 *
 * Extracted from `src/components/finance/reporting/LedgerInquiryService.tsx`
 * as the sixth worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * This view is intentionally minimal — it's a read-only inquiry screen
 * that reuses `useLedger` from `useFinance`. The service layer here
 * exists for consistency with the pattern and to provide a home for
 * future inquiry-specific helpers (e.g. CSV export, search filtering).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - Reuses `LedgerEntry` from `useFinance` rather than redefining it.
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

import type { LedgerEntry } from "@/hooks/useFinance";

// ─── Types ───────────────────────────────────────────────────────────

/**
 * The currently selected account filter.
 * - `null` means "all accounts" (no filter).
 * - A string is a specific account ID.
 */
export type SelectedAccount = string | null;

export interface LedgerInquiryState {
  selectedAccountId: SelectedAccount;
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Convert the select's onValueChange value to a SelectedAccount.
 *
 * The `<Select>` component uses the string "all" to represent "no filter";
 * internally we use `null`. This helper centralizes the conversion so the
 * component doesn't need to know about the convention.
 */
export function selectValueToAccount(value: string): SelectedAccount {
  return value === "all" ? null : value;
}

/**
 * Convert a SelectedAccount back to the select's string value.
 */
export function accountToSelectValue(account: SelectedAccount): string {
  return account ?? "all";
}

/**
 * The account ID to pass to `useLedger`, or `undefined` to fetch all.
 *
 * `useLedger`'s signature uses `undefined` (not `null`) to mean "all
 * accounts" — this helper bridges that gap.
 */
export function accountToLedgerParam(account: SelectedAccount): string | undefined {
  return account ?? undefined;
}

/**
 * Format a debit/credit value for display in the table.
 *
 * Returns "-" for zero values (matching the original component's
 * behavior) and a `$`-prefixed string otherwise.
 */
export function formatAmount(amount: number): string {
  return amount > 0 ? `$${amount.toFixed(2)}` : "-";
}

/**
 * Format a running balance for display.
 *
 * Always `$`-prefixed (even when zero), to match the original component.
 */
export function formatBalance(balance: number): string {
  return `$${balance.toFixed(2)}`;
}

/**
 * Determine the empty-state message based on whether an account is
 * selected and whether any entries exist.
 */
export function getEmptyStateMessage(
  hasEntries: boolean,
  selectedAccount: SelectedAccount
): string {
  if (hasEntries) return "";
  if (selectedAccount === null) {
    return "No ledger entries found. Post some journal entries first.";
  }
  return "No ledger entries found for this account.";
}

/**
 * Filter ledger entries by a free-text search query across the
 * entry number, description, and account fields.
 *
 * Returns the input array unchanged if `query` is empty.
 *
 * (Not used by the current UI but provided for future search
 * functionality — the original component had no search, but a
 * subsequent enhancement is a natural fit.)
 */
export function searchLedgerEntries(
  entries: LedgerEntry[],
  query: string
): LedgerEntry[] {
  // Treat empty or whitespace-only queries as "no filter" and return the
  // input array unchanged (same reference, so callers can detect no-op).
  if (!query || !query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter((e) =>
    e.entry_number.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.account_code.toLowerCase().includes(q) ||
    e.account_name.toLowerCase().includes(q)
  );
}
