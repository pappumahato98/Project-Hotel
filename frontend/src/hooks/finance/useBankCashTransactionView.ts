/**
 * React hook for the Bank & Cash Transaction view.
 */
import { useState, useMemo } from "react";
import { usePayments, useExpenses } from "@/hooks/useFinanceExtended";
import {
  type BankCashTransaction,
  type BankCashStats,
  type PaymentForBankCash,
  type ExpenseForBankCash,
  buildTransactionList,
  searchTransactions,
  computeBankCashStats,
} from "@/lib/finance/bankCashTransactionService";

export interface UseBankCashTransactionViewReturn {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  transactions: BankCashTransaction[];
  filteredTransactions: BankCashTransaction[];
  stats: BankCashStats;
  isLoading: boolean;
}

export function useBankCashTransactionView(): UseBankCashTransactionViewReturn {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: payments, isLoading: payLoading } = usePayments();
  const { data: expenses, isLoading: expLoading } = useExpenses();

  const transactions = useMemo(
    () =>
      buildTransactionList(
        (payments || []) as PaymentForBankCash[],
        (expenses || []) as ExpenseForBankCash[]
      ),
    [payments, expenses]
  );

  const filteredTransactions = useMemo(
    () => searchTransactions(transactions, searchTerm),
    [transactions, searchTerm]
  );

  const stats = useMemo(
    () => computeBankCashStats(transactions),
    [transactions]
  );

  return {
    searchTerm,
    setSearchTerm,
    transactions,
    filteredTransactions,
    stats,
    isLoading: payLoading || expLoading,
  };
}
