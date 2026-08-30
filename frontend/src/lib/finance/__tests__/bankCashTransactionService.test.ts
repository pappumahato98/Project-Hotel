/**
 * Unit tests for bankCashTransactionService.
 */
import { describe, it, expect } from "vitest";
import {
  buildTransactionList,
  searchTransactions,
  computeBankCashStats,
  formatSignedAmount,
  type PaymentForBankCash,
  type ExpenseForBankCash,
} from "../bankCashTransactionService";

const payments: PaymentForBankCash[] = [
  { id: "p1", payment_date: "2025-01-03", payment_number: "PAY-001", payment_method: "cash", amount: 1000 },
  { id: "p2", payment_date: "2025-01-01", payment_number: "PAY-002", payment_method: "card", amount: 500 },
];

const expenses: ExpenseForBankCash[] = [
  { id: "e1", expense_date: "2025-01-02", expense_number: "EXP-001", vendor: "Staples", category: "office", amount: 200, status: "paid" },
  { id: "e2", expense_date: "2025-01-05", expense_number: "EXP-002", vendor: null, category: "utilities", amount: 300, status: "pending" },
];

describe("buildTransactionList", () => {
  it("combines payments and paid expenses", () => {
    const txns = buildTransactionList(payments, expenses);
    // 2 payments + 1 paid expense (e2 is pending, filtered)
    expect(txns).toHaveLength(3);
  });

  it("sorts newest first", () => {
    const txns = buildTransactionList(payments, expenses);
    expect(txns[0].date).toBe("2025-01-03");
    expect(txns[txns.length - 1].date).toBe("2025-01-01");
  });

  it("marks payments as credit type", () => {
    const txns = buildTransactionList(payments, []);
    expect(txns.every((t) => t.type === "credit")).toBe(true);
  });

  it("marks expenses as debit type", () => {
    const txns = buildTransactionList([], expenses);
    expect(txns.every((t) => t.type === "debit")).toBe(true);
  });

  it("returns empty array for empty inputs", () => {
    expect(buildTransactionList([], [])).toEqual([]);
  });
});

describe("searchTransactions", () => {
  const txns = buildTransactionList(payments, expenses);

  it("returns all transactions for empty query", () => {
    expect(searchTransactions(txns, "")).toHaveLength(3);
  });

  it("filters by description (case-insensitive)", () => {
    const filtered = searchTransactions(txns, "receipt");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.description.includes("Receipt"))).toBe(true);
  });

  it("filters by method (case-insensitive)", () => {
    const filtered = searchTransactions(txns, "cash");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].method).toBe("cash");
  });

  it("returns empty array when no matches", () => {
    expect(searchTransactions(txns, "nonexistent")).toEqual([]);
  });
});

describe("computeBankCashStats", () => {
  it("computes balance, inflow, and outflow", () => {
    const txns = buildTransactionList(payments, expenses);
    const stats = computeBankCashStats(txns);
    // inflow: 1000 + 500 = 1500
    // outflow: 200 (only paid expense)
    expect(stats.totalIn).toBe(1500);
    expect(stats.totalOut).toBe(200);
    expect(stats.balance).toBe(1300);
  });

  it("returns zeros for empty array", () => {
    expect(computeBankCashStats([])).toEqual({ balance: 0, totalIn: 0, totalOut: 0 });
  });
});

describe("formatSignedAmount", () => {
  it("prefixes credit with +", () => {
    expect(formatSignedAmount(500, "credit")).toBe("+$500.00");
  });

  it("prefixes debit with -", () => {
    expect(formatSignedAmount(300, "debit")).toBe("-$300.00");
  });

  it("formats with 2 decimals", () => {
    expect(formatSignedAmount(99.999, "credit")).toBe("+$100.00");
  });
});
