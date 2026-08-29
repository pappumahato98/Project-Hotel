/**
 * Unit tests for the pure cashBankReconcileService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/cashBankReconcileService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  FISCAL_YEARS,
  FY_RANGES,
  makeDefaultFilters,
  selectCashBankAccounts,
  toggleInSet,
  computeReconciliationSummary,
  isBalanced,
  getReconcileStatus,
  withFiscalYear,
} from "../cashBankReconcileService";
import type {
  Account,
  LedgerEntry,
} from "@/hooks/useFinance";

// ─── fixtures ────────────────────────────────────────────────────────

const accounts: Account[] = [
  { id: "a1", code: "1000", name: "Cash in Hand", type: "asset", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a2", code: "1010", name: "Bank — Nabil", type: "asset", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a3", code: "1200", name: "Accounts Receivable", type: "asset", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a4", code: "2000", name: "Accounts Payable", type: "liability", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a5", code: "BCD", name: "Bank Current Account", type: "asset", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
];

const ledgerEntries: LedgerEntry[] = [
  { id: "le1", account_id: "a1", account_code: "1000", account_name: "Cash in Hand", date: "2024-08-01", description: "Open", debit: 1000, credit: 0, running_balance: 1000, journal_entry_id: "je1", entry_number: "JE-001" },
  { id: "le2", account_id: "a1", account_code: "1000", account_name: "Cash in Hand", date: "2024-08-05", description: "Receipt", debit: 500, credit: 0, running_balance: 1500, journal_entry_id: "je2", entry_number: "JE-002" },
  { id: "le3", account_id: "a1", account_code: "1000", account_name: "Cash in Hand", date: "2024-08-10", description: "Payment", debit: 0, credit: 200, running_balance: 1300, journal_entry_id: "je3", entry_number: "JE-003" },
];

// ─── tests ───────────────────────────────────────────────────────────

describe("cashBankReconcileService constants", () => {
  it("exports 4 fiscal years", () => {
    expect(FISCAL_YEARS).toHaveLength(4);
  });

  it("every fiscal year has a date range", () => {
    for (const fy of FISCAL_YEARS) {
      expect(FY_RANGES[fy.value]).toBeDefined();
    }
  });
});

describe("makeDefaultFilters", () => {
  it("returns FY 2081 with the given today date", () => {
    const f = makeDefaultFilters("2025-03-15");
    expect(f.fiscalYear).toBe("2081");
    expect(f.selectedAccount).toBe("none");
    expect(f.statementDate).toBe("2025-03-15");
    expect(f.fromDate).toBe("2024-07-16");
    expect(f.toDate).toBe("2025-07-15");
    expect(f.applied).toBe(false);
  });
});

describe("selectCashBankAccounts", () => {
  it("includes asset accounts whose name matches /cash|bank/i", () => {
    const result = selectCashBankAccounts(accounts);
    const ids = result.map((a) => a.id).sort();
    expect(ids).toEqual(["a1", "a2", "a5"]);
  });

  it("excludes non-asset accounts even if name matches", () => {
    const result = selectCashBankAccounts(accounts);
    expect(result.find((a) => a.id === "a4")).toBeUndefined(); // AP, liability
  });

  it("excludes asset accounts that don't match the heuristic", () => {
    const result = selectCashBankAccounts(accounts);
    expect(result.find((a) => a.id === "a3")).toBeUndefined(); // AR
  });

  it("matches on code too (BCD = Bank Current Account starts with B-C-D, but actually matches 'Bank' in name)", () => {
    // a5 has code "BCD" (no /cash|bank/i in code) but name "Bank Current Account" matches.
    const result = selectCashBankAccounts(accounts);
    expect(result.find((a) => a.id === "a5")).toBeDefined();
  });
});

describe("toggleInSet", () => {
  it("adds an id not in the set", () => {
    const s = new Set<string>(["a"]);
    const next = toggleInSet(s, "b");
    expect([...next].sort()).toEqual(["a", "b"]);
    // Immutability: original set unchanged.
    expect([...s]).toEqual(["a"]);
  });

  it("removes an id already in the set", () => {
    const s = new Set<string>(["a", "b"]);
    const next = toggleInSet(s, "a");
    expect([...next]).toEqual(["b"]);
    expect([...s].sort()).toEqual(["a", "b"]);
  });

  it("works with numbers", () => {
    const s = new Set<number>([1, 2]);
    const next = toggleInSet(s, 2);
    expect([...next]).toEqual([1]);
  });
});

describe("computeReconciliationSummary", () => {
  it("returns zeros for empty input", () => {
    const s = computeReconciliationSummary([], new Set(), "0");
    expect(s).toEqual({
      totalDebit: 0,
      totalCredit: 0,
      bookBalance: 0,
      stmtBal: 0,
      reconciledCount: 0,
      difference: 0,
    });
  });

  it("sums debit, credit, takes last running_balance as bookBalance", () => {
    const s = computeReconciliationSummary(ledgerEntries, new Set(), "0");
    expect(s.totalDebit).toBe(1500); // 1000 + 500 + 0
    expect(s.totalCredit).toBe(200); // 0 + 0 + 200
    expect(s.bookBalance).toBe(1300); // last running_balance
  });

  it("parses the statementBalance string to a number", () => {
    const s = computeReconciliationSummary(ledgerEntries, new Set(), "1300.00");
    expect(s.stmtBal).toBe(1300);
    expect(s.difference).toBe(0);
  });

  it("treats non-numeric statementBalance as 0", () => {
    const s = computeReconciliationSummary(ledgerEntries, new Set(), "abc");
    expect(s.stmtBal).toBe(0);
    expect(s.difference).toBe(1300);
  });

  it("counts reconciled entries", () => {
    const reconciled = new Set<string>(["le1", "le3"]);
    const s = computeReconciliationSummary(ledgerEntries, reconciled, "0");
    expect(s.reconciledCount).toBe(2);
  });

  it("computes difference = bookBalance - stmtBal", () => {
    const s = computeReconciliationSummary(ledgerEntries, new Set(), "1000");
    expect(s.difference).toBe(300); // 1300 - 1000
  });
});

describe("isBalanced", () => {
  it("returns true when difference is exactly 0", () => {
    expect(isBalanced({ totalDebit: 0, totalCredit: 0, bookBalance: 100, stmtBal: 100, reconciledCount: 0, difference: 0 })).toBe(true);
  });

  it("returns true when difference is within 0.01 tolerance", () => {
    expect(isBalanced({ totalDebit: 0, totalCredit: 0, bookBalance: 100, stmtBal: 100, reconciledCount: 0, difference: 0.005 })).toBe(true);
    expect(isBalanced({ totalDebit: 0, totalCredit: 0, bookBalance: 100, stmtBal: 100, reconciledCount: 0, difference: -0.009 })).toBe(true);
  });

  it("returns false when difference exceeds tolerance", () => {
    expect(isBalanced({ totalDebit: 0, totalCredit: 0, bookBalance: 100, stmtBal: 99, reconciledCount: 0, difference: 1 })).toBe(false);
    expect(isBalanced({ totalDebit: 0, totalCredit: 0, bookBalance: 100, stmtBal: 100.02, reconciledCount: 0, difference: -0.02 })).toBe(false);
  });
});

describe("getReconcileStatus", () => {
  it("returns 'reconciled' for entries in the set", () => {
    const set = new Set<string>(["le1", "le2"]);
    expect(getReconcileStatus(ledgerEntries[0], set)).toBe("reconciled");
    expect(getReconcileStatus(ledgerEntries[1], set)).toBe("reconciled");
  });

  it("returns 'pending' for entries not in the set", () => {
    const set = new Set<string>(["le1"]);
    expect(getReconcileStatus(ledgerEntries[1], set)).toBe("pending");
    expect(getReconcileStatus(ledgerEntries[2], set)).toBe("pending");
  });
});

describe("withFiscalYear", () => {
  it("returns fiscalYear + date range for a known FY", () => {
    const patch = withFiscalYear({} as any, "2080");
    expect(patch.fiscalYear).toBe("2080");
    expect(patch.fromDate).toBe("2023-07-16");
    expect(patch.toDate).toBe("2024-07-15");
  });

  it("returns only fiscalYear for an unknown FY", () => {
    const patch = withFiscalYear({} as any, "9999");
    expect(patch).toEqual({ fiscalYear: "9999" });
  });
});
