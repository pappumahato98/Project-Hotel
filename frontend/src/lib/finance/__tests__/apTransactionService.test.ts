/**
 * Unit tests for the pure apTransactionService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/apTransactionService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  PO_MATCH_RATE_PERCENT,
  getExpenseStatusBadgeClass,
  formatDollar,
  formatVendorName,
  simulateOcrExtraction,
} from "../apTransactionService";

// ─── tests ───────────────────────────────────────────────────────────

describe("apTransactionService constants", () => {
  it("exports the PO match rate", () => {
    expect(PO_MATCH_RATE_PERCENT).toBe(98);
    expect(PO_MATCH_RATE_PERCENT).toBeGreaterThan(0);
    expect(PO_MATCH_RATE_PERCENT).toBeLessThanOrEqual(100);
  });
});

describe("getExpenseStatusBadgeClass", () => {
  it("returns green classes for 'paid'", () => {
    expect(getExpenseStatusBadgeClass("paid")).toBe("bg-success/20 text-success");
  });

  it("returns blue classes for 'approved'", () => {
    expect(getExpenseStatusBadgeClass("approved")).toBe("bg-blue-500/20 text-blue-400");
  });

  it("returns amber classes for any other status", () => {
    expect(getExpenseStatusBadgeClass("pending")).toBe("bg-amber-500/20 text-amber-400");
    expect(getExpenseStatusBadgeClass("draft")).toBe("bg-amber-500/20 text-amber-400");
    expect(getExpenseStatusBadgeClass("")).toBe("bg-amber-500/20 text-amber-400");
    expect(getExpenseStatusBadgeClass("unknown")).toBe("bg-amber-500/20 text-amber-400");
  });
});

describe("formatDollar", () => {
  it("formats 0 as $0.00", () => {
    expect(formatDollar(0)).toBe("$0.00");
  });

  it("formats positive values with 2 decimals", () => {
    expect(formatDollar(1450.75)).toBe("$1450.75");
    expect(formatDollar(110.5)).toBe("$110.50");
    expect(formatDollar(99.999)).toBe("$100.00"); // rounded
  });

  it("formats negative values with a leading $-", () => {
    expect(formatDollar(-50)).toBe("$-50.00");
  });
});

describe("formatVendorName", () => {
  it("returns 'Operational' for null", () => {
    expect(formatVendorName(null)).toBe("Operational");
  });

  it("returns 'Operational' for undefined", () => {
    expect(formatVendorName(undefined)).toBe("Operational");
  });

  it("returns 'Operational' for empty string", () => {
    expect(formatVendorName("")).toBe("Operational");
  });

  it("returns the vendor name when provided", () => {
    expect(formatVendorName("Sysco Foods Inc.")).toBe("Sysco Foods Inc.");
  });
});

describe("simulateOcrExtraction", () => {
  it("returns an OcrResult with all required fields", () => {
    const result = simulateOcrExtraction();
    expect(result).toHaveProperty("vendor");
    expect(result).toHaveProperty("invoice_num");
    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("amount");
    expect(result).toHaveProperty("tax");
    expect(result).toHaveProperty("category");
  });

  it("returns the expected demo values", () => {
    const result = simulateOcrExtraction();
    expect(result.vendor).toBe("Sysco Foods Inc.");
    expect(result.invoice_num).toBe("INV-88392");
    expect(result.date).toBe("2024-05-14");
    expect(result.amount).toBe(1450.75);
    expect(result.tax).toBe(110.5);
    expect(result.category).toBe("food");
  });

  it("is pure — returns the same values on every call (no side effects)", () => {
    const r1 = simulateOcrExtraction();
    const r2 = simulateOcrExtraction();
    expect(r1).toEqual(r2);
  });

  it("returns a new object each call (no shared reference)", () => {
    const r1 = simulateOcrExtraction();
    const r2 = simulateOcrExtraction();
    expect(r1).not.toBe(r2); // different object references
    expect(r1).toEqual(r2); // but equal values
  });
});
