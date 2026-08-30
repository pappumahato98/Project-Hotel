/**
 * React hook for the Financial Period Close view.
 */
import { useState, useCallback } from "react";
import { useBusinessDate, useUpdateBusinessDate } from "@/hooks/useSettings";
import { toast } from "sonner";
import {
  computeNextBusinessDate,
  canCloseDay,
  formatCloseSuccessMessage,
} from "@/lib/finance/financialPeriodCloseService";

export interface UseFinancialPeriodCloseViewReturn {
  businessDate: string | undefined;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  closeDay: () => Promise<void>;
  isClosing: boolean;
}

export function useFinancialPeriodCloseView(): UseFinancialPeriodCloseViewReturn {
  const { data: businessDate } = useBusinessDate();
  const updateBusinessDate = useUpdateBusinessDate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => setIsDialogOpen(true), []);
  const closeDialog = useCallback(() => setIsDialogOpen(false), []);

  const closeDay = useCallback(async () => {
    if (!canCloseDay(businessDate)) return;
    const nextDate = computeNextBusinessDate(businessDate!);
    try {
      await updateBusinessDate.mutateAsync(nextDate);
      toast.success(formatCloseSuccessMessage(nextDate));
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to close business day");
    }
  }, [businessDate, updateBusinessDate]);

  return {
    businessDate,
    isDialogOpen,
    openDialog,
    closeDialog,
    closeDay,
    isClosing: updateBusinessDate.isPending,
  };
}
