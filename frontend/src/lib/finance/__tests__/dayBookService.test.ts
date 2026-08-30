/**
 * Unit tests for dayBookService.
 */
import { describe, it, expect } from "vitest";
import {
  matchesVoucherType,
  extractVoucherType,
  computeEntryTotals,
  computeDayBookTotals,
  filterByVoucherType,
  type JournalEntryForDayBook,
} from "../dayBookService";

const entries: JournalEntryForDayBook[] = [
  { id: "e1", entry_number: "JE-001", date: "2025-01-01", description: "Journal 1", is_posted: true, lines: [{ debit: 100, credit: 0 }, { debit: 0, credit: 100 }] },
  { id: "e2", entry_number: "RV-002", date: "2025-01-02", description: "Receipt 1", is_posted: true, lines: [{ debit: 500, credit: 0 }, { debit: 0, credit: 500 }] },
  { id: "e3", entry_number: "PV-003", date: "2025-01-03", description: "Payment 1", is_posted: false, lines: [{ debit: 200, credit: 0 }] },
  { id: "e4", entry_number: "CV-004", date: "2025-01-04", description: "Contra 1", is_posted: true, lines: [{ debit: 0, credit: 300 }] },
];

describe("matchesVoucherType", () => {
  it("returns true for 'all'", () => {
    expect(matchesVoucherType("JE-001", "all")).toBe(true);
    expect(matchesVoucherType("anything", "all")).toBe(true);
  });

  it("matches journal vouchers (JE/JV)", () => {
    expect(matchesVoucherType("JE-001", "journal")).toBe(true);
    expect(matchesVoucherType("jv-002", "journal")).toBe(true);
    expect(matchesVoucherType("RV-001", "journal")).toBe(false);
  });

  it("matches receipt vouchers (RV/RC)", () => {
    expect(matchesVoucherType("RV-001", "receipt")).toBe(true);
    expect(matchesVoucherType("rc-002", "receipt")).toBe(true);
    expect(matchesVoucherType("PV-001", "receipt")).toBe(false);
  });

  it("matches payment vouchers (PV/PY)", () => {
    expect(matchesVoucherType("PV-001", "payment")).toBe(true);
    expect(matchesVoucherType("py-002", "payment")).toBe(true);
  });

  it("matches contra vouchers (CV/CT)", () => {
    expect(matchesVoucherType("CV-001", "contra")).toBe(true);
    expect(matchesVoucherType("ct-002", "contra")).toBe(true);
  });
});

describe("extractVoucherType", () => {
  it("extracts the prefix before the dash", () => {
    expect(extractVoucherType("JE-001")).toBe("JE");
    expect(extractVoucherType("RV-002")).toBe("RV");
  });

  it("returns JV as fallback for entries without a dash", () => {
    expect(extractVoucherType("001")).toBe("JV");
    expect(extractVoucherType("")).toBe("JV");
  });
});

describe("computeEntryTotals", () => {
  it("sums debit and credit across lines", () => {
    const totals = computeEntryTotals(entries[0]);
    expect(totals.debit).toBe(100);
    expect(totals.credit).toBe(100);
  });

  it("returns zeros for entries with no lines", () => {
    const totals = computeEntryTotals({ ...entries[0], lines: undefined });
    expect(totals.debit).toBe(0);
    expect(totals.credit).toBe(0);
  });

  it("treats undefined amounts as 0", () => {
    const totals = computeEntryTotals({
      ...entries[0],
      lines: [{ debit: undefined as unknown as number, credit: undefined as unknown as number }],
    });
    expect(totals.debit).toBe(0);
    expect(totals.credit).toBe(0);
  });
});

describe("computeDayBookTotals", () => {
  it("sums all entries", () => {
    const totals = computeDayBookTotals(entries);
    // debits: 100 + 500 + 200 + 0 = 800
    // credits: 100 + 500 + 0 + 300 = 900
    expect(totals.totalDebit).toBe(800);
    expect(totals.totalCredit).toBe(900);
    expect(totals.count).toBe(4);
  });

  it("returns zeros for empty array", () => {
    expect(computeDayBookTotals([])).toEqual({ totalDebit: 0, totalCredit: 0, count: 0 });
  });
});

describe("filterByVoucherType", () => {
  it("returns all entries for 'all'", () => {
    expect(filterByVoucherType(entries, "all")).toHaveLength(4);
  });

  it("filters to journal only", () => {
    const filtered = filterByVoucherType(entries, "journal");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("e1");
  });

  it("filters to receipt only", () => {
    const filtered = filterByVoucherType(entries, "receipt");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("e2");
  });

  it("filters to payment only", () => {
    const filtered = filterByVoucherType(entries, "payment");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("e3");
  });

  it("filters to contra only", () => {
    const filtered = filterByVoucherType(entries, "contra");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("e4");
  });
});
