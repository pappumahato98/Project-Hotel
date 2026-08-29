/**
 * Pure business-logic layer for the Approval Workflow view.
 *
 * Extracted from `src/components/finance/transactions/ApprovalWorkflowService.tsx`
 * as the fifth worked example of the finance-service-split pattern
 * (see docs/FINANCE_SERVICE_SPLIT.md).
 *
 * Design goals:
 *   - Zero React imports. Fully unit-testable with Vitest.
 *   - Pure functions for partitioning approval items by status.
 *   - The "recent decisions" slice computation is extracted for reuse
 *     (e.g. a future notifications panel could use it).
 *   - All Supabase / TanStack Query concerns stay in the hook layer.
 */

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Minimal shape of an approval-queue item needed for the workflow view.
 * Mirrors `ApprovalItem` from `useApprovalQueue`.
 */
export interface ApprovalItemForWorkflow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  amount: number | null;
  description: string | null;
  status: string; // "pending" | "approved" | "rejected"
  requested_at: string;
}

export interface ApprovalPartition {
  pending: ApprovalItemForWorkflow[];
  approved: ApprovalItemForWorkflow[];
  rejected: ApprovalItemForWorkflow[];
}

export interface ApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
}

// ─── Pure computations ───────────────────────────────────────────────

/**
 * Partition approval items into pending / approved / rejected buckets.
 *
 * Items with status values other than "approved" or "rejected" are
 * treated as "pending" (matching the original component's behavior).
 */
export function partitionByStatus(
  items: ApprovalItemForWorkflow[]
): ApprovalPartition {
  const pending: ApprovalItemForWorkflow[] = [];
  const approved: ApprovalItemForWorkflow[] = [];
  const rejected: ApprovalItemForWorkflow[] = [];

  for (const item of items) {
    if (item.status === "approved") approved.push(item);
    else if (item.status === "rejected") rejected.push(item);
    else pending.push(item);
  }

  return { pending, approved, rejected };
}

/**
 * Compute counts per status bucket.
 */
export function countByStatus(items: ApprovalItemForWorkflow[]): ApprovalCounts {
  const partition = partitionByStatus(items);
  return {
    pending: partition.pending.length,
    approved: partition.approved.length,
    rejected: partition.rejected.length,
  };
}

/**
 * Build the "recent decisions" list: approved + rejected items, limited
 * to the most recent `limit` (default 5).
 *
 * Items are returned in their original order; if a chronological sort is
 * needed, the caller should sort by `requested_at` first.
 */
export function recentDecisions(
  items: ApprovalItemForWorkflow[],
  limit: number = 5
): ApprovalItemForWorkflow[] {
  const partition = partitionByStatus(items);
  return [...partition.approved, ...partition.rejected].slice(0, limit);
}

/**
 * Default rejection reason used by the workflow UI when the reviewer
 * doesn't provide a custom reason.
 */
export const DEFAULT_REJECTION_REASON = "Rejected by reviewer";
