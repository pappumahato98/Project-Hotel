/**
 * React hook that wires the pure `ledgerInquiryService` to Supabase +
 * TanStack Query.
 *
 * Extracted from `src/components/finance/reporting/LedgerInquiryService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 */

import { useState, useCallback } from "react";
import { useAccounts, useLedger } from "@/hooks/useFinance";
import {
  type SelectedAccount,
  selectValueToAccount,
  accountToSelectValue,
  accountToLedgerParam,
} from "@/lib/finance/ledgerInquiryService";
import type { Account, LedgerEntry } from "@/hooks/useFinance";

export interface UseLedgerInquiryViewReturn {
  // ─── filter state ─────────────────────────────────────────────────
  selectedAccountId: SelectedAccount;
  selectValue: string; // for <Select value={...}>
  onSelectChange: (value: string) => void;

  // ─── data ─────────────────────────────────────────────────────────
  accounts: Account[];
  ledgerEntries: LedgerEntry[];
  isLoading: boolean;
}

export function useLedgerInquiryView(): UseLedgerInquiryViewReturn {
  const [selectedAccountId, setSelectedAccountId] =
    useState<SelectedAccount>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: ledgerEntries = [], isLoading } = useLedger(
    accountToLedgerParam(selectedAccountId)
  );

  const onSelectChange = useCallback((value: string) => {
    setSelectedAccountId(selectValueToAccount(value));
  }, []);

  return {
    selectedAccountId,
    selectValue: accountToSelectValue(selectedAccountId),
    onSelectChange,
    accounts,
    ledgerEntries,
    isLoading,
  };
}
