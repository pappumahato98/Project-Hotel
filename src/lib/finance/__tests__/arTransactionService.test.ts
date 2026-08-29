/**
 * Unit tests for the pure arTransactionService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/arTransactionService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  getInvoiceStatusBadgeClass,
  formatGuestName,
  formatDollar,
  computeARSummary,
} from "../arTransactionService";
import type { InvoiceForAR, PaymentForAR } from "../arTransactionService";

// ─── fixtures ────────────────────────────────────────────────────────

const invoices: InvoiceForAR[] = [
  { id: "i1", invoice_number: "INV-001", invoice_date: "2024-08-01", total: 1000, balance_due: 0, status: "paid", guest: { first_name: "Alice", last_name: "Smith" } },
  { id: "i2", invoice_number: "INV-002", invoice_date: "2024-08-05", total: 500, balance_due: 250, status: "partial", guest: { first_name: "Bob", last_name: "Jones" } },
  { id: "i3", invoice_number: "INV-003", invoice_date: "2024-08-10", total: 300, balance_due: 300, status: "draft", guest: null },
  { id: "i4", invoice_number: "INV-004", invoice_date: "2024-08-15", total: 200, balance_due: 200, status: "void", guest: { first_name: "Carol", last_name: "Doe" } },
];

const payments: PaymentForAR[] = [
  { id: "p1", payment_number: "PAY-001", payment_method: "cash", payment_date: "2024-08-02", reference_number: "REF1", amount: 1000 },
  { id: "p2", payment_number: "PAY-002", payment_method: "card", payment_date: "2024-08-06", reference_number: null, amount: 250 },
];

// ─── tests ───────────────────────────────────────────────────────────

describe("getInvoiceStatusBadgeClass", () => {
  it("returns green classes for 'paid'", () => {
    expect(getInvoiceStatusBadgeClass("paid")).toBe("bg-success/20 text-success");
  });

  it("returns amber classes for 'partial'", () => {
    expect(getInvoiceStatusBadgeClass("partial")).toBe("bg-amber-500/20 text-amber-400");
  });

  it("returns muted classes for any other status", () => {
    expect(getInvoiceStatusBadgeClass("draft")).toBe("bg-muted");
    expect(getInvoiceStatusBadgeClass("void")).toBe("bg-muted");
    expect(getInvoiceStatusBadgeClass("")).toBe("bg-muted");
    expect(getInvoiceStatusBadgeClass("unknown")).toBe("bg-muted");
  });
});

describe("formatGuestName", () => {
  it("returns 'Walk-in' for null guest", () => {
    expect(formatGuestName(null)).toBe("Walk-in");
  });

  it("returns 'Walk-in' for undefined guest", () => {
    expect(formatGuestName(undefined)).toBe("Walk-in");
  });

  it("returns the full name for a guest object", () => {
    expect(formatGuestName({ first_name: "Alice", last_name: "Smith" })).toBe("Alice Smith");
  });
});

describe("formatDollar", () => {
  it("formats 0 as $0.00", () => {
    expect(formatDollar(0)).toBe("$0.00");
  });

  it("formats positive values with 2 decimals", () => {
    expect(formatDollar(100)).toBe("$100.00");
    expect(formatDollar(99.999)).toBe("$100.00"); // rounded
    expect(formatDollar(99.5)).toBe("$99.50");
  });

  it("formats negative values with a leading $-", () => {
    expect(formatDollar(-50)).toBe("$-50.00");
  });
});

describe("computeARSummary", () => {
  it("returns zeros for empty inputs", () => {
    const s = computeARSummary([], []);
    expect(s).toEqual({
      totalInvoiced: 0,
      totalOutstanding: 0,
      paidCount: 0,
      partialCount: 0,
      otherCount: 0,
      totalPayments: 0,
    });
  });

  it("sums invoice totals and balances", () => {
    const s = computeARSummary(invoices, payments);
    expect(s.totalInvoiced).toBe(2000); // 1000 + 500 + 300 + 200
    expect(s.totalOutstanding).toBe(750); // 0 + 250 + 300 + 200
  });

  it("counts invoices by status", () => {
    const s = computeARSummary(invoices, payments);
    expect(s.paidCount).toBe(1); // i1
    expect(s.partialCount).toBe(1); // i2
    expect(s.otherCount).toBe(2); // i3 (draft) + i4 (void)
  });

  it("sums payment amounts", () => {
    const s = computeARSummary(invoices, payments);
    expect(s.totalPayments).toBe(1250); // 1000 + 250
  });

  it("treats undefined amounts as 0", () => {
    const s = computeARSummary(
      [{ id: "x", invoice_number: "X", invoice_date: "", total: undefined as unknown as number, balance_due: undefined as unknown as number, status: "paid" }],
      [{ id: "y", payment_number: "Y", payment_method: "", payment_date: "", reference_number: null, amount: undefined as unknown as number }]
    );
    expect(s.totalInvoiced).toBe(0);
    expect(s.totalOutstanding).toBe(0);
    expect(s.totalPayments).toBe(0);
  });
});
