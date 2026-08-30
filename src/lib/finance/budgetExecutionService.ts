/**
 * Pure business-logic layer for the Budget Execution view.
 *
 * Extracted from `src/components/finance/transactions/BudgetExecutionService.tsx`
 * as the fourth worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions: same inputs → same outputs, no side effects.
 *   - The "expense aggregation by category as a proxy for department
 *     budgets" heuristic is made explicit and testable.
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Minimal shape of a budget needed for execution tracking.
 * Mirrors `Budget` from `useBudgets`.
 */
export interface BudgetForExecution {
  id: string;
  status: string; // "active" | "draft" | "closed" | ...
  total_amount: number;
}

/**
 * Minimal shape of an expense needed for budget execution.
 */
export interface ExpenseForBudget {
  amount: number;
  category: string;
  status: string; // "paid" | "approved" | "draft" | ...
}

export interface BudgetSummary {
  /** The active (or first) budget, or null if none exists. */
  activeBudget: BudgetForExecution | null;
  /** Total budgeted amount from the active budget. */
  totalBudgeted: number;
  /** Total actual spend across all qualifying expenses. */
  totalActual: number;
  /** totalBudgeted - totalActual. Positive = under budget. */
  variance: number;
  /** (totalActual / totalBudgeted) * 100, or 0 if no budget. */
  utilization: number;
}

export interface DepartmentVariance {
  dept: string;
  /** Even split of total budget across departments (matching original heuristic). */
  budgeted: number;
  actual: number;
  variance: number;
  status: "Under" | "Over";
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Aggregate expenses by category, summing amounts.
 *
 * Only expenses with status "paid" or "approved" are included (matching
 * the original component's filter).
 */
export function aggregateExpensesByCategory(
  expenses: ExpenseForBudget[]
): Record<string, number> {
  return expenses
    .filter((e) => e.status === "paid" || e.status === "approved")
    .reduce<Record<string, number>>((acc, e) => {
      const cat = e.category || "uncategorized";
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {});
}

/**
 * Select the active budget: the first budget with status "active",
 * or fall back to the first budget in the list, or null.
 */
export function selectActiveBudget(
  budgets: BudgetForExecution[]
): BudgetForExecution | null {
  if (budgets.length === 0) return null;
  return budgets.find((b) => b.status === "active") || budgets[0];
}

/**
 * Compute the high-level budget summary (totals + variance + utilization).
 */
export function computeBudgetSummary(
  budgets: BudgetForExecution[],
  expenses: ExpenseForBudget[]
): BudgetSummary {
  const activeBudget = selectActiveBudget(budgets);
  const totalBudgeted = activeBudget?.total_amount || 0;
  const byCategory = aggregateExpensesByCategory(expenses);
  const totalActual = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const variance = totalBudgeted - totalActual;
  const utilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  return { activeBudget, totalBudgeted, totalActual, variance, utilization };
}

/**
 * Compute per-department variance.
 *
 * The "budgeted" amount per department is an even split of the total
 * budget across the number of departments (matching the original
 * component's heuristic). This is a deliberate simplification — when
 * per-department budget lines exist in the DB, replace this function.
 */
export function computeDepartmentVariances(
  budgets: BudgetForExecution[],
  expenses: ExpenseForBudget[]
): DepartmentVariance[] {
  const summary = computeBudgetSummary(budgets, expenses);
  const byCategory = aggregateExpensesByCategory(expenses);
  const numDepts = Object.keys(byCategory).length;
  const perDeptBudget = numDepts > 0 ? summary.totalBudgeted / numDepts : 0;

  return Object.entries(byCategory).map(([dept, actual]) => {
    const variance = perDeptBudget - actual;
    return {
      dept,
      budgeted: perDeptBudget,
      actual,
      variance,
      status: variance >= 0 ? "Under" as const : "Over" as const,
    };
  });
}
