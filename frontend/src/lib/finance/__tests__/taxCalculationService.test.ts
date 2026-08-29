/**
 * Unit tests for the pure taxCalculationService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/taxCalculationService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  INPUT_TAX_RATE,
  BALANCED_THRESHOLD,
  computeOutputTax,
  computeInputTax,
  computeTaxSummary,
  isBalanced,
} from "../taxCalculationService";
import type { InvoiceForTax, ExpenseForTax } from "../taxCalculationService";

// ─── fixtures ────────────────────────────────────────────────────────

const invoices: InvoiceForTax[] = [
  { tax_amount: 130 }, // 13% of 1000
  { tax_amount: 65 },  // 13% of 500
  { tax_amount: 0 },   // tax-exempt
  { tax_amount: 26 },  // 13% of 200
];

const expenses: ExpenseForTax[] = [
  { amount: 1000, status: "paid" },     // input tax = 130
  { amount: 500, status: "paid" },      // input tax = 65
  { amount: 200, status: "approved" },  // filtered out (not paid)
  { amount: 300, status: "draft" },     // filtered out
  { amount: 100, status: "paid" },      // input tax = 13
];

// ─── tests ───────────────────────────────────────────────────────────

describe("taxCalculationService constants", () => {
  it("exports the Nepal VAT rate (13%)", () => {
    expect(INPUT_TAX_RATE).toBe(0.13);
  });

  it("exports a balanced threshold", () => {
    expect(BALANCED_THRESHOLD).toBeGreaterThan(0);
    expect(BALANCED_THRESHOLD).toBeLessThanOrEqual(0.01);
  });
});

describe("computeOutputTax", () => {
  it("returns 0 for empty input", () => {
    expect(computeOutputTax([])).toBe(0);
  });

  it("sums tax_amount across all invoices", () => {
    expect(computeOutputTax(invoices)).toBe(221); // 130 + 65 + 0 + 26
  });

  it("treats undefined tax_amount as 0", () => {
    const inv = [{ tax_amount: undefined as unknown as number }];
    expect(computeOutputTax(inv)).toBe(0);
  });
});

describe("computeInputTax", () => {
  it("returns 0 for empty input", () => {
    expect(computeInputTax([])).toBe(0);
  });

  it("only includes paid expenses", () => {
    // paid: 1000 + 500 + 100 = 1600; input tax = 1600 * 0.13 = 208
    expect(computeInputTax(expenses)).toBe(208);
  });

  it("applies the default 13% rate", () => {
    const paid = [{ amount: 1000, status: "paid" }];
    expect(computeInputTax(paid)).toBe(130);
  });

  it("accepts a custom rate", () => {
    const paid = [{ amount: 1000, status: "paid" }];
    expect(computeInputTax(paid, 0.05)).toBe(50); // 5%
    expect(computeInputTax(paid, 0)).toBe(0); // 0% (tax-exempt entity)
  });

  it("treats undefined amount as 0", () => {
    const exp = [{ amount: undefined as unknown as number, status: "paid" }];
    expect(computeInputTax(exp)).toBe(0);
  });
});

describe("computeTaxSummary", () => {
  it("returns zeros for empty inputs", () => {
    const s = computeTaxSummary([], []);
    expect(s).toEqual({
      outputTax: 0,
      inputTax: 0,
      netLiability: 0,
      direction: "payable",
      absNetLiability: 0,
    });
  });

  it("computes payable when output > input", () => {
    // output = 221, input = 208, net = 13 (positive → payable)
    const s = computeTaxSummary(invoices, expenses);
    expect(s.outputTax).toBe(221);
    expect(s.inputTax).toBe(208);
    expect(s.netLiability).toBe(13);
    expect(s.direction).toBe("payable");
    expect(s.absNetLiability).toBe(13);
  });

  it("computes refundable when input > output", () => {
    // Only one invoice, large paid expense → input > output
    const s = computeTaxSummary(
      [{ tax_amount: 13 }],
      [{ amount: 10000, status: "paid" }] // input = 1300
    );
    expect(s.netLiability).toBe(13 - 1300); // -1287
    expect(s.direction).toBe("refundable");
    expect(s.absNetLiability).toBe(1287);
  });

  it("reports direction as payable when net is exactly 0", () => {
    const s = computeTaxSummary(
      [{ tax_amount: 130 }],
      [{ amount: 1000, status: "paid" }] // input = 130
    );
    expect(s.netLiability).toBe(0);
    expect(s.direction).toBe("payable"); // >= 0 → payable
  });

  it("accepts a custom input-tax rate", () => {
    const s = computeTaxSummary(
      [{ tax_amount: 130 }],
      [{ amount: 1000, status: "paid" }],
      0.05 // 5% → input = 50
    );
    expect(s.inputTax).toBe(50);
    expect(s.netLiability).toBe(80);
    expect(s.direction).toBe("payable");
  });
});

describe("isBalanced", () => {
  it("returns true when netLiability is exactly 0", () => {
    expect(isBalanced({ outputTax: 100, inputTax: 100, netLiability: 0, direction: "payable", absNetLiability: 0 })).toBe(true);
  });

  it("returns true when netLiability is within threshold", () => {
    expect(isBalanced({ outputTax: 100, inputTax: 100, netLiability: 0.005, direction: "payable", absNetLiability: 0.005 })).toBe(true);
    expect(isBalanced({ outputTax: 100, inputTax: 100, netLiability: -0.009, direction: "refundable", absNetLiability: 0.009 })).toBe(true);
  });

  it("returns false when netLiability exceeds threshold", () => {
    expect(isBalanced({ outputTax: 100, inputTax: 99, netLiability: 1, direction: "payable", absNetLiability: 1 })).toBe(false);
  });
});
