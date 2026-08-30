/**
 * React hook that wires the pure `approvalWorkflowService` to Supabase +
 * TanStack Query + auth context.
 *
 * Extracted from `src/components/finance/transactions/ApprovalWorkflowService.tsx`.
 * See docs/FINANCE_SERVICE_SPLIT.md.
 */

import { useMemo, useCallback } from "react";
import { useApprovalQueue } from "@/hooks/useApprovalQueue";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  type ApprovalPartition,
  type ApprovalCounts,
  type ApprovalItemForWorkflow,
  DEFAULT_REJECTION_REASON,
  partitionByStatus,
  countByStatus,
  recentDecisions,
} from "@/lib/finance/approvalWorkflowService";

export interface UseApprovalWorkflowViewReturn {
  // ─── data ─────────────────────────────────────────────────────────
  items: ApprovalItemForWorkflow[];
  isLoading: boolean;

  // ─── derived ──────────────────────────────────────────────────────
  partition: ApprovalPartition;
  counts: ApprovalCounts;
  recentDecisionsList: ApprovalItemForWorkflow[];

  // ─── actions ──────────────────────────────────────────────────────
  approve: (id: string) => Promise<void>;
  reject: (id: string, reason?: string) => Promise<void>;
}

export function useApprovalWorkflowView(): UseApprovalWorkflowViewReturn {
  const { data: items, isLoading, approveItem, rejectItem } = useApprovalQueue();
  const { user } = useAuth();

  const partition = useMemo(
    () => partitionByStatus((items || []) as ApprovalItemForWorkflow[]),
    [items]
  );

  const counts = useMemo(
    () => countByStatus((items || []) as ApprovalItemForWorkflow[]),
    [items]
  );

  const recentDecisionsList = useMemo(
    () => recentDecisions((items || []) as ApprovalItemForWorkflow[]),
    [items]
  );

  const approve = useCallback(
    async (id: string) => {
      try {
        await approveItem.mutateAsync({ id, approvedBy: user?.id || "" });
        toast.success("Approved");
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [approveItem, user]
  );

  const reject = useCallback(
    async (id: string, reason: string = DEFAULT_REJECTION_REASON) => {
      try {
        await rejectItem.mutateAsync({
          id,
          approvedBy: user?.id || "",
          reason,
        });
        toast.success("Rejected");
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [rejectItem, user]
  );

  return {
    items: (items || []) as ApprovalItemForWorkflow[],
    isLoading,
    partition,
    counts,
    recentDecisionsList,
    approve,
    reject,
  };
}
