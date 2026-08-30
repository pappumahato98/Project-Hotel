/**
 * React hook that wires the pure `ledgerService` to Supabase + TanStack Query.
 *
 * Extracted from `src/components/finance/transactions/LedgerTransactionService.tsx`.
 *
 * Responsibilities:
 *   - Owns filter state (useState).
 *   - Fetches accounts, ledger entries, and journal entries via existing
 *     finance hooks (`useAccounts`, `useLedger`, `useJournalEntries`).
 *   - Delegates all computation to pure functions in `ledgerService.ts`.
 *   - Returns a flat, component-ready view model.
 *
 * The component consuming this hook should be ~100 lines of pure JSX.
 */

import { useMemo, useState, useCallback } from "react";
import { useAccounts, useLedger, useJournalEntries } from "@/hooks/useFinance";
import {
  type LedgerFilters,
  type LedgerSummary,
  type LedgerSummaryGroup,
  type ShowMode,
  DEFAULT_FILTERS,
  FY_RANGES,
  computeLinkedAccounts,
  filterByLinkedLedger,
  computeSummary,
  groupByJournalEntry,
  withFiscalYear,
  withSelectedAccount,
} from "@/lib/finance/ledgerService";
import type { Account, LedgerEntry } from "@/hooks/useFinance";

export interface UseLedgerTransactionViewReturn {
  // ─── filter state ─────────────────────────────────────────────────
  filters: LedgerFilters;
  setFiscalYear: (fy: string) => void;
  setFromDate: (d: string) => void;
  setToDate: (d: string) => void;
  setSelectedAccount: (id: string) => void;
  setShowMode: (m: ShowMode) => void;
  setLinkedLedger: (id: string) => void;
  toggleFilterPanel: () => void;
  search: () => void;
  cancel: () => void;

  // ─── data ─────────────────────────────────────────────────────────
  accounts: Account[];
  ledgerEntries: LedgerEntry[];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  linkedAccounts: Account[];
  filteredEntries: LedgerEntry[];
  summary: LedgerSummary;
  summaryGrouped: LedgerSummaryGroup[];
}

export function useLedgerTransactionView(): UseLedgerTransactionViewReturn {
  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(DEFAULT_FILTERS.fiscalYear);
  const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
  const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
  const [selectedAccount, setSelectedAccountRaw] = useState<string>(
    DEFAULT_FILTERS.selectedAccount
  );
  const [showMode, setShowMode] = useState<ShowMode>(DEFAULT_FILTERS.showMode);
  const [linkedLedger, setLinkedLedger] = useState<string>(
    DEFAULT_FILTERS.linkedLedger
  );
  const [applied, setApplied] = useState(false);

  // ─── data fetching ────────────────────────────────────────────────
  const { data: accounts = [] } = useAccounts();
  const accountId = selectedAccount !== "none" ? selectedAccount : undefined;

  const { data: ledgerEntries = [], isLoading } = useLedger(
    applied ? accountId : undefined,
    applied ? { startDate: fromDate, endDate: toDate } : undefined
  );

  const { data: journalEntries = [] } = useJournalEntries(
    applied && accountId ? { startDate: fromDate, endDate: toDate } : undefined
  );

  // ─── derived state (pure computations) ────────────────────────────
  const linkedAccounts = useMemo(
    () => computeLinkedAccounts(journalEntries, accountId, accounts),
    [journalEntries, accountId, accounts]
  );

  const filteredEntries = useMemo(
    () =>
      applied
        ? filterByLinkedLedger(
            ledgerEntries,
            journalEntries,
            accountId,
            linkedLedger
          )
        : ledgerEntries,
    [ledgerEntries, journalEntries, accountId, linkedLedger, applied]
  );

  const summary = useMemo(
    () => computeSummary(filteredEntries),
    [filteredEntries]
  );

  const summaryGrouped = useMemo(
    () => groupByJournalEntry(filteredEntries, showMode),
    [filteredEntries, showMode]
  );

  // ─── action callbacks ─────────────────────────────────────────────
  const setFiscalYearWithRange = useCallback((fy: string) => {
    const patch = withFiscalYear({} as LedgerFilters, fy);
    setFiscalYear(patch.fiscalYear ?? fy);
    if (patch.fromDate) setFromDate(patch.fromDate);
    if (patch.toDate) setToDate(patch.toDate);
  }, []);

  const setSelectedAccountSafe = useCallback((id: string) => {
    // Apply the "reset linkedLedger" policy from the service.
    const patch = withSelectedAccount({} as LedgerFilters, id);
    setSelectedAccountRaw(id);
    if (patch.linkedLedger) setLinkedLedger(patch.linkedLedger);
  }, []);

  const toggleFilterPanel = useCallback(() => setShowFilter((s) => !s), []);
  const search = useCallback(() => setApplied(true), []);
  const cancel = useCallback(() => setShowFilter(false), []);

  const filters: LedgerFilters = {
    fiscalYear,
    fromDate,
    toDate,
    selectedAccount,
    showMode,
    linkedLedger,
    applied,
  };

  return {
    filters,
    setFiscalYear: setFiscalYearWithRange,
    setFromDate,
    setToDate,
    setSelectedAccount: setSelectedAccountSafe,
    setShowMode,
    setLinkedLedger,
    toggleFilterPanel,
    search,
    cancel,
    accounts,
    ledgerEntries,
    isLoading,
    linkedAccounts,
    filteredEntries,
    summary,
    summaryGrouped,
    // NOTE: showFilter is consumed by the component via the toggle callback;
    // we expose it via a separate hook if needed. For now, the component
    // reads it from its own state. (Kept here to keep the API flat.)
  } as UseLedgerTransactionViewReturn & { showFilter: boolean };
}

// Re-export for convenience.
export { FY_RANGES };
