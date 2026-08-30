/**
 * Pure business-logic layer for the Accounts Receivable (AR) view.
 *
 * Extracted from `src/components/finance/transactions/ARTransactionService.tsx`
 * as the seventh worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - Encapsulates the status → badge CSS class mapping so it can be
 *     reused by the AP view (which has a similar pattern).
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Minimal shape of an invoice needed for the AR view.
 * Mirrors `Invoice` from `useFinanceExtended`.
 */
export interface InvoiceForAR {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total: number;
  balance_due: number;
  status: string; // "paid" | "partial" | "draft" | "void" | ...
  guest?: { first_name: string; last_name: string } | null;
}

/**
 * Minimal shape of a payment needed for the AR view.
 * Mirrors `Payment` from `useFinanceExtended`.
 */
export interface PaymentForAR {
  id: string;
  payment_number: string;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  amount: number;
}

export type ARTab = "invoices" | "payments";

export interface ARSummary {
  /** Total of all invoices. */
  totalInvoiced: number;
  /** Total outstanding balance across all invoices. */
  totalOutstanding: number;
  /** Count of invoices that are fully paid. */
  paidCount: number;
  /** Count of invoices with a partial balance. */
  partialCount: number;
  /** Count of invoices that are draft or void. */
  otherCount: number;
  /** Total of all payments received. */
  totalPayments: number;
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Map an invoice status to the Tailwind classes for its badge.
 *
 * Returns a string of class names. The mapping is:
 *   "paid"    → green badge
 *   "partial" → amber badge
 *   other     → muted badge
 *
 * Extracted as a pure function so:
 *   1. The mapping is unit-testable.
 *   2. The AP view can reuse the pattern with its own status set.
 *   3. If the design system changes the badge colors, only this
 *      function needs to change.
 */
export function getInvoiceStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-success/20 text-success";
    case "partial":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-muted";
  }
}

/**
 * Format a guest object into a display name, or "Walk-in" if no guest.
 */
export function formatGuestName(
  guest: { first_name: string; last_name: string } | null | undefined
): string {
  if (!guest) return "Walk-in";
  return `${guest.first_name} ${guest.last_name}`;
}

/**
 * Format a dollar amount for display (always 2 decimals, $-prefixed).
 */
export function formatDollar(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Compute the high-level AR summary from invoices + payments.
 */
export function computeARSummary(
  invoices: InvoiceForAR[],
  payments: PaymentForAR[]
): ARSummary {
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const partialCount = invoices.filter((i) => i.status === "partial").length;
  const otherCount = invoices.length - paidCount - partialCount;
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  return {
    totalInvoiced,
    totalOutstanding,
    paidCount,
    partialCount,
    otherCount,
    totalPayments,
  };
}
