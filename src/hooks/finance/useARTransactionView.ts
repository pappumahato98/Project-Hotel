/**
 * React hook that wires the pure `arTransactionService` to Supabase +
 * TanStack Query.
 *
 * Extracted from `src/components/finance/transactions/ARTransactionService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 */

import { useState } from "react";
import { useInvoices, usePayments } from "@/hooks/useFinanceExtended";
import {
  type ARTab,
  type ARSummary,
  computeARSummary,
} from "@/lib/finance/arTransactionService";
import type { InvoiceForAR, PaymentForAR } from "@/lib/finance/arTransactionService";

export interface UseARTransactionViewReturn {
  // ─── UI state ─────────────────────────────────────────────────────
  activeTab: ARTab;
  setActiveTab: (tab: ARTab) => void;

  // ─── data ─────────────────────────────────────────────────────────
  invoices: InvoiceForAR[];
  payments: PaymentForAR[];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  summary: ARSummary;
}

export function useARTransactionView(): UseARTransactionViewReturn {
  const [activeTab, setActiveTab] = useState<ARTab>("invoices");
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: payments, isLoading: payLoading } = usePayments();

  const invoiceList = (invoices || []) as InvoiceForAR[];
  const paymentList = (payments || []) as PaymentForAR[];

  const summary = computeARSummary(invoiceList, paymentList);

  return {
    activeTab,
    setActiveTab,
    invoices: invoiceList,
    payments: paymentList,
    isLoading: invLoading || payLoading,
    summary,
  };
}
