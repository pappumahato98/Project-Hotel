/**
 * Unit tests for cashBankReportingService.
 */
import { describe, it, expect } from "vitest";
import {
  computeCashReport,
  formatDollar,
  formatInflow,
  formatOutflow,
  type PaymentForCashReport,
  type ExpenseForCashReport,
} from "../cashBankReportingService";

const payments: PaymentForCashReport[] = [
  { payment_date: "2025-01-03", payment_number: "PAY-001", payment_method: "cash", amount: 1000 },
  { payment_date: "2025-01-01", payment_number: "PAY-002", payment_method: "card", amount: 500 },
];

const expenses: ExpenseForCashReport[] = [
  { expense_date: "2025-01-02", description: "Office supplies", vendor: "Staples", category: "office", amount: 200 },
  { expense_date: "2025-01-04", description: "Utilities", vendor: null, category: "utilities", amount: 300 },
];

describe("computeCashReport", () => {
  it("returns zeros for empty inputs", () => {
    const r = computeCashReport([], []);
    expect(r.totalInflow).toBe(0);
    expect(r.totalOutflow).toBe(0);
    expect(r.balance).toBe(0);
    expect(r.movements).toEqual([]);
  });

  it("combines payments and expenses into movements", () => {
    const r = computeCashReport(payments, expenses);
    expect(r.movements).toHaveLength(4);
  });

  it("computes total inflow and outflow", () => {
    const r = computeCashReport(payments, expenses);
    expect(r.totalInflow).toBe(1500); // 1000 + 500
    expect(r.totalOutflow).toBe(500); // 200 + 300
  });

  it("computes running balance (oldest to newest)", () => {
    const r = computeCashReport(payments, expenses);
    // Oldest first: 01-Jan (+500) → 02-Jan (-200) → 03-Jan (+1000) → 04-Jan (-300)
    // Final balance = 500 - 200 + 1000 - 300 = 1000
    expect(r.balance).toBe(1000);
  });

  it("limits movements to the specified limit", () => {
    const manyPayments = Array.from({ length: 30 }, (_, i) => ({
      payment_date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      payment_number: `PAY-${i}`,
      payment_method: "cash",
      amount: 100,
    }));
    const r = computeCashReport(manyPayments, [], 5);
    expect(r.movements).toHaveLength(5);
  });

  it("sorts movements newest first", () => {
    const r = computeCashReport(payments, expenses);
    expect(r.movements[0].date).toBe("2025-01-04");
    expect(r.movements[3].date).toBe("2025-01-01");
  });
});

describe("formatDollar", () => {
  it("formats with 2 decimals", () => {
    expect(formatDollar(1000)).toBe("$1,000.00");
    expect(formatDollar(0)).toBe("$0.00");
  });
});

describe("formatInflow", () => {
  it("returns formatted dollar for positive values", () => {
    expect(formatInflow(500)).toBe("$500.00");
  });

  it("returns '-' for zero", () => {
    expect(formatInflow(0)).toBe("-");
  });
});

describe("formatOutflow", () => {
  it("returns formatted dollar for positive values", () => {
    expect(formatOutflow(300)).toBe("$300.00");
  });

  it("returns '-' for zero", () => {
    expect(formatOutflow(0)).toBe("-");
  });
});
