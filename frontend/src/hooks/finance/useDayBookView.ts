/**
 * React hook for the Day Book view.
 */
import { useState, useMemo, useCallback } from "react";
import { useJournalEntries } from "@/hooks/useFinance";
import {
  type VoucherType,
  type JournalEntryForDayBook,
  type DayBookTotals,
  filterByVoucherType,
  computeDayBookTotals,
  computeEntryTotals,
  extractVoucherType,
} from "@/lib/finance/dayBookService";

export interface UseDayBookViewReturn {
  showFilter: boolean;
  fiscalYear: string;
  selectedDate: string;
  voucherType: VoucherType;
  applied: boolean;
  setFiscalYear: (fy: string) => void;
  setSelectedDate: (d: string) => void;
  setVoucherType: (v: VoucherType) => void;
  toggleFilter: () => void;
  closeFilter: () => void;
  search: () => void;
  filteredEntries: JournalEntryForDayBook[];
  totals: DayBookTotals;
  isLoading: boolean;
  getEntryTotals: (entry: JournalEntryForDayBook) => { debit: number; credit: number };
  getVoucherType: (entryNumber: string) => string;
}

export function useDayBookView(): UseDayBookViewReturn {
  const today = new Date().toISOString().slice(0, 10);
  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("2081");
  const [selectedDate, setSelectedDate] = useState(today);
  const [voucherType, setVoucherType] = useState<VoucherType>("all");
  const [applied, setApplied] = useState(false);

  const { data: allEntries = [], isLoading } = useJournalEntries(
    applied ? { startDate: selectedDate, endDate: selectedDate } : undefined
  );

  const filteredEntries = useMemo(() => {
    if (!applied) return [];
    return filterByVoucherType(allEntries as JournalEntryForDayBook[], voucherType);
  }, [allEntries, voucherType, applied]);

  const totals = useMemo(
    () => computeDayBookTotals(filteredEntries),
    [filteredEntries]
  );

  const toggleFilter = useCallback(() => setShowFilter((s) => !s), []);
  const closeFilter = useCallback(() => setShowFilter(false), []);
  const search = useCallback(() => setApplied(true), []);

  const getEntryTotals = useCallback(
    (entry: JournalEntryForDayBook) => computeEntryTotals(entry),
    []
  );

  const getVoucherType = useCallback(
    (entryNumber: string) => extractVoucherType(entryNumber),
    []
  );

  return {
    showFilter,
    fiscalYear,
    selectedDate,
    voucherType,
    applied,
    setFiscalYear,
    setSelectedDate,
    setVoucherType,
    toggleFilter,
    closeFilter,
    search,
    filteredEntries,
    totals,
    isLoading,
    getEntryTotals,
    getVoucherType,
  };
}
