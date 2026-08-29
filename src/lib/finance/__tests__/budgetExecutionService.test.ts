/**
 * Unit tests for the pure budgetExecutionService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/budgetExecutionService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  aggregateExpensesByCategory,
  selectActiveBudget,
  computeBudgetSummary,
  computeDepartmentVariances,
} from "../budgetExecutionService";
import type {
  BudgetForExecution,
  ExpenseForBudget,
} from "../budgetExecutionService";

// ─── fixtures ────────────────────────────────────────────────────────

const budgets: BudgetForExecution[] = [
  { id: "b1", status: "draft", total_amount: 50000 },
  { id: "b2", status: "active", total_amount: 100000 },
  { id: "b3", status: "closed", total_amount: 80000 },
];

const expenses: ExpenseForBudget[] = [
  { amount: 5000, category: "marketing", status: "paid" },
  { amount: 3000, category: "marketing", status: "approved" },
  { amount: 2000, category: "marketing", status: "draft" }, // excluded
  { amount: 10000, category: "operations", status: "paid" },
  { amount: 4000, category: "operations", status: "approved" },
  { amount: 7000, category: "engineering", status: "paid" },
  { amount: 1000, category: "engineering", status: "rejected" }, // excluded
];

// ─── tests ───────────────────────────────────────────────────────────

describe("aggregateExpensesByCategory", () => {
  it("returns {} for empty input", () => {
    expect(aggregateExpensesByCategory([])).toEqual({});
  });

  it("only includes paid and approved expenses", () => {
    const result = aggregateExpensesByCategory(expenses);
    // marketing: 5000 + 3000 = 8000 (draft excluded)
    // operations: 10000 + 4000 = 14000
    // engineering: 7000 (rejected excluded)
    expect(result).toEqual({
      marketing: 8000,
      operations: 14000,
      engineering: 7000,
    });
  });

  it("groups uncategorized expenses under 'uncategorized'", () => {
    const result = aggregateExpensesByCategory([
      { amount: 100, category: "", status: "paid" },
      { amount: 200, category: "food", status: "paid" },
    ]);
    expect(result).toEqual({ uncategorized: 100, food: 200 });
  });

  it("treats undefined amount as 0", () => {
    const result = aggregateExpensesByCategory([
      { amount: undefined as unknown as number, category: "x", status: "paid" },
      { amount: 100, category: "x", status: "paid" },
    ]);
    expect(result).toEqual({ x: 100 });
  });
});

describe("selectActiveBudget", () => {
  it("returns null for empty input", () => {
    expect(selectActiveBudget([])).toBeNull();
  });

  it("returns the first budget with status 'active'", () => {
    const result = selectActiveBudget(budgets);
    expect(result?.id).toBe("b2");
  });

  it("falls back to the first budget if none is active", () => {
    const noActive = [
      { id: "x1", status: "draft", total_amount: 100 },
      { id: "x2", status: "closed", total_amount: 200 },
    ];
    expect(selectActiveBudget(noActive)?.id).toBe("x1");
  });
});

describe("computeBudgetSummary", () => {
  it("returns zeros for empty inputs", () => {
    const s = computeBudgetSummary([], []);
    expect(s.activeBudget).toBeNull();
    expect(s.totalBudgeted).toBe(0);
    expect(s.totalActual).toBe(0);
    expect(s.variance).toBe(0);
    expect(s.utilization).toBe(0);
  });

  it("computes totals from the active budget", () => {
    const s = computeBudgetSummary(budgets, expenses);
    expect(s.activeBudget?.id).toBe("b2");
    expect(s.totalBudgeted).toBe(100000);
    // totalActual = 8000 + 14000 + 7000 = 29000
    expect(s.totalActual).toBe(29000);
    expect(s.variance).toBe(71000); // 100000 - 29000
    expect(s.utilization).toBeCloseTo(29, 1); // 29000/100000 * 100
  });

  it("reports 0% utilization when there is no budget", () => {
    const s = computeBudgetSummary([], expenses);
    expect(s.utilization).toBe(0);
  });

  it("reports > 100% utilization when actual exceeds budget", () => {
    const smallBudget = [{ id: "b1", status: "active", total_amount: 1000 }];
    const s = computeBudgetSummary(smallBudget, [
      { amount: 2000, category: "x", status: "paid" },
    ]);
    expect(s.utilization).toBe(200);
    expect(s.variance).toBe(-1000);
  });
});

describe("computeDepartmentVariances", () => {
  it("returns [] for empty inputs", () => {
    expect(computeDepartmentVariances([], [])).toEqual([]);
  });

  it("returns [] when there are no qualifying expenses", () => {
    const result = computeDepartmentVariances(budgets, [
      { amount: 100, category: "x", status: "draft" }, // excluded
    ]);
    expect(result).toEqual([]);
  });

  it("splits total budget evenly across departments", () => {
    const result = computeDepartmentVariances(budgets, expenses);
    // 3 departments, total budget 100000, so per-dept = 33333.33
    expect(result).toHaveLength(3);
    for (const d of result) {
      expect(d.budgeted).toBeCloseTo(33333.33, 2);
    }
  });

  it("computes variance and status per department", () => {
    const result = computeDepartmentVariances(budgets, expenses);
    const marketing = result.find((d) => d.dept === "marketing");
    expect(marketing).toBeDefined();
    expect(marketing?.actual).toBe(8000);
    // variance = 33333.33 - 8000 = 25333.33 (positive → Under)
    expect(marketing?.variance).toBeGreaterThan(25000);
    expect(marketing?.status).toBe("Under");
  });

  it("marks department as 'Over' when actual exceeds budgeted", () => {
    const smallBudget = [{ id: "b1", status: "active", total_amount: 100 }];
    const result = computeDepartmentVariances(smallBudget, [
      { amount: 1000, category: "x", status: "paid" },
    ]);
    // per-dept budget = 100 / 1 = 100; actual = 1000; variance = -900 → Over
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("Over");
    expect(result[0].variance).toBe(-900);
  });
});
