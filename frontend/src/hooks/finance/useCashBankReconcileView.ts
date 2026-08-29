/**
 * React hook that wires the pure `cashBankReconcileService` to Supabase +
 * TanStack Query + local UI state.
 *
 * Extracted from `src/components/finance/transactions/CashBankReconcileService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 *
 * Responsibilities:
 *   - Owns filter state (useState) and the reconciled-id set.
 *   - Fetches accounts + ledger entries via existing finance hooks.
 *   - Delegates all computation to pure functions in
 *     `cashBankReconcileService.ts`.
 *   - Returns a flat, component-ready view model.
 */

import { useState, useMemo, useCallback } from "react";
import { useAccounts, useLedger } from "@/hooks/useFinance";
import {
  type ReconcileFilters,
  type ReconciliationSummary,
  makeDefaultFilters,
  selectCashBankAccounts,
  toggleInSet,
  computeReconciliationSummary,
  isBalanced,
  getReconcileStatus,
  withFiscalYear,
} from "@/lib/finance/cashBankReconcileService";
import type { Account, LedgerEntry } from "@/hooks/useFinance";

export interface UseCashBankReconcileViewReturn {
  // ─── filter state ─────────────────────────────────────────────────
  filters: ReconcileFilters;
  setFiscalYear: (fy: string) => void;
  setSelectedAccount: (id: string) => void;
  setStatementDate: (d: string) => void;
  setFromDate: (d: string) => void;
  setToDate: (d: string) => void;
  toggleFilterPanel: () => void;
  search: () => void;
  cancel: () => void;
  showFilter: boolean;

  // ─── reconciliation state ────────────────────────────────────────
  reconciledIds: Set<string>;
  toggleReconciled: (id: string) => void;
  statementBalance: string;
  setStatementBalance: (s: string) => void;

  // ─── data ─────────────────────────────────────────────────────────
  cashBankAccounts: Account[];
  ledgerEntries: LedgerEntry[];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  summary: ReconciliationSummary;
  balanced: boolean;
  getEntryStatus: (entry: LedgerEntry) => "reconciled" | "pending";
}

export function useCashBankReconcileView(): UseCashBankReconcileViewReturn {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = makeDefaultFilters(today);

  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(defaults.fiscalYear);
  const [selectedAccount, setSelectedAccount] = useState<string>(
    defaults.selectedAccount
  );
  const [statementDate, setStatementDate] = useState(defaults.statementDate);
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);
  const [applied, setApplied] = useState(false);
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());
  const [statementBalance, setStatementBalance] = useState<string>("0");

  // ─── data fetching ────────────────────────────────────────────────
  const { data: accounts = [] } = useAccounts();
  const accountId = selectedAccount !== "none" ? selectedAccount : undefined;
  const { data: ledgerEntries = [], isLoading } = useLedger(
    applied ? accountId : undefined,
    applied ? { startDate: fromDate, endDate: toDate } : undefined
  );

  // ─── derived state ────────────────────────────────────────────────
  const cashBankAccounts = useMemo(
    () => selectCashBankAccounts(accounts),
    [accounts]
  );

  const summary = useMemo(
    () =>
      computeReconciliationSummary(ledgerEntries, reconciledIds, statementBalance),
    [ledgerEntries, reconciledIds, statementBalance]
  );

  const balanced = useMemo(() => isBalanced(summary), [summary]);

  const getEntryStatus = useCallback(
    (entry: LedgerEntry) => getReconcileStatus(entry, reconciledIds),
    [reconciledIds]
  );

  // ─── action callbacks ─────────────────────────────────────────────
  const setFiscalYearWithRange = useCallback((fy: string) => {
    const patch = withFiscalYear({} as ReconcileFilters, fy);
    setFiscalYear(patch.fiscalYear ?? fy);
    if (patch.fromDate) setFromDate(patch.fromDate);
    if (patch.toDate) setToDate(patch.toDate);
  }, []);

  const toggleReconciled = useCallback((id: string) => {
    setReconciledIds((prev) => toggleInSet(prev, id));
  }, []);

  const toggleFilterPanel = useCallback(() => setShowFilter((s) => !s), []);

  const search = useCallback(() => {
    setApplied(true);
    setReconciledIds(new Set());
  }, []);

  const cancel = useCallback(() => setShowFilter(false), []);

  const filters: ReconcileFilters = {
    fiscalYear,
    selectedAccount,
    statementDate,
    fromDate,
    toDate,
    applied,
  };

  return {
    filters,
    setFiscalYear: setFiscalYearWithRange,
    setSelectedAccount,
    setStatementDate,
    setFromDate,
    setToDate,
    toggleFilterPanel,
    search,
    cancel,
    showFilter,
    reconciledIds,
    toggleReconciled,
    statementBalance,
    setStatementBalance,
    cashBankAccounts,
    ledgerEntries,
    isLoading,
    summary,
    balanced,
    getEntryStatus: getEntryStatus,
  };
}
