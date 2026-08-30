/**
 * React hook for the Cash & Bank Reporting view.
 */
import { useMemo } from "react";
import { usePayments, useExpenses } from "@/hooks/useFinanceExtended";
import {
  type CashReportSummary,
  type PaymentForCashReport,
  type ExpenseForCashReport,
  computeCashReport,
} from "@/lib/finance/cashBankReportingService";

export interface UseCashBankReportingViewReturn {
  summary: CashReportSummary;
}

export function useCashBankReportingView(): UseCashBankReportingViewReturn {
  const { data: payments } = usePayments();
  const { data: expenses } = useExpenses({ status: "paid" });

  const summary = useMemo(
    () =>
      computeCashReport(
        (payments || []) as PaymentForCashReport[],
        (expenses || []) as ExpenseForCashReport[]
      ),
    [payments, expenses]
  );

  return { summary };
}
