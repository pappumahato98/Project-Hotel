/**
 * Pure business-logic layer for the Tax Calculation & Booking view.
 *
 * Extracted from `src/components/finance/transactions/TaxCalculationService.tsx`
 * as the third worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - Encapsulates Nepal VAT rules (13% input tax on paid expenses) so
 *     the rate can be changed in one place.
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 *
 * NOTE: The 13% input-tax rate is hardcoded here as `INPUT_TAX_RATE` to
 * match the original component's behavior. In production this should be
 * configurable per tax rate; see `applyInputTaxRate` for the
 * parameterized version.
 */

// ─── Domain constants ────────────────────────────────────────────────

/**
 * Nepal VAT rate (13%) applied to paid expenses as input tax.
 * Promote to a DB-backed setting if multi-rate support is needed.
 */
export const INPUT_TAX_RATE = 0.13;

/**
 * Threshold below which a net liability is considered "balanced"
 * (floating-point safety).
 */
export const BALANCED_THRESHOLD = 0.01;

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Minimal shape of an invoice needed for output-tax computation.
 * Mirrors the `Invoice` type from `useFinanceExtended` but only the
 * fields we actually read.
 */
export interface InvoiceForTax {
  tax_amount: number;
}

/**
 * Minimal shape of an expense needed for input-tax computation.
 */
export interface ExpenseForTax {
  amount: number;
  status: string; // "paid" | "approved" | "draft" | ...
}

export interface TaxSummary {
  /** Total output tax (sales/VAT collected from customers). */
  outputTax: number;
  /** Total input tax (VAT paid on purchases, estimated at INPUT_TAX_RATE). */
  inputTax: number;
  /** Net liability = outputTax - inputTax. Positive = payable, negative = refundable. */
  netLiability: number;
  /** "payable" if netLiability >= 0, else "refundable". */
  direction: "payable" | "refundable";
  /** Absolute value of netLiability, for display. */
  absNetLiability: number;
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Compute the total output tax from a list of invoices.
 *
 * Output tax = sum of `invoice.tax_amount` across all invoices.
 */
export function computeOutputTax(invoices: InvoiceForTax[]): number {
  return invoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
}

/**
 * Compute the total input tax from a list of expenses.
 *
 * Only expenses with status === "paid" are included (matching the
 * original component's filter). The input tax is estimated as
 * `expense.amount * rate` (default rate = 13%).
 *
 * For a parameterized rate, pass `rate` explicitly:
 *   computeInputTax(expenses, 0.05) // 5% rate
 */
export function computeInputTax(
  expenses: ExpenseForTax[],
  rate: number = INPUT_TAX_RATE
): number {
  return expenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + (e.amount || 0) * rate, 0);
}

/**
 * Compute the full tax summary (output, input, net liability, direction).
 */
export function computeTaxSummary(
  invoices: InvoiceForTax[],
  expenses: ExpenseForTax[],
  inputTaxRate: number = INPUT_TAX_RATE
): TaxSummary {
  const outputTax = computeOutputTax(invoices);
  const inputTax = computeInputTax(expenses, inputTaxRate);
  const netLiability = outputTax - inputTax;
  return {
    outputTax,
    inputTax,
    netLiability,
    direction: netLiability >= 0 ? "payable" : "refundable",
    absNetLiability: Math.abs(netLiability),
  };
}

/**
 * Determine whether the net liability is effectively zero (balanced).
 */
export function isBalanced(summary: TaxSummary): boolean {
  return Math.abs(summary.netLiability) < BALANCED_THRESHOLD;
}
