/**
 * Unit tests for the pure ledgerInquiryService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/ledgerInquiryService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  selectValueToAccount,
  accountToSelectValue,
  accountToLedgerParam,
  formatAmount,
  formatBalance,
  getEmptyStateMessage,
  searchLedgerEntries,
} from "../ledgerInquiryService";
import type { LedgerEntry } from "@/hooks/useFinance";

// ─── fixtures ────────────────────────────────────────────────────────

const entries: LedgerEntry[] = [
  { id: "le1", account_id: "a1", account_code: "1000", account_name: "Cash", date: "2024-08-01", description: "Open", debit: 100, credit: 0, running_balance: 100, journal_entry_id: "je1", entry_number: "JE-001" },
  { id: "le2", account_id: "a1", account_code: "1000", account_name: "Cash", date: "2024-08-05", description: "Receipt", debit: 50, credit: 0, running_balance: 150, journal_entry_id: "je2", entry_number: "JE-002" },
  { id: "le3", account_id: "a2", account_code: "2000", account_name: "AP", date: "2024-08-10", description: "Pay vendor", debit: 0, credit: 200, running_balance: -200, journal_entry_id: "je3", entry_number: "JE-003" },
];

// ─── tests ───────────────────────────────────────────────────────────

describe("selectValueToAccount", () => {
  it("returns null for 'all'", () => {
    expect(selectValueToAccount("all")).toBeNull();
  });

  it("returns the account id for any other value", () => {
    expect(selectValueToAccount("a1")).toBe("a1");
    expect(selectValueToAccount("abc-123")).toBe("abc-123");
  });
});

describe("accountToSelectValue", () => {
  it("returns 'all' for null", () => {
    expect(accountToSelectValue(null)).toBe("all");
  });

  it("returns the account id for a string", () => {
    expect(accountToSelectValue("a1")).toBe("a1");
  });
});

describe("accountToLedgerParam", () => {
  it("returns undefined for null", () => {
    expect(accountToLedgerParam(null)).toBeUndefined();
  });

  it("returns the account id for a string", () => {
    expect(accountToLedgerParam("a1")).toBe("a1");
  });
});

describe("formatAmount", () => {
  it("returns '-' for zero", () => {
    expect(formatAmount(0)).toBe("-");
  });

  it("returns '-' for negative values", () => {
    expect(formatAmount(-50)).toBe("-");
  });

  it("returns $-prefixed string for positive values", () => {
    expect(formatAmount(100)).toBe("$100.00");
    expect(formatAmount(99.99)).toBe("$99.99");
  });
});

describe("formatBalance", () => {
  it("returns $0.00 for zero", () => {
    expect(formatBalance(0)).toBe("$0.00");
  });

  it("returns $-prefixed string for positive values", () => {
    expect(formatBalance(150)).toBe("$150.00");
  });

  it("returns $-prefixed string for negative values", () => {
    expect(formatBalance(-200)).toBe("$-200.00");
  });
});

describe("getEmptyStateMessage", () => {
  it("returns empty string when entries exist", () => {
    expect(getEmptyStateMessage(true, null)).toBe("");
    expect(getEmptyStateMessage(true, "a1")).toBe("");
  });

  it("returns the generic message when no account is selected", () => {
    expect(getEmptyStateMessage(false, null)).toBe(
      "No ledger entries found. Post some journal entries first."
    );
  });

  it("returns the account-specific message when an account is selected", () => {
    expect(getEmptyStateMessage(false, "a1")).toBe(
      "No ledger entries found for this account."
    );
  });
});

describe("searchLedgerEntries", () => {
  it("returns the input unchanged for an empty query", () => {
    expect(searchLedgerEntries(entries, "")).toBe(entries);
    expect(searchLedgerEntries(entries, "   ")).toBe(entries); // not lowered/trimmed
  });

  it("matches entry_number case-insensitively", () => {
    const result = searchLedgerEntries(entries, "je-001");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("le1");
  });

  it("matches description case-insensitively", () => {
    const result = searchLedgerEntries(entries, "receipt");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("le2");
  });

  it("matches account_code case-insensitively", () => {
    const result = searchLedgerEntries(entries, "2000");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("le3");
  });

  it("matches account_name case-insensitively", () => {
    const result = searchLedgerEntries(entries, "cash");
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["le1", "le2"]);
  });

  it("returns empty array when no entries match", () => {
    expect(searchLedgerEntries(entries, "zzz")).toEqual([]);
  });

  it("returns all entries when query matches all", () => {
    // All entries have JE- in their entry_number
    expect(searchLedgerEntries(entries, "je-")).toHaveLength(3);
  });
});
