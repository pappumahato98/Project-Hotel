/**
 * Unit tests for the pure approvalWorkflowService module.
 *
 * Run with: pnpm vitest run src/lib/finance/__tests__/approvalWorkflowService.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_REJECTION_REASON,
  partitionByStatus,
  countByStatus,
  recentDecisions,
} from "../approvalWorkflowService";
import type { ApprovalItemForWorkflow } from "../approvalWorkflowService";

// ─── fixtures ────────────────────────────────────────────────────────

const items: ApprovalItemForWorkflow[] = [
  { id: "i1", entity_type: "invoice", entity_id: "e1", action: "post", amount: 100, description: "Inv 1", status: "pending", requested_at: "2025-01-01" },
  { id: "i2", entity_type: "journal", entity_id: "e2", action: "approve", amount: 500, description: "JE 1", status: "approved", requested_at: "2025-01-02" },
  { id: "i3", entity_type: "payment", entity_id: "e3", action: "release", amount: 250, description: "Pay 1", status: "rejected", requested_at: "2025-01-03" },
  { id: "i4", entity_type: "invoice", entity_id: "e4", action: "void", amount: null, description: "Inv 2", status: "pending", requested_at: "2025-01-04" },
  { id: "i5", entity_type: "budget", entity_id: "e5", action: "approve", amount: 10000, description: "Budget 2025", status: "approved", requested_at: "2025-01-05" },
  { id: "i6", entity_type: "journal", entity_id: "e6", action: "approve", amount: 300, description: "JE 2", status: "rejected", requested_at: "2025-01-06" },
  { id: "i7", entity_type: "invoice", entity_id: "e7", action: "post", amount: 75, description: null, status: "draft", requested_at: "2025-01-07" }, // unknown status → pending
];

// ─── tests ───────────────────────────────────────────────────────────

describe("approvalWorkflowService constants", () => {
  it("exports a default rejection reason", () => {
    expect(DEFAULT_REJECTION_REASON).toBe("Rejected by reviewer");
  });
});

describe("partitionByStatus", () => {
  it("returns empty buckets for empty input", () => {
    expect(partitionByStatus([])).toEqual({ pending: [], approved: [], rejected: [] });
  });

  it("partitions items into the three buckets", () => {
    const result = partitionByStatus(items);
    expect(result.pending.map(i => i.id)).toEqual(["i1", "i4", "i7"]);
    expect(result.approved.map(i => i.id)).toEqual(["i2", "i5"]);
    expect(result.rejected.map(i => i.id)).toEqual(["i3", "i6"]);
  });

  it("treats unknown statuses (e.g. 'draft') as pending", () => {
    const result = partitionByStatus([
      { id: "x", entity_type: "x", entity_id: "x", action: "x", amount: null, description: null, status: "draft", requested_at: "" },
      { id: "y", entity_type: "x", entity_id: "x", action: "x", amount: null, description: null, status: "withdrawn", requested_at: "" },
    ]);
    expect(result.pending).toHaveLength(2);
    expect(result.approved).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
  });

  it("does not mutate the input array", () => {
    const input = [...items];
    partitionByStatus(items);
    expect(items).toEqual(input);
  });
});

describe("countByStatus", () => {
  it("returns zeros for empty input", () => {
    expect(countByStatus([])).toEqual({ pending: 0, approved: 0, rejected: 0 });
  });

  it("counts items per bucket", () => {
    expect(countByStatus(items)).toEqual({ pending: 3, approved: 2, rejected: 2 });
  });
});

describe("recentDecisions", () => {
  it("returns empty array for empty input", () => {
    expect(recentDecisions([])).toEqual([]);
  });

  it("returns only approved and rejected items (not pending)", () => {
    const result = recentDecisions(items);
    // 2 approved + 2 rejected = 4 total
    expect(result).toHaveLength(4);
    expect(result.every(i => i.status === "approved" || i.status === "rejected")).toBe(true);
  });

  it("limits to 5 by default", () => {
    const many: ApprovalItemForWorkflow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `i${i}`,
      entity_type: "x",
      entity_id: "x",
      action: "x",
      amount: null,
      description: null,
      status: i % 2 === 0 ? "approved" : "rejected",
      requested_at: "",
    }));
    expect(recentDecisions(many)).toHaveLength(5);
  });

  it("accepts a custom limit", () => {
    const result = recentDecisions(items, 2);
    expect(result).toHaveLength(2);
  });

  it("returns approved items before rejected items (preserving original order within each)", () => {
    const result = recentDecisions(items);
    // Approved first (i2, i5), then rejected (i3, i6)
    expect(result.map(i => i.id)).toEqual(["i2", "i5", "i3", "i6"]);
  });

  it("returns empty when there are no approved or rejected items", () => {
    const onlyPending = [
      { id: "p1", entity_type: "x", entity_id: "x", action: "x", amount: null, description: null, status: "pending", requested_at: "" },
    ];
    expect(recentDecisions(onlyPending)).toEqual([]);
  });
});
