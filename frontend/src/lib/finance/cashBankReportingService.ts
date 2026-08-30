/**
 * Pure business-logic layer for the Cash & Bank Reporting view.
 */

export interface PaymentForCashReport {
  payment_date: string;
  payment_number: string;
  payment_method: string;
  amount: number;
}

export interface ExpenseForCashReport {
  expense_date: string;
  description: string;
  vendor: string | null;
  category: string;
  amount: number;
}

export interface CashMovement {
  date: string;
  desc: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface CashReportSummary {
  movements: CashMovement[]; // top 20, newest first
  totalInflow: number;
  totalOutflow: number;
  balance: number; // running balance
}

/**
 * Build a list of cash movements from payments and expenses, compute
 * running balance, and return the top 20 most recent.
 */
export function computeCashReport(
  payments: PaymentForCashReport[],
  expenses: ExpenseForCashReport[],
  limit: number = 20
): CashReportSummary {
  type Movement = CashMovement;
  const all: Movement[] = [];

  for (const p of payments) {
    all.push({
      date: p.payment_date,
      desc: `Payment ${p.payment_number} (${p.payment_method})`,
      inflow: p.amount,
      outflow: 0,
      balance: 0,
    });
  }

  for (const e of expenses) {
    all.push({
      date: e.expense_date,
      desc: `${e.description} - ${e.vendor || e.category}`,
      inflow: 0,
      outflow: e.amount,
      balance: 0,
    });
  }

  // Sort newest first for the display slice
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalInflow = all.reduce((s, m) => s + m.inflow, 0);
  const totalOutflow = all.reduce((s, m) => s + m.outflow, 0);

  // Compute running balance from oldest to newest
  const sortedAsc = [...all].reverse();
  let running = 0;
  sortedAsc.forEach((m) => {
    running += m.inflow - m.outflow;
    m.balance = running;
  });

  return {
    movements: all.slice(0, limit),
    totalInflow,
    totalOutflow,
    balance: running,
  };
}

/**
 * Format a number as a dollar string.
 */
export function formatDollar(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Format an inflow for display — returns "-" for zero.
 */
export function formatInflow(amount: number): string {
  return amount > 0 ? formatDollar(amount) : "-";
}

/**
 * Format an outflow for display — returns "-" for zero.
 */
export function formatOutflow(amount: number): string {
  return amount > 0 ? formatDollar(amount) : "-";
}
