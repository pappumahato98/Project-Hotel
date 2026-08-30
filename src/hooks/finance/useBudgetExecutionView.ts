/**
 * React hook that wires the pure `budgetExecutionService` to Supabase +
 * TanStack Query.
 *
 * Extracted from `src/components/finance/transactions/BudgetExecutionService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 */

import { useMemo } from "react";
import { useBudgets } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useFinanceExtended";
import {
  type BudgetSummary,
  type DepartmentVariance,
  computeBudgetSummary,
  computeDepartmentVariances,
} from "@/lib/finance/budgetExecutionService";

export interface UseBudgetExecutionViewReturn {
  // ─── data ─────────────────────────────────────────────────────────
  budgets: ReturnType<typeof useBudgets>["data"];
  expenses: ReturnType<typeof useExpenses>["data"];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  summary: BudgetSummary;
  departments: DepartmentVariance[];
}

export function useBudgetExecutionView(): UseBudgetExecutionViewReturn {
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();

  const summary = useMemo(
    () => computeBudgetSummary(budgets || [], expenses || []),
    [budgets, expenses]
  );

  const departments = useMemo(
    () => computeDepartmentVariances(budgets || [], expenses || []),
    [budgets, expenses]
  );

  return {
    budgets,
    expenses,
    isLoading: budgetsLoading || expensesLoading,
    summary,
    departments,
  };
}
