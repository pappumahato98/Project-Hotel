/**
 * Unit tests for integrationOrchestratorService.
 */
import { describe, it, expect } from "vitest";
import {
  buildEventStream,
  countEventsByStatus,
  buildIntegrationStatus,
  type PaymentForIntegration,
  type InvoiceForIntegration,
  type ExpenseForIntegration,
} from "../integrationOrchestratorService";

const payments: PaymentForIntegration[] = [
  { id: "p1", payment_date: "2025-01-03", payment_number: "PAY-001", payment_method: "cash", amount: 1000 },
  { id: "p2", payment_date: "2025-01-01", payment_number: "PAY-002", payment_method: "card", amount: 500 },
];

const invoices: InvoiceForIntegration[] = [
  { id: "i1", invoice_date: "2025-01-02", invoice_number: "INV-001", total: 2000, balance_due: 0, status: "paid" },
  { id: "i2", invoice_date: "2025-01-04", invoice_number: "INV-002", total: 800, balance_due: 800, status: "draft" },
];

const expenses: ExpenseForIntegration[] = [
  { id: "e1", expense_date: "2025-01-05", expense_number: "EXP-001", vendor: "Staples", category: "office", amount: 200, status: "paid" },
  { id: "e2", expense_date: "2025-01-06", expense_number: "EXP-002", vendor: null, category: "utilities", amount: 300, status: "pending" },
];

describe("buildEventStream", () => {
  it("returns empty array for empty inputs", () => {
    expect(buildEventStream([], [], [])).toEqual([]);
  });

  it("combines payments, invoices, and paid expenses", () => {
    const events = buildEventStream(payments, invoices, expenses);
    // 2 payments + 2 invoices + 1 paid expense (e2 is pending, filtered out)
    expect(events).toHaveLength(5);
  });

  it("sorts newest first", () => {
    const events = buildEventStream(payments, invoices, expenses);
    // e2 (2025-01-06) is pending, so it's filtered out. The newest is e1 (2025-01-05).
    expect(events[0].timestamp).toBe("2025-01-05");
    expect(events[events.length - 1].timestamp).toBe("2025-01-01");
  });

  it("marks draft invoices as pending, others as synced", () => {
    const events = buildEventStream([], invoices, []);
    const draftEvent = events.find((e) => e.source === "AR" && e.details.includes("INV-002"));
    const paidEvent = events.find((e) => e.source === "AR" && e.details.includes("INV-001"));
    expect(draftEvent?.status).toBe("pending");
    expect(paidEvent?.status).toBe("synced");
  });

  it("limits to the specified count", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      payment_date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      payment_number: `PAY-${i}`,
      payment_method: "cash",
      amount: 100,
    }));
    const events = buildEventStream(many, [], [], 5);
    expect(events).toHaveLength(5);
  });
});

describe("countEventsByStatus", () => {
  it("counts synced and pending events", () => {
    const events = buildEventStream(payments, invoices, expenses);
    const counts = countEventsByStatus(events);
    expect(counts.synced).toBe(4); // 2 payments + 1 paid invoice + 1 paid expense
    expect(counts.pending).toBe(1); // 1 draft invoice
  });

  it("returns zeros for empty array", () => {
    expect(countEventsByStatus([])).toEqual({ synced: 0, pending: 0 });
  });
});

describe("buildIntegrationStatus", () => {
  it("returns 4 integration statuses", () => {
    const statuses = buildIntegrationStatus(invoices, expenses, payments, 5);
    expect(statuses).toHaveLength(4);
    expect(statuses.map((s) => s.name)).toEqual([
      "Accounts Receivable",
      "Accounts Payable",
      "Payment Processing",
      "General Ledger",
    ]);
  });

  it("marks AR as Active when invoices exist", () => {
    const statuses = buildIntegrationStatus(invoices, [], [], 0);
    expect(statuses[0].status).toBe("Active");
    expect(statuses[0].count).toBe(2);
  });

  it("marks AR as Idle when no invoices", () => {
    const statuses = buildIntegrationStatus([], [], [], 0);
    expect(statuses[0].status).toBe("Idle");
    expect(statuses[0].count).toBe(0);
  });

  it("always marks General Ledger as Active", () => {
    const statuses = buildIntegrationStatus([], [], [], 0);
    expect(statuses[3].name).toBe("General Ledger");
    expect(statuses[3].status).toBe("Active");
  });
});
