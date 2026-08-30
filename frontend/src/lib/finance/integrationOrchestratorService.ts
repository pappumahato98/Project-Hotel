/**
 * Pure business-logic layer for the Integration Orchestrator view.
 */

export interface PaymentForIntegration {
  id: string;
  payment_date: string;
  payment_number: string;
  payment_method: string;
  amount: number;
}

export interface InvoiceForIntegration {
  id: string;
  invoice_date: string;
  invoice_number: string;
  total: number;
  balance_due: number;
  status: string;
}

export interface ExpenseForIntegration {
  id: string;
  expense_date: string;
  expense_number: string;
  vendor: string | null;
  category: string;
  amount: number;
  status: string;
}

export type EventSource = "PMS" | "AR" | "AP";
export type EventStatus = "synced" | "pending";

export interface FinancialEvent {
  id: string;
  source: EventSource;
  type: string;
  amount: number;
  timestamp: string;
  status: EventStatus;
  details: string;
}

export interface IntegrationStatus {
  name: string;
  status: "Active" | "Idle";
  count: number;
}

/**
 * Build a unified event stream from payments, invoices, and expenses.
 * Returns the most recent `limit` events (default 15), sorted newest first.
 */
export function buildEventStream(
  payments: PaymentForIntegration[],
  invoices: InvoiceForIntegration[],
  expenses: ExpenseForIntegration[],
  limit: number = 15
): FinancialEvent[] {
  const all: FinancialEvent[] = [];

  payments.slice(0, 5).forEach((p) => {
    all.push({
      id: p.id,
      source: "PMS",
      type: "Payment Receipt",
      amount: p.amount,
      timestamp: p.payment_date,
      status: "synced",
      details: `${p.payment_method} - ${p.payment_number}`,
    });
  });

  invoices.slice(0, 5).forEach((inv) => {
    all.push({
      id: inv.id,
      source: "AR",
      type: "Invoice Posted",
      amount: inv.total,
      timestamp: inv.invoice_date,
      status: inv.status === "draft" ? "pending" : "synced",
      details: `${inv.invoice_number} - Balance: $${inv.balance_due.toFixed(2)}`,
    });
  });

  expenses
    .filter((e) => e.status === "paid")
    .slice(0, 5)
    .forEach((exp) => {
      all.push({
        id: exp.id,
        source: "AP",
        type: "Expense Settled",
        amount: exp.amount,
        timestamp: exp.expense_date,
        status: "synced",
        details: `${exp.expense_number} - ${exp.vendor || exp.category}`,
      });
    });

  return all
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Count events by status.
 */
export function countEventsByStatus(
  events: FinancialEvent[]
): { synced: number; pending: number } {
  let synced = 0;
  let pending = 0;
  for (const e of events) {
    if (e.status === "synced") synced++;
    else pending++;
  }
  return { synced, pending };
}

/**
 * Build the integration status list for the sidebar.
 */
export function buildIntegrationStatus(
  invoices: InvoiceForIntegration[],
  expenses: ExpenseForIntegration[],
  payments: PaymentForIntegration[],
  syncedCount: number
): IntegrationStatus[] {
  return [
    {
      name: "Accounts Receivable",
      status: invoices.length > 0 ? "Active" : "Idle",
      count: invoices.length,
    },
    {
      name: "Accounts Payable",
      status: expenses.length > 0 ? "Active" : "Idle",
      count: expenses.length,
    },
    {
      name: "Payment Processing",
      status: payments.length > 0 ? "Active" : "Idle",
      count: payments.length,
    },
    {
      name: "General Ledger",
      status: "Active",
      count: syncedCount,
    },
  ];
}
