/**
 * React hook that wires the pure `taxCalculationService` to Supabase +
 * TanStack Query.
 *
 * Extracted from `src/components/finance/transactions/TaxCalculationService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 *
 * Responsibilities:
 *   - Fetches tax rates, invoices, and expenses via existing finance hooks.
 *   - Delegates all computation to pure functions in `taxCalculationService.ts`.
 *   - Returns a flat, component-ready view model.
 */

import { useMemo } from "react";
import { useTaxRates, useInvoices, useExpenses } from "@/hooks/useFinanceExtended";
import {
  type TaxSummary,
  computeTaxSummary,
} from "@/lib/finance/taxCalculationService";

export interface UseTaxCalculationViewReturn {
  // ─── data ─────────────────────────────────────────────────────────
  taxRates: ReturnType<typeof useTaxRates>["data"];
  invoices: ReturnType<typeof useInvoices>["data"];
  expenses: ReturnType<typeof useExpenses>["data"];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  summary: TaxSummary;
}

export function useTaxCalculationView(): UseTaxCalculationViewReturn {
  const { data: taxRates, isLoading: taxRatesLoading } = useTaxRates();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();

  const summary = useMemo(
    () => computeTaxSummary(invoices || [], expenses || []),
    [invoices, expenses]
  );

  return {
    taxRates,
    invoices,
    expenses,
    isLoading: taxRatesLoading || invoicesLoading || expensesLoading,
    summary,
  };
}
