/**
 * Pure business-logic layer for the Bank & Cash Transaction view.
 */

export interface PaymentForBankCash {
  id: string;
  payment_date: string;
  payment_number: string;
  payment_method: string;
  amount: number;
}

export interface ExpenseForBankCash {
  id: string;
  expense_date: string;
  expense_number: string;
  vendor: string | null;
  category: string;
  amount: number;
  status: string;
}

export type TransactionType = "credit" | "debit";

export interface BankCashTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  method: string;
  status: string;
}

export interface BankCashStats {
  balance: number;
  totalIn: number;
  totalOut: number;
}

/**
 * Combine payments and paid expenses into a unified transaction list,
 * sorted newest first.
 */
export function buildTransactionList(
  payments: PaymentForBankCash[],
  expenses: ExpenseForBankCash[]
): BankCashTransaction[] {
  const combined: BankCashTransaction[] = [];

  for (const p of payments) {
    combined.push({
      id: p.id,
      date: p.payment_date,
      description: `Receipt: ${p.payment_number}`,
      amount: p.amount,
      type: "credit",
      method: p.payment_method,
      status: "cleared",
    });
  }

  for (const e of expenses) {
    if (e.status !== "paid") continue;
    combined.push({
      id: e.id,
      date: e.expense_date,
      description: `Payment: ${e.expense_number} - ${e.vendor || e.category}`,
      amount: e.amount,
      type: "debit",
      method: "Bank Transfer",
      status: "cleared",
    });
  }

  return combined.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Filter transactions by a free-text search query (matches description or method).
 */
export function searchTransactions(
  transactions: BankCashTransaction[],
  query: string
): BankCashTransaction[] {
  if (!query) return transactions;
  const q = query.toLowerCase();
  return transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(q) ||
      t.method.toLowerCase().includes(q)
  );
}

/**
 * Compute the summary stats: balance, total inflow, total outflow.
 */
export function computeBankCashStats(
  transactions: BankCashTransaction[]
): BankCashStats {
  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.type === "credit") totalIn += t.amount;
    else totalOut += t.amount;
  }
  return {
    balance: totalIn - totalOut,
    totalIn,
    totalOut,
  };
}

/**
 * Format an amount with a sign based on transaction type.
 */
export function formatSignedAmount(amount: number, type: TransactionType): string {
  const sign = type === "credit" ? "+" : "-";
  return `${sign}$${amount.toFixed(2)}`;
}
