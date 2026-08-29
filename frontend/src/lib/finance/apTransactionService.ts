/**
 * Pure business-logic layer for the Accounts Payable (AP) view.
 *
 * Extracted from `src/components/finance/transactions/APTransactionService.tsx`
 * as the eighth worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - Encapsulates the OCR result type and the status → badge mapping.
 *   - The OCR simulation is split into a pure `simulateOcrExtraction`
 *     function (returns the data) and a side-effectful wrapper in the
 *     hook (handles the setTimeout + toast). This makes the data
 *     shape testable without dealing with timers.
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Minimal shape of an expense needed for the AP view.
 * Mirrors `Expense` from `useFinanceExtended`.
 */
export interface ExpenseForAP {
  id: string;
  expense_number: string;
  vendor: string | null;
  category: string;
  expense_date: string;
  amount: number;
  status: string; // "paid" | "approved" | "pending" | ...
}

/**
 * The shape of an OCR-extracted invoice.
 *
 * This was previously `any` in the component; we type it here so
 * downstream code is type-safe.
 */
export interface OcrResult {
  vendor: string;
  invoice_num: string;
  date: string; // ISO date string
  amount: number;
  tax: number;
  category: string;
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Map an expense status to the Tailwind classes for its badge.
 *
 * Mapping:
 *   "paid"     → green badge
 *   "approved" → blue badge
 *   other      → amber badge
 *
 * Sibling of `getInvoiceStatusBadgeClass` from `arTransactionService.ts`.
 * If the two diverge, consider extracting a shared helper to
 * `src/lib/finance/shared.ts`.
 */
export function getExpenseStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-success/20 text-success";
    case "approved":
      return "bg-blue-500/20 text-blue-400";
    default:
      return "bg-amber-500/20 text-amber-400";
  }
}

/**
 * Format a dollar amount for display (always 2 decimals, $-prefixed).
 *
 * Same as `formatDollar` in `arTransactionService.ts`. Promote to
 * `src/lib/finance/shared.ts` if a third service needs it.
 */
export function formatDollar(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format a vendor name for display, falling back to "Operational" if
 * the expense has no vendor.
 */
export function formatVendorName(vendor: string | null | undefined): string {
  return vendor || "Operational";
}

/**
 * Produce a simulated OCR result.
 *
 * This is a PURE function — it returns the data but does NOT set state
 * or show a toast. The hook wraps this in a `setTimeout` and manages
 * the side effects.
 *
 * The values are hardcoded to match the original component's demo data.
 * In production this would be replaced by a real OCR API call.
 */
export function simulateOcrExtraction(): OcrResult {
  return {
    vendor: "Sysco Foods Inc.",
    invoice_num: "INV-88392",
    date: "2024-05-14",
    amount: 1450.75,
    tax: 110.5,
    category: "food",
  };
}

/**
 * Simulated PO-matching rate for the "Automated Matching" card.
 *
 * Hardcoded to 98% to match the original component. Promote to a
 * DB-backed setting if real metrics become available.
 */
export const PO_MATCH_RATE_PERCENT = 98;
