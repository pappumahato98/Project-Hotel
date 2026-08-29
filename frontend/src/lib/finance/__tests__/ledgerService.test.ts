/**
 * Unit tests for the pure ledgerService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/ledgerService.test.ts
 *
 * These tests deliberately avoid React and Supabase — the service is
 * pure functions over plain data.
 */

import { describe, it, expect } from "vitest";
import {
  FISCAL_YEARS,
  FY_RANGES,
  computeLinkedAccounts,
  filterByLinkedLedger,
  computeSummary,
  groupByJournalEntry,
  withFiscalYear,
  withSelectedAccount,
} from "../ledgerService";
import type {
  Account,
  JournalEntry,
  LedgerEntry,
} from "@/hooks/useFinance";

// ─── fixtures ────────────────────────────────────────────────────────

const accounts: Account[] = [
  { id: "a1", code: "1000", name: "Cash", type: "asset", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a2", code: "2000", name: "AP", type: "liability", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a3", code: "3000", name: "Revenue", type: "revenue", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
  { id: "a4", code: "4000", name: "Expense", type: "expense", parent_id: null, description: null, is_active: true, created_at: "", updated_at: "" },
];

// JE1 hits Cash + AP. JE2 hits Cash + Revenue. JE3 hits AP + Expense.
const journalEntries: JournalEntry[] = [
  {
    id: "je1",
    entry_number: "JE-001",
    date: "2024-08-01",
    description: "Pay vendor",
    reference: null,
    is_posted: true,
    created_by: null,
    created_at: "",
    updated_at: "",
    lines: [
      { id: "l1", journal_entry_id: "je1", account_id: "a1", debit: 100, credit: 0, description: null },
      { id: "l2", journal_entry_id: "je1", account_id: "a2", debit: 0, credit: 100, description: null },
    ],
  },
  {
    id: "je2",
    entry_number: "JE-002",
    date: "2024-08-02",
    description: "Sell stuff",
    reference: null,
    is_posted: true,
    created_by: null,
    created_at: "",
    updated_at: "",
    lines: [
      { id: "l3", journal_entry_id: "je2", account_id: "a1", debit: 200, credit: 0, description: null },
      { id: "l4", journal_entry_id: "je2", account_id: "a3", debit: 0, credit: 200, description: null },
    ],
  },
  {
    id: "je3",
    entry_number: "JE-003",
    date: "2024-08-03",
    description: "Accrue expense",
    reference: null,
    is_posted: true,
    created_by: null,
    created_at: "",
    updated_at: "",
    lines: [
      { id: "l5", journal_entry_id: "je3", account_id: "a4", debit: 50, credit: 0, description: null },
      { id: "l6", journal_entry_id: "je3", account_id: "a2", debit: 0, credit: 50, description: null },
    ],
  },
];

const ledgerEntriesForCash: LedgerEntry[] = [
  { id: "le1", account_id: "a1", account_code: "1000", account_name: "Cash", date: "2024-08-01", description: "Pay vendor", debit: 100, credit: 0, running_balance: 100, journal_entry_id: "je1", entry_number: "JE-001" },
  { id: "le2", account_id: "a1", account_code: "1000", account_name: "Cash", date: "2024-08-02", description: "Sell stuff", debit: 200, credit: 0, running_balance: 300, journal_entry_id: "je2", entry_number: "JE-002" },
];

// ─── tests ───────────────────────────────────────────────────────────

describe("ledgerService constants", () => {
  it("exports 4 fiscal years", () => {
    expect(FISCAL_YEARS).toHaveLength(4);
    expect(FISCAL_YEARS.map((f) => f.value)).toEqual(["2081", "2080", "2079", "2078"]);
  });

  it("every fiscal year has a date range", () => {
    for (const fy of FISCAL_YEARS) {
      expect(FY_RANGES[fy.value]).toBeDefined();
      expect(FY_RANGES[fy.value].start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(FY_RANGES[fy.value].end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("computeLinkedAccounts", () => {
  it("returns [] when accountId is undefined", () => {
    expect(computeLinkedAccounts(journalEntries, undefined, accounts)).toEqual([]);
  });

  it("returns [] when journalEntries is empty", () => {
    expect(computeLinkedAccounts([], "a1", accounts)).toEqual([]);
  });

  it("finds AP and Revenue as linked to Cash", () => {
    // Cash (a1) appears in JE1 (with AP a2) and JE2 (with Revenue a3).
    const linked = computeLinkedAccounts(journalEntries, "a1", accounts);
    const linkedIds = linked.map((a) => a.id).sort();
    expect(linkedIds).toEqual(["a2", "a3"]);
  });

  it("finds Cash and Expense as linked to AP", () => {
    // AP (a2) appears in JE1 (with Cash a1) and JE3 (with Expense a4).
    const linked = computeLinkedAccounts(journalEntries, "a2", accounts);
    const linkedIds = linked.map((a) => a.id).sort();
    expect(linkedIds).toEqual(["a1", "a4"]);
  });

  it("excludes the selected account from the linked set", () => {
    const linked = computeLinkedAccounts(journalEntries, "a1", accounts);
    expect(linked.find((a) => a.id === "a1")).toBeUndefined();
  });
});

describe("filterByLinkedLedger", () => {
  it("returns entries unchanged when linkedLedger is 'none'", () => {
    expect(filterByLinkedLedger(ledgerEntriesForCash, journalEntries, "a1", "none"))
      .toBe(ledgerEntriesForCash);
  });

  it("returns entries unchanged when accountId is undefined", () => {
    expect(filterByLinkedLedger(ledgerEntriesForCash, journalEntries, undefined, "a2"))
      .toBe(ledgerEntriesForCash);
  });

  it("filters to entries whose JE also hits the linked account", () => {
    // Cash ledger entries: le1 (je1, hits AP) and le2 (je2, hits Revenue).
    // Filter to linkedLedger=AP (a2): only je1 contains both Cash and AP.
    const filtered = filterByLinkedLedger(
      ledgerEntriesForCash,
      journalEntries,
      "a1",
      "a2"
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("le1");
  });

  it("returns empty when linkedLedger never co-occurs with selected", () => {
    // Cash never co-occurs with Expense (a4) in any JE.
    const filtered = filterByLinkedLedger(
      ledgerEntriesForCash,
      journalEntries,
      "a1",
      "a4"
    );
    expect(filtered).toEqual([]);
  });
});

describe("computeSummary", () => {
  it("returns zeros for empty input", () => {
    expect(computeSummary([])).toEqual({
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
    });
  });

  it("sums debit and credit and takes last running_balance", () => {
    const s = computeSummary(ledgerEntriesForCash);
    expect(s.totalDebit).toBe(300);
    expect(s.totalCredit).toBe(0);
    expect(s.closingBalance).toBe(300);
  });

  it("handles a single entry", () => {
    const s = computeSummary([ledgerEntriesForCash[0]]);
    expect(s.totalDebit).toBe(100);
    expect(s.closingBalance).toBe(100);
  });
});

describe("groupByJournalEntry", () => {
  it("returns [] when showMode is 'details'", () => {
    expect(groupByJournalEntry(ledgerEntriesForCash, "details")).toEqual([]);
  });

  it("groups entries by journal_entry_id", () => {
    // ledgerEntriesForCash has 2 entries from 2 different JEs.
    const groups = groupByJournalEntry(ledgerEntriesForCash, "summary");
    expect(groups).toHaveLength(2);
    expect(groups[0].entryNumber).toBe("JE-001");
    expect(groups[1].entryNumber).toBe("JE-002");
  });

  it("sums debit/credit within a group when multiple lines share a JE", () => {
    // Construct two ledger entries for the SAME journal entry.
    const entries: LedgerEntry[] = [
      { id: "x1", account_id: "a1", account_code: "1000", account_name: "Cash", date: "2024-08-01", description: "d1", debit: 100, credit: 0, running_balance: 100, journal_entry_id: "jeX", entry_number: "JE-X" },
      { id: "x2", account_id: "a2", account_code: "2000", account_name: "AP", date: "2024-08-01", description: "d1", debit: 0, credit: 100, running_balance: -100, journal_entry_id: "jeX", entry_number: "JE-X" },
    ];
    const groups = groupByJournalEntry(entries, "summary");
    expect(groups).toHaveLength(1);
    expect(groups[0].debit).toBe(100);
    expect(groups[0].credit).toBe(100);
    expect(groups[0].lines).toHaveLength(2);
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

describe("withSelectedAccount", () => {
  it("resets linkedLedger to 'none'", () => {
    const patch = withSelectedAccount({} as any, "a1");
    expect(patch).toEqual({ selectedAccount: "a1", linkedLedger: "none" });
  });
});
