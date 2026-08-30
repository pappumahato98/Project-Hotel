/**
 * React hook for the Integration Orchestrator view.
 */
import { useMemo } from "react";
import { usePayments, useInvoices, useExpenses } from "@/hooks/useFinanceExtended";
import {
  type FinancialEvent,
  type IntegrationStatus,
  type PaymentForIntegration,
  type InvoiceForIntegration,
  type ExpenseForIntegration,
  buildEventStream,
  countEventsByStatus,
  buildIntegrationStatus,
} from "@/lib/finance/integrationOrchestratorService";

export interface UseIntegrationOrchestratorViewReturn {
  events: FinancialEvent[];
  integrations: IntegrationStatus[];
  syncedCount: number;
  pendingCount: number;
}

export function useIntegrationOrchestratorView(): UseIntegrationOrchestratorViewReturn {
  const { data: payments } = usePayments();
  const { data: invoices } = useInvoices();
  const { data: expenses } = useExpenses();

  const events = useMemo(
    () =>
      buildEventStream(
        (payments || []) as PaymentForIntegration[],
        (invoices || []) as InvoiceForIntegration[],
        (expenses || []) as ExpenseForIntegration[]
      ),
    [payments, invoices, expenses]
  );

  const { synced: syncedCount, pending: pendingCount } = useMemo(
    () => countEventsByStatus(events),
    [events]
  );

  const integrations = useMemo(
    () =>
      buildIntegrationStatus(
        (invoices || []) as InvoiceForIntegration[],
        (expenses || []) as ExpenseForIntegration[],
        (payments || []) as PaymentForIntegration[],
        syncedCount
      ),
    [invoices, expenses, payments, syncedCount]
  );

  return {
    events,
    integrations,
    syncedCount,
    pendingCount,
  };
}
