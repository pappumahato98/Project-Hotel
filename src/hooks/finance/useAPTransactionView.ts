/**
 * React hook that wires the pure `apTransactionService` to Supabase +
 * TanStack Query + the OCR simulation.
 *
 * Extracted from `src/components/finance/transactions/APTransactionService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 *
 * Notable fix: the original component called `toast.success(...)` without
 * importing `toast`, which would throw a ReferenceError at runtime. This
 * hook imports `toast` from `sonner` properly.
 */

import { useState, useCallback } from "react";
import { useExpenses } from "@/hooks/useFinanceExtended";
import { toast } from "sonner";
import {
  type OcrResult,
  type ExpenseForAP,
  simulateOcrExtraction,
} from "@/lib/finance/apTransactionService";

export interface UseAPTransactionViewReturn {
  // ─── data ─────────────────────────────────────────────────────────
  expenses: ExpenseForAP[];
  isLoading: boolean;

  // ─── OCR simulation state ────────────────────────────────────────
  isUploading: boolean;
  ocrResult: OcrResult | null;
  simulateOcr: () => void;
  clearOcr: () => void;
}

export function useAPTransactionView(): UseAPTransactionViewReturn {
  const { data: expenses, isLoading } = useExpenses();
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const simulateOcr = useCallback(() => {
    setIsUploading(true);
    // The setTimeout wraps the pure `simulateOcrExtraction` with the
    // side effects (state + toast). The data shape itself is testable
    // without timers via the service function.
    setTimeout(() => {
      setIsUploading(false);
      setOcrResult(simulateOcrExtraction());
      toast.success("Invoice scanned and data extracted successfully via AI.");
    }, 2000);
  }, []);

  const clearOcr = useCallback(() => {
    setOcrResult(null);
  }, []);

  return {
    expenses: (expenses || []) as ExpenseForAP[],
    isLoading,
    isUploading,
    ocrResult,
    simulateOcr,
    clearOcr,
  };
}
